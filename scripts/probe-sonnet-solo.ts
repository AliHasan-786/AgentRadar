import { config } from "dotenv";
config({ path: ".env.local" });
import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { computeCatalogSignals } from "../lib/catalog-signals";
import { fetchCatalog } from "../lib/shopify";
import { runPersona } from "../lib/agents/runner";
import { getPersona } from "../lib/agents/personas";

(async () => {
  const p = getPersona("sustainable-runner");
  const f = await fetchCatalog("allbirds.com");
  const { deduped: catalog } = dedupeProducts(normalizeCatalog(f.products));
  const signals = computeCatalogSignals(catalog);
  console.log("Running Sonnet 4 ALONE (no parallel) with full prompt size…");
  const r = await runPersona(p, catalog, {
    tier: "build",
    catalogHasReviewSignal: signals.reviewSignalRate > 0,
  });
  console.log("verdict:  ", r.parsed?.verdict ?? "NONE");
  console.log("error:    ", r.error);
  console.log("latency:  ", r.latencyMs, "ms");
  console.log(
    "top:      ",
    r.parsed?.topProductId,
    "→",
    catalog.find((x) => x.id === r.parsed?.topProductId)?.title,
  );
  console.log("reasoning:", r.parsed?.reasoning);
  if (r.parsed?.gaps) {
    console.log("gaps:");
    for (const g of r.parsed.gaps) console.log("  -", g);
  }
})();
