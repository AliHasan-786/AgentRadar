// Recommendation rule library. Each rule has a deterministic `trigger`
// based on catalog signals and persona gap reports, and a `build` function
// that returns a Recommendation. No model writes a recommendation — the
// rule library is the entire surface area for what we tell merchants to do.
//
// IMAGE_ALT_GAPS is intentionally not present. Shopify's /products.json
// does not expose image alt text (confirmed against allbirds.com and
// outdoorvoices.com — the `alt` key is not in the response object), so we
// cannot honestly score it. The methodology contract is "we don't measure
// what we don't have."

import { RECOMMENDATION_LIFTS, USE_CASE_GAP_KEYWORDS } from "../score/rubric";
import type {
  DimensionId,
  Recommendation,
  ScoreInputs,
} from "../score/types";

export interface Rule {
  id: keyof typeof RECOMMENDATION_LIFTS;
  trigger: (inputs: ScoreInputs) => boolean;
  build: (inputs: ScoreInputs) => Recommendation;
}

function gapsContain(
  inputs: ScoreInputs,
  keywords: readonly string[],
): { hits: number; matchingPersonas: string[] } {
  const lowered = keywords.map((k) => k.toLowerCase());
  let hits = 0;
  const matchingPersonas: string[] = [];
  for (const v of inputs.verdicts) {
    if (v.error || !v.parsed) continue;
    const text = v.parsed.gaps.join(" ").toLowerCase();
    if (lowered.some((k) => text.includes(k))) {
      hits++;
      matchingPersonas.push(v.displayName || v.personaId);
    }
  }
  return { hits, matchingPersonas };
}

