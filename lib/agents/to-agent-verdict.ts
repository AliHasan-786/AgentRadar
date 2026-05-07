import type { VerdictSummary } from "../score/types";
import type { AgentVerdict } from "../types";
import type { PersonaRunResult } from "./runner";
import type { VerdictFlag } from "./verdict-parser";

// Adapt the runner's PersonaRunResult to the persisted AgentVerdict shape.
// Errors map to verdict="skipped" + populated `error` field — methodology
// page discloses: "verdict='skipped' with non-null `error` indicates a
// transport / parse failure rather than a model decision."
export function toAgentVerdict(
  run: PersonaRunResult,
  intent: string,
): AgentVerdict {
  const parsed = run.parsed;
  return {
    personaId: run.personaId,
    modelSlug: run.modelSlug,
    displayName: run.displayName,
    intent,
    verdict: parsed?.verdict ?? "skipped",
    topProductId: parsed?.topProductId ?? null,
    reasoning: parsed?.reasoning ?? "",
    gaps: parsed?.gaps ?? [],
    flags: run.flags ?? [],
    promptUsed: run.prompt,
    rawResponse: run.rawResponse,
    sampledProductIds: run.sampledProductIds,
    latencyMs: run.latencyMs,
    retried: run.retried,
    usage: run.usage,
    error: run.error,
  };
}

// Adapter for the /api/score VerdictSummary shape. Strips the heavy fields
// (raw response, prompts, sampledProductIds) not needed for downstream
// score computation but kept in the persisted demo JSON for transparency.
// `parsed` is null iff the runner had an error before producing output;
// otherwise the model emitted a real verdict (including legitimate
// "skipped" with reasoning and gaps).
export function toVerdictSummary(av: AgentVerdict): VerdictSummary {
  return {
    personaId: av.personaId,
    modelSlug: av.modelSlug,
    displayName: av.displayName,
    parsed: av.error
      ? null
      : {
          verdict: av.verdict,
          topProductId: av.topProductId,
          reasoning: av.reasoning,
          gaps: av.gaps,
          flags: av.flags as VerdictFlag[],
        },
    flags: av.flags as VerdictFlag[],
    error: av.error,
  };
}
