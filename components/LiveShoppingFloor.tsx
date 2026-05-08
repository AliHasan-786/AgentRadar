"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AgentRow, type AgentRowState } from "./AgentRow";
import { AgentTranscriptModal } from "./AgentTranscriptModal";
import { MethodologyFooter } from "./MethodologyFooter";
import { RecommendationsList } from "./RecommendationsList";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { ScoreDial } from "./ScoreDial";
import { PERSONAS } from "@/lib/agents/personas";
import type { ScoreResult } from "@/lib/score/types";
import type { AgentVerdict } from "@/lib/types";

interface CatalogReady {
  hostname: string;
  productCount: number;
  inferredVertical: string;
  catalogHasReviewSignal: boolean;
  tier: string;
}

type PersonaPhase = AgentRowState["phase"];

interface PersonaInternal {
  personaId: string;
  modelSlug: string;
  displayName: string;
  intent: string;
  phase: PersonaPhase;
  partialText: string;
  // Captured from the persona-start SSE event so the transcript modal +
  // sample-count footer have the right data when the persona completes.
  // Without this we'd render "0 products sampled" and an empty prompt
  // body in every transcript modal on the live flow.
  sampledProductIds: string[];
  prompt: { system: string; user: string };
  verdict?: AgentVerdict;
}

interface Props {
  hostname: string;
  tier?: "build" | "live";
}

function emptyPersonaState(): Record<string, PersonaInternal> {
  const map: Record<string, PersonaInternal> = {};
  for (const p of PERSONAS) {
    map[p.id] = {
      personaId: p.id,
      modelSlug: p.liveModel,
      displayName: p.liveDisplayName,
      intent: p.intent,
      phase: "idle",
      partialText: "",
      sampledProductIds: [],
      prompt: { system: "", user: "" },
    };
  }
  return map;
}

function* parseSseChunks(buffer: string): Generator<{ event: string; data: unknown }> {
  const blocks = buffer.split("\n\n");
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    let eventName = "";
    let dataStr = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) eventName = line.slice(7).trim();
      else if (line.startsWith("data: ")) dataStr += line.slice(6);
      else if (line.startsWith(":")) continue;
    }
    if (!eventName || !dataStr) continue;
    try {
      yield { event: eventName, data: JSON.parse(dataStr) };
    } catch {
      // skip unparseable
    }
  }
}

