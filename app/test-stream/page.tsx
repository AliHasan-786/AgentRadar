"use client";

import { useCallback, useState } from "react";

interface PersonaState {
  personaId: string;
  modelSlug: string;
  displayName: string;
  intent: string;
  tokens: string;
  status: "idle" | "streaming" | "complete" | "error";
  verdict?: "recommended" | "ranked-low" | "skipped";
  topProductId?: string | null;
  reasoning?: string;
  gaps?: string[];
  flags?: string[];
  latencyMs?: number;
  error?: string;
  sampledProductIds?: string[];
}

interface CatalogReady {
  hostname: string;
  productCount: number;
  inferredVertical: string;
  catalogHasReviewSignal: boolean;
  tier: string;
}

interface ParsedSseEvent {
  event: string;
  data: unknown;
}

function* parseSseChunks(buffer: string): Generator<ParsedSseEvent> {
  // Yields one parsed event per "event:/data:" block separated by \n\n.
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
      // Drop unparseable
    }
  }
}

const VERDICT_PILL: Record<string, string> = {
  recommended: "bg-green-100 text-green-800 border-green-400",
  "ranked-low": "bg-amber-100 text-amber-800 border-amber-400",
  skipped: "bg-red-100 text-red-800 border-red-400",
};

export default function TestStreamPage() {
  const [url, setUrl] = useState("allbirds.com");
  const [tier, setTier] = useState<"live" | "build">("live");
  const [catalog, setCatalog] = useState<CatalogReady | null>(null);
  const [personas, setPersonas] = useState<Record<string, PersonaState>>({});
  const [running, setRunning] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [allComplete, setAllComplete] = useState(false);
  const [wallClockMs, setWallClockMs] = useState<number | null>(null);

  const updatePersona = useCallback(
    (id: string, patch: Partial<PersonaState>) => {
      setPersonas((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? ({} as PersonaState)), ...patch },
      }));
    },
    [],
  );

  const start = useCallback(async () => {
    setRunning(true);
    setCatalog(null);
    setPersonas({});
    setGlobalError(null);
    setAllComplete(false);
    setWallClockMs(null);
    const t0 = Date.now();

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, tier }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text();
        setGlobalError(`HTTP ${res.status}: ${text.slice(0, 240)}`);
        setRunning(false);
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
          if (evt.event === "catalog-ready") {
            setCatalog(evt.data as CatalogReady);
          } else if (evt.event === "persona-start") {
            const d = evt.data as PersonaState & { personaId: string };
            updatePersona(d.personaId, {
              personaId: d.personaId,
              modelSlug: d.modelSlug,
              displayName: d.displayName,
              intent: d.intent,
              sampledProductIds: d.sampledProductIds,
              tokens: "",
              status: "streaming",
            });
          } else if (evt.event === "persona-token") {
            const d = evt.data as { personaId: string; token: string };
            setPersonas((prev) => {
              const cur = prev[d.personaId];
              if (!cur) return prev;
              return {
                ...prev,
                [d.personaId]: { ...cur, tokens: cur.tokens + d.token },
              };
            });
          } else if (evt.event === "persona-complete") {
            const d = evt.data as {
              personaId: string;
              parsed: {
                verdict: PersonaState["verdict"];
                topProductId: string | null;
                reasoning: string;
                gaps: string[];
              } | null;
              flags: string[];
              latencyMs: number;
              error: string | null;
            };
            updatePersona(d.personaId, {
              status: d.error ? "error" : "complete",
              verdict: d.parsed?.verdict,
              topProductId: d.parsed?.topProductId ?? null,
              reasoning: d.parsed?.reasoning,
              gaps: d.parsed?.gaps ?? [],
              flags: d.flags ?? [],
              latencyMs: d.latencyMs,
              error: d.error ?? undefined,
            });
          } else if (evt.event === "persona-error") {
            const d = evt.data as {
              personaId: string;
              modelSlug?: string;
              displayName?: string;
              error: string;
              latencyMs?: number;
            };
            updatePersona(d.personaId, {
              status: "error",
              error: d.error,
              latencyMs: d.latencyMs,
              modelSlug: d.modelSlug ?? "",
              displayName: d.displayName ?? "",
            });
          } else if (evt.event === "all-complete") {
            setAllComplete(true);
            setWallClockMs(Date.now() - t0);
          }
        }
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [url, tier, updatePersona]);

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10 font-sans">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">AgentRadar — SSE smoke test</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Sprint 3: streaming /api/analyze end-to-end. Each persona row
          renders skeleton, fills tokens incrementally, then animates verdict.
        </p>

        <div className="flex gap-2 items-end mb-8">
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              Store URL
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={running}
              className="border border-neutral-300 rounded px-3 py-2 text-sm font-mono"
              placeholder="allbirds.com"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              Tier
            </span>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as "live" | "build")}
              disabled={running}
              className="border border-neutral-300 rounded px-3 py-2 text-sm"
            >
              <option value="live">live (free-tier-safe)</option>
              <option value="build">build (premium models)</option>
            </select>
          </label>
          <button
            onClick={start}
            disabled={running}
            className="bg-teal-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {running ? "Streaming…" : "Run analysis"}
          </button>
        </div>

        {globalError && (
          <div className="mb-6 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <strong>Error:</strong> {globalError}
          </div>
        )}

        {catalog && (
          <div className="mb-6 rounded border border-neutral-200 bg-white px-4 py-3 text-sm">
            <div className="font-mono text-xs text-neutral-500 mb-1">
              CATALOG READY
            </div>
            <div>
              <strong>{catalog.hostname}</strong> · {catalog.productCount}{" "}
              canonical products · vertical:{" "}
              <span className="font-mono">{catalog.inferredVertical}</span> ·
              tier: <span className="font-mono">{catalog.tier}</span> ·
              review signal:{" "}
              <span className="font-mono">
                {catalog.catalogHasReviewSignal ? "present" : "absent"}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {Object.values(personas).map((p) => (
            <div
              key={p.personaId}
              className="rounded border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{p.personaId}</div>
                  <div className="text-xs text-neutral-500 font-mono">
                    {p.displayName} · {p.modelSlug}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.status === "streaming" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  )}
                  {p.verdict && (
                    <span
                      className={`px-2 py-0.5 rounded border text-xs font-medium ${VERDICT_PILL[p.verdict] ?? ""}`}
                    >
                      {p.verdict}
                    </span>
                  )}
                  {p.status === "error" && (
                    <span className="px-2 py-0.5 rounded border border-red-400 bg-red-50 text-red-800 text-xs">
                      error
                    </span>
                  )}
                  {p.latencyMs != null && (
                    <span className="text-xs text-neutral-500 font-mono">
                      {p.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-neutral-600 italic mb-2">
                &ldquo;{p.intent}&rdquo;
              </div>
              {p.tokens && (
                <pre className="text-xs font-mono whitespace-pre-wrap text-neutral-800 bg-neutral-50 rounded p-2 max-h-64 overflow-y-auto">
                  {p.tokens}
                </pre>
              )}
              {p.error && (
                <div className="text-xs text-red-700 mt-2">{p.error}</div>
              )}
              {p.flags && p.flags.length > 0 && (
                <div className="text-xs text-amber-700 mt-2">
                  flags: {p.flags.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>

        {allComplete && wallClockMs != null && (
          <div className="mt-6 text-xs text-neutral-500 font-mono">
            all-complete · wall clock {wallClockMs}ms
          </div>
        )}
      </div>
    </main>
  );
}