export const RULES: Rule[] = [
  {
    id: "MISSING_REVIEW_SCHEMA",
    trigger: (i) => i.signals.reviewSignalRate < 0.3,
    build: (i) => {
      const affected = Math.round(
        i.productCount * (1 - i.signals.reviewSignalRate),
      );
      const { matchingPersonas } = gapsContain(i, ["review", "rating"]);
      const personaEvidence =
        matchingPersonas.length > 0
          ? `${matchingPersonas.length} of ${i.verdicts.length} personas reported missing review/rating data (${matchingPersonas.join(", ")})`
          : `catalog review-signal rate is ${(i.signals.reviewSignalRate * 100).toFixed(0)}%`;
      return {
        id: "MISSING_REVIEW_SCHEMA",
        title: "Add review and rating data to product pages",
        description: `${affected} of ${i.productCount} products have no review signals in their catalog data. AI shoppers asking about social proof have nothing to cite.`,
        dimension: "schema" satisfies DimensionId,
        pointsLift: RECOMMENDATION_LIFTS.MISSING_REVIEW_SCHEMA,
        productCount: affected,
        evidence: [personaEvidence],
      };
    },
  },
  {
    id: "MISSING_USE_CASE_TAGS",
    trigger: (i) => {
      if (i.signals.useCaseLanguageRate >= 0.3) return false;
      const { hits } = gapsContain(i, USE_CASE_GAP_KEYWORDS);
      return hits > 0;
    },
    build: (i) => {
      const affected = Math.round(
        i.productCount * (1 - i.signals.useCaseLanguageRate),
      );
      const { matchingPersonas } = gapsContain(i, USE_CASE_GAP_KEYWORDS);
      return {
        id: "MISSING_USE_CASE_TAGS",
        title: "Add use-case language to product descriptions",
        description: `Only ${(i.signals.useCaseLanguageRate * 100).toFixed(0)}% of products mention common use-cases (gift, travel, daily, work, casual). Shoppers querying "for X scenario" can't find their match.`,
        dimension: "description" satisfies DimensionId,
        pointsLift: RECOMMENDATION_LIFTS.MISSING_USE_CASE_TAGS,
        productCount: affected,
        evidence: [
          `personas reporting use-case gaps: ${matchingPersonas.join(", ") || "(none directly, but catalog rate < 30%)"}`,
        ],
      };
    },
  },
  {
    id: "THIN_DESCRIPTIONS",
    trigger: (i) => i.signals.averageDescriptionWords < 50,
    build: (i) => ({
      id: "THIN_DESCRIPTIONS",
      title: "Expand thin product descriptions",
      description: `Average description is ${i.signals.averageDescriptionWords.toFixed(0)} words — below the 60–200 word window where AI shoppers can answer purchase-intent questions reliably.`,
      dimension: "description" satisfies DimensionId,
      pointsLift: RECOMMENDATION_LIFTS.THIN_DESCRIPTIONS,
      productCount: i.productCount,
      evidence: [
        `catalog average: ${i.signals.averageDescriptionWords.toFixed(1)} words/product`,
      ],
    }),
  },
  {
    id: "MISSING_ATTRIBUTE_DETAIL",
    trigger: (i) => {
      if (i.signals.attributeDetailRate >= 0.4) return false;
      const { hits } = gapsContain(i, [
        "spec",
        "specification",
        "size",
        "fit",
        "material",
        "weight",
      ]);
      return hits > 0;
    },
    build: (i) => {
      const { matchingPersonas } = gapsContain(i, [
        "spec",
        "specification",
        "size",
        "fit",
        "material",
        "weight",
      ]);
      return {
        id: "MISSING_ATTRIBUTE_DETAIL",
        title: "Add product specs (size, fit, material, weight)",
        description: `Only ${(i.signals.attributeDetailRate * 100).toFixed(0)}% of products mention concrete attributes. Personas asking for specs are flagging the gap directly.`,
        dimension: "description" satisfies DimensionId,
        pointsLift: RECOMMENDATION_LIFTS.MISSING_ATTRIBUTE_DETAIL,
        productCount: Math.round(
          i.productCount * (1 - i.signals.attributeDetailRate),
        ),
        evidence: [
          `personas reporting attribute gaps: ${matchingPersonas.join(", ")}`,
        ],
      };
    },
  },
  {
    id: "LOW_TAG_DENSITY",
    trigger: (i) => i.signals.averageVisibleTagsPerProduct < 2,
    build: (i) => ({
      id: "LOW_TAG_DENSITY",
      title: "Add customer-visible tags to products",
      description: `Average ${i.signals.averageVisibleTagsPerProduct.toFixed(1)} customer-visible tags per product (internal taxonomy stripped). AI shoppers use tags as a primary discovery surface; below 2 means many products are essentially invisible to tag-based queries.`,
      dimension: "discoverability" satisfies DimensionId,
      pointsLift: RECOMMENDATION_LIFTS.LOW_TAG_DENSITY,
      productCount: i.productCount,
      evidence: [
        `avg visible tags/product: ${i.signals.averageVisibleTagsPerProduct.toFixed(2)}`,
      ],
    }),
  },
  {
    id: "MISSING_POLICY_KEYWORDS",
    trigger: (i) => i.signals.policyKeywordRate < 0.1,
    build: (i) => ({
      id: "MISSING_POLICY_KEYWORDS",
      title: "Surface return / shipping / warranty language",
      description: `Only ${(i.signals.policyKeywordRate * 100).toFixed(0)}% of products mention policy terms (returns, shipping, warranty, guarantee). Trust-anxious shoppers can't verify the basics.`,
      dimension: "trust" satisfies DimensionId,
      pointsLift: RECOMMENDATION_LIFTS.MISSING_POLICY_KEYWORDS,
      productCount: Math.round(
        i.productCount * (1 - i.signals.policyKeywordRate),
      ),
      evidence: [
        `catalog policy-keyword rate: ${(i.signals.policyKeywordRate * 100).toFixed(1)}%`,
      ],
    }),
  },
  {
    id: "OVER_CONSOLIDATED_TAXONOMY",
    trigger: (i) => i.signals.productTypeBreadth < 0.05,
    build: (i) => ({
      id: "OVER_CONSOLIDATED_TAXONOMY",
      title: "Split over-consolidated product types",
      description: `${i.signals.uniqueProductTypeCount} unique product types across ${i.productCount} products (breadth ${i.signals.productTypeBreadth.toFixed(3)}). Lumping everything under "Shoes" or "Apparel" hides differentiating signal that AI agents would use to narrow down.`,
      dimension: "discoverability" satisfies DimensionId,
      pointsLift: RECOMMENDATION_LIFTS.OVER_CONSOLIDATED_TAXONOMY,
      productCount: i.productCount,
      evidence: [
        `${i.signals.uniqueProductTypeCount} types / ${i.productCount} products`,
      ],
    }),
  },
  {
    id: "TERSE_TITLES",
    trigger: (i) => i.signals.averageTitleWordCount < 4,
    build: (i) => ({
      id: "TERSE_TITLES",
      title: "Expand terse product titles",
      description: `Average title is ${i.signals.averageTitleWordCount.toFixed(1)} words. AI shoppers parsing titles for intent ("running shoe", "men's wool sweater") get less to match against the shorter the title.`,
      dimension: "discoverability" satisfies DimensionId,
      pointsLift: RECOMMENDATION_LIFTS.TERSE_TITLES,
      productCount: i.productCount,
      evidence: [
        `avg title word count: ${i.signals.averageTitleWordCount.toFixed(2)}`,
      ],
    }),
  },
];

export function evaluateRules(inputs: ScoreInputs): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const rule of RULES) {
    if (rule.trigger(inputs)) {
      recs.push(rule.build(inputs));
    }
  }
  return recs;
}
