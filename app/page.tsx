import Link from "next/link";
import { HeroDiagram } from "@/components/HeroDiagram";
import { HeroInput } from "@/components/HeroInput";
import { DEMO_STORES } from "@/lib/demo-stores";
import type { ScoreResult } from "@/lib/score/types";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-24">
          <div className="text-xs uppercase tracking-[0.2em] text-teal-700 font-mono mb-6">
            agentradar · agentic-commerce diagnostic
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px] gap-x-12 gap-y-10 items-start">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                See your store through{" "}
                <span className="text-teal-700">AI shoppers&apos; eyes.</span>
              </h1>
              <p className="mt-6 text-base md:text-lg text-neutral-700 leading-relaxed">
                Real LLMs. Real catalog data. Real transcripts. AgentRadar runs
                Claude, GPT-4o-mini, Llama 3.3, Gemini 3 Flash, and Mistral
                Small against any Shopify store&apos;s live{" "}
                <code className="font-mono text-neutral-900">/products.json</code>{" "}
                endpoint and shows you exactly how each one describes — or
                skips — the store when asked for products in its category.
              </p>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-mono text-neutral-500">
                <span>
                  <span className="text-teal-700">●</span> 5 distinct LLM
                  providers
                </span>
                <span>
                  <span className="text-teal-700">●</span> 14 catalog signals
                  · 8 deterministic rules
                </span>
                <span>
                  <span className="text-teal-700">●</span> every weight +
                  prompt + response visible
                </span>
              </div>
            </div>
            <div className="md:pt-2">
              <HeroDiagram />
            </div>
          </div>

          <HeroInput />

          <div className="mt-3 text-[11px] text-neutral-500 leading-relaxed max-w-2xl">
            The default persona panel is calibrated to footwear; pasting a
            different vertical (apparel, home, wellness) will skip most
            personas — the catalog scoring and recommendations are
            vertical-agnostic and still apply.
          </div>

          <div className="mt-4 text-xs text-neutral-500 font-mono">
            Or try a demo:{" "}
            {DEMO_STORES.map((s, i) => (
              <span key={s.slug}>
                {i > 0 && <span className="text-neutral-300"> · </span>}
                <Link
                  href={`/analyze/${s.slug}`}
                  className="text-teal-700 hover:text-teal-900"
                >
                  → {s.displayName}
                </Link>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Demo store cards */}
      <section className="bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-4">
            Pre-cached demo stores · click any to see the analysis instantly
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMO_STORES.map((store) => {
              const score = store.score as ScoreResult;
              const okVerdicts = store.verdicts.filter((v) => !v.error).length;
              // Surface the strongest + weakest dimension to hint at the
              // differentiation that the dimension-card click-through reveals.
              // Recruiter glancing at "everything's a B" overall scores still
              // sees that the catalogs differ in shape.
              const dimEntries = (
                Object.entries(score.dimensions) as [
                  keyof ScoreResult["dimensions"],
                  ScoreResult["dimensions"][keyof ScoreResult["dimensions"]],
                ][]
              ).map(([k, v]) => ({ key: k, score: v.score }));
              const sorted = [...dimEntries].sort((a, b) => b.score - a.score);
              const top = sorted[0];
              const bottom = sorted[sorted.length - 1];
              return (
                <Link
                  key={store.slug}
                  href={`/analyze/${store.slug}`}
                  className="group block rounded-md border border-neutral-200 bg-white p-5 hover:border-teal-400 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-base group-hover:text-teal-900">
                        {store.displayName}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono">
                        {store.hostname}
                      </div>
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-teal-900">
                      {Math.round(score.overall)}
                      <span className="text-neutral-400 text-xs font-medium ml-0.5">
                        /100
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-700 mb-3">
                    {store.vertical}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono mb-2">
                    <span className="px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 tabular-nums">
                      {dimLabel(top.key)} {Math.round(top.score)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 tabular-nums">
                      {dimLabel(bottom.key)} {Math.round(bottom.score)}
                    </span>
                  </div>
                  {/* Tiny dimension shape — 4 horizontal bars, one per
                      dimension, lengths proportional to score. Editorial
                      sparkline; readable in 2 seconds. */}
                  <DimensionSparkline score={score} />

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                    <span>{store.catalog.metadata.productCount} products</span>
                    <span>
                      {okVerdicts}/{store.verdicts.length} verdicts
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why this matters */}
      <section className="bg-white border-t border-neutral-200">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-6">
            Why this matters
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Fact
              stat="8× / 15×"
              label="growth in AI-driven traffic to Shopify stores · growth in orders from AI search (since Jan 2025)"
              sourceText="Shopify, Agentic Commerce on Shopify, April 2026"
              sourceUrl="https://www.shopify.com/blog/how-agentic-commerce-works"
            />
            <Fact
              stat="$3–5T"
              label="projected global orchestrated revenue from agentic commerce by 2030"
              sourceText="McKinsey, The agentic commerce opportunity, October 2025"
              sourceUrl="https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-agentic-commerce-opportunity-how-ai-agents-are-ushering-in-a-new-era-for-consumers-and-merchants"
            />
            <Fact
              stat="static → behavioral"
              label="existing tools audit schema and structure; AgentRadar shows what AI agents actually say"
              sourceText="see the methodology page for the comparison"
              sourceUrl="/methodology"
            />
          </div>
        </div>
      </section>

      {/* What this does NOT claim */}
      <section className="bg-neutral-50 border-t border-neutral-200">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-3">
            What this does NOT claim
          </div>
          <ul className="text-sm text-neutral-700 space-y-2 list-disc list-inside">
            <li>
              AgentRadar does not predict what ChatGPT Shopping, Perplexity
              Merchant, or Shopify Catalog will do with your store. It is
              not those systems.
            </li>
            <li>
              No revenue-impact estimate. Methodology integrity over vibes.
            </li>
            <li>
              The score is a heuristic. Click any dimension card to see the
              math; click any persona row to read the literal prompt and
              response.
            </li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200">
        <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-neutral-500 font-mono">
          <div>
            built by{" "}
            <a
              href="https://github.com/AliHasan-786"
              className="text-teal-700 hover:text-teal-900"
              target="_blank"
              rel="noreferrer"
            >
              Ali Hasan
            </a>{" "}
            · an AI-native product portfolio piece on agentic commerce
          </div>
          <div className="flex gap-4">
            <Link href="/methodology" className="hover:text-neutral-900">
              methodology
            </Link>
            <Link href="/teardown" className="hover:text-neutral-900">
              teardown
            </Link>
            <a
              href="https://github.com/AliHasan-786/AgentRadar"
              className="hover:text-neutral-900"
              target="_blank"
              rel="noreferrer"
            >
              github
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function dimLabel(k: keyof ScoreResult["dimensions"]): string {
  return {
    discoverability: "Disc",
    description: "Desc",
    schema: "Schema",
    trust: "Trust",
  }[k];
}

function DimensionSparkline({ score }: { score: ScoreResult }) {
  const dims: (keyof ScoreResult["dimensions"])[] = [
    "discoverability",
    "description",
    "schema",
    "trust",
  ];
  return (
    <div className="space-y-1 mb-3 mt-2">
      {dims.map((d) => {
        const v = score.dimensions[d].score;
        const pct = Math.max(0, Math.min(100, v));
        return (
          <div key={d} className="flex items-center gap-2">
            <div className="w-12 text-[9px] font-mono text-neutral-500 tabular-nums">
              {dimLabel(d)}
            </div>
            <div className="flex-1 h-1 bg-neutral-100 rounded-sm overflow-hidden">
              <div
                className="h-full bg-teal-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-6 text-[9px] font-mono text-neutral-700 tabular-nums text-right">
              {Math.round(v)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Fact({
  stat,
  label,
  sourceText,
  sourceUrl,
}: {
  stat: string;
  label: string;
  sourceText: string;
  sourceUrl: string;
}) {
  const isExternal = sourceUrl.startsWith("http");
  return (
    <div>
      <div className="text-2xl md:text-3xl font-bold text-neutral-900 tabular-nums leading-tight mb-2">
        {stat}
      </div>
      <div className="text-sm text-neutral-700 leading-snug">{label}</div>
      <a
        href={sourceUrl}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="mt-2 inline-block text-[11px] text-neutral-500 hover:text-teal-700 font-mono"
      >
        {sourceText} {isExternal && <span aria-hidden>↗</span>}
      </a>
    </div>
  );
}
