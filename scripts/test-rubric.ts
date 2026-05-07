// Calibration test for the rubric. No LLM calls — uses fixed stub verdicts
// that approximate the live-tier behavior we've already observed (3
// recommended, 1 ranked-low, 1 skipped) so the differentiation comes from
// the catalog signals, not from verdict variance.
//
// Targets:
//   Allbirds (998 canonical) — should land mid-60s to mid-70s overall
//   Outdoor Voices (122 canonical) — discoverability noticeably lower
//                                      (avg title 2.9 words)
//   Stub bad-catalog — empty descriptions, no tags, one product type, no
//                      reviews. Should score sub-30.
// Top-3 recommendations should be visibly different per store.

import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { computeCatalogSignals } from "../lib/catalog-signals";
import { fetchCatalog } from "../lib/shopify";
import { evaluateRules } from "../lib/recommendations/rules";
import { rankRecommendations } from "../lib/recommendations/rank";
import { computeScore } from "../lib/score/compute";
import type { ScoreInputs, VerdictSummary } from "../lib/score/types";
import type { CanonicalProduct } from "../lib/types";

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

function stubVerdicts(): VerdictSummary[] {
  // Mirrors the live-tier panel; verdicts approximate the patterns seen in
  // /tmp/agentradar-5persona-final.txt and earlier runs against real
  // Allbirds catalog data.
  return [
    {
      personaId: "sustainable-runner",
      modelSlug: "anthropic/claude-3-haiku",
      displayName: "Claude 3 Haiku",
      parsed: {
        verdict: "recommended",
        topProductId: "stub-product-1",
        reasoning:
          "The catalog includes wool and tree-based runners with eco materials.",
        gaps: [
          "no carbon footprint or sustainability certifications mentioned",
          "no manufacturing process detail",
        ],
        flags: [],
      },
      flags: [],
      error: null,
    },
    {
      personaId: "arch-support-shopper",
      modelSlug: "openai/gpt-4o-mini",
      displayName: "GPT-4o-mini",
      parsed: {
        verdict: "ranked-low",
        topProductId: "stub-product-2",
        reasoning:
          "Trail runners are in budget but no arch-support spec in descriptions.",
        gaps: [
          "no arch support spec in descriptions",
          "no review aggregation visible",
          "no detailed performance metrics for trail running",
        ],
        flags: [],
      },
      flags: [],
      error: null,
    },
    {
      personaId: "daily-walker-gift",
      modelSlug: "meta-llama/llama-3.3-70b-instruct",
      displayName: "Llama 3.3 70B",
      parsed: {
        verdict: "recommended",
        topProductId: "stub-product-3",
        reasoning:
          "Wool Runner Fluffs are soft, supportive, and machine washable, suitable as a gift.",
        gaps: [
          "no customer reviews or ratings available",
          "no sizing detail or fit guidance",
        ],
        flags: [],
      },
      flags: [],
      error: null,
    },
    {
      personaId: "minimalist-traveler",
      modelSlug: "google/gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      parsed: {
        verdict: "recommended",
        topProductId: "stub-product-4",
        reasoning:
          "The Cruiser Slip On has a clean minimalist look, available in neutral colors.",
        gaps: [
          "no explicit weight specification for lightweight",
          "no review aggregation visible",
        ],
        flags: [],
      },
      flags: [],
      error: null,
    },
    {
      personaId: "vegan-with-reviews",
      modelSlug: "mistralai/mistral-small-3.2-24b-instruct",
      displayName: "Mistral Small 3.2 24B",
      parsed: {
        verdict: "skipped",
        topProductId: null,
        reasoning:
          "No customer reviews or ratings visible in the catalog data.",
        gaps: [
          "no review aggregation visible",
          "no rating breakdown visible",
          "no vegan certification visible",
        ],
        flags: [],
      },
      flags: [],
      error: null,
    },
  ];
}

function makeBadCatalog(): CanonicalProduct[] {
  // Empty descriptions, no tags, one product type ("Item"), single product
  // — should hit nearly every recommendation rule.
  const products: CanonicalProduct[] = [];
  for (let i = 0; i < 20; i++) {
    products.push({
      id: `bad-${i}`,
      handle: `bad-${i}`,
      title: "Item",
      description: "",
      descriptionHtml: "",
      vendor: "Acme Co",
      productType: "Item",
      tags: [],
      priceMin: 10,
      priceMax: 10,
      currency: "USD",
      images: [],
      variants: [
        {
          id: `var-${i}`,
          title: "Default",
          price: 10,
          available: true,
        },
      ],
      available: true,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });
  }
  return products;
}

