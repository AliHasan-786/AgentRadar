// Mockup of how AgentRadar could surface inside Shopify's Sidekick
// conversation panel. Dark frame mirrors the real Sidekick UI; the
// contents stay editorial — mono labels, single teal accent, the
// real provider logos already used in the hero diagram.
//
// Used in the teardown's "If this lived inside Sidekick" section to
// turn the bulleted sketch into a concrete visual reference.

const ROWS = [
  { brand: "anthropic", name: "Anthropic", verdict: "recommended" },
  { brand: "openai", name: "OpenAI", verdict: "ranked-low" },
  { brand: "groq", name: "Groq", verdict: "recommended" },
  { brand: "google", name: "Google", verdict: "recommended" },
  { brand: "mistral", name: "Mistral", verdict: "ranked-low" },
] as const;

const VERDICT_DOT: Record<string, string> = {
  recommended: "#10b981",
  "ranked-low": "#f59e0b",
};

export function SidekickMockup() {
  return (
    <figure className="not-prose mt-4">
      <svg
        viewBox="0 0 560 440"
        xmlns="http://www.w3.org/2000/svg"
        className="block w-full max-w-[640px] h-auto rounded-md border border-neutral-200"
        aria-label="Mockup of AgentRadar surfaced inside Shopify's Sidekick conversation panel"
      >
        <style>{`
          .panel { fill: #0a0a0a; }
          .divider { stroke: #1f1f1f; stroke-width: 1; }
          .border-soft { stroke: #2a2a2a; stroke-width: 1; fill: none; }
          .header-text { font-family: var(--font-sans, system-ui), sans-serif; font-size: 11px; font-weight: 600; fill: #e5e5e5; }
          .subtle { font-family: var(--font-mono, ui-monospace), monospace; font-size: 10px; fill: #737373; }
          .user-bubble { fill: #1a1a1a; stroke: #2a2a2a; stroke-width: 1; }
          .user-text { font-family: var(--font-sans, system-ui), sans-serif; font-size: 11px; fill: #f5f5f5; }
          .bot-text { font-family: var(--font-sans, system-ui), sans-serif; font-size: 11px; fill: #d4d4d4; }
          .bot-strong { font-family: var(--font-sans, system-ui), sans-serif; font-size: 11px; fill: #f5f5f5; font-weight: 500; }
          .card { fill: #141414; stroke: #2a2a2a; stroke-width: 1; }
          .card-label { font-family: var(--font-mono, ui-monospace), monospace; font-size: 9px; fill: #737373; letter-spacing: 0.6px; }
          .score-num { font-family: var(--font-sans, system-ui), sans-serif; font-size: 28px; font-weight: 700; fill: #5eead4; }
          .score-suffix { font-family: var(--font-sans, system-ui), sans-serif; font-size: 12px; font-weight: 500; fill: #737373; }
          .row-name { font-family: var(--font-mono, ui-monospace), monospace; font-size: 10px; fill: #e5e5e5; }
          .row-verdict { font-family: var(--font-mono, ui-monospace), monospace; font-size: 9.5px; fill: #a3a3a3; }
          .input-bg { fill: #141414; stroke: #2a2a2a; stroke-width: 1; }
          .input-placeholder { font-family: var(--font-sans, system-ui), sans-serif; font-size: 11px; fill: #525252; }
          .accent-bar { fill: #14b8a6; }
          .accent-bar-dim { fill: #14b8a6; opacity: 0.45; }
        `}</style>

        {/* Outer Sidekick panel */}
        <rect width="560" height="440" rx="8" className="panel" />

        {/* Header bar */}
        <line x1="0" y1="38" x2="560" y2="38" className="divider" />
        <circle cx="22" cy="20" r="6" fill="#9333ea" />
        <circle cx="20" cy="18" r="1.5" fill="white" />
        <circle cx="24" cy="18" r="1.5" fill="white" />
        <text x="36" y="24" className="header-text">
          AgentRadar · readiness diagnostic
        </text>
        <text x="540" y="24" textAnchor="end" className="subtle">
          ⛶  ✕
        </text>

        {/* User message — right-aligned */}
        <rect
          x="280"
          y="56"
          width="260"
          height="36"
          rx="4"
          className="user-bubble"
        />
        <text x="296" y="80" className="user-text">
          Check how AI shoppers see my catalog
        </text>

        {/* Sidekick reply intro */}
        <circle cx="22" cy="118" r="10" fill="#9333ea" />
        <circle cx="18" cy="116" r="1.8" fill="white" />
        <circle cx="26" cy="116" r="1.8" fill="white" />
        <text x="42" y="116" className="bot-text">
          5 LLMs queried your /products.json against
        </text>
        <text x="42" y="130" className="bot-text">
          shopper intents in your category. Result:
        </text>

        {/* Score + verdicts card */}
        <rect
          x="42"
          y="146"
          width="476"
          height="200"
          rx="6"
          className="card"
        />

        {/* Card header */}
        <text x="58" y="168" className="card-label">
          AI READINESS · CATALOG-LEVEL
        </text>

        {/* Big score */}
        <text x="58" y="206" className="score-num">
          72
        </text>
        <text x="100" y="206" className="score-suffix">
          / 100
        </text>

        {/* Mini dimension bars on the right of score */}
        <text x="180" y="170" className="card-label">
          DISC
        </text>
        <rect x="216" y="162" width="60" height="6" rx="1" fill="#1f1f1f" />
        <rect x="216" y="162" width="44" height="6" rx="1" className="accent-bar" />

        <text x="180" y="186" className="card-label">
          DESC
        </text>
        <rect x="216" y="178" width="60" height="6" rx="1" fill="#1f1f1f" />
        <rect x="216" y="178" width="32" height="6" rx="1" className="accent-bar-dim" />

        <text x="180" y="202" className="card-label">
          SCHEMA
        </text>
        <rect x="216" y="194" width="60" height="6" rx="1" fill="#1f1f1f" />
        <rect x="216" y="194" width="50" height="6" rx="1" className="accent-bar" />

        <text x="180" y="218" className="card-label">
          TRUST
        </text>
        <rect x="216" y="210" width="60" height="6" rx="1" fill="#1f1f1f" />
        <rect x="216" y="210" width="38" height="6" rx="1" className="accent-bar-dim" />

        {/* Divider */}
        <line x1="58" y1="234" x2="500" y2="234" className="divider" />

        {/* Agent rows */}
        {ROWS.map((r, i) => {
          const y = 246 + i * 18;
          return (
            <g key={r.brand}>
              <image
                href={`/logos/${r.brand}.png`}
                x="58"
                y={y - 6}
                width="14"
                height="14"
                preserveAspectRatio="xMidYMid meet"
              />
              <text x="80" y={y + 4} className="row-name">
                {r.name}
              </text>
              <circle cx="408" cy={y + 1} r="3" fill={VERDICT_DOT[r.verdict]} />
              <text x="418" y={y + 4} className="row-verdict">
                {r.verdict}
              </text>
            </g>
          );
        })}

        {/* Recommendation hint outside card */}
        <text x="42" y="372" className="bot-strong">
          Top fix:
        </text>
        <text x="86" y="372" className="bot-text">
          GPT-4o-mini ranked you below 3 competitors.
        </text>
        <text x="42" y="386" className="bot-text">
          Add arch-support specs to product descriptions
        </text>
        <text x="42" y="400" fill="#14b8a6" fontSize="11" fontFamily="var(--font-sans, system-ui), sans-serif">
          Open product editor →
        </text>

        {/* Input bar */}
        <rect
          x="20"
          y="412"
          width="520"
          height="22"
          rx="4"
          className="input-bg"
        />
        <text x="32" y="427" className="input-placeholder">
          Ask anything…
        </text>
        <text x="528" y="427" textAnchor="end" className="subtle">
          +  ⏺
        </text>
      </svg>
      <figcaption className="mt-2 text-[10px] text-neutral-500 font-mono leading-relaxed">
        mockup · AgentRadar surfaced inside Sidekick · score, dimension
        breakdown, 5 verdicts, and a one-click recommendation in native
        conversation
      </figcaption>
    </figure>
  );
}
