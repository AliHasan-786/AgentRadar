// Async-iterator wrapper that emits per-persona stream events. Provider-
// agnostic: uses lib/agents/dispatch.ts to route to OpenRouter or Gemini
// AI Studio based on the persona's slug. Each persona yields:
//   - one `start` event (when the LLM call begins)
//   - one `token` event per content delta from the upstream stream
//   - one `complete` event (with parsed verdict + flags) at end of stream
//   - one `error` event on failure (no retries on stream — bad-JSON retry
//     only makes sense in non-stream runner)

import { dispatchStream, type NormalizedUsage } from "./dispatch";
import { modelForPersona, type Persona } from "./personas";
import { buildPersonaPrompt, sampleForPersona } from "./prompts";
import {
  parseVerdict,
  type ParsedVerdict,
  type VerdictFlag,
} from "./verdict-parser";
import type { CanonicalProduct } from "../types";

const SAMPLE_LIMIT = 30;

export type StreamEvent =
  | {
      type: "start";
      personaId: string;
      modelSlug: string;
      displayName: string;
      intent: string;
      sampledProductIds: string[];
      prompt: { system: string; user: string };
    }
  | { type: "token"; personaId: string; token: string }
  | {
      type: "complete";
      personaId: string;
      modelSlug: string;
      displayName: string;
      parsed: ParsedVerdict | null;
      flags: VerdictFlag[];
      rawResponse: string;
      latencyMs: number;
      usage: NormalizedUsage | null;
      error: string | null;
    }
  | {
      type: "error";
      personaId: string;
      modelSlug: string;
      displayName: string;
      error: string;
      latencyMs: number;
    };

interface StreamOptions {
  tier: "build" | "live";
  catalogHasReviewSignal: boolean;
  abortSignal?: AbortSignal;
}

export async function* streamPersona(
  persona: Persona,
  catalog: CanonicalProduct[],
  options: StreamOptions,
): AsyncGenerator<StreamEvent> {
  const { slug, displayName } = modelForPersona(persona, options.tier);
  const sampled = sampleForPersona(
    catalog,
    persona.intent,
    SAMPLE_LIMIT,
    persona.expansionKeywords,
  );
  const prompt = buildPersonaPrompt(persona.intent, sampled);

  yield {
    type: "start",
    personaId: persona.id,
    modelSlug: slug,
    displayName,
    intent: persona.intent,
    sampledProductIds: sampled.map((p) => p.id),
    prompt,
  };

  const t0 = Date.now();
  let accumulated = "";
  let usage: NormalizedUsage | null = null;
  try {
    for await (const chunk of dispatchStream(
      {
        slug,
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
        temperature: 0.2,
        maxTokens: 800,
      },
      { abortSignal: options.abortSignal },
    )) {
      if (chunk.type === "delta" && chunk.delta) {
        accumulated += chunk.delta;
        yield { type: "token", personaId: persona.id, token: chunk.delta };
      } else if (chunk.type === "done") {
        usage = chunk.usage ?? null;
      }
    }
  } catch (err) {
    yield {
      type: "error",
      personaId: persona.id,
      modelSlug: slug,
      displayName,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - t0,
    };
    return;
  }

  const parseResult = parseVerdict(accumulated, {
    sampledProducts: sampled,
    catalogHasReviewSignal: options.catalogHasReviewSignal,
  });

  yield {
    type: "complete",
    personaId: persona.id,
    modelSlug: slug,
    displayName,
    parsed: parseResult.parsed,
    flags: parseResult.flags,
    rawResponse: accumulated,
    latencyMs: Date.now() - t0,
    usage,
    error: parseResult.ok ? null : parseResult.errorMessage ?? null,
  };
}
