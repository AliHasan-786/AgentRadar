import { visibleTags } from "./tag-utils";
import type {
  CanonicalProduct,
  CatalogMetadata,
  CatalogSignals,
} from "./types";

export const USE_CASE_LEXICON = [
  "gift",
  "daily",
  "everyday",
  "travel",
  "work",
  "casual",
  "formal",
  "running",
  "training",
  "hiking",
  "office",
  "weekend",
  "outdoor",
  "indoor",
  "kids",
  "men",
  "women",
  "wedding",
  "party",
  "beach",
  "summer",
  "winter",
  "school",
  "commute",
  "festival",
];

export const ATTRIBUTE_LEXICON = [
  "size",
  "fit",
  "material",
  "fabric",
  "weight",
  "dimensions",
  "ingredients",
  "compatible",
  "compatibility",
  "color",
  "wash",
  "care",
  "machine washable",
  "vegan",
  "leather",
  "cotton",
  "wool",
  "polyester",
  "stretch",
  "waterproof",
  "breathable",
  "insulated",
  "support",
  "cushion",
  "drop",
  "stack",
  "sole",
  "outsole",
  "midsole",
  "ml",
  "oz",
  "fl oz",
  "grams",
  "kg",
  "lbs",
];

export const POLICY_LEXICON = [
  "return",
  "returns",
  "refund",
  "warranty",
  "guarantee",
  "shipping",
  "delivery",
  "exchange",
  "policy",
];

export const REVIEW_LEXICON = [
  "review",
  "reviews",
  "rating",
  "ratings",
  "stars",
  "verified buyer",
];

const VERTICAL_HINTS: { vertical: string; keywords: string[] }[] = [
  { vertical: "footwear", keywords: ["shoe", "shoes", "sneaker", "boot", "footwear", "runner"] },
  { vertical: "apparel", keywords: ["shirt", "tee", "pants", "jacket", "hoodie", "dress", "apparel", "clothing"] },
  { vertical: "wellness", keywords: ["supplement", "tonic", "vitamin", "wellness", "adaptogen", "tincture"] },
  { vertical: "food-and-beverage", keywords: ["food", "snack", "beverage", "drink", "tea", "coffee", "chocolate"] },
  { vertical: "beauty", keywords: ["serum", "cream", "lotion", "skincare", "makeup", "moisturizer"] },
  { vertical: "home", keywords: ["candle", "kitchen", "home", "bedding", "decor", "cookware"] },
  { vertical: "accessories", keywords: ["bag", "tote", "wallet", "watch", "jewelry", "hat", "sunglasses"] },
  { vertical: "outdoor", keywords: ["tent", "camping", "hiking", "outdoor", "gear", "trail"] },
];

function lower(s: string): string {
  return s.toLowerCase();
}

function rateContains(
  products: CanonicalProduct[],
  lexicon: string[],
  haystack: (p: CanonicalProduct) => string,
): number {
  if (products.length === 0) return 0;
  const lowered = lexicon.map(lower);
  let hits = 0;
  for (const p of products) {
    const text = lower(haystack(p));
    if (lowered.some((kw) => text.includes(kw))) hits++;
  }
  return hits / products.length;
}

function descriptionHaystack(p: CanonicalProduct): string {
  return [p.title, p.description, p.tags.join(" "), p.productType].join(" ");
}

function reviewHaystack(p: CanonicalProduct): string {
  return [p.descriptionHtml, p.tags.join(" ")].join(" ");
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  let sum = 0;
  for (const n of nums) sum += n;
  return sum / nums.length;
}

function inferVertical(products: CanonicalProduct[]): string {
  const text = lower(
    products
      .slice(0, 50)
      .map((p) => `${p.title} ${p.productType} ${p.tags.join(" ")}`)
      .join(" "),
  );
  let best = { vertical: "general", count: 0 };
  for (const v of VERTICAL_HINTS) {
    let count = 0;
    for (const kw of v.keywords) {
      const matches = text.split(kw).length - 1;
      count += matches;
    }
    if (count > best.count) best = { vertical: v.vertical, count };
  }
  return best.vertical;
}

