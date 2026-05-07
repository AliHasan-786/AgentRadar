// Generic client for any provider that speaks the OpenAI Chat Completions
// wire format: Groq, Mistral, OpenAI direct, OpenRouter. Each provider
// module is a thin wrapper around `createOpenAICompatClient(config)` —
// see lib/groq.ts, lib/mistral.ts, lib/openai.ts, lib/openrouter.ts.
//
// Returned shape is normalized: `{text, finishReason, usage}` for sync
// calls, `{type: "delta"|"done", delta?, finishReason?, usage?}` for
// streaming. The dispatcher (lib/agents/dispatch.ts) consumes this shape
// directly without per-provider massaging.
//
// Includes one-retry-with-backoff layer for transient errors
// (429/500/502/503/504 + network failures).

import { resilientFetch } from "./resilient-fetch";

export interface OpenAICompatConfig {
  baseUrl: string;
  // Slug prefix the dispatcher uses to route to this provider, e.g.
  // "groq-direct/". Stripped from the slug before sending upstream.
  // Empty string = no prefix (used by OpenRouter, the fallback route).
  slugPrefix: string;
  authHeader: () => string;
  extraHeaders?: () => Record<string, string>;
  displayName: string;
}

export class OpenAICompatError extends Error {
  status: number;
  body: string;
  provider: string;
  constructor(provider: string, status: number, message: string, body: string) {
    super(`[${provider}] ${message}`);
    this.provider = provider;
    this.status = status;
    this.body = body;
  }
}

export interface ChatRequest {
  slug: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface NormalizedUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  text: string;
  finishReason: string | null;
  usage: NormalizedUsage | null;
}

export interface StreamChunk {
  type: "delta" | "done";
  delta?: string;
  finishReason?: string | null;
  usage?: NormalizedUsage | null;
}

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const BACKOFF_MS = 20000;

interface OpenAIChoice {
  message?: { content?: string };
  delta?: { content?: string };
  finish_reason?: string;
}

interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface ChatCompletionPayload {
  choices?: OpenAIChoice[];
  usage?: OpenAIUsage;
}

interface ListingPayload {
  data?: { id: string; [key: string]: unknown }[];
}

function normalizeUsage(u: OpenAIUsage | undefined): NormalizedUsage | null {
  if (!u) return null;
  return {
    promptTokens: u.prompt_tokens ?? 0,
    completionTokens: u.completion_tokens ?? 0,
    totalTokens: u.total_tokens ?? 0,
  };
}

export function createOpenAICompatClient(config: OpenAICompatConfig) {
  function modelFromSlug(slug: string): string {
    if (config.slugPrefix && slug.startsWith(config.slugPrefix)) {
      return slug.slice(config.slugPrefix.length);
    }
    return slug;
  }

  function makeHeaders(): Record<string, string> {
    return {
      authorization: config.authHeader(),
      "content-type": "application/json",
      ...(config.extraHeaders?.() ?? {}),
    };
  }

  async function listModels(): Promise<
    ({ id: string } & Record<string, unknown>)[]
  > {
    const res = await resilientFetch(`${config.baseUrl}/models`, {
      headers: makeHeaders(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new OpenAICompatError(
        config.displayName,
        res.status,
        "models fetch failed",
        body,
      );
    }
    const json = (await res.json()) as ListingPayload;
    return (json.data ?? []) as ({ id: string } & Record<string, unknown>)[];
  }

  function makeBody(req: ChatRequest, stream = false): string {
    return JSON.stringify({
      model: modelFromSlug(req.slug),
      messages: req.messages,
      temperature: req.temperature ?? 0.2,
      max_tokens: req.maxTokens ?? 800,
      ...(stream ? { stream: true } : {}),
      ...(req.jsonMode ? { response_format: { type: "json_object" } } : {}),
    });
  }

  async function chatCompletionOnce(
    req: ChatRequest,
    opts: { timeoutMs?: number },
  ): Promise<ChatResponse> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      opts.timeoutMs ?? 60000,
    );
    let res: Response;
    try {
      res = await resilientFetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: makeHeaders(),
        body: makeBody(req, false),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const body = await res.text();
      throw new OpenAICompatError(
        config.displayName,
        res.status,
        `chat/completions failed (${res.status})`,
        body,
      );
    }
    const json = (await res.json()) as ChatCompletionPayload;
    const choice = json.choices?.[0];
    return {
      text: choice?.message?.content ?? "",
      finishReason: choice?.finish_reason ?? null,
      usage: normalizeUsage(json.usage),
    };
  }

  async function chatCompletion(
    req: ChatRequest,
    opts: { timeoutMs?: number } = {},
  ): Promise<ChatResponse> {
    try {
      return await chatCompletionOnce(req, opts);
    } catch (err) {
      const isTransient =
        (err instanceof OpenAICompatError &&
          TRANSIENT_STATUSES.has(err.status)) ||
        (err instanceof Error &&
          /fetch failed|timed? ?out|aborted/i.test(err.message));
      if (!isTransient) throw err;
      await new Promise((r) => setTimeout(r, BACKOFF_MS));
      return await chatCompletionOnce(req, opts);
    }
  }

  async function* streamChatCompletion(
    req: ChatRequest,
    opts: { timeoutMs?: number; abortSignal?: AbortSignal } = {},
  ): AsyncGenerator<StreamChunk> {
    const internal = new AbortController();
    const timer = setTimeout(
      () => internal.abort(),
      opts.timeoutMs ?? 60000,
    );
    if (opts.abortSignal) {
      if (opts.abortSignal.aborted) internal.abort();
      else opts.abortSignal.addEventListener("abort", () => internal.abort());
    }

    let res: Response;
    try {
      res = await resilientFetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: makeHeaders(),
        body: makeBody(req, true),
        signal: internal.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new OpenAICompatError(
        config.displayName,
        res.status,
        `streaming failed (${res.status})`,
        body,
      );
    }
    if (!res.body) {
      throw new OpenAICompatError(
        config.displayName,
        0,
        "stream had no body",
        "",
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lastFinish: string | null = null;
    let lastUsage: NormalizedUsage | null = null;

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
          const json = JSON.parse(data) as ChatCompletionPayload;
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield { type: "delta", delta };
          if (json.choices?.[0]?.finish_reason) {
            lastFinish = json.choices[0].finish_reason ?? null;
          }
          if (json.usage) {
            lastUsage = normalizeUsage(json.usage);
          }
        } catch {
          // partial / non-JSON line — skip
        }
      }
    }
    yield { type: "done", finishReason: lastFinish, usage: lastUsage };
  }

  return { listModels, chatCompletion, streamChatCompletion };
}
