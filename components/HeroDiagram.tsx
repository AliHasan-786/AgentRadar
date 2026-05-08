// Compact hero info-graphic — 5 providers fan into one catalog, fan back
// out to 5 verdicts. Editorial: thin lines, mono labels, single deep-teal
// accent. No gradients, no decorative icons, no AI sparkle.
//
// Sized to sit beside the hero text on desktop and stack below on mobile.

const PROVIDERS = [
  { tag: "AN", name: "Anthropic", verdict: "recommended" },
  { tag: "OA", name: "OpenAI", verdict: "ranked-low" },
  { tag: "GR", name: "Groq", verdict: "recommended" },
  { tag: "GO", name: "Google", verdict: "recommended" },
  { tag: "MS", name: "Mistral", verdict: "ranked-low" },
];

const VERDICT_DOT: Record<string, string> = {
  recommended: "#059669",
  "ranked-low": "#d97706",
  skipped: "#dc2626",
};

export function HeroDiagram() {
  // 320 × 280 viewBox. 5 small provider chips on the left, one catalog
  // box in the middle, 5 verdict dots on the right. Thin connecting
  // lines, no labels on lines (the legend below carries the meaning).
  const PROVIDER_X = 8;
  const CATALOG_X = 138;
  const VERDICT_X = 280;
  const ROW_HEIGHT = 40;
  const CHIP_W = 96;
  const CHIP_H = 28;
  const TOP = 16;

  return (
    <figure className="not-prose">
      <svg
        viewBox="0 0 320 280"
        xmlns="http://www.w3.org/2000/svg"
        className="block w-full max-w-[360px] h-auto"
        aria-label="5 LLM providers query a single store catalog in parallel and each return a distinct shopping verdict"
      >
        <style>{`
          .label { font-family: var(--font-mono, ui-monospace), monospace; font-size: 9px; fill: #404040; }
          .tag { font-family: var(--font-mono, ui-monospace), monospace; font-size: 9px; fill: #0f766e; font-weight: 600; }
          .catalog-label { font-family: var(--font-sans, system-ui), sans-serif; font-size: 11px; font-weight: 600; fill: #111827; }
          .catalog-meta { font-family: var(--font-mono, ui-monospace), monospace; font-size: 8px; fill: #737373; }
          .chip { fill: white; stroke: #d4d4d4; stroke-width: 1; }
          .catalog-box { fill: white; stroke: #0f766e; stroke-width: 1.25; }
          .line { stroke: #a3a3a3; stroke-width: 0.75; fill: none; }
          .line-accent { stroke: #0f766e; stroke-width: 0.75; fill: none; opacity: 0.55; }
        `}</style>

        {PROVIDERS.map((p, i) => {
          const y = TOP + i * ROW_HEIGHT;
          return (
            <g key={p.tag}>
              {/* provider chip */}
              <rect
                x={PROVIDER_X}
                y={y}
                width={CHIP_W}
                height={CHIP_H}
                rx={3}
                className="chip"
              />
              <text
                x={PROVIDER_X + 8}
                y={y + 12}
                className="tag"
              >
                {p.tag}
              </text>
              <text
                x={PROVIDER_X + 8}
                y={y + 22}
                className="label"
              >
                {p.name}
              </text>

              {/* line provider → catalog */}
              <line
                x1={PROVIDER_X + CHIP_W}
                y1={y + CHIP_H / 2}
                x2={CATALOG_X}
                y2={140}
                className="line"
              />

              {/* line catalog → verdict */}
              <line
                x1={CATALOG_X + 60}
                y1={140}
                x2={VERDICT_X - 4}
                y2={y + CHIP_H / 2}
                className="line-accent"
              />

              {/* verdict dot */}
              <circle
                cx={VERDICT_X + 4}
                cy={y + CHIP_H / 2}
                r={4}
                fill={VERDICT_DOT[p.verdict] ?? "#737373"}
              />
              <text
                x={VERDICT_X + 14}
                y={y + CHIP_H / 2 + 3}
                className="label"
              >
                {p.verdict}
              </text>
            </g>
          );
        })}

        {/* catalog box — center pivot */}
        <rect
          x={CATALOG_X}
          y={120}
          width={60}
          height={40}
          rx={3}
          className="catalog-box"
        />
        <text x={CATALOG_X + 30} y={138} textAnchor="middle" className="catalog-label">
          catalog
        </text>
        <text x={CATALOG_X + 30} y={152} textAnchor="middle" className="catalog-meta">
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
