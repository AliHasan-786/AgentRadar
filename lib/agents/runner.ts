import type { CanonicalProduct } from "../types";
import { dispatchChat, type NormalizedUsage } from "./dispatch";
import { modelForPersona, type Persona } from "./personas";
import { buildPersonaPrompt, sampleForPersona } from "./prompts";
import {
  parseVerdict,
  type ParsedVerdict,
  type VerdictFlag,
} from "./verdict-parser";

export interface PersonaRunResult {
  personaId: string;
  modelSlug: string;
  displayName: string;
  intent: string;
  prompt: { system: string; user: string };
  rawResponse: string;
  parsed: ParsedVerdict | null;
  flags: VerdictFlag[];
  retried: boolean;
  latencyMs: number;
  usage: NormalizedUsage | null;
  error: string | null;
  sampledProductIds: string[];
}

const SAMPLE_LIMIT = 30;
const RETRY_NUDGE = `Your previous response was not valid JSON. Output only a single JSON object with the four required fields. No prose. No code fences.`;

export async function runPersona(
  persona: Persona,
  catalog: CanonicalProduct[],
  options: {
    tier?: "build" | "live";
    catalogHasReviewSignal: boolean;
    temperature?: number;
  },
): Promise<PersonaRunResult> {
  const tier = options.tier ?? "live";
  const { slug, displayName } = modelForPersona(persona, tier);
  const sampled = sampleForPersona(
    catalog,
    persona.intent,
    SAMPLE_LIMIT,
    persona.expansionKeywords,
  );
  const prompt = buildPersonaPrompt(persona.intent, sampled);

  const t0 = Date.now();
  let response;
  try {
    response = await dispatchChat({
      slug,
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      temperature: options.temperature ?? 0.2,
      maxTokens: 800,
      jsonMode: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      personaId: persona.id,
      modelSlug: slug,
      displayName,
      intent: persona.intent,
      prompt,
      rawResponse: "",
      parsed: null,
      flags: [],
      retried: false,
      latencyMs: Date.now() - t0,
      usage: null,
      error: msg,
      sampledProductIds: sampled.map((p) => p.id),
    };
  }

  const rawResponse = response.text;
  let parseResult = parseVerdict(rawResponse, {
    sampledProducts: sampled,
    catalogHasReviewSignal: options.catalogHasReviewSignal,
  });

  let retried = false;
  let finalRaw = rawResponse;
  if (!parseResult.ok && parseResult.flags.includes("invalid-json")) {
    retried = true;
    try {
      const retryResp = await dispatchChat({
        slug,
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
        assistantPrior: rawResponse,
        retryNudge: RETRY_NUDGE,
        temperature: 0,
        maxTokens: 800,
        jsonMode: true,
      });
      finalRaw = retryResp.text;
      parseResult = parseVerdict(finalRaw, {
        sampledProducts: sampled,
        catalogHasReviewSignal: options.catalogHasReviewSignal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        personaId: persona.id,
        modelSlug: slug,
        displayName,
        intent: persona.intent,
        prompt,
        rawResponse: finalRaw,
        parsed: null,
        flags: parseResult.flags,
        retried: true,
        latencyMs: Date.now() - t0,
        usage: response.usage,
        error: `retry failed: ${msg}`,
        sampledProductIds: sampled.map((p) => p.id),
      };
    }
  }

  return {
    personaId: persona.id,
    modelSlug: slug,
    displayName,
    intent: persona.intent,
    prompt,
    rawResponse: finalRaw,
    parsed: parseResult.parsed,
    flags: parseResult.flags,
    retried,
    latencyMs: Date.now() - t0,
    usage: response.usage,
    error: parseResult.ok ? null : parseResult.errorMessage ?? null,
    sampledProductIds: sampled.map((p) => p.id),
  };
}
