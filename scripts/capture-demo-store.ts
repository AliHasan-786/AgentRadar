// Capture one or more demo stores: fetch catalog, run all 5 personas in
// parallel on live tier, compute score + recommendations, persist as
// data/demo-stores/{slug}.json per PRD §14.3.
//
// Resilience: each store is captured independently. If one fails entirely,
// the others still write. If individual personas fail, the JSON still
// writes with their `error` populated — the cached page can render the
// error pill honestly. Free-tier credit pool can degrade mid-run; better
// to have a partial capture than nothing.
//
// Tier: live (free-tier-safe slugs). Build tier requires paid OpenRouter
// credits. Methodology page already discloses the tier in the persisted
// JSON.
//
// Usage:
//   npx tsx scripts/capture-demo-store.ts          # captures all 3
//   npx tsx scripts/capture-demo-store.ts allbirds # captures one by slug

import { config } from "dotenv";
config({ path: ".env.local" });

import { promises as fs } from "node:fs";
import path from "node:path";
import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import {
  buildCatalogMetadata,
  computeCatalogSignals,
} from "../lib/catalog-signals";
import { fetchCatalog } from "../lib/shopify";
import { sampleProducts } from "../lib/sample-products";
import { PERSONAS } from "../lib/agents/personas";
import { runPersona } from "../lib/agents/runner";
import {
  toAgentVerdict,
  toVerdictSummary,
} from "../lib/agents/to-agent-verdict";
import { computeScore } from "../lib/score/compute";
import { rankRecommendations } from "../lib/recommendations/rank";
import { evaluateRules } from "../lib/recommendations/rules";
import type { ScoreInputs, VerdictSummary } from "../lib/score/types";
import type {
  AgentVerdict,
  CanonicalProduct,
  DemoStoreCapture,
} from "../lib/types";

interface DemoTarget {
  slug: string;
  hostname: string;
  displayName: string;
  vertical: string;
}

const DEMO_TARGETS: DemoTarget[] = [
  {
    slug: "allbirds",
    hostname: "allbirds.com",
    displayName: "Allbirds",
    vertical: "Sustainable footwear",
  },
  {
    slug: "outdoor-voices",
    hostname: "outdoorvoices.com",
    displayName: "Outdoor Voices",
    vertical: "Athleisure / lifestyle",
  },
  {
    slug: "material-kitchen",
    hostname: "materialkitchen.com",
    displayName: "Material Kitchen",
    vertical: "Home / kitchen",
  },
];

const OUT_DIR = path.join(__dirname, "..", "data", "demo-stores");

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

