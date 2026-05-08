// Mockup of how AgentRadar would surface inside Shopify's Sidekick
// conversation panel. Built as an HTML replica (not SVG) so the text
// wraps naturally and reads like a real Sidekick reply rather than a
// dashboard dropped into a chat.
//
// Visual fidelity matches the actual Sidekick UI screenshots: dark
// panel, mascot avatar, right-aligned user bubble, prose response with
// inline bold + per-provider rows + native action chips, and the
// "Ask anything…" footer with + / mic icons.

const RECOMMENDED = [
  { brand: "anthropic", name: "Anthropic" },
  { brand: "groq", name: "Groq" },
  { brand: "google", name: "Google" },
] as const;

const RANKED_LOW = [
  {
    brand: "openai-white",
    name: "OpenAI",
    note: "placed you below 3 competitors",
  },
  {
    brand: "mistral",
    name: "Mistral",
    note: 'skipped on "arch-support shoes"',
  },
] as const;

export function SidekickMockup() {
  return (
    <figure className="not-prose mt-4 max-w-[560px]">
      <div className="rounded-lg overflow-hidden border border-neutral-200 bg-[#0a0a0a] text-neutral-100">
        {/* Header — matches Sidekick chrome */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-1.5 min-w-0 text-neutral-200">
            <span className="text-[13px] font-semibold truncate">
              AgentRadar diagnostic
            </span>
            <ChevronDownIcon />
          </div>
          <div className="flex items-center gap-3 text-neutral-500">
            <PenIcon />
            <ExpandIcon />
            <CloseIcon />
          </div>
        </div>

        {/* Conversation */}
        <div className="px-4 py-5 space-y-5">
          {/* User message — right-aligned */}
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-xl bg-neutral-800/80 px-4 py-2.5 text-[13px] text-neutral-100">
              Check how AI shoppers see my catalog
            </div>
          </div>

          {/* Sidekick reply */}
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/sidekick.png"
              width={32}
              height={32}
              alt=""
              className="flex-shrink-0 rounded-full"
            />
            <div className="space-y-3.5 text-[13px] leading-relaxed flex-1 min-w-0 text-neutral-200">
              <p>
                I ran your{" "}
                <code className="font-mono text-[12px] bg-neutral-800/60 px-1 py-px rounded text-neutral-100">
                  /products.json
                </code>{" "}
                catalog past five AI shoppers in your category. Here&apos;s
                what came back.
              </p>

              {/* Score with inline progress bar */}
              <div className="space-y-1.5">
                <p>
                  Your AI Readiness Score:{" "}
                  <strong className="text-white font-semibold">72 / 100</strong>
                </p>
                <div className="h-1.5 rounded-full bg-neutral-800 max-w-[280px] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-400"
                    style={{ width: "72%" }}
                  />
                </div>
              </div>

              <p>
                <strong className="text-white font-semibold">
                  3 of 5
                </strong>{" "}
                recommended you in their top three:
              </p>
              <ul className="space-y-1.5 pl-1">
                {RECOMMENDED.map((p) => (
                  <ProviderRow
                    key={p.brand}
                    brand={p.brand}
                    name={p.name}
                    verdict="recommended"
                  />
                ))}
              </ul>

              <p>
                <strong className="text-white font-semibold">
                  2 ranked you low
                </strong>
                :
              </p>
              <ul className="space-y-1.5 pl-1">
                {RANKED_LOW.map((p) => (
                  <ProviderRow
                    key={p.brand}
                    brand={p.brand}
                    name={p.name}
                    note={p.note}
                    verdict="ranked-low"
                  />
                ))}
              </ul>

              <p>
                <strong className="text-white font-semibold">Top fix:</strong>{" "}
                GPT-4o-mini cited missing arch-support specs in your product
                descriptions. Adding them would likely flip both verdicts.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[12px] px-3 py-1.5 rounded-full border border-teal-500/40 text-teal-300 bg-teal-500/5">
                  Open product editor →
                </span>
                <span className="text-[12px] px-3 py-1.5 rounded-full border border-neutral-700 text-neutral-300 bg-neutral-900">
                  See full transcripts →
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-neutral-800">
          <div className="flex items-center gap-2 rounded-full bg-neutral-900 border border-neutral-800 px-4 py-2.5">
            <span className="text-[13px] text-neutral-500 flex-1">
              Ask anything…
            </span>
            <PlusIcon />
            <MicIcon />
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-[10px] text-neutral-500 font-mono leading-relaxed">
        mockup · AgentRadar surfaced inside Sidekick · the diagnostic replies
        in Sidekick&apos;s native conversational style — score, per-shopper
        verdicts, top fix, and one-click action chips
      </figcaption>
    </figure>
  );
}

function ProviderRow({
  brand,
  name,
  note,
  verdict,
}: {
  brand: string;
  name: string;
  note?: string;
  verdict: "recommended" | "ranked-low";
}) {
  const dotColor = verdict === "recommended" ? "bg-emerald-400" : "bg-amber-400";
  return (
    <li className="flex items-center gap-2.5 text-[13px]">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/logos/${brand}.png`}
        width={16}
        height={16}
        alt=""
        className="flex-shrink-0"
      />
      <span className="text-neutral-100 font-medium">{name}</span>
      {note && (
        <span className="text-neutral-400 truncate">— {note}</span>
      )}
    </li>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 2l3 3-9 9H2v-3l9-9z" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 2h3v3M5 12H2V9M12 2L8 6M2 12l4-4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-neutral-500"
      aria-hidden
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-neutral-500"
      aria-hidden
    >
      <rect x="5" y="2" width="4" height="7" rx="2" />
      <path d="M2.5 7a4.5 4.5 0 009 0M7 11.5v1.5" />
    </svg>
  );
}