export function LiveShoppingFloor({ hostname, tier = "live" }: Props) {
  const [catalog, setCatalog] = useState<CatalogReady | null>(null);
  const [personas, setPersonas] = useState<Record<string, PersonaInternal>>(
    emptyPersonaState(),
  );
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [allComplete, setAllComplete] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeVerdict, setActiveVerdict] = useState<AgentVerdict | null>(null);
  const [wallClockMs, setWallClockMs] = useState<number | null>(null);
  const startedRef = useRef(false);

  const startRun = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    const t0 = Date.now();

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: hostname, tier }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text();
        setGlobalError(`HTTP ${res.status}: ${text.slice(0, 240)}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lastBoundary = buffer.lastIndexOf("\n\n");
        if (lastBoundary < 0) continue;
        const ready = buffer.slice(0, lastBoundary);
        buffer = buffer.slice(lastBoundary + 2);
        for (const evt of parseSseChunks(ready)) {
          handleEvent(evt.event, evt.data, t0);
        }
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : String(err));
    }
  }, [hostname, tier]);

  function handleEvent(event: string, data: unknown, t0: number) {
    if (event === "catalog-ready") {
      setCatalog(data as CatalogReady);
    } else if (event === "persona-start") {
      const d = data as {
        personaId: string;
        modelSlug: string;
        displayName: string;
        intent: string;
        sampledProductIds: string[];
        prompt: { system: string; user: string };
      };
      setPersonas((prev) => ({
        ...prev,
        [d.personaId]: {
          ...prev[d.personaId],
          modelSlug: d.modelSlug,
          displayName: d.displayName,
          intent: d.intent,
          phase: "streaming",
          partialText: "",
          sampledProductIds: d.sampledProductIds,
          prompt: d.prompt,
        },
      }));
    } else if (event === "persona-token") {
      const d = data as { personaId: string; token: string };
      setPersonas((prev) => {
        const cur = prev[d.personaId];
        if (!cur) return prev;
        return {
          ...prev,
          [d.personaId]: { ...cur, partialText: cur.partialText + d.token },
        };
      });
    } else if (event === "persona-complete") {
      const d = data as {
        personaId: string;
        modelSlug: string;
        displayName: string;
        parsed: {
          verdict: AgentVerdict["verdict"];
          topProductId: string | null;
          reasoning: string;
          gaps: string[];
          flags: string[];
        } | null;
        flags: string[];
        rawResponse: string;
        latencyMs: number;
        usage: AgentVerdict["usage"];
        error: string | null;
      };
      const persona = PERSONAS.find((p) => p.id === d.personaId);
      setPersonas((prev) => {
        const cur = prev[d.personaId];
        const verdict: AgentVerdict = {
          personaId: d.personaId,
          modelSlug: d.modelSlug,
          displayName: d.displayName,
          intent: persona?.intent ?? "",
          verdict: d.parsed?.verdict ?? "skipped",
          topProductId: d.parsed?.topProductId ?? null,
          reasoning: d.parsed?.reasoning ?? "",
          gaps: d.parsed?.gaps ?? [],
          flags: d.flags,
          // Pull from start-event state so the transcript modal renders
          // the actual prompt + sample IDs the model saw.
          promptUsed: cur?.prompt ?? { system: "", user: "" },
          rawResponse: d.rawResponse,
          sampledProductIds: cur?.sampledProductIds ?? [],
          latencyMs: d.latencyMs,
          retried: false,
          usage: d.usage,
          error: d.error,
        };
        return {
          ...prev,
          [d.personaId]: {
            ...cur,
            phase: d.error ? "error" : "complete",
            verdict,
          },
        };
      });
    } else if (event === "persona-error") {
      const d = data as {
        personaId: string;
        modelSlug?: string;
        displayName?: string;
        error: string;
        latencyMs?: number;
      };
      const persona = PERSONAS.find((p) => p.id === d.personaId);
      setPersonas((prev) => {
        const cur = prev[d.personaId];
        const verdict: AgentVerdict = {
          personaId: d.personaId,
          modelSlug: d.modelSlug ?? persona?.liveModel ?? "",
          displayName: d.displayName ?? persona?.liveDisplayName ?? "",
          intent: persona?.intent ?? "",
          verdict: "skipped",
          topProductId: null,
          reasoning: "",
          gaps: [],
          flags: [],
          // Even on error, surface whatever prompt the runner did build —
          // useful for diagnosing why it failed.
          promptUsed: cur?.prompt ?? { system: "", user: "" },
          rawResponse: "",
          sampledProductIds: cur?.sampledProductIds ?? [],
          latencyMs: d.latencyMs ?? 0,
          retried: false,
          usage: null,
          error: d.error,
        };
        return {
          ...prev,
          [d.personaId]: {
            ...cur,
            phase: "error",
            verdict,
          },
        };
      });
    } else if (event === "score-ready") {
      const d = data as { score: ScoreResult };
      setScore(d.score);
    } else if (event === "all-complete") {
      setAllComplete(true);
      setWallClockMs(Date.now() - t0);
    }
  }

  useEffect(() => {
    startRun();
  }, [startRun]);

  const personaList = PERSONAS.map((p) => personas[p.id]);
  const okCount = personaList.filter(
    (p) => p.phase === "complete" && !p.verdict?.error,
  ).length;
  // Vertical-mismatch detection: if 4+ of 5 successful personas all
  // skipped, the catalog is probably in a different vertical from the
  // (footwear-calibrated) panel. The wall of red pills then looks like
  // a broken tool to a recruiter; the banner converts that into an
  // explicit constraint disclosure.
  const successfulVerdicts = personaList.filter(
    (p) => p.phase === "complete" && p.verdict && !p.verdict.error,
  );
  const skippedAmongSuccessful = successfulVerdicts.filter(
    (p) => p.verdict!.verdict === "skipped",
  ).length;
  const verticalMismatch =
    allComplete &&
    successfulVerdicts.length >= 3 &&
    skippedAmongSuccessful / successfulVerdicts.length >= 0.8;

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
          <h1 className="text-2xl font-bold mt-2">{hostname}</h1>
          <div className="text-sm text-neutral-600 mt-1 font-mono">
            {catalog ? (
              <>
                {catalog.productCount} canonical products · vertical:{" "}
                <span className="text-neutral-900">{catalog.inferredVertical}</span>
              </>
            ) : (
              <span className="text-neutral-400">fetching catalog…</span>
            )}
          </div>
          <div className="text-[11px] text-teal-700 mt-1 font-mono">
            {allComplete && wallClockMs != null
              ? `live analysis · completed in ${(wallClockMs / 1000).toFixed(1)}s`
              : "live analysis · streaming verdicts in real time"}
          </div>
        </div>
        <ScoreDial value={score?.overall ?? null} animateMs={600} />
      </header>

      {globalError && (
        <div className="rounded border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <strong>Error:</strong> {globalError}
        </div>
      )}

      {verticalMismatch && (
        <div className="rounded-md border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 leading-relaxed">
          <div className="font-semibold mb-1">
            Vertical mismatch — most personas skipped this catalog.
          </div>
          <p className="text-[13px]">
            The default persona panel is calibrated to footwear (sustainable
            runner, arch-support shopper, daily walker, minimalist sneaker
            traveler, vegan shoes). The personas correctly identified that{" "}
            <code className="font-mono">{hostname}</code> is in a different
            vertical and skipped — this is the system being epistemically
            honest, not broken. The dimension scores and recommendations
            below are <strong>vertical-agnostic</strong> and still apply:
            they measure catalog hygiene (description length, tag richness,
            taxonomy depth, policy keywords, review schema) regardless of
            what the merchant sells.
          </p>
        </div>
      )}

      {/* Agent rows */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-3">
          5 AI shoppers · 5 real queries
          {allComplete && (
            <span className="ml-2 text-neutral-700">
              · {okCount}/{personaList.length} verdicts returned
              {wallClockMs != null && ` in ${(wallClockMs / 1000).toFixed(1)}s`}
            </span>
          )}
        </h2>
        <div className="space-y-3">
          {personaList.map((p) => {
            const state: AgentRowState =
              p.phase === "idle"
                ? { phase: "idle" }
                : p.phase === "streaming"
                  ? { phase: "streaming", partialText: p.partialText }
                  : p.phase === "complete" && p.verdict
                    ? { phase: "complete", verdict: p.verdict }
                    : p.phase === "error" && p.verdict
                      ? { phase: "error", verdict: p.verdict }
                      : { phase: "idle" };
            return (
              <AgentRow
                key={p.personaId}
                personaId={p.personaId}
                modelDisplayName={p.displayName}
                modelSlug={p.modelSlug}
                intent={p.intent}
                state={state}
                onShowTranscript={
                  p.verdict ? () => setActiveVerdict(p.verdict!) : undefined
                }
              />
            );
          })}
        </div>
      </section>

      {/* Score breakdown — fades in once score-ready fires */}
      {score && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-3">
            Score breakdown · click any dimension to see contributing signals
          </h2>
          <ScoreBreakdown score={score} />
        </section>
      )}

      {/* Recommendations */}
      {score && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-3">
            Recommendations · ranked by leverage
          </h2>
          <RecommendationsList recommendations={score.recommendations} />
        </section>
      )}

      <MethodologyFooter
        productsSampled={30}
        modelPanelLabel={`panel: ${[...new Set(personaList.map((p) => p.displayName))].join(", ")}`}
      />

      <AgentTranscriptModal
        verdict={activeVerdict}
        onClose={() => setActiveVerdict(null)}
      />
    </article>
  );
}
