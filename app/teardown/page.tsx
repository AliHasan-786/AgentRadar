import Link from "next/link";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";

export const metadata = {
  title: "Teardown · AgentRadar",
  description:
    "What Shopify already ships for agentic commerce, what GEO tools audit today, and where AgentRadar fits — written as a PM teardown.",
};

const TOC: { id: string; label: string }[] = [
  { id: "frame", label: "Why a teardown" },
  { id: "shopify", label: "Shopify's first-party stack" },
  { id: "geo-tools", label: "Existing GEO/AEO tools" },
  { id: "wedge", label: "What none of them do" },
  { id: "fit", label: "What this means for Shopify" },
  { id: "first-party", label: "If this lived inside Sidekick" },
  { id: "sources", label: "Sources" },
];

export default function TeardownPage() {
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
          Teardown — what Shopify ships, what GEO tools audit, and where
          AgentRadar fits
        </h1>
        <p className="mt-3 text-base text-neutral-700 leading-relaxed max-w-2xl">
          A short PM-style teardown of the agentic-commerce landscape circa
          mid-2026. Written to make explicit what Shopify already does
          first-party, what the existing GEO/AEO tool ecosystem actually
          checks, and the wedge AgentRadar sits in. The frame is constructive
          — Shopify&apos;s first-party stack is doing real work, and any
          third-party tool in this space lives downstream of platform
          plumbing.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-10">
          <nav
            aria-label="Teardown sections"
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
              Behavioral, not structural. That&apos;s the wedge.
            </div>
          </nav>

          <div>
            <Section id="frame" title="Why a teardown">
              <p className="text-sm text-neutral-800 leading-relaxed">
                Every merchant tool in the agentic-commerce space today
                either ships from Shopify itself or lives downstream of
                Shopify&apos;s plumbing. Building yet another generic AI tool
                without doing the platform-level reading first is a fast
                way to demo something Shopify already ships, or to build on
                top of plumbing that&apos;s about to obsolete you. This page
                exists so a Shopify reader can verify I&apos;ve done that
                reading.
              </p>
            </Section>

            <Section id="shopify" title="Shopify's first-party agentic-commerce stack">
              <p className="text-sm text-neutral-700 leading-relaxed mb-3">
                As of mid-2026, the surface area roughly looks like:
              </p>
              <ul className="space-y-2 text-sm text-neutral-800 leading-relaxed list-disc list-inside">
                <li>
                  <strong>Shopify Catalog.</strong> Auto-syndication of
                  merchant catalog data into ChatGPT Shopping, Microsoft
                  Copilot, Google AI Mode, Perplexity, and the Gemini app.
                  Built on top of the Universal Commerce Protocol (UCP),
                  co-developed with Google. This is the merchant&apos;s
                  &ldquo;data feed to every AI shopper&rdquo; layer.
                </li>
                <li>
                  <strong>Agentic Storefronts.</strong> In-chat checkout
                  inside participating channels — the agent doesn&apos;t hand
                  the shopper off to the storefront URL; the transaction
                  closes in the conversation. Activated by default for every
                  store on the platform as of late March 2026.
                </li>
                <li>
                  <strong>Knowledge Base.</strong> Merchant-curated content
                  that agents consult when answering brand-specific
                  questions. The merchant&apos;s lever for shaping what AI
                  agents say about their store.
                </li>
                <li>
                  <strong>Sidekick.</strong> Shopify&apos;s in-admin assistant
                  for merchants — increasingly the surface where merchants
                  see analytics, tasks, and recommendations in conversation.
                  The natural home for any first-party agentic-commerce
                  diagnostic.
                </li>
                <li>
                  <strong>Agentic Plan.</strong> Lets non-Shopify-store
                  merchants join Shopify Catalog&apos;s syndication network
                  without re-platforming — a distribution play around UCP.
                </li>
              </ul>
              <p className="mt-4 text-sm text-neutral-700 leading-relaxed">
                What this stack does: it makes a merchant&apos;s catalog
                discoverable to AI agents and lets transactions close inside
                AI surfaces. What it does <em>not</em> do, today: tell the
                merchant whether and how AI agents actually surface them when
                a real shopper queries.
              </p>
            </Section>

            <Section id="geo-tools" title="The third-party GEO/AEO tool ecosystem">
              <p className="text-sm text-neutral-700 leading-relaxed mb-3">
                A small ecosystem of GEO/AEO (generative-engine optimization
                / answer-engine optimization) tools has emerged since 2025:
              </p>
              <ul className="space-y-2 text-sm text-neutral-800 leading-relaxed list-disc list-inside">
                <li>
                  <strong>Fudge.ai&apos;s Shopify AI Readiness Checker</strong>{" "}
                  — free static scanner that checks for AEO/GEO/UCP signals
                  in a merchant&apos;s structured data. Surfaces schema gaps,
                  alt text gaps, FAQ presence.
                </li>
                <li>
                  <strong>Airefs.</strong> Agent-readiness score tracking.
                  Static.
                </li>
                <li>
                  <strong>AEO Engine, Stormy AI, Huptech Web</strong>, and
                  similar agency-style audit services. Reports on schema and
                  content quality. Static.
                </li>
                <li>
                  <strong>llms.txt</strong>, OpenClaw / Clawbots — emerging
                  open standards for machine-readable catalog files
                  consumed by AI crawlers. Specifications, not analysis.
                </li>
              </ul>
              <p className="mt-4 text-sm text-neutral-700 leading-relaxed">
                The common shape: structural analysis. &ldquo;Your FAQ schema is
                missing.&rdquo; &ldquo;Your alt text is weak.&rdquo; &ldquo;Add
                Review/AggregateRating.&rdquo; The merchant is given a checklist;
                they fix the structure; nothing in the loop tells them whether
                the fix changed anything an AI agent would say.
              </p>
            </Section>

            <Section id="wedge" title="What none of them do">
              <p className="text-sm text-neutral-800 leading-relaxed">
                None of these tools — first-party or third-party — show the
                merchant a transcript of what AI agents <em>actually say</em>{" "}
                when asked for products in the merchant&apos;s category. None
                surface &ldquo;GPT-4o-mini ranked you below 3 competitors
                because your descriptions don&apos;t include arch-support
                specs.&rdquo; None demonstrate behavior. They audit
                structure.
              </p>
              <p className="mt-3 text-sm text-neutral-800 leading-relaxed">
                AgentRadar fills that wedge. It runs real LLMs against the
                merchant&apos;s real catalog and shows the merchant the
                conversation. Behavioral, not structural. Both are valuable;
                the behavioral version is more visceral and produces a
                clearer ask-to-action than &ldquo;your schema is incomplete.&rdquo;
              </p>
              <ArchitectureDiagram />
              <p className="text-sm text-neutral-700 leading-relaxed">
                Stage 3 above is where the existing GEO/AEO ecosystem and
                AgentRadar diverge. The signals fan covers what audit tools
                already check; the personas fan is the unique surface — five
                LLMs in parallel returning literal verdicts, gaps, and
                top-product recommendations against the same catalog.
              </p>
            </Section>

            <Section id="fit" title="What this means for Shopify">
              <p className="text-sm text-neutral-800 leading-relaxed">
                Shopify already owns the platform plumbing (Catalog, UCP,
                Agentic Storefronts) and the merchant relationship surface
                (Sidekick, Admin). What it doesn&apos;t yet ship is a
                first-party diagnostic that closes the loop: <em>did my
                catalog actually answer the question an AI shopper just
                asked?</em>
              </p>
              <p className="mt-3 text-sm text-neutral-800 leading-relaxed">
                A first-party version of AgentRadar would benefit from
                signals Shopify already has and a third-party tool
                cannot:
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-neutral-800 leading-relaxed list-disc list-inside">
                <li>
                  Real Knowledge Base content the merchant has curated, not
                  just <code className="font-mono">/products.json</code> data
                </li>
                <li>
                  Catalog-inferred attributes from Shopify&apos;s own
                  enrichment pipeline
                </li>
                <li>
                  Telemetry from Agentic Storefront events: which agent
                  surfaced the merchant, on which query, with what verdict
                </li>
                <li>
                  ChatGPT Shopping and Perplexity Merchant Program data via
                  partner integrations Shopify already has
                </li>
              </ul>
              <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                What an outside tool can do today is establish the design
                language and demonstrate demand. AgentRadar is one possible
                reference design.
              </p>
            </Section>

            <Section id="first-party" title="If this lived inside Sidekick">
              <p className="text-sm text-neutral-700 leading-relaxed mb-3">
                Sketch of how the experience might land natively:
              </p>
              <ul className="space-y-2 text-sm text-neutral-800 leading-relaxed list-disc list-inside">
                <li>
                  Sidekick prompts the merchant after a catalog change:{" "}
                  <em>&ldquo;You added 47 new products this week. Want to see how
                  AI shoppers describe them?&rdquo;</em>
                </li>
                <li>
                  Run the multi-agent simulation against the merchant&apos;s
                  Knowledge Base + Catalog + actual ChatGPT Shopping
                  telemetry, not just <code className="font-mono">/products.json</code>
                </li>
                <li>
                  Surface verdicts in Sidekick&apos;s native conversation UI
                  — the merchant doesn&apos;t leave the admin
                </li>
                <li>
                  Recommendations link directly to the merchant&apos;s
                  product editor with the exact field highlighted (one-click
                  fix instead of one-click awareness)
                </li>
                <li>
                  Trend tracking: &ldquo;your AI Readiness Score went from 64 to
                  78 after last week&apos;s description rewrite&rdquo; —
                  the longitudinal data Shopify has and a third-party tool
                  doesn&apos;t
                </li>
              </ul>
              <p className="mt-4 text-sm text-neutral-700 leading-relaxed">
                The diagnostic + the platform together is a stronger product
                than either alone. AgentRadar is the diagnostic; Shopify
                provides the platform.
              </p>
            </Section>

            <Section id="sources" title="Sources">
              <ul className="space-y-2 text-sm leading-relaxed list-disc list-inside">
                <li>
                  <a
                    href="https://www.shopify.com/blog/how-agentic-commerce-works"
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 hover:text-teal-900"
                  >
                    Shopify, &ldquo;Agentic Commerce on Shopify: How It Works&rdquo; ↗
                  </a>{" "}
                  — primary source for Catalog / Agentic Storefronts /
                  Knowledge Base / UCP framing and the 8× / 15× growth
                  numbers
                </li>
                <li>
                  <a
                    href="https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-agentic-commerce-opportunity-how-ai-agents-are-ushering-in-a-new-era-for-consumers-and-merchants"
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 hover:text-teal-900"
                  >
                    McKinsey, &ldquo;The agentic commerce opportunity&rdquo;
                    (October 2025) ↗
                  </a>{" "}
                  — $3–5T global agentic commerce projection by 2030
                </li>
                <li>
                  <a
                    href="https://techcrunch.com/2025/11/04/shopify-says-ai-traffic-is-up-7x-since-january-ai-driven-orders-are-up-11x/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 hover:text-teal-900"
                  >
                    TechCrunch, &ldquo;Shopify says AI traffic is up 7×&hellip;&rdquo;
                    (November 2025) ↗
                  </a>{" "}
                  — earlier reporting on the same trajectory
                </li>
                <li>
                  Existing GEO/AEO tools observed in the wild: Fudge.ai
                  Shopify AI Readiness Checker, Airefs, AEO Engine, Stormy
                  AI. None publicly cite behavioral transcript output.
                </li>
              </ul>
            </Section>

            <footer className="mt-12 pt-6 border-t border-neutral-200 text-xs text-neutral-500 font-mono flex items-center justify-between">
              <Link href="/" className="hover:text-neutral-900">
                ← back to home
              </Link>
              <span>
                <Link href="/methodology" className="hover:text-neutral-900">
                  methodology
                </Link>
                {" · "}
                <a
                  href="https://github.com/AliHasan-786/AgentRadar"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-neutral-900"
                >
                  github
                </a>
              </span>
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
