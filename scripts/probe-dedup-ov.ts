import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { fetchCatalog } from "../lib/shopify";

(async () => {
  const fetched = await fetchCatalog("outdoorvoices.com");
  const normalized = normalizeCatalog(fetched.products);
  const { deduped, duplicatesFolded } = dedupeProducts(normalized);

  console.log(`outdoorvoices.com: ${normalized.length} raw → ${deduped.length} canonical`);
  console.log(`Duplicates folded: ${duplicatesFolded}`);
  console.log(`Reduction: ${((duplicatesFolded / normalized.length) * 100).toFixed(1)}%`);
  console.log("");

  const folds = new Map<string, number>();
  for (const p of normalized) {
    const key = `${p.title.trim().toLowerCase()} ${p.productType.trim().toLowerCase()}`;
    folds.set(key, (folds.get(key) ?? 0) + 1);
  }
  const top = Array.from(folds.entries())
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  console.log(`Largest product families (raw count → 1 canonical):`);
  for (const [key, c] of top) {
    const [title, ...rest] = key.split(" ");
    console.log(`  ${c.toString().padStart(2)} × ${key.padEnd(50)}`);
    void title;
    void rest;
  }
  console.log("");

  const variantCounts = deduped.map((p) => p.variants.length).sort((a, b) => b - a);
  console.log(`Variant fan-out after dedup (top 5): ${variantCounts.slice(0, 5).join(", ")}`);
  console.log(`Median variants/canonical: ${variantCounts[Math.floor(variantCounts.length / 2)]}`);
})();
