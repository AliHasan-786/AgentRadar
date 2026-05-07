"use client";

import { useState } from "react";
import { DIMENSION_WEIGHTS } from "@/lib/score/rubric";
import type {
  DimensionId,
  DimensionScore,
  ScoreResult,
} from "@/lib/score/types";

interface Props {
  score: ScoreResult;
}

const DIMENSION_LABEL: Record<DimensionId, string> = {
  discoverability: "Discoverability",
  description: "Description quality",
  schema: "Schema",
  trust: "Trust signals",
};

const DIMENSION_BLURB: Record<DimensionId, string> = {
  discoverability:
    "How easily AI agents find the right products in the catalog (tag richness, type breadth, title specificity, persona surface rate).",
  description:
    "How well descriptions answer purchase-intent questions (length, use-case language, attribute detail, persona gap reports).",
  schema:
    "Structured data signals in the catalog (review presence, variant structure, vendor consistency, image coverage).",
  trust:
    "Brand authority and policy clarity markers (return/shipping/warranty language, brand consistency, persona trust gaps).",
};

const DIMENSIONS: DimensionId[] = [
  "discoverability",
  "description",
  "schema",
  "trust",
];

export function ScoreBreakdown({ score }: Props) {
  const [expandedDim, setExpandedDim] = useState<DimensionId | null>(null);

  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {DIMENSIONS.map((d) => {
          const dimScore = score.dimensions[d];
          const weight = Math.round(DIMENSION_WEIGHTS[d] * 100);
          const expanded = expandedDim === d;
          return (
            <button
              key={d}
              onClick={() => setExpandedDim(expanded ? null : d)}
              aria-expanded={expanded}
              className={`text-left rounded-md border bg-white px-4 py-3 transition ${expanded ? "border-teal-400 shadow-sm" : "border-neutral-200 hover:border-neutral-300"}`}
            >
              <div className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-1">
                {DIMENSION_LABEL[d]} <span className="text-neutral-400">· {weight}%</span>
              </div>
              <div className="text-3xl font-bold tabular-nums text-neutral-900">
                {dimScore.score.toFixed(1)}
                <span className="text-neutral-400 text-sm font-medium ml-1">
                  / 100
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                {expanded ? "click to collapse ↑" : "click to expand ↓"}
              </div>
            </button>
          );
        })}
      </div>

      {expandedDim && (
        <ExpandedDimension
          dim={expandedDim}
          dimScore={score.dimensions[expandedDim]}
        />
      )}
    </section>
  );
}

function ExpandedDimension({
  dim,
  dimScore,
}: {
  dim: DimensionId;
  dimScore: DimensionScore;
}) {
  return (
    <div className="mt-3 rounded-md border border-teal-300 bg-teal-50/40 px-4 py-3">
      <div className="text-sm font-semibold text-neutral-900 mb-1">
        {DIMENSION_LABEL[dim]} — {dimScore.score.toFixed(1)} / 100
      </div>
      <p className="text-xs text-neutral-700 mb-3">{DIMENSION_BLURB[dim]}</p>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-neutral-500">
            <th className="text-left py-1">Signal</th>
            <th className="text-right py-1">Value</th>
            <th className="text-right py-1">Contribution</th>
            <th className="text-right py-1">Source</th>
          </tr>
        </thead>
        <tbody>
          {dimScore.signals.map((s, i) => {
            const v =
              typeof s.value === "number" ? s.value.toFixed(2) : String(s.value);
            const pctOfWeight =
              s.weight > 0 ? (s.contribution / s.weight) * 100 : 0;
            return (
              <tr key={i} className="border-t border-teal-100">
                <td className="py-1 text-neutral-800">{s.name}</td>
                <td className="py-1 text-right tabular-nums">{v}</td>
                <td
                  className="py-1 text-right tabular-nums"
                  title={`${pctOfWeight.toFixed(0)}% of max ${s.weight}`}
                >
                  {s.contribution.toFixed(1)} / {s.weight}
                </td>
                <td className="py-1 text-right text-neutral-500">
                  {s.source === "catalog" ? "catalog" : "personas"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-neutral-500 mt-2">
        Catalog signals are deterministic from the merchant's <span className="font-mono">/products.json</span>.
        Persona signals come from the verdicts above. The math lives in{" "}
        <span className="font-mono">lib/score/rubric.ts</span>.
      </p>
    </div>
  );
}
