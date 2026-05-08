"use client";

import { useEffect, useRef } from "react";
import type { AgentVerdict } from "@/lib/types";

interface Props {
  verdict: AgentVerdict | null;
  onClose: () => void;
}

const VERDICT_COLOR: Record<string, string> = {
  recommended: "text-emerald-700 bg-emerald-50 border-emerald-300",
  "ranked-low": "text-amber-700 bg-amber-50 border-amber-300",
  skipped: "text-rose-700 bg-rose-50 border-rose-300",
};

export function AgentTranscriptModal({ verdict, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!verdict) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [verdict, onClose]);

  if (!verdict) return null;

  const flagPills = verdict.flags.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Transcript for ${verdict.personaId}`}
      className="fixed inset-0 z-50 bg-black/60 flex items-stretch md:items-center justify-center p-0 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white max-h-full md:max-h-[90vh] w-full md:max-w-4xl flex flex-col rounded-none md:rounded-lg shadow-lg outline-none"
      >
        <header className="px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-1">
              Persona transcript
            </div>
            <div className="font-semibold text-base">{verdict.personaId}</div>
            <div className="text-xs text-neutral-500 font-mono mt-1">
              {verdict.displayName} · {verdict.modelSlug} · {verdict.latencyMs}ms
              {verdict.retried ? " · retried after malformed JSON" : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {verdict.error ? (
              <span className="px-2 py-0.5 rounded border border-rose-300 bg-rose-50 text-rose-800 text-xs">
                error
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded border text-xs font-medium ${VERDICT_COLOR[verdict.verdict]}`}
              >
                {verdict.verdict}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-900 text-2xl leading-none px-2 -mr-2"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-5 text-sm">
          <Section label="Shopper intent">
            <p className="italic text-neutral-700">&ldquo;{verdict.intent}&rdquo;</p>
          </Section>

          {flagPills && (
            <Section label="Methodology flags">
              <div className="flex flex-wrap gap-2">
                {verdict.flags.map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 text-xs font-mono"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Flags surface methodology integrity checks (invalid JSON,
                invented product IDs, references to data not in the catalog).
                See /methodology for what each flag means.
              </p>
            </Section>
          )}

          {verdict.error ? (
            <Section label="Error">
              <pre className="text-xs font-mono text-rose-700 whitespace-pre-wrap bg-rose-50 border border-rose-200 rounded p-3">
                {verdict.error}
              </pre>
            </Section>
          ) : (
            <>
              <Section label="Verdict">
                <div className="font-medium">{verdict.verdict}</div>
                {verdict.topProductId && (
                  <div className="text-xs text-neutral-600 font-mono mt-1">
                    top product id: {verdict.topProductId}
                  </div>
                )}
              </Section>
              <Section label="Reasoning">
                <p className="text-neutral-800 leading-relaxed">{verdict.reasoning}</p>
              </Section>
              {verdict.gaps.length > 0 && (
                <Section label="Catalog data gaps reported">
                  <ul className="list-disc list-inside space-y-1 text-neutral-800">
                    {verdict.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}

          <Section label="System prompt">
            <pre className="text-xs font-mono whitespace-pre-wrap bg-neutral-50 border border-neutral-200 rounded p-3 text-neutral-800">
              {verdict.promptUsed.system}
            </pre>
          </Section>

          <Section
            label={`User prompt (${verdict.sampledProductIds.length} products sampled)`}
          >
            <pre className="text-xs font-mono whitespace-pre-wrap bg-neutral-50 border border-neutral-200 rounded p-3 text-neutral-800 max-h-80 overflow-y-auto">
              {verdict.promptUsed.user}
            </pre>
          </Section>

          <Section label="Raw model response">
            <pre className="text-xs font-mono whitespace-pre-wrap bg-neutral-50 border border-neutral-200 rounded p-3 text-neutral-800 max-h-72 overflow-y-auto">
              {verdict.rawResponse || "(empty)"}
            </pre>
          </Section>

          {verdict.usage && (
            <Section label="Token usage">
              <div className="text-xs text-neutral-600 font-mono">
                prompt={verdict.usage.promptTokens} ·{" "}
                completion={verdict.usage.completionTokens} ·{" "}
                total={verdict.usage.totalTokens}
              </div>
            </Section>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 text-xs text-neutral-600">
          Real LLM call · prompt and response shown verbatim · part of the
          methodology contract.
        </footer>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-mono mb-2">
        {label}
      </h3>
      {children}
    </section>
  );
}
