// Anthropic Messages API direct integration. NOT OpenAI-compatible — the
// Messages API uses `system` as a top-level field, `messages` only carries
// user/assistant turns, and the SSE event shape is provider-specific
// (`content_block_delta` for text, `message_start`/`message_delta` for
// usage). Mirrors lib/gemini.ts's structure and retry-on-transient layer.
//
// Used by sustainable-runner persona via the live-tier slug
// `anthropic-direct/claude-haiku-4-5-20251001`.

import { resilientFetch } from "./resilient-fetch";

const BASE_URL = "https://api.anthropic.com/v1";
export const ANTHROPIC_SLUG_PREFIX = "anthropic-direct/";
export const ANTHROPIC_API_VERSION = "2023-06-01";

export class AnthropicError extends Error {
  status: number;
  body: string;
  constructor(status: number, message: string, body: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AnthropicError(0, "ANTHROPIC_API_KEY is not set", "");
  return key;
}

function modelFromSlug(slug: string): string {
  return slug.startsWith(ANTHROPIC_SLUG_PREFIX)
    ? slug.slice(ANTHROPIC_SLUG_PREFIX.length)
    : slug;
}

function makeHeaders(): Record<string, string> {
  return {
    "x-api-key": apiKey(),
    "anthropic-version": ANTHROPIC_API_VERSION,
    "content-type": "application/json",
  };
}

export interface AnthropicChatRequest {
  slug: string;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export interface AnthropicUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AnthropicChatResponse {
  text: string;
  finishReason: string | null;
  usage: AnthropicUsage | null;
}

export interface AnthropicStreamChunk {
  type: "delta" | "done";
  delta?: string;
  finishReason?: string | null;
  usage?: AnthropicUsage | null;
}

interface MessagesResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const BACKOFF_MS = 20000;

function makeBody(req: AnthropicChatRequest, stream = false): string {
  return JSON.stringify({
    model: modelFromSlug(req.slug),
    max_tokens: req.maxTokens ?? 800,
    system: req.system,
    messages: req.messages,
    temperature: req.temperature ?? 0.2,
    ...(stream ? { stream: true } : {}),
  });
}

async function chatCompletionOnce(
  req: AnthropicChatRequest,
  opts: { timeoutMs?: number },
): Promise<AnthropicChatResponse> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 60000,
  );
  let res: Response;
  try {
    res = await resilientFetch(`${BASE_URL}/messages`, {
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
    throw new AnthropicError(
      res.status,
      `messages failed (${res.status})`,
      body,
    );
  }
  const json = (await res.json()) as MessagesResponse;
  const text = (json.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  const u = json.usage;
  return {
    text,
    finishReason: json.stop_reason ?? null,
    usage: u
      ? {
          promptTokens: u.input_tokens ?? 0,
          completionTokens: u.output_tokens ?? 0,
          totalTokens: (u.input_tokens ?? 0) + (u.output_tokens ?? 0),
        }
      : null,
  };
}

export async function chatCompletion(
  req: AnthropicChatRequest,
  opts: { timeoutMs?: number } = {},
): Promise<AnthropicChatResponse> {
  try {
    return await chatCompletionOnce(req, opts);
  } catch (err) {
    const isTransient =
      (err instanceof AnthropicError && TRANSIENT_STATUSES.has(err.status)) ||
      (err instanceof Error &&
        /fetch failed|timed? ?out|aborted/i.test(err.message));
    if (!isTransient) throw err;
    await new Promise((r) => setTimeout(r, BACKOFF_MS));
    return await chatCompletionOnce(req, opts);
  }
}

interface SSEMessage {
  type?: string;
  delta?: { type?: string; text?: string; stop_reason?: string };
  usage?: { input_tokens?: number; output_tokens?: number };
  message?: { usage?: { input_tokens?: number; output_tokens?: number } };
}

export async function* streamChatCompletion(
  req: AnthropicChatRequest,
  opts: { timeoutMs?: number; abortSignal?: AbortSignal } = {},
): AsyncGenerator<AnthropicStreamChunk> {
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
    res = await resilientFetch(`${BASE_URL}/messages`, {
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
    throw new AnthropicError(
      res.status,
      `streaming messages failed (${res.status})`,
      body,
    );
  }
  if (!res.body) {
    throw new AnthropicError(0, "stream had no body", "");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let lastFinish: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let lineEnd: number;
    while ((lineEnd = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      if (!line) continue;
      // Anthropic SSE has both `event: name` and `data: {...}` lines; we
      // only need the data payload (the `type` field inside it tells us
      // which event it is).
      if (line.startsWith("event: ")) continue;
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") {
        buffer = "";
        break;
      }
      try {
        const json = JSON.parse(data) as SSEMessage;
        if (
          json.type === "content_block_delta" &&
          json.delta?.type === "text_delta" &&
          json.delta.text
        ) {
          yield { type: "delta", delta: json.delta.text };
        }
        if (json.type === "message_start" && json.message?.usage?.input_tokens) {
          inputTokens = json.message.usage.input_tokens;
        }
        if (json.type === "message_delta") {
          if (json.delta?.stop_reason) {
            lastFinish = json.delta.stop_reason ?? null;
          }
          if (json.usage?.output_tokens) {
            outputTokens = json.usage.output_tokens;
          }
        }
      } catch {
        // partial / non-JSON line — skip
      }
    }
  }
  yield {
    type: "done",
    finishReason: lastFinish,
    usage:
      inputTokens || outputTokens
        ? {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
          }
        : null,
  };
}
