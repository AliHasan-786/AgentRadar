"use client";

import { useState } from "react";
import type { DimensionId, Recommendation } from "@/lib/score/types";

interface Props {
  recommendations: Recommendation[];
}

const DIMENSION_TAG: Record<DimensionId, string> = {
  discoverability: "discoverability",
  description: "description",
  schema: "schema",
  trust: "trust",
};

const DIMENSION_TAG_COLOR: Record<DimensionId, string> = {
  discoverability: "bg-sky-50 text-sky-800 border-sky-300",
  description: "bg-violet-50 text-violet-800 border-violet-300",
  schema: "bg-amber-50 text-amber-800 border-amber-300",
  trust: "bg-emerald-50 text-emerald-800 border-emerald-300",
};

export function RecommendationsList({ recommendations }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (recommendations.length === 0) {
    return (
      <section>
        <div className="rounded-md border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-900">
          No recommendations triggered. The catalog is clearing every rubric
          rule&apos;s threshold — uncommon and noteworthy.
        </div>
      </section>
    );
  }

  const top3 = recommendations.slice(0, 3);
  const rest = recommendations.slice(3);
  const visible = showAll ? recommendations : top3;

  return (
    <section>
      <div className="space-y-2">
        {visible.map((r, i) => {
          const expanded = expandedId === r.id;
          const isTop3 = i < 3;
          return (
            <div
              key={r.id}
              className={`rounded-md border bg-white px-4 py-3 ${isTop3 ? "border-neutral-300" : "border-neutral-200"}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 px-2 py-0.5 rounded bg-teal-700 text-white text-xs font-bold tabular-nums"
                  aria-label={`${r.pointsLift} point lift`}
                >
                  +{r.pointsLift}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${DIMENSION_TAG_COLOR[r.dimension]}`}
                    >
                      {DIMENSION_TAG[r.dimension]}
                    </span>
                    <span className="font-semibold text-sm text-neutral-900">
                      {r.title}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700 leading-snug">
                    {r.description}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                    <span className="font-mono">
                      affects {r.productCount} products
                    </span>
                    <button
                      onClick={() => setExpandedId(expanded ? null : r.id)}
                      className="text-teal-700 hover:text-teal-900 font-medium"
                      aria-expanded={expanded}
                    >
                      {expanded ? "hide evidence ↑" : "show evidence ↓"}
                    </button>
                  </div>
                  {expanded && r.evidence.length > 0 && (
                    <ul className="mt-2 pt-2 border-t border-neutral-100 text-xs text-neutral-700 space-y-1 list-disc list-inside">
                      {r.evidence.map((e, ei) => (
                        <li key={ei}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs text-teal-700 hover:text-teal-900 font-medium"
          aria-expanded={showAll}
        >
          {showAll
            ? `hide ${rest.length} additional recommendation${rest.length > 1 ? "s" : ""} ↑`
            : `see all ${recommendations.length} recommendations →`}
        </button>
      )}

      <p className="mt-3 text-[11px] text-neutral-500">
        Recommendations are deterministic rule outputs from{" "}
        <span className="font-mono">lib/recommendations/rules.ts</span>, not
        model-generated. Lift estimates are calibrated to the rubric, not
        promises of post-fix score improvement.
      </p>
    </section>
  );
}
