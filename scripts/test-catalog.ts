import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { buildCatalogMetadata, computeCatalogSignals } from "../lib/catalog-signals";
import { sampleProducts } from "../lib/sample-products";
import { fetchCatalog } from "../lib/shopify";
import type { CanonicalProduct } from "../lib/types";

const TARGETS = ["allbirds.com", "outdoorvoices.com"];

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNum(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function previewDescription(p: CanonicalProduct, max = 220): string {
  const text = p.description.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

async function runOne(target: string) {
  const banner = "=".repeat(72);
  console.log(`\n${banner}`);
  console.log(`STORE: ${target}`);
  console.log(banner);

  const t0 = Date.now();
  let fetched;
  try {
    fetched = await fetchCatalog(target);
  } catch (err) {
    const e = err as Error & { code?: string; status?: number };
    console.log(`FETCH FAILED: ${e.code ?? "UNKNOWN"} — ${e.message}`);
    return;
  }
  const fetchMs = Date.now() - t0;

  const normalizedRaw = normalizeCatalog(fetched.products);
  const { deduped: normalized, duplicatesFolded } = dedupeProducts(normalizedRaw);
  const signals = computeCatalogSignals(normalized);
  const metadata = buildCatalogMetadata(
    fetched.hostname,
    normalized,
    fetched.fetchedAt,
  );

  console.log(`Hostname:           ${fetched.hostname}`);
  console.log(`Pages fetched:      ${fetched.pagesFetched}`);
  console.log(`Truncated:          ${fetched.truncated}`);
  console.log(`Raw products:       ${fetched.products.length}`);
  console.log(
    `After dedup (title × type): ${normalized.length} canonical (${duplicatesFolded} duplicates folded)`,
  );
  console.log(`Fetch latency:      ${fetchMs} ms`);
  console.log("");
  console.log("--- Catalog metadata ---");
  console.log(`Inferred vertical:  ${metadata.inferredVertical}`);
  console.log(`Unique vendors:     ${metadata.uniqueVendors.length}`);
  console.log(
    `Top vendors:        ${metadata.uniqueVendors.slice(0, 5).join(", ") || "(none)"}`,
  );
  console.log(`Unique types:       ${metadata.uniqueProductTypes.length}`);
  console.log(
    `Top types:          ${metadata.uniqueProductTypes.slice(0, 5).join(", ") || "(none)"}`,
  );
  console.log(`Avg desc words:     ${fmtNum(metadata.averageDescriptionWords)}`);
  console.log(`Avg tags/product:   ${fmtNum(metadata.averageTagsPerProduct)}`);
  console.log(`Avg images/product: ${fmtNum(metadata.averageImagesPerProduct)}`);
  console.log(
    `Products w/ review signal:    ${metadata.productsWithReviews}/${metadata.productCount} (${fmtPct(signals.reviewSignalRate)})`,
  );
  console.log(
    `Products w/ use-case lang:    ${metadata.productsWithUseCaseTags}/${metadata.productCount} (${fmtPct(signals.useCaseLanguageRate)})`,
  );
  console.log("");
  console.log("--- Signal extraction (Sprint 1 → Sprint 4 inputs) ---");
  console.log(`reviewSignalRate:       ${fmtPct(signals.reviewSignalRate)}`);
  console.log(`useCaseLanguageRate:    ${fmtPct(signals.useCaseLanguageRate)}`);
  console.log(`attributeDetailRate:    ${fmtPct(signals.attributeDetailRate)}`);
  console.log(`policyKeywordRate:      ${fmtPct(signals.policyKeywordRate)}`);
  console.log(`variantStructureRate:   ${fmtPct(signals.variantStructureRate)}`);
  console.log(`duplicateHandleCount:   ${signals.duplicateHandleCount}`);
  console.log(`productTypeBreadth:     ${fmtNum(signals.productTypeBreadth, 3)}`);
  console.log(`avg title word count:   ${fmtNum(signals.averageTitleWordCount)}`);
  console.log(`imageAltCoverage:       — (not exposed by /products.json)`);
  console.log("");

  const sample = sampleProducts(normalized, 30);
  console.log(`--- Sample products (showing first 3 of ${sample.length}) ---`);
  for (const p of sample.slice(0, 3)) {
    console.log("");
    console.log(`  id:       ${p.id}`);
    console.log(`  title:    ${p.title}`);
    console.log(`  vendor:   ${p.vendor || "(none)"}`);
    console.log(`  type:     ${p.productType || "(none)"}`);
    console.log(`  tags:     ${p.tags.slice(0, 8).join(", ") || "(none)"}`);
    console.log(`  price:    ${p.priceMin}–${p.priceMax}`);
    console.log(`  variants: ${p.variants.length}`);
    console.log(`  images:   ${p.images.length}`);
    console.log(`  desc:     ${previewDescription(p)}`);
  }

  console.log("");
  console.log("--- Sanity checks ---");
  const checks: { label: string; pass: boolean; detail: string }[] = [
    {
      label: "≥1 product fetched",
      pass: normalized.length > 0,
      detail: `${normalized.length} products`,
    },
    {
      label: "every product has an id",
      pass: normalized.every((p) => p.id && p.id.length > 0),
      detail: "ids non-empty",
    },
    {
      label: "every product has a title",
      pass: normalized.every((p) => p.title && p.title.length > 0),
      detail: "titles non-empty",
    },
    {
      label: "≥80% of products have a description",
      pass:
        normalized.filter((p) => p.description.length > 0).length /
          normalized.length >=
        0.8,
      detail: `${normalized.filter((p) => p.description.length > 0).length}/${normalized.length} have description`,
    },
    {
      label: "≥1 image per product on average",
      pass: signals.averageImagesPerProduct >= 1,
      detail: `${fmtNum(signals.averageImagesPerProduct)} avg`,
    },
    {
      label: "vertical inference produced a non-default value",
      pass: metadata.inferredVertical !== "general",
      detail: `inferred = ${metadata.inferredVertical}`,
    },
  ];
  for (const c of checks) {
    console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.label} — ${c.detail}`);
  }
}

(async () => {
  console.log(`AgentRadar — Sprint 1 catalog ingestion test`);
  console.log(`Targets: ${TARGETS.join(", ")}`);
  for (const t of TARGETS) {
    try {
      await runOne(t);
    } catch (err) {
      console.log(`Unexpected error testing ${t}:`, err);
    }
  }
  console.log("\nDone.\n");
})();
