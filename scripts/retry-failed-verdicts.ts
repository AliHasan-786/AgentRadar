// Targeted retry: for each demo-store JSON on disk, re-run any persona
// whose verdict has a non-null `error` field. Merges the new verdict back
// in place and recomputes the score from the updated verdict set. Uses
// `uniqueVendorShareTop` already persisted, so the round-trip identity
// holds.
//
// Useful when the bulk capture run hit transient rate limits on a single
// provider and we want to fix only those failures without spending
// 5-personas-worth of API budget per store.

import { config } from "dotenv";
config({ path: ".env.local" });

import { promises as fs } from "node:fs";
import path from "node:path";
import { runPersona } from "../lib/agents/runner";
import { getPersona } from "../lib/agents/personas";
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
import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { fetchCatalog } from "../lib/shopify";
import { computeCatalogSignals } from "../lib/catalog-signals";

const OUT_DIR = path.join(__dirname, "..", "data", "demo-stores");
const SPACING_MS = 8000;

(async () => {
  const files = (await fs.readdir(OUT_DIR)).filter((f) => f.endsWith(".json"));
  const allFailures: { file: string; personaIds: string[] }[] = [];

  for (const f of files) {
    const raw = await fs.readFile(path.join(OUT_DIR, f), "utf8");
    const cap = JSON.parse(raw) as DemoStoreCapture;
    const failures = cap.verdicts.filter((v) => v.error != null);
    if (failures.length === 0) continue;
    allFailures.push({ file: f, personaIds: failures.map((v) => v.personaId) });
  }

  if (allFailures.length === 0) {
    console.log("No errored verdicts. Nothing to retry.");
    return;
  }

  console.log(`Retrying ${allFailures.reduce((s, x) => s + x.personaIds.length, 0)} failed verdicts:`);
  for (const a of allFailures) {
    console.log(`  ${a.file}: ${a.personaIds.join(", ")}`);
  }
  console.log("");

  let firstCall = true;

  for (const a of allFailures) {
    const filePath = path.join(OUT_DIR, a.file);
    const raw = await fs.readFile(filePath, "utf8");
    const cap = JSON.parse(raw) as DemoStoreCapture;

    // We need the live catalog (the persisted sample is only 30 products,
    // not the full catalog the persona sampler operates on). Refetch.
    console.log(`=== ${cap.displayName} (${cap.hostname}) ===`);
    const fetched = await fetchCatalog(cap.hostname);
    const { deduped: catalog } = dedupeProducts(normalizeCatalog(fetched.products));
    const signals = computeCatalogSignals(catalog);

    for (const personaId of a.personaIds) {
      if (!firstCall) {
        await new Promise((r) => setTimeout(r, SPACING_MS));
      }
      firstCall = false;
      const persona = getPersona(personaId as Parameters<typeof getPersona>[0]);
      console.log(`  [retry] ${personaId} via ${persona.liveDisplayName}…`);
      const result = await runPersona(persona, catalog, {
        tier: "live",
        catalogHasReviewSignal: signals.reviewSignalRate > 0,
      });
      const newVerdict = toAgentVerdict(result, persona.intent);
      if (newVerdict.error) {
        console.log(`    STILL FAILED: ${newVerdict.error.slice(0, 80)}`);
      } else {
        console.log(`    OK → ${newVerdict.verdict}`);
      }
      // Splice in by personaId
      const idx = cap.verdicts.findIndex((v) => v.personaId === personaId);
      if (idx >= 0) cap.verdicts[idx] = newVerdict;
    }

    // Recompute the score from the now-updated verdicts.
    const summaries: VerdictSummary[] = cap.verdicts.map(toVerdictSummary);
    const scoreInputs: ScoreInputs = {
      signals: cap.signals,
      verdicts: summaries,
      productCount: cap.catalog.metadata.productCount,
      uniqueVendorShareTop: cap.uniqueVendorShareTop,
    };
    const recs = rankRecommendations(evaluateRules(scoreInputs));
    cap.score = computeScore(scoreInputs, recs);
    cap.capturedAt = new Date().toISOString();
    await fs.writeFile(filePath, JSON.stringify(cap, null, 2), "utf8");
    console.log(`  → wrote ${a.file}`);
    console.log("");
  }

  // Summarize
  console.log("=".repeat(60));
  console.log("Final state:");
  for (const f of files) {
    const cap = JSON.parse(
      await fs.readFile(path.join(OUT_DIR, f), "utf8"),
    ) as DemoStoreCapture;
    const ok = cap.verdicts.filter((v) => !v.error).length;
    console.log(`  ${f.padEnd(28)} ${ok}/${cap.verdicts.length} ok`);
  }
})();
