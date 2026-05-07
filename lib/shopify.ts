import { resilientFetch } from "./resilient-fetch";
import { CatalogFetchError } from "./types";

export interface RawShopifyProduct {
  id: number | string;
  title: string;
  handle: string;
  body_html: string | null;
  vendor: string | null;
  product_type: string | null;
  tags: string | string[];
  images: { src: string; alt?: string | null }[] | null;
  variants:
    | {
        id: number | string;
        title: string;
        price: string;
        available?: boolean;
      }[]
    | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

const PAGE_SIZE = 250;
const MAX_PAGES = 4;
const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT =
  "AgentRadar/0.1 (+https://github.com/AliHasan-786/agentradar)";

export function normalizeHostname(input: string): string {
  if (!input || typeof input !== "string") {
    throw new CatalogFetchError("INVALID_URL", "URL is required");
  }
  let raw = input.trim();
  if (!raw) {
    throw new CatalogFetchError("INVALID_URL", "URL is required");
  }
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new CatalogFetchError("INVALID_URL", `Could not parse URL: ${input}`);
  }
  let host = url.hostname.toLowerCase();
  if (host.startsWith("www.")) host = host.slice(4);
  if (!host.includes(".")) {
    throw new CatalogFetchError(
      "INVALID_URL",
      `Hostname looks invalid: ${host}`,
    );
  }
  return host;
}

async function fetchProductsPage(
  hostname: string,
  page: number,
): Promise<RawShopifyProduct[]> {
  const url = `https://${hostname}/products.json?limit=${PAGE_SIZE}&page=${page}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await resilientFetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      signal: controller.signal,
      redirect: "follow",
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    throw new CatalogFetchError(
      "FETCH_FAILED",
      `Network error fetching ${url}: ${msg}`,
    );
  }
  clearTimeout(timer);

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    throw new CatalogFetchError(
      "CATALOG_DISABLED",
      `Public /products.json is disabled (HTTP ${response.status})`,
      response.status,
    );
  }
  if (!response.ok) {
    throw new CatalogFetchError(
      "FETCH_FAILED",
      `Unexpected HTTP ${response.status} fetching ${url}`,
      response.status,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CatalogFetchError(
      "CATALOG_DISABLED",
      `Endpoint did not return JSON — likely not a Shopify store`,
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("products" in body) ||
    !Array.isArray((body as { products: unknown }).products)
  ) {
    throw new CatalogFetchError(
      "CATALOG_DISABLED",
      `Endpoint did not return a Shopify products array`,
    );
  }
  return (body as { products: RawShopifyProduct[] }).products;
}

export interface FetchCatalogResult {
  hostname: string;
  products: RawShopifyProduct[];
  pagesFetched: number;
  truncated: boolean;
  fetchedAt: string;
}

export async function fetchCatalog(
  hostnameInput: string,
): Promise<FetchCatalogResult> {
  const hostname = normalizeHostname(hostnameInput);
  const all: RawShopifyProduct[] = [];
  let pagesFetched = 0;
  let truncated = false;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageProducts = await fetchProductsPage(hostname, page);
    pagesFetched = page;
    all.push(...pageProducts);
    if (pageProducts.length < PAGE_SIZE) break;
    if (page === MAX_PAGES && pageProducts.length === PAGE_SIZE) {
      truncated = true;
    }
  }

  if (all.length === 0) {
    throw new CatalogFetchError(
      "EMPTY_CATALOG",
      `Catalog at ${hostname} returned 0 products`,
    );
  }

  return {
    hostname,
    products: all,
    pagesFetched,
    truncated,
    fetchedAt: new Date().toISOString(),
  };
}
