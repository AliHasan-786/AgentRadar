import { config } from "dotenv";
config({ path: ".env.local" });

import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { computeCatalogSignals } from "../lib/catalog-signals";
import { fetchCatalog } from "../lib/shopify";
import { runPersona } from "../lib/agents/runner";
import { getPersona } from "../lib/agents/personas";

const TARGET = "allbirds.com";
const PERSONA_ID = "arch-support-shopper" as const;

(async () => {
  console.log("AgentRadar — Sprint 2 single-persona end-to-end test");
  console.log(`Persona: ${PERSONA_ID}`);
  console.log(`Target store: ${TARGET}`);
  console.log("");

  const persona = getPersona(PERSONA_ID);
  console.log(`Intent:        "${persona.intent}"`);
  console.log(`Build model:   ${persona.buildModel} (${persona.buildDisplayName})`);
  console.log(`Tests:         ${persona.testsDimension}`);
  console.log("");

  console.log(`Fetching catalog from ${TARGET}…`);
  const fetched = await fetchCatalog(TARGET);
  const normalizedRaw = normalizeCatalog(fetched.products);
  const { deduped: catalog, duplicatesFolded } = dedupeProducts(normalizedRaw);
  const signals = computeCatalogSignals(catalog);
  console.log(
    `Catalog: ${fetched.products.length} raw → ${catalog.length} canonical (folded ${duplicatesFolded})`,
  );
  console.log(`Review signal rate: ${(signals.reviewSignalRate * 100).toFixed(1)}%`);
  console.log("");

  console.log(`Running persona "${persona.id}" (build tier)…`);
  const result = await runPersona(persona, catalog, {
    tier: "build",
    catalogHasReviewSignal: signals.reviewSignalRate > 0,
  });

  console.log("");
  console.log("================ PROMPT (system) ================");
  console.log(result.prompt.system);
  console.log("");
  console.log("================ PROMPT (user) ==================");
  console.log(result.prompt.user.slice(0, 1800));
  if (result.prompt.user.length > 1800) {
    console.log(`… [truncated, total ${result.prompt.user.length} chars]`);
  }
  console.log("");
  console.log("================ RAW MODEL RESPONSE ==============");
  console.log(result.rawResponse);
  console.log("");
  console.log("================ PARSED VERDICT ==================");
  if (result.parsed) {
    console.log(`verdict:        ${result.parsed.verdict}`);
    console.log(`topProductId:   ${result.parsed.topProductId ?? "(null)"}`);
    if (result.parsed.topProductId) {
      const matched = catalog.find((p) => p.id === result.parsed!.topProductId);
      if (matched) {
        console.log(`  ↳ matched:    "${matched.title}" (${matched.productType})`);
        console.log(`  ↳ price:      ${matched.priceMin}-${matched.priceMax}`);
        console.log(
          `  ↳ description: ${matched.description.slice(0, 200)}${matched.description.length > 200 ? "…" : ""}`,
        );
      }
    }
    console.log(`reasoning:      ${result.parsed.reasoning}`);
    console.log(`gaps:`);
    for (const g of result.parsed.gaps) console.log(`  - ${g}`);
  } else {
    console.log("(no parsed verdict)");
  }
  console.log("");
  console.log("================ RUN METADATA ====================");
  console.log(`Model slug:     ${result.modelSlug}`);
  console.log(`Display name:   ${result.displayName}`);
  console.log(`Latency:        ${result.latencyMs} ms`);
  console.log(`Retried:        ${result.retried}`);
  console.log(`Flags:          ${result.flags.length === 0 ? "(none)" : result.flags.join(", ")}`);
  console.log(`Sampled IDs:    ${result.sampledProductIds.length} products sent to model`);
  if (result.usage) {
    console.log(
      `Token usage:    prompt=${result.usage.promptTokens} completion=${result.usage.completionTokens} total=${result.usage.totalTokens}`,
    );
  }
  if (result.error) console.log(`Error:          ${result.error}`);
})();
