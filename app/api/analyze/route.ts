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
import { PERSONAS } from "@/lib/agents/personas";
import { streamPersona } from "@/lib/agents/streaming-runner";
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
        try {
          for await (const evt of streamPersona(persona, entry.products, {
            tier,
            catalogHasReviewSignal,
          })) {
            send(controller, `persona-${evt.type}`, evt);
          }
        } catch (err) {
          send(controller, "persona-error", {
            personaId: persona.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });

      await Promise.all(tasks);
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
