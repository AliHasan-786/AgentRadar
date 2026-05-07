import { z } from "zod";
import {
  cacheGet,
  cacheSet,
  catalogCacheKey,
  CATALOG_TTL_MS,
} from "@/lib/cache";
import { dedupeProducts, normalizeCatalog } from "@/lib/catalog-normalizer";
import { buildCatalogMetadata } from "@/lib/catalog-signals";
import { sampleProducts } from "@/lib/sample-products";
import { fetchCatalog, normalizeHostname } from "@/lib/shopify";
import {
  CatalogFetchError,
  type CanonicalProduct,
  type CatalogMetadata,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  url: z.string().min(1),
  refresh: z.boolean().optional(),
});

interface CatalogResponseBody {
  hostname: string;
  metadata: CatalogMetadata;
  sampleProducts: CanonicalProduct[];
  cached: boolean;
}

interface CatalogCacheEntry {
  hostname: string;
  metadata: CatalogMetadata;
  products: CanonicalProduct[];
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
      { error: "Missing or invalid `url` field", code: "INVALID_URL" },
      { status: 400 },
    );
  }

  let hostname: string;
  try {
    hostname = normalizeHostname(parsed.data.url);
  } catch (err) {
    if (err instanceof CatalogFetchError) {
      return Response.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    return Response.json(
      { error: "Could not parse URL", code: "INVALID_URL" },
      { status: 400 },
    );
  }

  const cacheKey = catalogCacheKey(hostname);

  if (!parsed.data.refresh) {
    const cached = await cacheGet<CatalogCacheEntry>(cacheKey);
    if (cached) {
      const responseBody: CatalogResponseBody = {
        hostname: cached.hostname,
        metadata: cached.metadata,
        sampleProducts: sampleProducts(cached.products, 30),
        cached: true,
      };
      return Response.json(responseBody);
    }
  }

  try {
    const fetched = await fetchCatalog(hostname);
    const normalizedRaw = normalizeCatalog(fetched.products);
    const { deduped: normalized } = dedupeProducts(normalizedRaw);
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
    await cacheSet(cacheKey, entry, CATALOG_TTL_MS);

    const responseBody: CatalogResponseBody = {
      hostname: fetched.hostname,
      metadata,
      sampleProducts: sampleProducts(normalized, 30),
      cached: false,
    };
    return Response.json(responseBody);
  } catch (err) {
    if (err instanceof CatalogFetchError) {
      const status =
        err.code === "CATALOG_DISABLED"
          ? 422
          : err.code === "INVALID_URL"
            ? 400
            : err.code === "EMPTY_CATALOG"
              ? 422
              : 502;
      return Response.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    return Response.json(
      {
        error: "Internal error fetching catalog",
        code: "FETCH_FAILED",
      },
      { status: 500 },
    );
  }
}
