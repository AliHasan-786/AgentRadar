// Dry-run the sampler against Allbirds with the new expansionKeywords. No
// LLM calls — just computes the per-persona 30-product samples and prints
// the Jaccard overlap matrix and per-persona sample previews.

import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { fetchCatalog } from "../lib/shopify";
import { PERSONAS } from "../lib/agents/personas";
import { sampleForPersona } from "../lib/agents/prompts";

const TARGET = "allbirds.com";

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = new Set<string>();
  for (const x of a) if (b.has(x)) inter.add(x);
  const union = new Set<string>([...a, ...b]);
  if (union.size === 0) return 0;
  return inter.size / union.size;
}

function rpad(s: string | number, w: number): string {
  const t = String(s);
  if (t.length >= w) return t.slice(0, w);
  return t + " ".repeat(w - t.length);
}

(async () => {
  const fetched = await fetchCatalog(TARGET);
  const { deduped: catalog } = dedupeProducts(normalizeCatalog(fetched.products));
  console.log(`Catalog: ${catalog.length} canonical products from ${TARGET}\n`);

  const samples = PERSONAS.map((persona) => ({
    persona,
    sampled: sampleForPersona(
      catalog,
      persona.intent,
      30,
      persona.expansionKeywords,
    ),
  }));

  // Overlap matrix
  console.log("=".repeat(110));
  console.log("SAMPLING OVERLAP (Jaccard) — with expansionKeywords applied");
  console.log("=".repeat(110));
  const labels = samples.map((s) => s.persona.id.slice(0, 18));
  const sets = samples.map((s) => new Set(s.sampled.map((p) => p.id)));
  console.log(rpad("", 20) + labels.map((l) => rpad(l, 20)).join(""));
  for (let i = 0; i < samples.length; i++) {
    let row = rpad(labels[i], 20);
    for (let j = 0; j < samples.length; j++) {
      if (i === j) {
        row += rpad("—", 20);
      } else {
        row += rpad((jaccard(sets[i], sets[j]) * 100).toFixed(0) + "%", 20);
      }
    }
    console.log(row);
  }
  console.log("");

  // Per-persona top-5 sample preview
  console.log("=".repeat(110));
  console.log("TOP 5 SAMPLED PRODUCTS PER PERSONA");
  console.log("=".repeat(110));
  for (const { persona, sampled } of samples) {
    console.log(`\n${persona.id} — ${persona.buildDisplayName}`);
    console.log(`  intent:    "${persona.intent}"`);
    console.log(`  expansion: [${persona.expansionKeywords.join(", ")}]`);
    console.log(`  top 5 products:`);
    for (const p of sampled.slice(0, 5)) {
      console.log(`    ${p.id.padEnd(15)} ${p.title.slice(0, 70)}`);
    }
  }
})();
