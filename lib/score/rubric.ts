// Single config of every weight and threshold the AI Readiness Score uses.
// The methodology page renders this verbatim — visitors should be able to
// audit "why is my score 67" without leaving the product. If you tune a
// number here, the change is automatically reflected in /methodology.
//
// Numerical scoring is rule-based. Models classify (recommended /
// ranked-low / skipped) and report gaps; the rubric does the math. No
// model-generated number drives the score.

export const DIMENSION_WEIGHTS = {
  discoverability: 0.3,
  description: 0.3,
  schema: 0.25,
  trust: 0.15,
} as const;

// === Discoverability ===
export const DISCOVERABILITY = {
  // Visible (post-filter) tags per product.
  tagDensity: {
    minPoints: 0,
    maxPoints: 30,
    zeroAt: 0, // 0 visible tags → 0 pts
    topAt: 5, // 5+ visible tags → 30 pts (linear in between)
  },
  // unique productTypes / total products. < 0.05 (over-consolidated)
  // and > 0.50 (under-consolidated) both penalized; 0.10–0.30 ideal.
  productTypeBreadth: {
    minPoints: 0,
    maxPoints: 20,
    floor: 0.05,
    idealLow: 0.1,
    idealHigh: 0.3,
    ceiling: 0.5,
  },
  titleSpecificity: {
    minPoints: 0,
    maxPoints: 20,
    zeroAt: 2, // 2 words or fewer → 0 pts
    idealLow: 6,
    idealHigh: 12,
    ceiling: 20, // > 20 words → wall-of-text penalty
  },
  // (recommended + ranked-low) / total personas
  personaSurfaceRate: {
    minPoints: 0,
    maxPoints: 30,
  },
} as const;

// === Description quality ===
export const DESCRIPTION = {
  averageDescriptionWords: {
    minPoints: 0,
    maxPoints: 30,
    zeroAt: 10, // <10 words avg → 0 pts
    idealLow: 60,
    idealHigh: 200,
    ceiling: 400, // >400 wall-of-text → drop back
  },
  useCaseLanguageRate: {
    minPoints: 0,
    maxPoints: 25,
    zeroAt: 0,
    topAt: 0.5, // 50% of products mention a use-case → 25 pts
  },
  attributeDetailRate: {
    minPoints: 0,
    maxPoints: 25,
    zeroAt: 0,
    topAt: 0.6,
  },
  // fraction of personas whose `gaps` mention description-related issues
  personaDescriptionGapRate: {
    minPoints: 0,
    maxPoints: 20,
    // higher gap rate = lower score (inverted)
    invertFromTopAt: 0.6,
  },
} as const;

// === Schema ===
export const SCHEMA = {
  reviewSignalRate: {
    minPoints: 0,
    maxPoints: 30,
    zeroAt: 0,
    topAt: 0.5,
  },
  variantStructureRate: {
    minPoints: 0,
    maxPoints: 25,
    zeroAt: 0.1,
    topAt: 0.7,
  },
  vendorConsistency: {
    minPoints: 0,
    maxPoints: 25,
    // 1 unique vendor (single-brand store) → full pts
    // moderate (2-5) → high pts
    // long-tail (>20) → degraded
    idealMaxVendors: 5,
    ceiling: 50,
  },
  averageImagesPerProduct: {
    minPoints: 0,
    maxPoints: 20,
    zeroAt: 0,
    topAt: 4, // 4+ images → 20 pts
  },
} as const;

// === Trust ===
export const TRUST = {
  policyKeywordRate: {
    minPoints: 0,
    maxPoints: 35,
    zeroAt: 0,
    topAt: 0.4, // 40% of products mention return/warranty/etc → 35 pts
  },
  // Single canonical brand vendor matching the storefront brand
  vendorBrandClarity: {
    minPoints: 0,
    maxPoints: 30,
    // dominant vendor share of products
    topAt: 0.85,
    floorAt: 0.4,
  },
  reviewSignalAsTrustSignal: {
    minPoints: 0,
    maxPoints: 20,
    zeroAt: 0,
    topAt: 0.4,
  },
  personaTrustGapRate: {
    minPoints: 0,
    maxPoints: 15,
    invertFromTopAt: 0.6,
  },
} as const;

// === Recommendation rule lifts (estimates calibrated to rubric) ===
export const RECOMMENDATION_LIFTS = {
  MISSING_REVIEW_SCHEMA: 9,
  MISSING_USE_CASE_TAGS: 6,
  THIN_DESCRIPTIONS: 5,
  MISSING_ATTRIBUTE_DETAIL: 4,
  LOW_TAG_DENSITY: 4,
  MISSING_POLICY_KEYWORDS: 3,
  OVER_CONSOLIDATED_TAXONOMY: 2,
  TERSE_TITLES: 4,
  // IMAGE_ALT_GAPS intentionally NOT included — Shopify's /products.json
  // does not expose image alt text, so we cannot measure it. Methodology
  // contract: we don't recommend on data we can't measure.
} as const;

// === Description-gap keywords (used to detect persona gap reports about
// description quality, drives DESCRIPTION.personaDescriptionGapRate) ===
export const DESCRIPTION_GAP_KEYWORDS = [
  "description",
  "spec",
  "specification",
  "detail",
  "attribute",
  "fit",
  "size",
  "material",
  "weight",
  "dimension",
  "measurement",
  "ingredients",
];

// === Trust-gap keywords ===
export const TRUST_GAP_KEYWORDS = [
  "review",
  "rating",
  "stars",
  "policy",
  "return",
  "warranty",
  "shipping",
  "guarantee",
  "verified",
  "trust",
  "certif",
];

// === Use-case-gap keywords ===
export const USE_CASE_GAP_KEYWORDS = [
  "use case",
  "use-case",
  "occasion",
  "scenario",
  "purpose",
  "intended",
  "for whom",
  "target",
  "gift",
  "everyday",
  "daily",
  "travel",
  "work",
];

export const RUBRIC = {
  weights: DIMENSION_WEIGHTS,
  discoverability: DISCOVERABILITY,
  description: DESCRIPTION,
  schema: SCHEMA,
  trust: TRUST,
  recommendationLifts: RECOMMENDATION_LIFTS,
  descriptionGapKeywords: DESCRIPTION_GAP_KEYWORDS,
  trustGapKeywords: TRUST_GAP_KEYWORDS,
  useCaseGapKeywords: USE_CASE_GAP_KEYWORDS,
} as const;