export function computeCatalogSignals(
  products: CanonicalProduct[],
): CatalogSignals {
  const productCount = products.length;
  if (productCount === 0) {
    return {
      productCount: 0,
      averageDescriptionWords: 0,
      averageTagsPerProduct: 0,
      averageVisibleTagsPerProduct: 0,
      averageImagesPerProduct: 0,
      uniqueProductTypeCount: 0,
      uniqueVendorCount: 0,
      productTypeBreadth: 0,
      averageTitleWordCount: 0,
      reviewSignalRate: 0,
      useCaseLanguageRate: 0,
      attributeDetailRate: 0,
      policyKeywordRate: 0,
      variantStructureRate: 0,
      duplicateHandleCount: 0,
    };
  }

  const descriptionWordCounts = products.map(
    (p) => p.description.split(/\s+/).filter(Boolean).length,
  );
  const titleWordCounts = products.map(
    (p) => p.title.split(/\s+/).filter(Boolean).length,
  );
  const tagCounts = products.map((p) => p.tags.length);
  const visibleTagCounts = products.map((p) => visibleTags(p.tags).length);
  const imageCounts = products.map((p) => p.images.length);
  const productTypes = new Set(
    products.map((p) => p.productType.trim()).filter(Boolean),
  );
  const vendors = new Set(
    products.map((p) => p.vendor.trim()).filter(Boolean),
  );

  const reviewSignalRate = rateContains(products, REVIEW_LEXICON, reviewHaystack);
  const useCaseLanguageRate = rateContains(
    products,
    USE_CASE_LEXICON,
    descriptionHaystack,
  );
  const attributeDetailRate = rateContains(
    products,
    ATTRIBUTE_LEXICON,
    descriptionHaystack,
  );
  const policyKeywordRate = rateContains(
    products,
    POLICY_LEXICON,
    descriptionHaystack,
  );

  const productsWithMultipleVariants = products.filter(
    (p) => p.variants.length > 1,
  ).length;
  const variantStructureRate = productsWithMultipleVariants / productCount;

  const handleCounts = new Map<string, number>();
  for (const p of products) {
    if (!p.handle) continue;
    handleCounts.set(p.handle, (handleCounts.get(p.handle) ?? 0) + 1);
  }
  let duplicateHandleCount = 0;
  for (const c of handleCounts.values()) {
    if (c > 1) duplicateHandleCount += c - 1;
  }

  return {
    productCount,
    averageDescriptionWords: avg(descriptionWordCounts),
    averageTagsPerProduct: avg(tagCounts),
    averageVisibleTagsPerProduct: avg(visibleTagCounts),
    averageImagesPerProduct: avg(imageCounts),
    uniqueProductTypeCount: productTypes.size,
    uniqueVendorCount: vendors.size,
    productTypeBreadth: productTypes.size / productCount,
    averageTitleWordCount: avg(titleWordCounts),
    reviewSignalRate,
    useCaseLanguageRate,
    attributeDetailRate,
    policyKeywordRate,
    variantStructureRate,
    duplicateHandleCount,
  };
}

export function buildCatalogMetadata(
  hostname: string,
  products: CanonicalProduct[],
  fetchedAt: string,
): CatalogMetadata {
  const signals = computeCatalogSignals(products);
  const uniqueVendors = Array.from(
    new Set(products.map((p) => p.vendor).filter(Boolean)),
  ).sort();
  const uniqueProductTypes = Array.from(
    new Set(products.map((p) => p.productType).filter(Boolean)),
  ).sort();
  const productsWithReviews = Math.round(
    signals.reviewSignalRate * products.length,
  );
  const productsWithUseCaseTags = Math.round(
    signals.useCaseLanguageRate * products.length,
  );

  return {
    hostname,
    productCount: products.length,
    uniqueVendors,
    uniqueProductTypes,
    inferredVertical: inferVertical(products),
    averageDescriptionWords: signals.averageDescriptionWords,
    productsWithReviews,
    productsWithUseCaseTags,
    averageImagesPerProduct: signals.averageImagesPerProduct,
    averageTagsPerProduct: signals.averageTagsPerProduct,
    fetchedAt,
  };
}
