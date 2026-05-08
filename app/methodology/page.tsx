import Link from "next/link";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { PERSONAS } from "@/lib/agents/personas";
import { DEMO_STORES, getDemoStore } from "@/lib/demo-stores";
import {
  DESCRIPTION,
  DIMENSION_WEIGHTS,
  DISCOVERABILITY,
  RECOMMENDATION_LIFTS,
  SCHEMA,
  TRUST,
} from "@/lib/score/rubric";
import type { DimensionId, ScoreResult } from "@/lib/score/types";

export const metadata = {
  title: "Methodology · AgentRadar",
  description:
    "Every claim AgentRadar makes about agent behavior is auditable here — rubric config, persona panel, hallucination guardrails, known limitations.",
};

const TOC: { id: string; label: string }[] = [
  { id: "architecture", label: "Architecture" },
  { id: "claim", label: "What this claims" },
  { id: "no-claim", label: "What this does not claim" },
  { id: "panel", label: "Persona panel" },
  { id: "intents", label: "Intent prompts" },
  { id: "ingestion", label: "Catalog ingestion" },
  { id: "weights", label: "Dimension weights" },
  { id: "thresholds", label: "Per-dimension thresholds" },
  { id: "rules", label: "Recommendation rules" },
  { id: "worked-example", label: "Worked example: Allbirds 64.5" },
  { id: "compare", label: "Why the demos score differently" },
  { id: "guardrails", label: "Hallucination guardrails" },
  { id: "faq", label: "FAQ" },
  { id: "demos", label: "Demo stores" },
  { id: "limitations", label: "Limitations + changelog" },
  { id: "source", label: "Source code" },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-white font-sans text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        <Link
          href="/"
          className="text-xs text-neutral-500 hover:text-neutral-900 font-mono"
        >
          ← back
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold mt-6 tracking-tight">
          Methodology
        </h1>
        <p className="mt-3 text-base text-neutral-700 leading-relaxed max-w-2xl">
          This page exists so you can verify everything AgentRadar shows you.
          The score, the recommendations, the persona panel, the prompts and
          responses — all of it traces to either a deterministic rule in the
          source code or a literal LLM response captured verbatim.
        </p>
        <p className="mt-4 text-sm text-neutral-600 leading-relaxed max-w-2xl">
          Built by{" "}
          <a
            href="https://github.com/AliHasan-786"
            target="_blank"
            rel="noreferrer"
            className="text-teal-700 hover:text-teal-900"
          >
            Ali Hasan
          </a>
          . Where this page says &ldquo;the project&rdquo; or
          &ldquo;AgentRadar,&rdquo; that&apos;s the same author making each
          design call. Tradeoffs and limitations below are disclosed
          accordingly.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-10">
          {/* Sticky TOC */}
          <nav
            aria-label="Methodology sections"
            className="md:sticky md:top-8 md:self-start text-xs"
          >
            <div className="uppercase tracking-wider text-neutral-500 font-mono mb-3">
              On this page
            </div>
            <ol className="space-y-1.5">
              {TOC.map((t, i) => (
                <li key={t.id} className="flex items-baseline gap-2">
                  <span className="text-neutral-400 font-mono tabular-nums w-4">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={`#${t.id}`}
                    className="text-neutral-700 hover:text-teal-700"
                  >
                    {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div>
            <div className="hidden">
              {/* Anchor offset spacer for jump-link clearance */}
            </div>

        {/* Architecture diagram */}
        <Section id="architecture" title="Architecture">
          <p className="text-sm text-neutral-700 leading-relaxed mb-2">
            Five stages, one fan-out at stage 3 where the catalog signals and
            the five LLM personas run in parallel. Everything downstream of the
            fan-out is deterministic.
          </p>
          <ArchitectureDiagram />
        </Section>

        {/* What this claims */}
        <Section id="claim" title="What this claims">
          <ol className="space-y-2 text-neutral-800 list-decimal list-inside text-sm leading-relaxed">
            <li>
              The catalog data analyzed is the merchant&apos;s real catalog,
              fetched from the public{" "}
              <code className="font-mono">/products.json</code> endpoint at
              the moment of analysis. AgentRadar does not scrape storefront
              HTML; it does not access any authenticated endpoint.
            </li>
            <li>
              The five personas are real, named, versioned LLMs running with
              literal prompts visible in the transcript modal of any agent
              row.
            </li>
            <li>
              Model responses are literal. Not summarized, not paraphrased.
            </li>
            <li>
              The score rubric is deterministic and every weight is visible
              on this page (rendered directly from{" "}
              <code className="font-mono">lib/score/rubric.ts</code>).
            </li>
            <li>
              The recommendations are deterministic rule outputs from{" "}
              <code className="font-mono">lib/recommendations/rules.ts</code>,
              not model-generated. An LLM cannot recommend something the
              rubric doesn&apos;t already know how to score.
            </li>
          </ol>
        </Section>

        {/* What this does not claim */}
        <Section id="no-claim" title="What this does not claim">
          <ol className="space-y-2 text-neutral-800 list-decimal list-inside text-sm leading-relaxed">
            <li>
              AgentRadar does not predict what ChatGPT Shopping, Perplexity
              Merchant Program, or Shopify Catalog will do with the
              merchant&apos;s store. It is not those systems. It runs leading
              LLMs against catalog data — that is the frame.
            </li>
            <li>
              No estimate of revenue impact for any recommendation. That
              would require longitudinal merchant data the project
              doesn&apos;t have.
            </li>
            <li>
              The score is a heuristic, not an oracle. The rubric is
              published; reasonable people may weight things differently.
            </li>
          </ol>
        </Section>

        {/* The persona panel */}
        <Section id="panel" title="The persona panel">
          <p className="text-sm text-neutral-700 leading-relaxed mb-4">
            Five distinct intents · five distinct providers · five distinct
            models. Each persona&apos;s display name in the UI matches the slug
            that actually ran. If a row says &ldquo;Claude Haiku 4.5,&rdquo;
            the analysis ran on{" "}
            <code className="font-mono">claude-haiku-4-5-20251001</code>.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-neutral-500 font-mono uppercase tracking-wider">
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4">Persona</th>
                  <th className="text-left py-2 pr-4">Provider</th>
                  <th className="text-left py-2 pr-4">Live model</th>
                  <th className="text-left py-2">Tests</th>
                </tr>
              </thead>
              <tbody>
                {PERSONAS.map((p) => {
                  const provider = providerName(p.liveModel);
                  return (
                    <tr key={p.id} className="border-b border-neutral-100">
                      <td className="py-2 pr-4 font-mono text-neutral-900">
                        {p.id}
                      </td>
                      <td className="py-2 pr-4 text-neutral-700">{provider}</td>
                      <td className="py-2 pr-4 font-mono text-[11px] text-neutral-700">
                        {p.liveModel}
                      </td>
                      <td className="py-2 text-neutral-700">
                        {p.testsDimension}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-neutral-500 leading-relaxed">
            Build-tier captures (when paid OpenRouter credits are available)
            route through OpenRouter for the premium panel: Claude Sonnet 4 /
            GPT-4o / Llama 3.3 70B / Gemini 2.5 Flash / Mixtral 8x22B. The tier
            that actually ran is recorded in every persisted demo capture
            JSON.
          </p>
        </Section>

        {/* Persona intents + expansions */}
        <Section id="intents" title="Intent prompts and domain vocabulary">
          <p className="text-sm text-neutral-700 leading-relaxed mb-3">
            Each persona sees the same system prompt (visible in any
            transcript modal). The user prompt is the persona&apos;s intent
            plus a 30-product sample from the catalog. The sampler scores
            each product&apos;s relevance using the intent tokens plus a
            hand-curated expansion-keyword list per persona — visible below.
          </p>
          <div className="space-y-3">
            {PERSONAS.map((p) => (
              <div
                key={p.id}
                className="rounded border border-neutral-200 bg-neutral-50 p-3 text-xs"
              >
                <div className="font-mono text-neutral-900 mb-1">{p.id}</div>
                <div className="italic text-neutral-700 mb-2">
                  &ldquo;{p.intent}&rdquo;
                </div>
                <div className="text-[11px] text-neutral-500 font-mono">
                  expansion: [{p.expansionKeywords.join(", ")}]
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Catalog ingestion */}
        <Section id="ingestion" title="Catalog ingestion">
          <ul className="space-y-2 text-sm text-neutral-800 list-disc list-inside leading-relaxed">
            <li>
              AgentRadar fetches{" "}
              <code className="font-mono">
                {"{hostname}"}/products.json?limit=250&page=N
              </code>{" "}
              and paginates up to 1000 products (page 4 cap).
            </li>
            <li>
              The catalog is deduped by{" "}
              <code className="font-mono">(title × productType)</code>, not
              by handle. Some merchants model color as separate products
              (e.g., Outdoor Voices ships 12 CloudKnit Shortsleeve products
              with different colorways and different handles); an AI shopper
              would collapse them to one canonical product. Color/size
              differences survive in the variants array.
            </li>
            <li>
              Vendor-namespaced internal taxonomy tags (containing{" "}
              <code className="font-mono">::</code>, e.g.{" "}
              <code className="font-mono">allbirds::carbon-score</code>) are
              stripped at both the prompt-formatting surface and the
              tag-density signal in the rubric.
            </li>
            <li>
              <strong>Image alt text is unavailable.</strong> Shopify&apos;s
              public <code className="font-mono">/products.json</code>{" "}
              endpoint does not include the <code className="font-mono">alt</code>{" "}
              field on image objects (confirmed empirically against{" "}
              <code className="font-mono">allbirds.com</code> and{" "}
              <code className="font-mono">outdoorvoices.com</code>). The
              project therefore does not score alt-text coverage and has no
              recommendation rule for it. Methodology contract: don&apos;t
              measure what isn&apos;t available.
            </li>
            <li>
              Each persona sees up to 30 products, sampled by relevance. The
              sample is logged on the verdict and visible in the transcript
              modal.
            </li>
          </ul>
        </Section>

        {/* The rubric */}
        <Section id="weights" title="The rubric — dimension weights">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(DIMENSION_WEIGHTS).map(([dim, weight]) => (
                <tr key={dim} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 capitalize text-neutral-900">
                    {dim}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {Math.round(weight * 100)}%
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-4 font-bold">Overall</td>
                <td className="py-2 text-right font-mono font-bold tabular-nums">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-neutral-500 leading-relaxed">
            Weights are calibrated against documented GEO/AEO best practices,
            not empirically validated against merchant revenue outcomes. Every
            dimension card on the analysis page expands to show the specific
            signal contributions.
          </p>
        </Section>

        {/* Per-dimension thresholds */}
        <Section id="thresholds" title="Per-dimension thresholds">
          <ThresholdBlock label="Discoverability (30%)" config={DISCOVERABILITY} />
          <ThresholdBlock label="Description quality (30%)" config={DESCRIPTION} />
          <ThresholdBlock label="Schema (25%)" config={SCHEMA} />
          <ThresholdBlock label="Trust signals (15%)" config={TRUST} />
          <p className="mt-3 text-xs text-neutral-500 leading-relaxed">
            These tables render directly from{" "}
            <code className="font-mono">lib/score/rubric.ts</code>. Tune a
            number in the source and this page updates automatically.
          </p>
        </Section>

        {/* Recommendation rules */}
        <Section id="rules" title="Recommendation rule library">
          <p className="text-sm text-neutral-700 leading-relaxed mb-3">
            Recommendations are deterministic outputs — each rule has a
            trigger predicate based on catalog signals or persona gap reports,
            and a fixed lift estimate calibrated to the rubric. No LLM writes
            a recommendation.
          </p>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(RECOMMENDATION_LIFTS).map(([id, lift]) => (
                <tr key={id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-mono text-xs text-neutral-700">
                    {id}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-teal-700 font-semibold">
                    +{lift} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-neutral-500 leading-relaxed">
            <code className="font-mono">IMAGE_ALT_GAPS</code> is intentionally
            absent — see &ldquo;Catalog ingestion&rdquo; above for why.
          </p>
        </Section>

        {/* Worked example */}
        <Section
          id="worked-example"
          title="Worked example: how Allbirds got 64.5"
        >
          <WorkedExample />
        </Section>

        {/* Compare across demos */}
        <Section id="compare" title="Why the three demos score differently">
          <CompareDemos />
        </Section>

        {/* Hallucination guardrails */}
        <Section id="guardrails" title="Hallucination guardrails">
          <ul className="space-y-2 text-sm text-neutral-800 list-disc list-inside leading-relaxed">
            <li>
              <strong>Models cannot invent products.</strong> The
              verdict-parser checks that any{" "}
              <code className="font-mono">topProductId</code> exists in the
              30-product sample shown to the model. If not, the verdict is
              flagged{" "}
              <code className="font-mono">invented-product-id</code> and the
              flag surfaces in the transcript modal.
            </li>
            <li>
              <strong>Models cannot fabricate review claims.</strong> The
              catalog data sent to each model does not include reviews. If a
              model&apos;s reasoning makes a positive claim about reviews
              (e.g., &ldquo;has 4.5 star reviews&rdquo;), the verdict is
              flagged{" "}
              <code className="font-mono">mentions-reviews-not-in-catalog</code>.
              Negated mentions (&ldquo;no customer reviews visible&rdquo;)
              do not trigger the flag — the parser uses sentence-bounded
              clause checks for negation including conjunctions like
              &ldquo;no reviews or ratings.&rdquo;
            </li>
            <li>
              <strong>Numerical scoring is rule-based.</strong> Models
              classify and report gaps; the rubric does the math. No
              model-generated number ever drives the score.
            </li>
          </ul>
        </Section>

        {/* FAQ */}
        <Section id="faq" title="FAQ">
          <FAQ />
        </Section>

        {/* Demo stores */}
        <Section id="demos" title="Demo stores">
          <p className="text-sm text-neutral-700 leading-relaxed mb-3">
            Three demo stores are pre-cached with full catalog and full
            analysis. They load instantly with no API call. Each
            capture&apos;s timestamp is recorded below.
          </p>
          <table className="w-full text-sm">
            <tbody>
              {DEMO_STORES.map((s) => (
                <tr key={s.slug} className="border-b border-neutral-100">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/analyze/${s.slug}`}
                      className="text-teal-700 hover:text-teal-900"
                    >
                      {s.displayName}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-neutral-700">{s.vertical}</td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums text-neutral-700">
                    {s.catalog.metadata.productCount} products
                  </td>
                  <td className="py-2 text-right text-[11px] text-neutral-500 font-mono">
                    captured{" "}
                    {new Date(s.capturedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Known limitations / changelog */}
        <Section id="limitations" title="Known limitations + project changelog">
          <ul className="space-y-2 text-sm text-neutral-800 list-disc list-inside leading-relaxed">
            <li>
              <strong>Calibration is rubric-arithmetic, not revenue.</strong>{" "}
              Stub-verdict tests in development validate that the math behaves
              correctly across catalog shapes; production scores reflect real
              persona output, which differs from stubs because real personas
              sometimes skip or rank-low.
            </li>
            <li>
              <strong>Free-tier Gemini token-bucket finding (resolved).</strong>{" "}
              Early Outdoor Voices captures hit a per-prompt token-throughput
              ceiling on{" "}
              <code className="font-mono">gemini-3-flash-preview</code> —
              separate from the documented 20 RPD request count, and not
              visible in the docs. Full-prompt persona calls would 429 even
              when small probe calls cleared. Recovered after the daily
              bucket reset and{" "}
              <code className="font-mono">
                scripts/retry-failed-verdicts.ts
              </code>{" "}
              re-ran the single failed persona; OV is now 5/5. Documented
              here as a real ops constraint for any free-tier deployment.
            </li>
            <li>
              <strong>Free-tier provider gotchas (changelog).</strong> Gemini
              direct enforces both per-day request count (20 RPD on
              gemini-3-flash) and a separate per-prompt token-throughput
              ceiling not visible in the docs. OpenRouter free credits
              dynamically tighten per-model prompt-token caps as the credit
              pool drains. Anthropic and OpenAI <code className="font-mono">sk-proj</code>{" "}
              keys require explicit account billing — listing endpoints work
              without it but chat completions don&apos;t.
            </li>
            <li>
              <strong>Catalog sampling bias is real.</strong> We sample 30
              products per persona by intent-relevance + per-persona expansion
              keywords. That biases each persona toward a coherent product
              subset, which is the design — but it means broad-intent
              personas on flagship-heavy catalogs (Allbirds → Tree Dasher,
              Nike → Air Max) tend to converge on the flagship. This reflects
              real AI shopper behavior and is preserved in the verdicts; we
              do not correct for it.
            </li>
          </ul>
        </Section>

        <Section id="source" title="Source code">
          <p className="text-sm text-neutral-700 leading-relaxed">
            The repo is open at{" "}
            <a
              href="https://github.com/AliHasan-786/AgentRadar"
              target="_blank"
              rel="noreferrer"
              className="text-teal-700 hover:text-teal-900 font-mono"
            >
              github.com/AliHasan-786/AgentRadar
            </a>
            . The methodology contract is the code; the code is the
            methodology contract.
          </p>
        </Section>

            <footer className="mt-12 pt-6 border-t border-neutral-200 text-xs text-neutral-500 font-mono flex items-center justify-between">
              <Link href="/" className="hover:text-neutral-900">
                ← back to home
              </Link>
              <span>An AI-native product portfolio piece on agentic commerce.</span>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

// Visual rhythm: technical sections (rubric tables, threshold dumps,
// rule library) get a subtle neutral-50 background and inset padding;
// editorial sections (claims, FAQ, compare-and-contrast) sit on white.
// Breaks up the same-texture-everywhere read without adding decoration.
const TECHNICAL_SECTIONS = new Set([
  "weights",
  "thresholds",
  "rules",
  "guardrails",
]);

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  const technical = id ? TECHNICAL_SECTIONS.has(id) : false;
  return (
    <section id={id} className="mt-14 scroll-mt-8">
      <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-3">
        {title}
      </h2>
      <div
        className={
          technical
            ? "rounded-md border border-neutral-200 bg-neutral-50 p-5"
            : ""
        }
      >
        {children}
      </div>
    </section>
  );
}

function ThresholdBlock({
  label,
  config,
}: {
  label: string;
  config: Record<string, unknown>;
}) {
  return (
    <div className="mb-4">
      <div className="text-sm font-semibold mb-1">{label}</div>
      <pre className="font-mono text-[11px] text-neutral-700 bg-neutral-50 border border-neutral-200 rounded p-3 overflow-x-auto whitespace-pre">
        {JSON.stringify(config, null, 2)}
      </pre>
    </div>
  );
}

const DIM_HEADING: Record<DimensionId, string> = {
  discoverability: "Discoverability",
  description: "Description quality",
  schema: "Schema",
  trust: "Trust signals",
};

function fmtVal(v: number | string | boolean): string {
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(3);
  }
  return String(v);
}

function WorkedExample() {
  // Pulls real numbers from data/demo-stores/allbirds.json — re-runs of
  // the capture script will update the page automatically.
  const allbirds = getDemoStore("allbirds");
  if (!allbirds) {
    return (
      <p className="text-sm text-neutral-500">
        Allbirds capture not on disk — run{" "}
        <code className="font-mono">npx tsx scripts/capture-demo-store.ts allbirds</code>.
      </p>
    );
  }
  const score = allbirds.score as ScoreResult;
  const dims = score.dimensions;

  // Compute the weighted contribution of each dimension to the overall.
  const weighted = (
    Object.keys(DIMENSION_WEIGHTS) as DimensionId[]
  ).map((d) => ({
    id: d,
    score: dims[d].score,
    weight: DIMENSION_WEIGHTS[d],
    contribution: DIMENSION_WEIGHTS[d] * dims[d].score,
  }));

  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-700 leading-relaxed">
        Open the cached{" "}
        <Link
          href="/analyze/allbirds"
          className="text-teal-700 hover:text-teal-900"
        >
          Allbirds analysis
        </Link>{" "}
        and the score dial top-right reads{" "}
        <strong className="text-neutral-900">
          {score.overall.toFixed(1)}
        </strong>
        . Here is where every point came from, pulled live from{" "}
        <code className="font-mono">data/demo-stores/allbirds.json</code> so
        this section never drifts from the actual capture.
      </p>

      <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-mono mb-2">
          Top-level math
        </div>
        <pre className="font-mono text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed">
{`Overall = 0.30 × Discoverability
        + 0.30 × Description
        + 0.25 × Schema
        + 0.15 × Trust

        = 0.30 × ${dims.discoverability.score.toFixed(1)}
        + 0.30 × ${dims.description.score.toFixed(1)}
        + 0.25 × ${dims.schema.score.toFixed(1)}
        + 0.15 × ${dims.trust.score.toFixed(1)}

        = ${weighted.map((w) => w.contribution.toFixed(2)).join(" + ")}
        = ${score.overall.toFixed(1)}`}
        </pre>
      </div>

      <p className="text-sm text-neutral-700 leading-relaxed">
        Walking through each dimension, signal by signal — every row is one
        entry in the dimension card&apos;s expandable view on the analysis
        page:
      </p>

      <div className="space-y-4">
        {(Object.keys(DIMENSION_WEIGHTS) as DimensionId[]).map((dimId) => {
          const dim = dims[dimId];
          return (
            <div
              key={dimId}
              className="rounded border border-neutral-200 overflow-hidden"
            >
              <div className="bg-white px-4 py-2 border-b border-neutral-200 flex items-baseline justify-between">
                <div className="text-sm font-semibold text-neutral-900">
                  {DIM_HEADING[dimId]}{" "}
                  <span className="text-neutral-400 font-normal text-xs ml-1">
                    ({Math.round(DIMENSION_WEIGHTS[dimId] * 100)}% weight)
                  </span>
                </div>
                <div className="font-mono tabular-nums text-sm text-teal-900">
                  {dim.score.toFixed(1)} / 100
                </div>
              </div>
              <table className="w-full text-xs font-mono">
                <tbody>
                  {dim.signals.map((s, i) => {
                    const pct = s.weight > 0 ? s.contribution / s.weight : 0;
                    const bar = Math.round(pct * 24); // 0..24 char bar
                    return (
                      <tr
                        key={i}
                        className="border-t border-neutral-100 first:border-t-0"
                      >
                        <td className="px-4 py-1.5 text-neutral-700">
                          {s.name}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-neutral-700 whitespace-nowrap">
                          value=
                          {fmtVal(s.value as number | string | boolean)}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-neutral-900 whitespace-nowrap">
                          {s.contribution.toFixed(1)} / {s.weight}
                        </td>
                        <td className="pl-2 pr-4 py-1.5 whitespace-nowrap">
                          <span className="text-teal-700">
                            {"█".repeat(bar)}
                          </span>
                          <span className="text-neutral-200">
                            {"░".repeat(24 - bar)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-mono mb-2">
          What this tells the merchant
        </div>
        <ul className="text-sm text-neutral-800 leading-relaxed list-disc list-inside space-y-1">
          <li>
            <strong>Trust</strong> ({dims.trust.score.toFixed(1)}) is held up
            by{" "}
            <code className="font-mono">policyKeywordRate</code> ={" "}
            {(
              (dims.trust.signals[0].value as number) * 100
            ).toFixed(0)}
            % — Allbirds mentions returns/warranty/shipping in over half its
            descriptions, the most-rewarded signal in the trust dimension.
          </li>
          <li>
            <strong>Discoverability</strong> ({dims.discoverability.score.toFixed(1)})
            is dragged down by{" "}
            <code className="font-mono">productTypeBreadth</code> — only 7
            unique product types across 998 products lands well below the
            0.05 floor, so the OVER_CONSOLIDATED_TAXONOMY rule fires.
          </li>
          <li>
            <strong>Schema</strong> ({dims.schema.score.toFixed(1)}) loses 30
            possible points entirely because{" "}
            <code className="font-mono">reviewSignalRate</code> = 0% (Allbirds
            does have reviews via Yotpo on their storefront, but those don&apos;t
            appear in <code className="font-mono">/products.json</code>).
            Highest-leverage recommendation in the analysis.
          </li>
          <li>
            <strong>persona surface rate</strong> = 1.0 (all five personas
            surfaced a product) gives full 30/30 in Discoverability — the
            personas can find the right products even if the catalog has
            consolidation issues at the type level.
          </li>
        </ul>
      </div>

      <p className="text-[11px] text-neutral-500 leading-relaxed">
        The same walkthrough is available for any catalog by clicking the
        dimension cards on its analysis page. The math is in{" "}
        <code className="font-mono">lib/score/compute.ts</code>.
      </p>
    </div>
  );
}

function CompareDemos() {
  const stores = DEMO_STORES.map((s) => ({
    slug: s.slug,
    name: s.displayName,
    score: s.score as ScoreResult,
  }));
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-700 leading-relaxed">
        The three demo stores land within 3.5 points of each other on the
        overall score (Allbirds {stores[0].score.overall.toFixed(1)},
        Outdoor Voices {stores[1].score.overall.toFixed(1)}, Material
        Kitchen {stores[2].score.overall.toFixed(1)}) — but the dimension
        breakdown tells a much louder story. Every column below is a different
        merchant fingerprint.
      </p>
      <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500 font-mono">
            <tr>
              <th className="text-left py-2 px-4">Dimension</th>
              {stores.map((s) => (
                <th key={s.slug} className="text-right py-2 px-4">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(DIMENSION_WEIGHTS) as DimensionId[]).map((dimId) => {
              const vals = stores.map((s) => s.score.dimensions[dimId].score);
              const top = Math.max(...vals);
              const bot = Math.min(...vals);
              return (
                <tr key={dimId} className="border-t border-neutral-100">
                  <td className="py-2 px-4 text-neutral-800">
                    {DIM_HEADING[dimId]}{" "}
                    <span className="text-[10px] text-neutral-400">
                      {Math.round(DIMENSION_WEIGHTS[dimId] * 100)}%
                    </span>
                  </td>
                  {stores.map((s, i) => {
                    const v = vals[i];
                    const isTop = v === top && top !== bot;
                    const isBot = v === bot && top !== bot;
                    return (
                      <td
                        key={s.slug}
                        className={`py-2 px-4 text-right font-mono tabular-nums ${
                          isTop
                            ? "text-emerald-700 font-semibold"
                            : isBot
                              ? "text-amber-700 font-semibold"
                              : "text-neutral-700"
                        }`}
                      >
                        {v.toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="border-t border-neutral-200 bg-neutral-50">
              <td className="py-2 px-4 font-bold text-neutral-900">Overall</td>
              {stores.map((s) => (
                <td
                  key={s.slug}
                  className="py-2 px-4 text-right font-mono tabular-nums font-bold text-neutral-900"
                >
                  {s.score.overall.toFixed(1)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-3 text-sm text-neutral-800 leading-relaxed">
        <p>
          <strong>Allbirds wins Trust ({stores[0].score.dimensions.trust.score.toFixed(1)}) and Schema ({stores[0].score.dimensions.schema.score.toFixed(1)}).</strong>{" "}
          A tight single-vendor catalog with consistent policy language
          (returns, warranty, shipping mentioned in over half of products) and
          rich variant structure on every shoe. It loses on Discoverability
          because 998 products squeezed into 7 product types fails the
          taxonomy-breadth check — the catalog is structurally over-consolidated.
        </p>
        <p>
          <strong>Outdoor Voices wins Discoverability ({stores[1].score.dimensions.discoverability.score.toFixed(1)}).</strong>{" "}
          17 distinct product types across 123 canonical products, average 8
          customer-visible tags per product (the namespaced-tag filter not
          firing because OV doesn&apos;t use that pattern). It loses on Trust
          ({stores[1].score.dimensions.trust.score.toFixed(1)}) because
          policy-keyword rate is below 5% — OV doesn&apos;t mention returns or
          shipping in product descriptions. The dimensional spread (54.3 to
          77.3) is the largest of the three demos.
        </p>
        <p>
          <strong>Material Kitchen scores middle on every dimension</strong> —
          a 100-product home-goods catalog with clean 60-word descriptions,
          decent taxonomy breadth, and no standout strength or weakness. The
          Description dimension is its highest ({stores[2].score.dimensions.description.score.toFixed(1)})
          because their product copy is unusually long for the catalog size.
          The merchant-actionable read: Material Kitchen has no obvious
          single fix, so the recommendations focus on review schema (the
          universal +9 lever).
        </p>
        <p>
          The wins-balance-out into a 3.5-point overall spread is the rubric
          working as designed — these are three stores with different shapes
          of AI readiness, and the score is the honest weighted summary. The
          dimension cards on each analysis page do the actual differentiation
          work; the overall is a dashboard light, not the diagnosis.
        </p>
      </div>
    </div>
  );
}

const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Why are the personas all footwear-focused?",
    a: (
      <>
        Calibration tradeoff. Specific intents (&ldquo;trail running shoe under
        $150 with arch support&rdquo;) produce sharper verdicts and clearer
        gap reports than abstract ones (&ldquo;something good&rdquo;). The
        cost is vertical-mismatch when a non-footwear catalog gets pasted —
        most personas correctly skip and the page renders a banner explaining
        why. Adding a vertical-agnostic persona is on the post-MVP list; for
        the demo stores (footwear, athleisure, home goods) the existing
        panel still produces meaningful per-store differentiation.
      </>
    ),
  },
  {
    q: "Why these specific five providers?",
    a: (
      <>
        Coverage across Anthropic, OpenAI, Meta, Google, and Mistral — five
        different post-training pipelines and reasoning styles. The point
        isn&apos;t that any single one represents &ldquo;real shopper
        behavior&rdquo;; the point is that AI shoppers will be heterogeneous,
        and a catalog that only one model can interpret well is a catalog
        with a hidden coverage problem. The Llama choice routes through Groq
        for sub-second latency; the Anthropic and OpenAI calls go direct.
      </>
    ),
  },
  {
    q: "How is this different from Fudge.ai or other GEO/AEO tools?",
    a: (
      <>
        Existing tools do <em>structural</em> analysis: &ldquo;your FAQ
        schema is missing,&rdquo; &ldquo;your alt text is weak.&rdquo;
        AgentRadar does <em>behavioral</em> analysis: five real LLMs query
        the catalog with realistic intents, return literal verdicts, and
        report the gaps they ran into. Both layers are valuable; AgentRadar
        surfaces the second one.{" "}
        <Link
          href="/teardown"
          className="text-teal-700 hover:text-teal-900"
        >
          The teardown page
        </Link>{" "}
        has the longer comparison.
      </>
    ),
  },
  {
    q: "What is the score actually predicting?",
    a: (
      <>
        Nothing, in the strict statistical sense. The score is a deterministic
        rubric calibrated against documented GEO/AEO best practices, not a
        model trained on revenue outcomes. A catalog scoring 80 versus 60
        means &ldquo;the 80 catalog clears more rubric thresholds&rdquo; — it
        does not mean &ldquo;the 80 catalog will earn more from AI shoppers.&rdquo;
        Treat it as a structured checklist with weighted columns, not an
        oracle.
      </>
    ),
  },
  {
    q: "Could I tune the rubric for my own vertical?",
    a: (
      <>
        Yes, and that&apos;s the intended affordance. Every weight and
        threshold lives in{" "}
        <code className="font-mono">lib/score/rubric.ts</code> as a single
        config object — the page you&apos;re reading renders directly from it,
        so changing a number in source updates this page automatically. Adding
        a new persona is a 6-field addition to{" "}
        <code className="font-mono">lib/agents/personas.ts</code> with a
        domain-vocabulary expansion list. Both are documented in the README.
      </>
    ),
  },
];

function FAQ() {
  return (
    <div className="space-y-5">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i}>
          <h3 className="text-sm font-semibold text-neutral-900 mb-1.5">
            {String(i + 1).padStart(2, "0")} · {item.q}
          </h3>
          <div className="text-sm text-neutral-700 leading-relaxed">
            {item.a}
          </div>
        </div>
      ))}
    </div>
  );
}

function providerName(slug: string): string {
  if (slug.startsWith("anthropic-direct/")) return "Anthropic (direct)";
  if (slug.startsWith("openai-direct/")) return "OpenAI (direct)";
  if (slug.startsWith("groq-direct/")) return "Groq (direct)";
  if (slug.startsWith("google-direct/")) return "Google AI Studio (direct)";
  if (slug.startsWith("mistral-direct/")) return "Mistral La Plateforme (direct)";
  return "OpenRouter";
}
