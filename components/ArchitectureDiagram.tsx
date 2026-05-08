// Hand-coded SVG of the AgentRadar pipeline. Editorial — thin lines,
// mono labels, single accent (deep teal). No gradients, no decorative
// icons. Designed to communicate engineering depth in a 3-second visual
// where prose takes 30 seconds.
//
// Layout: 5 horizontal stages, with the persona bank fanning out
// vertically inside stage 4. Mobile-friendly via viewBox scaling — the
// SVG has an explicit viewBox and parents constrain max-width.

const PERSONAS = [
  "Claude Haiku 4.5",
  "GPT-4o mini",
  "Llama 3.3 70B",
  "Gemini 3 Flash",
  "Mistral Small",
];

export function ArchitectureDiagram() {
  // Coordinate system: 1100 wide × 380 tall.
  // Stage x-positions chosen for even rhythm; persona fan centered at x=620.
  return (
    <figure className="my-6 not-prose">
      <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
        <svg
          viewBox="0 0 1100 380"
          xmlns="http://www.w3.org/2000/svg"
          className="block w-full min-w-[760px] h-auto"
          aria-label="AgentRadar architecture: catalog fetch → normalize and dedup → 14 signals plus 5 personas in parallel → rubric → score and recommendations"
        >
          {/* Defs: arrow marker, mono text styling */}
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#0f766e" />
            </marker>
          </defs>

          <style>{`
            .label { font-family: var(--font-mono, ui-monospace), monospace; font-size: 11px; fill: #1f2937; }
            .label-meta { font-family: var(--font-mono, ui-monospace), monospace; font-size: 9px; fill: #737373; }
            .stage-title { font-family: var(--font-sans, system-ui), sans-serif; font-size: 12px; font-weight: 600; fill: #111827; }
            .stage-num { font-family: var(--font-mono, ui-monospace), monospace; font-size: 10px; fill: #0f766e; letter-spacing: 0.1em; }
            .accent-line { stroke: #0f766e; stroke-width: 1.25; fill: none; }
            .neutral-line { stroke: #d4d4d4; stroke-width: 1; fill: none; }
            .box { fill: white; stroke: #d4d4d4; stroke-width: 1; }
            .box-accent { fill: white; stroke: #0f766e; stroke-width: 1.25; }
            .persona-box { fill: #f0fdfa; stroke: #0d9488; stroke-width: 1; }
          `}</style>

          {/* Stage 1: visitor URL */}
          <g>
            <text x="80" y="38" className="stage-num">01</text>
            <text x="80" y="56" className="stage-title">Input</text>
            <rect x="80" y="68" width="160" height="74" rx="4" className="box-accent" />
            <text x="160" y="98" textAnchor="middle" className="label">visitor pastes URL</text>
            <text x="160" y="116" textAnchor="middle" className="label-meta">store.com /</text>
            <text x="160" y="130" textAnchor="middle" className="label-meta">store.myshopify.com</text>
          </g>

          {/* Arrow 1→2 */}
          <line x1="240" y1="105" x2="280" y2="105" className="accent-line" markerEnd="url(#arrow)" />

          {/* Stage 2: catalog fetch */}
          <g>
            <text x="290" y="38" className="stage-num">02</text>
            <text x="290" y="56" className="stage-title">Catalog</text>
            <rect x="290" y="68" width="170" height="74" rx="4" className="box" />
            <text x="375" y="92" textAnchor="middle" className="label">fetch /products.json</text>
            <text x="375" y="110" textAnchor="middle" className="label-meta">paginate ≤ 1000 products</text>
            <text x="375" y="124" textAnchor="middle" className="label-meta">dedupe by (title × type)</text>
          </g>

          {/* Arrow 2→3 */}
          <line x1="460" y1="105" x2="500" y2="105" className="accent-line" markerEnd="url(#arrow)" />

          {/* Stage 3: parallel work */}
          <g>
            <text x="510" y="38" className="stage-num">03</text>
            <text x="510" y="56" className="stage-title">Parallel work</text>

            {/* Signals box */}
            <rect x="510" y="68" width="200" height="60" rx="4" className="box" />
            <text x="610" y="92" textAnchor="middle" className="label">14 catalog signals</text>
            <text x="610" y="110" textAnchor="middle" className="label-meta">tag density · breadth · review</text>
            <text x="610" y="122" textAnchor="middle" className="label-meta">rate · use-case · attribute · …</text>

            {/* 5 personas, fanned below */}
            {PERSONAS.map((p, i) => {
              const y = 158 + i * 38;
              return (
                <g key={p}>
                  <rect x="510" y={y} width="200" height="28" rx="3" className="persona-box" />
                  <text x="525" y={y + 18} className="label">▸ {p}</text>
                </g>
              );
            })}
            <text x="610" y="362" textAnchor="middle" className="label-meta">5 LLMs × Promise.all → SSE</text>
          </g>

          {/* Arrows 3→4 (signals + personas → rubric) */}
          <line x1="710" y1="98" x2="780" y2="160" className="accent-line" markerEnd="url(#arrow)" />
          <line x1="710" y1="240" x2="780" y2="200" className="accent-line" markerEnd="url(#arrow)" />

          {/* Stage 4: rubric */}
          <g>
            <text x="790" y="120" className="stage-num">04</text>
            <text x="790" y="138" className="stage-title">Rubric</text>
            <rect x="790" y="150" width="160" height="100" rx="4" className="box-accent" />
            <text x="870" y="174" textAnchor="middle" className="label">deterministic math</text>
            <text x="870" y="192" textAnchor="middle" className="label-meta">0.30 disc + 0.30 desc</text>
            <text x="870" y="206" textAnchor="middle" className="label-meta">+ 0.25 schema + 0.15 trust</text>
            <text x="870" y="226" textAnchor="middle" className="label-meta">+ rule library</text>
            <text x="870" y="240" textAnchor="middle" className="label-meta">(8 deterministic triggers)</text>
          </g>

          {/* Arrow 4→5 */}
          <line x1="950" y1="200" x2="990" y2="200" className="accent-line" markerEnd="url(#arrow)" />

          {/* Stage 5: render */}
          <g>
            <text x="1000" y="120" className="stage-num">05</text>
            <text x="1000" y="138" className="stage-title">Render</text>
            <rect x="1000" y="150" width="80" height="100" rx="4" className="box" />
            <text x="1040" y="174" textAnchor="middle" className="label">score</text>
            <text x="1040" y="192" textAnchor="middle" className="label">+ recs</text>
            <text x="1040" y="216" textAnchor="middle" className="label-meta">cached</text>
            <text x="1040" y="230" textAnchor="middle" className="label-meta">or live SSE</text>
          </g>

          {/* Bottom note: methodology contract */}
          <text x="80" y="370" className="label-meta">
            every prompt + response visible · every weight in lib/score/rubric.ts · methodology contract = code
          </text>
        </svg>
      </div>
      <figcaption className="mt-2 text-[11px] text-neutral-500 font-mono">
        AgentRadar pipeline · catalog signals + 5 LLMs run in parallel,
        rubric is deterministic
      </figcaption>
    </figure>
  );
}
