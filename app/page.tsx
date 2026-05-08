import Link from "next/link";
import { HeroInput } from "@/components/HeroInput";
import { DEMO_STORES } from "@/lib/demo-stores";
import type { ScoreResult } from "@/lib/score/types";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <div className="text-xs uppercase tracking-[0.2em] text-teal-700 font-mono mb-6">
            agentradar · agentic-commerce diagnostic
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            See your store through{" "}
            <span className="text-teal-700">AI shoppers&apos; eyes.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base md:text-lg text-neutral-700 leading-relaxed">
            Real LLMs. Real catalog data. Real transcripts. AgentRadar runs
            Claude, GPT-4o-mini, Llama 3.3, Gemini 3 Flash, and Mistral Small
            against your live <code className="font-mono text-neutral-900">/products.json</code> endpoint and shows
            you exactly how each one describes — or skips — your store when
            asked for products in your category.
          </p>

          <HeroInput />

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
                  <div className="flex items-center gap-2 text-[10px] font-mono mb-3">
                    <span className="px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 tabular-nums">
                      {dimLabel(top.key)} {Math.round(top.score)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 tabular-nums">
                      {dimLabel(bottom.key)} {Math.round(bottom.score)}
                    </span>
                  </div>
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

      {/* What we don't claim */}
      <section className="bg-neutral-50 border-t border-neutral-200">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-3">
            What we don&apos;t claim
          </div>
          <ul className="text-sm text-neutral-700 space-y-2 list-disc list-inside">
            <li>
              We do not predict what ChatGPT Shopping, Perplexity Merchant, or
              Shopify Catalog will do with your store. We are not those
              systems.
            </li>
            <li>
              We do not estimate revenue impact. Methodology integrity over
              vibes.
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
            · portfolio piece for the{" "}
            <span className="text-neutral-900">
              Shopify Apprentice PM Fall 2026
            </span>{" "}
            application
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
