import { z } from "zod";
import {
  cacheGet,
  cacheSet,
  catalogCacheKey,
  CATALOG_TTL_MS,
} from "@/lib/cache";
import { dedupeProducts, normalizeCatalog } from "@/lib/catalog-normalizer";
import {
  buildCatalogMetadata,
  computeCatalogSignals,
} from "@/lib/catalog-signals";
import { fetchCatalog, normalizeHostname } from "@/lib/shopify";
import { PERSONAS, getPersona, type PersonaId } from "@/lib/agents/personas";
import { streamPersona } from "@/lib/agents/streaming-runner";
import { computeScore } from "@/lib/score/compute";
import { rankRecommendations } from "@/lib/recommendations/rank";
import { evaluateRules } from "@/lib/recommendations/rules";
import type { ScoreInputs, VerdictSummary } from "@/lib/score/types";
import {
  CatalogFetchError,
  type CanonicalProduct,
  type CatalogMetadata,
} from "@/lib/types";

// Node runtime — undici Agent in resilient-fetch needs Node, not Edge.
// SSE flushing on Vercel: the `X-Accel-Buffering: no` header below
// disables proxy buffering; Next.js itself does not buffer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  url: z.string().min(1).optional(),
  hostname: z.string().min(1).optional(),
  tier: z.enum(["build", "live"]).optional(),
});

interface CatalogCacheEntry {
  hostname: string;
  metadata: CatalogMetadata;
  products: CanonicalProduct[];
}

async function getCatalog(hostname: string): Promise<CatalogCacheEntry> {
  const key = catalogCacheKey(hostname);
  const cached = await cacheGet<CatalogCacheEntry>(key);
  if (cached) return cached;

  const fetched = await fetchCatalog(hostname);
  const { deduped: normalized } = dedupeProducts(
    normalizeCatalog(fetched.products),
  );
  const metadata = buildCatalogMetadata(
    fetched.hostname,
    normalized,
    fetched.fetchedAt,
  );
  const entry: CatalogCacheEntry = {
    hostname: fetched.hostname,
    metadata,
    products: normalized,
  };
  await cacheSet(key, entry, CATALOG_TTL_MS);
  return entry;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be JSON", code: "INVALID_URL" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Missing or invalid `url`/`hostname`", code: "INVALID_URL" },
      { status: 400 },
    );
  }

  const input = parsed.data.hostname ?? parsed.data.url;
  if (!input) {
    return Response.json(
      { error: "Provide either `url` or `hostname`", code: "INVALID_URL" },
      { status: 400 },
    );
  }

  let hostname: string;
  try {
    hostname = normalizeHostname(input);
  } catch (err) {
    if (err instanceof CatalogFetchError) {
      return Response.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    return Response.json(
      { error: "Invalid URL", code: "INVALID_URL" },
      { status: 400 },
    );
  }

  let entry: CatalogCacheEntry;
  try {
    entry = await getCatalog(hostname);
  } catch (err) {
    if (err instanceof CatalogFetchError) {
      return Response.json(
        { error: err.message, code: err.code },
        { status: err.code === "INVALID_URL" ? 400 : 502 },
      );
    }
    return Response.json(
      { error: "Failed to fetch catalog", code: "FETCH_FAILED" },
      { status: 502 },
    );
  }

  const tier = parsed.data.tier ?? "live";
  const signals = computeCatalogSignals(entry.products);
  const catalogHasReviewSignal = signals.reviewSignalRate > 0;

  const encoder = new TextEncoder();
  const send = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    event: string,
    data: unknown,
  ) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(payload));
  };

  // Collect each persona's terminal state as the streams complete so we
  // can compute the score + recommendations after all five finish, and
  // emit a final `score-ready` event before `all-complete`.
  type CollectedVerdict = {
    personaId: string;
    modelSlug: string;
    displayName: string;
    parsed: {
      verdict: "recommended" | "ranked-low" | "skipped";
      topProductId: string | null;
      reasoning: string;
      gaps: string[];
      flags: string[];
    } | null;
    flags: string[];
    error: string | null;
  };
  const collected = new Map<string, CollectedVerdict>();

  function dominantVendorShare(products: CanonicalProduct[]): number {
    if (products.length === 0) return 0;
    const counts = new Map<string, number>();
    for (const p of products) {
      const v = p.vendor.trim();
      if (!v) continue;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    let top = 0;
    for (const c of counts.values()) {
      if (c > top) top = c;
    }
    return top / products.length;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Initial heartbeat — gets the response flowing through any
      // intermediate proxies before the first real event arrives.
      controller.enqueue(encoder.encode(": stream-open\n\n"));

      send(controller, "catalog-ready", {
        hostname: entry.hostname,
        productCount: entry.metadata.productCount,
        inferredVertical: entry.metadata.inferredVertical,
        catalogHasReviewSignal,
        tier,
      });

      const tasks = PERSONAS.map(async (persona) => {
        const personaCfg = getPersona(persona.id as PersonaId);
        try {
          for await (const evt of streamPersona(persona, entry.products, {
            tier,
            catalogHasReviewSignal,
          })) {
            send(controller, `persona-${evt.type}`, evt);
            if (evt.type === "complete") {
              collected.set(persona.id, {
                personaId: persona.id,
                modelSlug: evt.modelSlug,
                displayName: evt.displayName,
                parsed: evt.parsed
                  ? {
                      verdict: evt.parsed.verdict,
                      topProductId: evt.parsed.topProductId,
                      reasoning: evt.parsed.reasoning,
                      gaps: evt.parsed.gaps,
                      flags: evt.parsed.flags,
                    }
                  : null,
                flags: evt.flags,
                error: evt.error,
              });
            } else if (evt.type === "error") {
              collected.set(persona.id, {
                personaId: persona.id,
                modelSlug: evt.modelSlug,
                displayName: evt.displayName,
                parsed: null,
                flags: [],
                error: evt.error,
              });
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          send(controller, "persona-error", {
            personaId: persona.id,
            error: msg,
          });
          collected.set(persona.id, {
            personaId: persona.id,
            modelSlug: personaCfg.liveModel,
            displayName: personaCfg.liveDisplayName,
            parsed: null,
            flags: [],
            error: msg,
          });
        }
      });

      await Promise.all(tasks);

      // Compute score + recommendations once all personas finish.
      const verdictSummaries: VerdictSummary[] = PERSONAS.map((p) => {
        const c = collected.get(p.id);
        if (!c) {
          return {
            personaId: p.id,
            modelSlug: p.liveModel,
            displayName: p.liveDisplayName,
            parsed: null,
            flags: [],
            error: "no verdict collected",
          };
        }
        return {
          personaId: c.personaId,
          modelSlug: c.modelSlug,
          displayName: c.displayName,
          parsed: c.parsed
            ? {
                verdict: c.parsed.verdict,
                topProductId: c.parsed.topProductId,
                reasoning: c.parsed.reasoning,
                gaps: c.parsed.gaps,
                flags: c.parsed.flags as VerdictSummary["flags"],
              }
            : null,
          flags: c.flags as VerdictSummary["flags"],
          error: c.error,
        };
      });
      const scoreInputs: ScoreInputs = {
        signals,
        verdicts: verdictSummaries,
        productCount: entry.products.length,
        uniqueVendorShareTop: dominantVendorShare(entry.products),
      };
      const recs = rankRecommendations(evaluateRules(scoreInputs));
      const score = computeScore(scoreInputs, recs);
      send(controller, "score-ready", { score });
      send(controller, "all-complete", { tier });
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