function fmtScore(n: number): string {
  return n.toFixed(1).padStart(5);
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(0) + "%";
}

function reportRun(label: string, products: CanonicalProduct[]) {
  const signals = computeCatalogSignals(products);
  const inputs: ScoreInputs = {
    signals,
    verdicts: stubVerdicts(),
    productCount: products.length,
    uniqueVendorShareTop: dominantVendorShare(products),
  };
  const recs = rankRecommendations(evaluateRules(inputs));
  const result = computeScore(inputs, recs);

  console.log("");
  console.log("=".repeat(96));
  console.log(`${label}  —  ${products.length} canonical products`);
  console.log("=".repeat(96));
  console.log(`Overall:                 ${fmtScore(result.overall)}`);
  console.log(`  Discoverability (30%): ${fmtScore(result.dimensions.discoverability.score)}`);
  console.log(`  Description (30%):     ${fmtScore(result.dimensions.description.score)}`);
  console.log(`  Schema (25%):          ${fmtScore(result.dimensions.schema.score)}`);
  console.log(`  Trust (15%):           ${fmtScore(result.dimensions.trust.score)}`);
  console.log("");
  console.log("Key signals:");
  console.log(`  avg desc words:           ${signals.averageDescriptionWords.toFixed(1)}`);
  console.log(`  avg title word count:     ${signals.averageTitleWordCount.toFixed(1)}`);
  console.log(`  avg visible tags/product: ${signals.averageVisibleTagsPerProduct.toFixed(2)} (raw: ${signals.averageTagsPerProduct.toFixed(1)})`);
  console.log(`  avg images/product:       ${signals.averageImagesPerProduct.toFixed(1)}`);
  console.log(`  productTypeBreadth:       ${signals.productTypeBreadth.toFixed(3)}`);
  console.log(`  reviewSignalRate:         ${fmtPct(signals.reviewSignalRate)}`);
  console.log(`  useCaseLanguageRate:      ${fmtPct(signals.useCaseLanguageRate)}`);
  console.log(`  attributeDetailRate:      ${fmtPct(signals.attributeDetailRate)}`);
  console.log(`  policyKeywordRate:        ${fmtPct(signals.policyKeywordRate)}`);
  console.log(`  variantStructureRate:     ${fmtPct(signals.variantStructureRate)}`);
  console.log("");
  console.log("Per-dimension signal contributions:");
  for (const [dim, body] of Object.entries(result.dimensions)) {
    console.log(`  ${dim}:`);
    for (const s of body.signals) {
      const v = typeof s.value === "number" ? s.value.toFixed(2) : s.value;
      console.log(
        `    ${s.name.padEnd(50)} value=${String(v).padStart(7)} →${fmtScore(s.contribution)} / ${s.weight}`,
      );
    }
  }
  console.log("");
  console.log(`Recommendations (${recs.length} triggered):`);
  for (const r of recs) {
    console.log(
      `  +${r.pointsLift.toString().padStart(2)}pts [${r.dimension.padEnd(15)}] ${r.title}`,
    );
    console.log(`           ${r.description.slice(0, 120)}${r.description.length > 120 ? "…" : ""}`);
  }
}

(async () => {
  console.log("AgentRadar — Sprint 4 rubric calibration test");
  console.log("(uses stubbed verdicts — no LLM calls)");

  // Allbirds
  const allbirdsFetched = await fetchCatalog("allbirds.com");
  const { deduped: allbirds } = dedupeProducts(
    normalizeCatalog(allbirdsFetched.products),
  );
  reportRun("Allbirds (allbirds.com)", allbirds);

  // OV
  const ovFetched = await fetchCatalog("outdoorvoices.com");
  const { deduped: ov } = dedupeProducts(normalizeCatalog(ovFetched.products));
  reportRun("Outdoor Voices (outdoorvoices.com)", ov);

  // Bad-catalog stub
  reportRun("Hand-rolled bad catalog (sanity check)", makeBadCatalog());
})();
