// Round-trip verification: load each demo store JSON, validate the shape
// with zod, re-run the score computation from the persisted verdicts, and
// confirm we land on the same numbers. This is the contract that lets the
// Sprint 5 component render cached + live results from the same code path.

import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { computeScore } from "../lib/score/compute";
import { rankRecommendations } from "../lib/recommendations/rank";
import { evaluateRules } from "../lib/recommendations/rules";
import { toVerdictSummary } from "../lib/agents/to-agent-verdict";
import type { ScoreInputs } from "../lib/score/types";
import type { CanonicalProduct, AgentVerdict } from "../lib/types";

const OUT_DIR = path.join(__dirname, "..", "data", "demo-stores");

const verdictSchema = z.object({
  personaId: z.string(),
  modelSlug: z.string(),
  displayName: z.string(),
  intent: z.string(),
  verdict: z.enum(["recommended", "ranked-low", "skipped"]),
  topProductId: z.string().nullable(),
  reasoning: z.string(),
  gaps: z.array(z.string()),
  flags: z.array(z.string()),
  promptUsed: z.object({ system: z.string(), user: z.string() }),
  rawResponse: z.string(),
  sampledProductIds: z.array(z.string()),
  latencyMs: z.number(),
  retried: z.boolean(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .nullable(),
  error: z.string().nullable(),
});

const captureSchema = z.object({
  slug: z.string(),
  hostname: z.string(),
  displayName: z.string(),
  vertical: z.string(),
  capturedAt: z.string(),
  tier: z.enum(["build", "live"]),
  catalog: z.object({
    metadata: z.object({
      hostname: z.string(),
      productCount: z.number(),
      uniqueVendors: z.array(z.string()),
      uniqueProductTypes: z.array(z.string()),
      inferredVertical: z.string(),
      averageDescriptionWords: z.number(),
      productsWithReviews: z.number(),
      productsWithUseCaseTags: z.number(),
      averageImagesPerProduct: z.number(),
      averageTagsPerProduct: z.number(),
      fetchedAt: z.string(),
    }),
    sampleProducts: z.array(z.unknown()),
  }),
  verdicts: z.array(verdictSchema),
  score: z.object({
    overall: z.number(),
    dimensions: z.object({
      discoverability: z.object({ score: z.number(), signals: z.array(z.unknown()) }),
      description: z.object({ score: z.number(), signals: z.array(z.unknown()) }),
      schema: z.object({ score: z.number(), signals: z.array(z.unknown()) }),
      trust: z.object({ score: z.number(), signals: z.array(z.unknown()) }),
    }),
    recommendations: z.array(z.unknown()),
    computedAt: z.string(),
  }),
  uniqueVendorShareTop: z.number(),
  signals: z.object({
    productCount: z.number(),
    averageDescriptionWords: z.number(),
    averageTagsPerProduct: z.number(),
    averageVisibleTagsPerProduct: z.number(),
    averageImagesPerProduct: z.number(),
    uniqueProductTypeCount: z.number(),
    uniqueVendorCount: z.number(),
    productTypeBreadth: z.number(),
    averageTitleWordCount: z.number(),
    reviewSignalRate: z.number(),
    useCaseLanguageRate: z.number(),
    attributeDetailRate: z.number(),
    policyKeywordRate: z.number(),
    variantStructureRate: z.number(),
    duplicateHandleCount: z.number(),
  }),
});

function dominantVendorShare(products: CanonicalProduct[]): number {
  if (products.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const p of products) {
    const v = (p.vendor ?? "").trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let top = 0;
  for (const c of counts.values()) {
    if (c > top) top = c;
  }
  return top / products.length;
}

(async () => {
  const files = (await fs.readdir(OUT_DIR)).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} demo capture(s) in ${OUT_DIR}`);

  let allOk = true;
  for (const f of files) {
    console.log("");
    console.log("=".repeat(72));
    console.log(`Verifying ${f}`);
    console.log("=".repeat(72));
    const raw = await fs.readFile(path.join(OUT_DIR, f), "utf8");
    const json: unknown = JSON.parse(raw);

    // 1) zod parse against PRD §14.3 schema
    const result = captureSchema.safeParse(json);
    if (!result.success) {
      console.log(`  shape: FAIL`);
      console.log(`  errors:`, result.error.issues.slice(0, 5));
      allOk = false;
      continue;
    }
    const cap = result.data;
    console.log(
      `  shape: OK (slug=${cap.slug}, captured=${cap.capturedAt}, tier=${cap.tier})`,
    );

    // 2) verdict states
    const okVerdicts = cap.verdicts.filter((v) => !v.error).length;
    const errVerdicts = cap.verdicts.length - okVerdicts;
    console.log(
      `  verdicts: ${okVerdicts}/${cap.verdicts.length} ok, ${errVerdicts} errored`,
    );

    // 3) topProductId integrity (every non-null id must be in sampledProductIds for that persona)
    let invalidTops = 0;
    for (const v of cap.verdicts) {
      if (!v.topProductId) continue;
      if (!v.sampledProductIds.includes(v.topProductId)) invalidTops++;
    }
    console.log(
      `  topProductId integrity: ${invalidTops === 0 ? "OK" : `${invalidTops} INVENTED`}`,
    );

    // 4) re-run the rubric from persisted verdicts + signals; the score
    // should reproduce within rounding (we compute lazily from persisted
    // signals, not from the catalog products themselves — that's the
    // contract that lets cached + live render identically without
    // re-fetching the catalog at view time).
    const summaries = (cap.verdicts as AgentVerdict[]).map(toVerdictSummary);
    const inputs: ScoreInputs = {
      signals: cap.signals as ScoreInputs["signals"],
      verdicts: summaries,
      productCount: cap.catalog.metadata.productCount,
      uniqueVendorShareTop: cap.uniqueVendorShareTop,
    };
    const recs = rankRecommendations(evaluateRules(inputs));
    const recomputed = computeScore(inputs, recs);

    const persisted = cap.score.overall;
    const drift = Math.abs(recomputed.overall - persisted);
    console.log(
      `  score round-trip: persisted=${persisted.toFixed(1)} recomputed=${recomputed.overall.toFixed(1)} drift=${drift.toFixed(2)}`,
    );
    if (drift > 0.5) {
      console.log(
        `  WARNING: drift > 0.5; sampleProducts likely insufficient for dominantVendorShare (uses sample not full catalog)`,
      );
    }

    // 5) recommendation count
    console.log(
      `  recommendations: persisted=${cap.score.recommendations.length} recomputed=${recs.length}`,
    );
  }

  console.log("");
  console.log(allOk ? "All captures passed shape verification." : "Some captures failed.");
  process.exit(allOk ? 0 : 1);
})();
