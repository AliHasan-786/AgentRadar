// Compact hero info-graphic — 5 providers fan into one catalog, fan back
// out to 5 verdicts. Editorial: thin lines, mono labels, single deep-teal
// accent. No gradients, no decorative icons.
//
// Provider marks are simplified monochrome SVG glyphs that evoke each
// brand silhouette (Claude burst, OpenAI knot, Groq G, Gemini spark,
// Mistral M) without lifting copyrighted multicolor logos — keeps the
// editorial aesthetic and dodges trademark risk.

const PROVIDERS = [
  { name: "Anthropic", brand: "anthropic", verdict: "recommended" },
  { name: "OpenAI", brand: "openai", verdict: "ranked-low" },
  { name: "Groq", brand: "groq", verdict: "recommended" },
  { name: "Google", brand: "google", verdict: "recommended" },
  { name: "Mistral", brand: "mistral", verdict: "ranked-low" },
] as const;

const VERDICT_DOT: Record<string, string> = {
  recommended: "#059669",
  "ranked-low": "#d97706",
  skipped: "#dc2626",
};

function ProviderLogo({
  brand,
  x,
  y,
  size = 16,
}: {
  brand: string;
  x: number;
  y: number;
  size?: number;
}) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const accent = "#0f766e";
  const transform = `translate(${cx} ${cy})`;

  switch (brand) {
    case "anthropic":
      return (
        <g
          transform={transform}
          stroke={accent}
          strokeWidth={1.4}
          strokeLinecap="round"
        >
          <line x1="0" y1="-7" x2="0" y2="7" />
          <line x1="-7" y1="0" x2="7" y2="0" />
          <line x1="-5" y1="-5" x2="5" y2="5" />
          <line x1="-5" y1="5" x2="5" y2="-5" />
        </g>
      );
    case "openai":
      return (
        <g transform={transform} stroke={accent} strokeWidth={1} fill="none">
          <ellipse cx="0" cy="0" rx="6.5" ry="2.5" />
          <ellipse
            cx="0"
            cy="0"
            rx="6.5"
            ry="2.5"
            transform="rotate(60)"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="6.5"
            ry="2.5"
            transform="rotate(120)"
          />
        </g>
      );
    case "groq":
      return (
        <g
          transform={transform}
          stroke={accent}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 5 -2 A 5.5 5.5 0 1 0 5 4 L 0 4" />
        </g>
      );
    case "google":
      return (
        <g transform={transform} fill={accent}>
          <path d="M 0 -7 L 1.5 -1.5 L 7 0 L 1.5 1.5 L 0 7 L -1.5 1.5 L -7 0 L -1.5 -1.5 Z" />
        </g>
      );
    case "mistral":
      return (
        <g
          transform={transform}
          stroke={accent}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M -6 6 V -6 L 0 0 L 6 -6 V 6" />
        </g>
      );
    default:
      return null;
  }
}

export function HeroDiagram() {
  const PROVIDER_X = 4;
  const CHIP_W = 120;
  const CHIP_H = 32;
  const ROW_H = 44;
  const TOP = 14;
  const CATALOG_X = 152;
  const CATALOG_Y = 94;
  const CATALOG_W = 88;
  const CATALOG_H = 48;
  const VERDICT_DOT_X = 262;
  const VERDICT_TEXT_X = 274;
  const CATALOG_CENTER_X = CATALOG_X + CATALOG_W / 2;
  const CATALOG_CENTER_Y = CATALOG_Y + CATALOG_H / 2;

  return (
    <figure className="not-prose">
      <svg
        viewBox="0 0 380 240"
        xmlns="http://www.w3.org/2000/svg"
        className="block w-full max-w-[420px] h-auto"
        aria-label="5 LLM providers query a single store catalog in parallel and each return a distinct shopping verdict"
      >
        <style>{`
          .label { font-family: var(--font-mono, ui-monospace), monospace; font-size: 9.5px; fill: #404040; }
          .provider-name { font-family: var(--font-mono, ui-monospace), monospace; font-size: 11px; fill: #171717; font-weight: 500; }
          .catalog-label { font-family: var(--font-sans, system-ui), sans-serif; font-size: 12px; font-weight: 600; fill: #111827; }
          .catalog-meta { font-family: var(--font-mono, ui-monospace), monospace; font-size: 9px; fill: #737373; }
          .chip { fill: white; stroke: #d4d4d4; stroke-width: 1; }
          .catalog-box { fill: white; stroke: #0f766e; stroke-width: 1.25; }
          .line { stroke: #a3a3a3; stroke-width: 0.75; fill: none; }
          .line-accent { stroke: #0f766e; stroke-width: 0.75; fill: none; opacity: 0.55; }
        `}</style>

        {PROVIDERS.map((p, i) => {
          const y = TOP + i * ROW_H;
          const cy = y + CHIP_H / 2;
          return (
            <g key={p.brand}>
              <rect
                x={PROVIDER_X}
                y={y}
                width={CHIP_W}
                height={CHIP_H}
                rx={4}
                className="chip"
              />
              <ProviderLogo brand={p.brand} x={PROVIDER_X + 8} y={y + 8} />
              <text
                x={PROVIDER_X + 32}
                y={y + 20}
                className="provider-name"
              >
                {p.name}
              </text>

              <line
                x1={PROVIDER_X + CHIP_W}
                y1={cy}
                x2={CATALOG_X}
                y2={CATALOG_CENTER_Y}
                className="line"
              />

              <line
                x1={CATALOG_X + CATALOG_W}
                y1={CATALOG_CENTER_Y}
                x2={VERDICT_DOT_X - 4}
                y2={cy}
                className="line-accent"
              />

              <circle
                cx={VERDICT_DOT_X}
                cy={cy}
                r={4}
                fill={VERDICT_DOT[p.verdict] ?? "#737373"}
              />
              <text x={VERDICT_TEXT_X} y={cy + 3} className="label">
                {p.verdict}
              </text>
            </g>
          );
        })}

        <rect
          x={CATALOG_X}
          y={CATALOG_Y}
          width={CATALOG_W}
          height={CATALOG_H}
          rx={4}
          className="catalog-box"
        />
        <text
          x={CATALOG_CENTER_X}
          y={CATALOG_Y + 20}
          textAnchor="middle"
          className="catalog-label"
        >
          catalog
        </text>
        <text
          x={CATALOG_CENTER_X}
          y={CATALOG_Y + 36}
          textAnchor="middle"
          className="catalog-meta"
        >
          /products.json
        </text>
      </svg>
      <figcaption className="mt-2 text-[10px] text-neutral-500 font-mono leading-relaxed">
        sample run · 5 LLMs query the same catalog in parallel · 5 distinct
        verdicts in &lt; 12s wall clock
      </figcaption>
    </figure>
  );
}
