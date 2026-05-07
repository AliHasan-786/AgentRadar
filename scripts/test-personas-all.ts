import { config } from "dotenv";
config({ path: ".env.local" });

import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { computeCatalogSignals } from "../lib/catalog-signals";
import { fetchCatalog } from "../lib/shopify";
import { runPersona } from "../lib/agents/runner";
import { PERSONAS } from "../lib/agents/personas";
import type { CanonicalProduct } from "../lib/types";
import type { PersonaRunResult } from "../lib/agents/runner";

const TARGET = "allbirds.com";

function pad(s: string | number, w: number): string {
  const t = String(s);
  if (t.length >= w) return t.slice(0, w);
  return t + " ".repeat(w - t.length);
}

function rpad(s: string | number, w: number): string {
  return pad(s, w);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = new Set<string>();
  for (const x of a) if (b.has(x)) inter.add(x);
  const union = new Set<string>([...a, ...b]);
  if (union.size === 0) return 0;
  return inter.size / union.size;
}

function findProductTitle(
  catalog: CanonicalProduct[],
  id: string | null,
): string {
  if (!id) return "(none)";
  const p = catalog.find((x) => x.id === id);
  return p ? p.title : `(unknown id ${id})`;
}

function summarizeFlags(flags: string[]): string {
  if (flags.length === 0) return "—";
  return flags.join(", ");
}

