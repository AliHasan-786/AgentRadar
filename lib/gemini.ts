// Google AI Studio direct integration (not via OpenRouter). Used for the
// live-tier free-tier-friendly path; OpenRouter handles the build-tier
// premium models when paid credits are available.
//
// API reference: generativelanguage.googleapis.com/v1beta
//   POST /models/{model}:generateContent          (synchronous)
//   POST /models/{model}:streamGenerateContent    (SSE streaming)
//
// Slug convention used throughout AgentRadar:
//   google-direct/gemini-2.5-flash  → routes here
//   anthropic/claude-sonnet-4       → routes via OpenRouter
// The provider dispatcher in lib/agents/dispatch.ts handles the prefix.

import { resilientFetch } from "./resilient-fetch";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_SLUG_PREFIX = "google-direct/";

export class GeminiError extends Error {
  status: number;
  body: string;
  constructor(status: number, message: string, body: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function apiKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new GeminiError(0, "GOOGLE_API_KEY is not set", "");
  }
  return key;
}

function modelFromSlug(slug: string): string {
  return slug.startsWith(GEMINI_SLUG_PREFIX)
    ? slug.slice(GEMINI_SLUG_PREFIX.length)
    : slug;
}

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[]; role?: string };
  finishReason?: string;
}

interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsage;
}

export interface GeminiChatRequest {
  slug: string;
  systemInstruction: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface GeminiChatResponse {
  text: string;
  finishReason: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
}

function extractText(resp: GeminiResponse): string {
  const cand = resp.candidates?.[0];
  if (!cand?.content?.parts) return "";
  return cand.content.parts.map((p) => p.text ?? "").join("");
}

function makeBody(req: GeminiChatRequest): string {
  return JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ text: req.user }],
      } satisfies GeminiContent,
    ],
    systemInstruction: {
      parts: [{ text: req.systemInstruction }],
    },
    generationConfig: {
      temperature: req.temperature ?? 0.2,
      maxOutputTokens: req.maxTokens ?? 800,
      // Disable thinking. Gemini 2.5 Flash is a thinking model — without
      // this it can burn the entire output-token budget on internal
      // reasoning, returning empty content. For structured 4-field JSON
      // classification, thinking adds nothing and breaks reliability.
      // (Same calibration call we made for Gemini 2.5 Pro on OpenRouter
      // earlier in the project.)
      thinkingConfig: { thinkingBudget: 0 },
      ...(req.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });
}

// Transient errors worth retrying with backoff:
//   429 — rate limit window crossed
//   503 — Gemini overloaded (common on preview models)
//   500/502/504 — gateway / upstream blip
// Network-level "fetch failed" surfaces here as a thrown error before we
// see status; we retry that case too.
const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const BACKOFF_MS = 20000;

async function chatCompletionOnce(
  req: GeminiChatRequest,
  opts: { timeoutMs?: number },
): Promise<GeminiChatResponse> {
  const model = modelFromSlug(req.slug);
  const url = `${BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey())}`;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 60000,
  );
  let res: Response;
  try {
    res = await resilientFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: makeBody(req),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new GeminiError(
      res.status,
      `generateContent failed (${res.status})`,
      body,
    );
  }
  const json = (await res.json()) as GeminiResponse;
  const text = extractText(json);
  const u = json.usageMetadata;
  return {
    text,
    finishReason: json.candidates?.[0]?.finishReason ?? null,
    usage: u
      ? {
          promptTokens: u.promptTokenCount ?? 0,
          completionTokens: u.candidatesTokenCount ?? 0,
          totalTokens: u.totalTokenCount ?? 0,
        }
      : null,
  };
}

export async function chatCompletion(
  req: GeminiChatRequest,
  opts: { timeoutMs?: number } = {},
): Promise<GeminiChatResponse> {
  try {
    return await chatCompletionOnce(req, opts);
  } catch (err) {
    const isTransient =
      (err instanceof GeminiError && TRANSIENT_STATUSES.has(err.status)) ||
      (err instanceof Error && /fetch failed|timed? ?out|aborted/i.test(err.message));
    if (!isTransient) throw err;
    await new Promise((r) => setTimeout(r, BACKOFF_MS));
    return await chatCompletionOnce(req, opts);
  }
}

// Streaming variant — yields text deltas as they arrive. Returns total
// usage at end via the side-channel `onComplete` callback because the
// usage metadata only appears in the final SSE chunk.
export interface StreamChunk {
  type: "delta" | "done";
  delta?: string;
  finishReason?: string | null;
  usage?: GeminiChatResponse["usage"];
}

export async function* streamChatCompletion(
  req: GeminiChatRequest,
  opts: { timeoutMs?: number; abortSignal?: AbortSignal } = {},
): AsyncGenerator<StreamChunk> {
  const model = modelFromSlug(req.slug);
  const url = `${BASE_URL}/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey())}`;
  const internalAbort = new AbortController();
  const timer = setTimeout(
    () => internalAbort.abort(),
    opts.timeoutMs ?? 60000,
  );
  // Compose external + internal abort signals.
  if (opts.abortSignal) {
    if (opts.abortSignal.aborted) internalAbort.abort();
    else opts.abortSignal.addEventListener("abort", () => internalAbort.abort());
  }

  let res: Response;
  try {
    res = await resilientFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: makeBody(req),
      signal: internalAbort.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new GeminiError(
      res.status,
      `streamGenerateContent failed (${res.status})`,
      body,
    );
  }
  if (!res.body) {
    throw new GeminiError(0, "stream has no body", "");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastFinish: string | null = null;
  let lastUsage: GeminiChatResponse["usage"] | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let lineEnd: number;
    while ((lineEnd = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") {
        buffer = "";
        break;
      }
      try {
        const json = JSON.parse(data) as GeminiResponse;
        const delta = extractText(json);
        if (delta) {
          yield { type: "delta", delta };
        }
        if (json.candidates?.[0]?.finishReason) {
          lastFinish = json.candidates[0].finishReason ?? null;
        }
        if (json.usageMetadata) {
          const u = json.usageMetadata;
          lastUsage = {
            promptTokens: u.promptTokenCount ?? 0,
            completionTokens: u.candidatesTokenCount ?? 0,
            totalTokens: u.totalTokenCount ?? 0,
          };
        }
      } catch {
        // partial / non-JSON line — skip
      }
    }
  }
  yield { type: "done", finishReason: lastFinish, usage: lastUsage };
}
