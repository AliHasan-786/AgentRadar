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
import { computeScore } from "@/lib/score/compute";
import { rankRecommendations } from "@/lib/recommendations/rank";
import { evaluateRules } from "@/lib/recommendations/rules";
import type { ScoreInputs, VerdictSummary } from "@/lib/score/types";
import {
  CatalogFetchError,
  type CanonicalProduct,
  type CatalogMetadata,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verdictSummarySchema = z.object({
  personaId: z.string(),
  modelSlug: z.string(),
  displayName: z.string(),
  parsed: z
    .object({
      verdict: z.enum(["recommended", "ranked-low", "skipped"]),
      topProductId: z.string().nullable(),
      reasoning: z.string(),
      gaps: z.array(z.string()),
      flags: z.array(z.string()),
    })
    .nullable(),
  flags: z.array(z.string()),
  error: z.string().nullable(),
});

const requestSchema = z.object({
  hostname: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  verdicts: z.array(verdictSummarySchema),
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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Body must be JSON", code: "INVALID_URL" },
      { status: 400 },
    );
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request shape", code: "INVALID_URL" },
      { status: 400 },
    );
  }

  const input = parsed.data.hostname ?? parsed.data.url;
  if (!input) {
    return Response.json(
      { error: "Provide either hostname or url", code: "INVALID_URL" },
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
        { status: 502 },
      );
    }
    return Response.json(
      { error: "Failed to fetch catalog", code: "FETCH_FAILED" },
      { status: 502 },
    );
  }

  const signals = computeCatalogSignals(entry.products);
  const verdicts = parsed.data.verdicts as VerdictSummary[];

  const inputs: ScoreInputs = {
    signals,
    verdicts,
    productCount: entry.products.length,
    uniqueVendorShareTop: dominantVendorShare(entry.products),
  };

  const recs = rankRecommendations(evaluateRules(inputs));
  const result = computeScore(inputs, recs);

  return Response.json({
    hostname: entry.hostname,
    productCount: entry.metadata.productCount,
    inferredVertical: entry.metadata.inferredVertical,
    score: result,
  });
}