(async () => {
  const tier =
    (process.env.AGENTRADAR_TIER as "build" | "live") ?? "live";
  console.log("AgentRadar — Sprint 2 full 5-persona run");
  console.log(`Target store: ${TARGET}`);
  console.log(
    `Tier: ${tier} (set AGENTRADAR_TIER=build for premium captures; requires paid OpenRouter credits)`,
  );
  console.log("");

  console.log(`Fetching catalog…`);
  const fetched = await fetchCatalog(TARGET);
  const normalizedRaw = normalizeCatalog(fetched.products);
  const { deduped: catalog } = dedupeProducts(normalizedRaw);
  const signals = computeCatalogSignals(catalog);
  const catalogHasReviewSignal = signals.reviewSignalRate > 0;
  console.log(
    `Catalog: ${fetched.products.length} raw → ${catalog.length} canonical`,
  );
  console.log(
    `Catalog review signal: ${(signals.reviewSignalRate * 100).toFixed(1)}% (catalogHasReviewSignal=${catalogHasReviewSignal})`,
  );
  console.log("");

  console.log(`Launching 5 personas in parallel…`);
  const t0 = Date.now();
  const settled = await Promise.allSettled(
    PERSONAS.map((p) =>
      runPersona(p, catalog, {
        tier,
        catalogHasReviewSignal,
      }),
    ),
  );
  const wallMs = Date.now() - t0;

  const results: PersonaRunResult[] = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    return {
      personaId: PERSONAS[i].id,
      modelSlug:
        tier === "build" ? PERSONAS[i].buildModel : PERSONAS[i].liveModel,
      displayName:
        tier === "build"
          ? PERSONAS[i].buildDisplayName
          : PERSONAS[i].liveDisplayName,
      intent: PERSONAS[i].intent,
      prompt: { system: "", user: "" },
      rawResponse: "",
      parsed: null,
      flags: [],
      retried: false,
      latencyMs: 0,
      usage: null,
      error:
        s.reason instanceof Error ? s.reason.message : String(s.reason),
      sampledProductIds: [],
    };
  });

  console.log(`All personas done in ${wallMs}ms wall clock.`);
  console.log("");

  // === Side-by-side verdict table ===
  console.log("=".repeat(110));
  console.log("VERDICT TABLE");
  console.log("=".repeat(110));
  console.log(
    rpad("Persona", 24) +
      rpad("Model", 22) +
      rpad("Verdict", 14) +
      rpad("Top product", 36) +
      rpad("Latency", 10) +
      rpad("Retried", 8) +
      "Flags",
  );
  console.log("-".repeat(110));
  for (const r of results) {
    const verdict = r.parsed?.verdict ?? (r.error ? "error" : "(none)");
    const top = findProductTitle(catalog, r.parsed?.topProductId ?? null).slice(
      0,
      34,
    );
    console.log(
      rpad(r.personaId, 24) +
        rpad(r.displayName, 22) +
        rpad(verdict, 14) +
        rpad(top, 36) +
        rpad(`${r.latencyMs}ms`, 10) +
        rpad(r.retried ? "yes" : "no", 8) +
        summarizeFlags(r.flags),
    );
  }
  console.log("");

  // === Sampling overlap matrix ===
  console.log("=".repeat(110));
  console.log("SAMPLING OVERLAP (Jaccard between sampled-product-ID sets)");
  console.log("=".repeat(110));
  const idSets = results.map((r) => new Set(r.sampledProductIds));
  const labels = results.map((r) => r.personaId.slice(0, 18));
  console.log(rpad("", 20) + labels.map((l) => rpad(l, 20)).join(""));
  for (let i = 0; i < results.length; i++) {
    let row = rpad(labels[i], 20);
    for (let j = 0; j < results.length; j++) {
      if (i === j) {
        row += rpad("—", 20);
      } else {
        const j_score = jaccard(idSets[i], idSets[j]);
        row += rpad((j_score * 100).toFixed(0) + "%", 20);
      }
    }
    console.log(row);
  }
  console.log("");
  console.log(
    "(0% = entirely different products sampled; 100% = identical sets.",
  );
  console.log(
    " trail-running and arch-support are explicitly the pair to watch — both",
  );
  console.log(
    " query trail/running shoes. High overlap means we lose dimension of signal.)",
  );
  console.log("");

  // === Per-persona detail ===
  for (const r of results) {
    console.log("=".repeat(110));
    console.log(
      `PERSONA: ${r.personaId}  (${r.displayName} — ${r.modelSlug})`,
    );
    console.log("=".repeat(110));
    console.log(`Intent:     "${r.intent}"`);
    console.log(`Latency:    ${r.latencyMs}ms`);
    console.log(`Retried:    ${r.retried ? "YES (initial response was malformed)" : "no"}`);
    console.log(`Flags:      ${summarizeFlags(r.flags)}`);
    if (r.usage) {
      console.log(
        `Tokens:     prompt=${r.usage.promptTokens} completion=${r.usage.completionTokens}`,
      );
    }
    if (r.error) {
      console.log(`Error:      ${r.error}`);
    }
    console.log("");
    console.log(`--- Sampled product IDs (${r.sampledProductIds.length}) ---`);
    console.log(r.sampledProductIds.slice(0, 30).join(", "));
    console.log("");
    console.log(`--- Raw model response ---`);
    console.log(r.rawResponse || "(empty)");
    console.log("");
    if (r.parsed) {
      console.log(`--- Parsed verdict ---`);
      console.log(`verdict:        ${r.parsed.verdict}`);
      console.log(
        `topProductId:   ${r.parsed.topProductId ?? "(null)"}  → ${findProductTitle(catalog, r.parsed.topProductId)}`,
      );
      console.log(`reasoning:      ${r.parsed.reasoning}`);
      console.log(`gaps:`);
      for (const g of r.parsed.gaps) console.log(`  - ${g}`);
    }
    console.log("");
  }

  // === Summary ===
  console.log("=".repeat(110));
  console.log("RUN SUMMARY");
  console.log("=".repeat(110));
  const verdictCounts = new Map<string, number>();
  for (const r of results) {
    const v = r.parsed?.verdict ?? (r.error ? "error" : "missing");
    verdictCounts.set(v, (verdictCounts.get(v) ?? 0) + 1);
  }
  for (const [v, c] of verdictCounts) console.log(`  ${v}: ${c}`);
  console.log("");
  const retried = results.filter((r) => r.retried).length;
  console.log(`Retries:           ${retried}/${results.length}`);
  const errored = results.filter((r) => r.error).length;
  console.log(`Errored:           ${errored}/${results.length}`);
  const flagged = results.filter((r) => r.flags.length > 0).length;
  console.log(`Flagged (any):     ${flagged}/${results.length}`);
  const reviewFlag = results.filter((r) =>
    r.flags.includes("mentions-reviews-not-in-catalog"),
  ).length;
  console.log(`Mentions-reviews:  ${reviewFlag}/${results.length}`);
  const inventedId = results.filter((r) =>
    r.flags.includes("invented-product-id"),
  ).length;
  console.log(`Invented-prod-id:  ${inventedId}/${results.length}`);
  const totalTokens = results.reduce(
    (sum, r) => sum + (r.usage?.totalTokens ?? 0),
    0,
  );
  console.log(`Total tokens:      ${totalTokens}`);
  console.log(`Wall clock:        ${wallMs}ms`);
})();
