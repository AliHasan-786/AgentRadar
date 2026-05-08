import Link from "next/link";
import { PERSONAS } from "@/lib/agents/personas";
import { DEMO_STORES } from "@/lib/demo-stores";
import {
  DESCRIPTION,
  DIMENSION_WEIGHTS,
  DISCOVERABILITY,
  RECOMMENDATION_LIFTS,
  SCHEMA,
  TRUST,
} from "@/lib/score/rubric";

export const metadata = {
  title: "Methodology · AgentRadar",
  description:
    "Every claim AgentRadar makes about agent behavior is auditable here — rubric config, persona panel, hallucination guardrails, known limitations.",
};

const TOC: { id: string; label: string }[] = [
  { id: "claim", label: "What we claim" },
  { id: "no-claim", label: "What we don't claim" },
  { id: "panel", label: "Persona panel" },
  { id: "intents", label: "Intent prompts" },
  { id: "ingestion", label: "Catalog ingestion" },
  { id: "weights", label: "Dimension weights" },
  { id: "thresholds", label: "Per-dimension thresholds" },
  { id: "rules", label: "Recommendation rules" },
  { id: "guardrails", label: "Hallucination guardrails" },
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
          source code or a literal LLM response captured verbatim. If anything
          here is unclear, the project hasn&apos;t met its bar.
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
            <div className="mt-6 pt-4 border-t border-neutral-200 text-[11px] text-neutral-500 leading-relaxed">
              The methodology contract is the code; the code is the methodology
              contract.
            </div>
          </nav>

          <div>
            <div className="hidden">
              {/* Anchor offset spacer for jump-link clearance */}
            </div>

        {/* What we claim */}
        <Section id="claim" title="What we claim">
          <ol className="space-y-2 text-neutral-800 list-decimal list-inside text-sm leading-relaxed">
            <li>
              The catalog data we analyze is your real catalog, fetched from
              your public <code className="font-mono">/products.json</code>{" "}
              endpoint at the moment of analysis. We do not scrape your
              storefront HTML; we do not access any authenticated endpoint.
            </li>
            <li>
              The five personas are real, named, versioned LLMs running with
              literal prompts you can read in the transcript modal of any
              agent row.
            </li>
            <li>
              Model responses are literal. Not summarized, not paraphrased.
            </li>
            <li>
              The score rubric is deterministic and the weights are visible in
              this page (rendered directly from{" "}
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

        {/* What we don't claim */}
        <Section id="no-claim" title="What we don't claim">
          <ol className="space-y-2 text-neutral-800 list-decimal list-inside text-sm leading-relaxed">
            <li>
              We do not predict what ChatGPT Shopping, Perplexity Merchant
              Program, or Shopify Catalog will do with your store. We are not
              those systems. We run leading LLMs against your catalog data —
              that is the frame.
            </li>
            <li>
              We do not estimate revenue impact of any recommendation. That
              would require longitudinal merchant data we don&apos;t have.
            </li>
            <li>
              We do not claim the score is empirically validated against
              real-world outcomes. It&apos;s a heuristic; the rubric is
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
            plus a 30-product sample from the catalog. The sampler scores each
            product&apos;s relevance using the intent tokens plus a hand-curated
            expansion-keyword list per persona — visible below.
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
              We fetch{" "}
              <code className="font-mono">
                {"{hostname}"}/products.json?limit=250&page=N
              </code>{" "}
              and paginate up to 1000 products (page 4 cap).
            </li>
            <li>
              We dedupe by{" "}
              <code className="font-mono">(title × productType)</code>, not by
              handle. Some merchants model color as separate products (e.g.,
              Outdoor Voices ships 12 CloudKnit Shortsleeve products with
              different colorways and different handles); an AI shopper would
              collapse them to one canonical product. Color/size differences
              survive in the variants array.
            </li>
            <li>
              We strip vendor-namespaced internal taxonomy tags
              (containing <code className="font-mono">::</code>, e.g.{" "}
              <code className="font-mono">allbirds::carbon-score</code>) at
              both the prompt-formatting surface and the tag-density signal
              in the rubric.
            </li>
            <li>
              <strong>Image alt text is unavailable.</strong> Shopify&apos;s
              public <code className="font-mono">/products.json</code>{" "}
              endpoint does not include the <code className="font-mono">alt</code>{" "}
              field on image objects (confirmed empirically against{" "}
              <code className="font-mono">allbirds.com</code> and{" "}
              <code className="font-mono">outdoorvoices.com</code>). We
              therefore do not score alt-text coverage and have no
              recommendation rule for it. Methodology contract: we don&apos;t
              measure what we don&apos;t have.
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

        {/* Hallucination guardrails */}
        <Section id="guardrails" title="Hallucination guardrails">
          <ul className="space-y-2 text-sm text-neutral-800 list-disc list-inside leading-relaxed">
            <li>
              <strong>Models cannot invent products.</strong> The
              verdict-parser checks that any{" "}
              <code className="font-mono">topProductId</code> exists in the
              30-product sample shown to the model. If not, the verdict is
              flagged{" "}
              <code className="font-mono">invented-product-id</code> and shown
              to you.
            </li>
            <li>
              <strong>Models cannot fabricate review claims.</strong> The
              catalog data we send doesn&apos;t include reviews. If a
              model&apos;s reasoning makes a positive claim about reviews
              (e.g., &ldquo;has 4.5 star reviews&rdquo;), the verdict is
              flagged{" "}
              <code className="font-mono">mentions-reviews-not-in-catalog</code>.
              Negated mentions (&ldquo;no customer reviews visible&rdquo;) do
              not trigger the flag — the parser uses sentence-bounded clause
              checks for negation including conjunctions like &ldquo;no
              reviews or ratings&rdquo;.
            </li>
            <li>
              <strong>Numerical scoring is rule-based.</strong> Models classify
              and report gaps; the rubric does the math. No model-generated
              number ever drives the score.
            </li>
          </ul>
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
              <strong>Outdoor Voices&apos; minimalist-traveler verdict</strong>{" "}
              is currently captured as an error pill — Gemini 3 Flash
              free-tier rate-limited that one persona at capture time.
              Recoverable with one command (
              <code className="font-mono">
                npx tsx scripts/retry-failed-verdicts.ts
              </code>
              ) once the daily token bucket resets.
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
              <span>Built for the Shopify APM Fall 2026 application.</span>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-8">
      <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-3">
        {title}
      </h2>
      {children}
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

function providerName(slug: string): string {
  if (slug.startsWith("anthropic-direct/")) return "Anthropic (direct)";
  if (slug.startsWith("openai-direct/")) return "OpenAI (direct)";
  if (slug.startsWith("groq-direct/")) return "Groq (direct)";
  if (slug.startsWith("google-direct/")) return "Google AI Studio (direct)";
  if (slug.startsWith("mistral-direct/")) return "Mistral La Plateforme (direct)";
  return "OpenRouter";
}
