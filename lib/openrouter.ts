// OpenRouter integration. OpenAI-compatible wire format at
// openrouter.ai/api/v1, plus two extra request headers (HTTP-Referer,
// X-Title) for OpenRouter's usage attribution. Used as the dispatcher's
// fallback route — any slug without a `*-direct/` prefix lands here.
//
// Build-tier slugs in personas.ts (e.g. anthropic/claude-sonnet-4,
// openai/gpt-4o, mistralai/mixtral-8x22b-instruct) route through
// OpenRouter when paid credits are available, restoring the PRD §10.1
// premium 5-distinct-providers panel.

import {
  createOpenAICompatClient,
  OpenAICompatError,
} from "./openai-compat";

export const BASE_URL = "https://openrouter.ai/api/v1";

// Backward-compat error class — OpenRouterError preserved for any caller
// that still does `instanceof OpenRouterError` checks.
export class OpenRouterError extends OpenAICompatError {
  constructor(status: number, message: string, body: string) {
    super("OpenRouter", status, message, body);
    this.name = "OpenRouterError";
  }
}

// Backward-compat: explicit auth-headers fn for any inline use.
export function authHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
    "content-type": "application/json",
    "http-referer": "https://agentradar.vercel.app",
    "x-title": "AgentRadar",
  };
}

const client = createOpenAICompatClient({
  baseUrl: BASE_URL,
  slugPrefix: "", // OpenRouter slugs are unprefixed; dispatcher falls
  // through to OpenRouter for anything not matched by a *-direct/ prefix.
  authHeader: () => `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
  displayName: "OpenRouter",
  extraHeaders: () => ({
    "http-referer": "https://agentradar.vercel.app",
    "x-title": "AgentRadar",
  }),
});

export const { listModels, chatCompletion, streamChatCompletion } = client;

// Backward-compat type re-exports for any code that imported these.
export type OpenRouterModel = { id: string; [key: string]: unknown };
