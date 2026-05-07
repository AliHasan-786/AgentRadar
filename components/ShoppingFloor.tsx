"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentRow } from "./AgentRow";
import { AgentTranscriptModal } from "./AgentTranscriptModal";
import { MethodologyFooter } from "./MethodologyFooter";
import { RecommendationsList } from "./RecommendationsList";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { ScoreDial } from "./ScoreDial";
import type { ScoreResult } from "@/lib/score/types";
import type { AgentVerdict, CatalogMetadata } from "@/lib/types";

interface Props {
  storeName: string;
  hostname: string;
  vertical: string;
  capturedAt?: string;
  metadata: CatalogMetadata;
  verdicts: AgentVerdict[];
  score: ScoreResult;
  // When true, we're rendering against a captured demo; the score dial
  // skips the count-up animation and the "rerun" button is hidden.
  cached: boolean;
}

const PERSONA_LABEL: Record<string, string> = {
  "sustainable-runner": "sustainable-runner",
  "arch-support-shopper": "arch-support-shopper",
  "daily-walker-gift": "daily-walker-gift",
  "minimalist-traveler": "minimalist-traveler",
  "vegan-with-reviews": "vegan-with-reviews",
};

export function ShoppingFloor({
  storeName,
  hostname,
  vertical,
  capturedAt,
  metadata,
  verdicts,
  score,
  cached,
}: Props) {
  const [activeVerdict, setActiveVerdict] = useState<AgentVerdict | null>(null);

  const okCount = verdicts.filter((v) => !v.error).length;
  const modelPanelLabel = `panel: ${[...new Set(verdicts.map((v) => v.displayName))].slice(0, 5).join(", ")}`;

  return (
    <article className="space-y-8">
      {/* Header strip */}
      <header className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-4">
        <div>
          <Link
            href="/"
            className="text-xs text-neutral-500 hover:text-neutral-900 font-mono"
          >
            ← back
          </Link>
          <h1 className="text-2xl font-bold mt-2">{storeName}</h1>
          <div className="text-sm text-neutral-600 mt-1 font-mono">
            {hostname} · {metadata.productCount} canonical products · vertical:{" "}
            <span className="text-neutral-900">{vertical}</span>
          </div>
          {cached && capturedAt && (
            <div className="text-[11px] text-neutral-500 mt-1 font-mono">
              cached analysis from{" "}
              {new Date(capturedAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </div>
        <ScoreDial value={score.overall} animateMs={cached ? 0 : 600} />
      </header>

      {/* Agent rows */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-3">
          5 AI shoppers · 5 real queries · {okCount}/{verdicts.length} verdicts returned
        </h2>
        <div className="space-y-3">
          {verdicts.map((v) => (
            <AgentRow
              key={v.personaId}
              personaId={PERSONA_LABEL[v.personaId] ?? v.personaId}
              modelDisplayName={v.displayName}
              modelSlug={v.modelSlug}
              intent={v.intent}
              state={
                v.error
                  ? { phase: "error", verdict: v }
                  : { phase: "complete", verdict: v }
              }
              onShowTranscript={() => setActiveVerdict(v)}
            />
          ))}
        </div>
      </section>

      {/* Score breakdown */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-3">
          Score breakdown · click any dimension to see contributing signals
        </h2>
        <ScoreBreakdown score={score} />
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-3">
          Recommendations · ranked by leverage
        </h2>
        <RecommendationsList recommendations={score.recommendations} />
      </section>

      <MethodologyFooter
        capturedAt={cached ? capturedAt : undefined}
        productsSampled={30}
        modelPanelLabel={modelPanelLabel}
      />

      <AgentTranscriptModal
        verdict={activeVerdict}
        onClose={() => setActiveVerdict(null)}
      />
    </article>
  );
}
