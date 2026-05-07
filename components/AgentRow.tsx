"use client";

import type { AgentVerdict } from "@/lib/types";

export type AgentRowState =
  | { phase: "idle"; verdict?: undefined }
  | { phase: "streaming"; partialText: string; verdict?: undefined }
  | { phase: "complete"; verdict: AgentVerdict }
  | { phase: "error"; verdict: AgentVerdict };

interface Props {
  personaId: string;
  modelDisplayName: string;
  modelSlug: string;
  intent: string;
  state: AgentRowState;
  onShowTranscript?: () => void;
}

const VERDICT_PILL: Record<string, string> = {
  recommended:
    "bg-emerald-50 text-emerald-800 border-emerald-300",
  "ranked-low": "bg-amber-50 text-amber-800 border-amber-300",
  skipped: "bg-rose-50 text-rose-800 border-rose-300",
};

const VERDICT_ICON: Record<string, string> = {
  recommended: "✓",
  "ranked-low": "—",
  skipped: "✕",
};

export function AgentRow({
  personaId,
  modelDisplayName,
  modelSlug,
  intent,
  state,
  onShowTranscript,
}: Props) {
  const verdict =
    state.phase === "complete" || state.phase === "error"
      ? state.verdict
      : undefined;
  const showTranscriptDisabled =
    state.phase === "idle" || state.phase === "streaming";

  return (
    <div className="border border-neutral-200 bg-white rounded-md p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{personaId}</div>
          <div className="text-xs text-neutral-500 font-mono truncate">
            {modelDisplayName} · {modelSlug}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {state.phase === "streaming" && (
            <span
              className="inline-block w-2 h-2 rounded-full bg-teal-600 animate-pulse"
              aria-label="streaming"
            />
          )}
          {state.phase === "error" && (
            <span
              className="px-2 py-0.5 rounded border border-rose-400 bg-rose-50 text-rose-800 text-xs font-medium"
              aria-label="error verdict"
            >
              <span className="mr-1" aria-hidden>
                !
              </span>
              error
            </span>
          )}
          {state.phase === "complete" && verdict && (
            <span
              className={`px-2 py-0.5 rounded border text-xs font-medium ${VERDICT_PILL[verdict.verdict] ?? ""}`}
              aria-label={`verdict: ${verdict.verdict}`}
            >
              <span className="mr-1" aria-hidden>
                {VERDICT_ICON[verdict.verdict]}
              </span>
              {verdict.verdict}
            </span>
          )}
        </div>
      </div>

      <div className="text-xs italic text-neutral-600 mb-2">
        &ldquo;{intent}&rdquo;
      </div>

      {state.phase === "streaming" && state.partialText && (
        <pre className="font-mono text-[11px] text-neutral-700 whitespace-pre-wrap max-h-32 overflow-y-auto bg-neutral-50 rounded p-2">
          {state.partialText}
        </pre>
      )}

      {verdict && !verdict.error && verdict.reasoning && (
        <p className="text-sm text-neutral-800 leading-snug">
          {verdict.reasoning}
        </p>
      )}

      {verdict?.error && (
        <p className="text-xs text-rose-700 font-mono">{verdict.error}</p>
      )}

      {verdict && verdict.flags.length > 0 && (
        <div className="mt-2 text-xs text-amber-800 font-mono">
          flags: {verdict.flags.join(", ")}
        </div>
      )}

      {onShowTranscript && (
        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="text-xs text-neutral-500 font-mono">
            {state.phase === "complete" && verdict
              ? `${verdict.latencyMs}ms · ${verdict.sampledProductIds.length} products sampled`
              : state.phase === "error" && verdict
                ? `${verdict.latencyMs}ms · errored`
                : ""}
          </div>
          <button
            onClick={onShowTranscript}
            disabled={showTranscriptDisabled}
            className="text-xs text-teal-700 hover:text-teal-900 font-medium disabled:text-neutral-300 disabled:cursor-not-allowed"
          >
            show prompt and response →
          </button>
        </div>
      )}
    </div>
  );
}
