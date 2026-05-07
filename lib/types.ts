export interface CanonicalProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  priceMin: number;
  priceMax: number;
  currency: string;
  images: { src: string; altText: string | null }[];
  variants: {
    id: string;
    title: string;
    price: number;
    available: boolean;
  }[];
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogMetadata {
  hostname: string;
  productCount: number;
  uniqueVendors: string[];
  uniqueProductTypes: string[];
  inferredVertical: string;
  averageDescriptionWords: number;
  productsWithReviews: number;
  productsWithUseCaseTags: number;
  averageImagesPerProduct: number;
  averageTagsPerProduct: number;
  fetchedAt: string;
}

export interface CatalogSignals {
  productCount: number;
  averageDescriptionWords: number;
  averageTagsPerProduct: number;
  averageVisibleTagsPerProduct: number;
  averageImagesPerProduct: number;
  uniqueProductTypeCount: number;
  uniqueVendorCount: number;
  productTypeBreadth: number;
  averageTitleWordCount: number;
  reviewSignalRate: number;
  useCaseLanguageRate: number;
  attributeDetailRate: number;
  policyKeywordRate: number;
  variantStructureRate: number;
  duplicateHandleCount: number;
}

// Canonical persisted shape per PRD §8.3. The runner emits a richer
// PersonaRunResult internally; we convert to AgentVerdict at the boundary
// (serialization, demo-store JSON, /api/score input) so the contract stays
// crisp. Errors are preserved via the `error` field; `verdict` is set to
// "skipped" with `error` populated when the model never produced output.
export interface AgentVerdict {
  personaId: string;
  modelSlug: string;
  displayName: string;
  intent: string;
  verdict: "recommended" | "ranked-low" | "skipped";
  topProductId: string | null;
  reasoning: string;
  gaps: string[];
  flags: string[];
  promptUsed: { system: string; user: string };
  rawResponse: string;
  sampledProductIds: string[];
  latencyMs: number;
  retried: boolean;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  error: string | null;
}

// Persisted demo-store JSON per PRD §14.3. The shape is self-contained:
// rendering reads `score` directly; recomputation from persisted
// `verdicts` + `signals` + `uniqueVendorShareTop` reproduces the exact
// score (full-catalog dominantVendorShare is persisted because the 30-
// product sample doesn't preserve the vendor distribution).
export interface DemoStoreCapture {
  slug: string;
  hostname: string;
  displayName: string;
  vertical: string;
  capturedAt: string;
  tier: "build" | "live";
  catalog: {
    metadata: CatalogMetadata;
    sampleProducts: CanonicalProduct[];
  };
  verdicts: AgentVerdict[];
  score: unknown;
  signals: CatalogSignals;
  uniqueVendorShareTop: number;
}

export type CatalogFetchErrorCode =
  | "INVALID_URL"
  | "CATALOG_DISABLED"
  | "FETCH_FAILED"
  | "EMPTY_CATALOG";

export class CatalogFetchError extends Error {
  code: CatalogFetchErrorCode;
  status?: number;
  constructor(code: CatalogFetchErrorCode, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
