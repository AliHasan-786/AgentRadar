// Probe candidate third demo stores. We want one that's visually distinct
// from Allbirds (footwear) and OV (athleisure) — user-suggested:
// materialkitchen.com (home goods) or golde.co (wellness). First with a
// healthy /products.json wins.

import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { computeCatalogSignals } from "../lib/catalog-signals";
import { fetchCatalog } from "../lib/shopify";
import type { CatalogFetchError } from "../lib/types";

const CANDIDATES = [
  { hostname: "materialkitchen.com", label: "Material Kitchen", vertical: "home" },
  { hostname: "golde.co", label: "Golde", vertical: "wellness" },
  { hostname: "drinkolipop.com", label: "Olipop", vertical: "wellness-fb" },
  { hostname: "magicmind.com", label: "Magic Mind", vertical: "wellness-fb" },
];

(async () => {
  for (const c of CANDIDATES) {
    console.log("");
    console.log("=".repeat(72));
    console.log(`${c.label} (${c.hostname}) — ${c.vertical}`);
    console.log("=".repeat(72));
    try {
      const fetched = await fetchCatalog(c.hostname);
      const { deduped, duplicatesFolded } = dedupeProducts(
        normalizeCatalog(fetched.products),
      );
      const signals = computeCatalogSignals(deduped);
      console.log(
        `  /products.json:        OK (${fetched.pagesFetched} pages, ${fetched.products.length} raw)`,
      );
      console.log(
        `  After dedup:           ${deduped.length} canonical (${duplicatesFolded} folded)`,
      );
      console.log(`  Avg desc words:        ${signals.averageDescriptionWords.toFixed(1)}`);
      console.log(`  Avg title words:       ${signals.averageTitleWordCount.toFixed(1)}`);
      console.log(`  Avg visible tags:      ${signals.averageVisibleTagsPerProduct.toFixed(1)}`);
      console.log(`  Avg images/product:    ${signals.averageImagesPerProduct.toFixed(1)}`);
      console.log(`  productTypeBreadth:    ${signals.productTypeBreadth.toFixed(3)}`);
      console.log(`  Sample titles:`);
      for (const p of deduped.slice(0, 5)) {
        console.log(`    "${p.title}" (${p.productType || "no type"}) — $${p.priceMin}`);
      }
    } catch (err) {
      const e = err as Error & { code?: string };
      console.log(`  FAIL: ${e.code ?? "?"} — ${e.message}`);
    }
  }
})();