async function captureOne(target: DemoTarget): Promise<DemoStoreCapture | null> {
  console.log("\n" + "=".repeat(80));
  console.log(`Capturing ${target.displayName} (${target.hostname})`);
  console.log("=".repeat(80));

  let fetched;
  try {
    fetched = await fetchCatalog(target.hostname);
  } catch (err) {
    const e = err as Error & { code?: string };
    console.log(`  catalog FAIL: ${e.code ?? "?"} — ${e.message}`);
    return null;
  }

  const { deduped: catalog, duplicatesFolded } = dedupeProducts(
    normalizeCatalog(fetched.products),
  );
  const signals = computeCatalogSignals(catalog);
  const metadata = buildCatalogMetadata(
    fetched.hostname,
    catalog,
    fetched.fetchedAt,
  );
  console.log(
    `  catalog OK: ${fetched.products.length} raw → ${catalog.length} canonical (${duplicatesFolded} folded)`,
  );

  // Serialize persona calls at capture time with a 7-second spacing.
  // Gemini AI Studio's free tier is 10 RPM and even sequential rapid-fire
  // calls trip 429/503 because the prior call's tokens count toward the
  // per-minute window. 7s spacing keeps us at ~8.5 RPM with margin.
  // Latency doesn't matter at capture time — cached JSON loads instantly.
  // Live SSE flow stays parallel; a single visitor's 5 calls won't trip
  // the limit (errors are still surfaced honestly when they do).
  const RPM_DELAY_MS = 5000;
  console.log(`  running 5 personas (live tier, sequential w/ ${RPM_DELAY_MS}ms spacing)…`);
  const t0 = Date.now();
  const results: Array<{ persona: (typeof PERSONAS)[number]; result: Awaited<ReturnType<typeof runPersona>> }> = [];
  for (let i = 0; i < PERSONAS.length; i++) {
    const p = PERSONAS[i];
    if (i > 0) {
      await new Promise((r) => setTimeout(r, RPM_DELAY_MS));
    }
    const r = await runPersona(p, catalog, {
      tier: "live",
      catalogHasReviewSignal: signals.reviewSignalRate > 0,
    });
    const status = r.error ? `ERR ${r.error.slice(0, 50)}…` : r.parsed?.verdict ?? "?";
    console.log(`    [${i + 1}/${PERSONAS.length}] ${p.id.padEnd(24)} ${status}`);
    results.push({ persona: p, result: r });
  }
  const wallMs = Date.now() - t0;

  const verdicts: AgentVerdict[] = results.map(({ persona, result }) =>
    toAgentVerdict(result, persona.intent),
  );
  const summaries: VerdictSummary[] = verdicts.map(toVerdictSummary);

  const okCount = verdicts.filter((v) => !v.error).length;
  const errCount = verdicts.length - okCount;
  console.log(
    `  personas done: ${okCount}/${verdicts.length} ok, ${errCount} errored, ${wallMs}ms wall clock`,
  );

  for (const v of verdicts) {
    const status = v.error ? `ERROR (${v.error.slice(0, 60)}…)` : v.verdict;
    console.log(
      `    ${v.personaId.padEnd(24)} ${v.displayName.padEnd(24)} ${status}`,
    );
  }

  const inputs: ScoreInputs = {
    signals,
    verdicts: summaries,
    productCount: catalog.length,
    uniqueVendorShareTop: dominantVendorShare(catalog),
  };
  const recs = rankRecommendations(evaluateRules(inputs));
  const score = computeScore(inputs, recs);
  console.log(
    `  score: ${score.overall.toFixed(1)} (D ${score.dimensions.discoverability.score.toFixed(1)} · Desc ${score.dimensions.description.score.toFixed(1)} · S ${score.dimensions.schema.score.toFixed(1)} · T ${score.dimensions.trust.score.toFixed(1)})`,
  );
  console.log(`  recommendations: ${recs.length} triggered`);

  const sample = sampleProducts(catalog, 30);

  const capture: DemoStoreCapture = {
    slug: target.slug,
    hostname: fetched.hostname,
    displayName: target.displayName,
    vertical: target.vertical,
    capturedAt: new Date().toISOString(),
    tier: "live",
    catalog: {
      metadata,
      sampleProducts: sample,
    },
    verdicts,
    score,
    signals,
    uniqueVendorShareTop: inputs.uniqueVendorShareTop,
  };

  const outPath = path.join(OUT_DIR, `${target.slug}.json`);
  await fs.writeFile(outPath, JSON.stringify(capture, null, 2), "utf8");
  console.log(`  → wrote ${outPath} (${(JSON.stringify(capture).length / 1024).toFixed(1)} KB)`);

  return capture;
}

(async () => {
  const arg = process.argv[2];
  const targets = arg
    ? DEMO_TARGETS.filter((t) => t.slug === arg)
    : DEMO_TARGETS;
  if (targets.length === 0) {
    console.error(`No demo target matches "${arg}". Available: ${DEMO_TARGETS.map((t) => t.slug).join(", ")}`);
    process.exit(1);
  }
  await fs.mkdir(OUT_DIR, { recursive: true });

  const captured: string[] = [];
  const failed: string[] = [];
  for (const t of targets) {
    try {
      const c = await captureOne(t);
      if (c) captured.push(t.slug);
      else failed.push(t.slug);
    } catch (err) {
      console.error(
        `  capture for ${t.slug} threw:`,
        err instanceof Error ? err.message : err,
      );
      failed.push(t.slug);
    }
  }
  console.log("\n" + "=".repeat(80));
  console.log(`Captured: ${captured.join(", ") || "(none)"}`);
  console.log(`Failed:   ${failed.join(", ") || "(none)"}`);
})();
