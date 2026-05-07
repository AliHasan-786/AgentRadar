// OpenAI direct integration. Standard Chat Completions endpoint at
// api.openai.com/v1. GPT-4o-mini (dated, e.g. 2024-07-18) for the
// arch-support-shopper persona.

import { createOpenAICompatClient } from "./openai-compat";

export const OPENAI_SLUG_PREFIX = "openai-direct/";

const client = createOpenAICompatClient({
  baseUrl: "https://api.openai.com/v1",
  slugPrefix: OPENAI_SLUG_PREFIX,
  authHeader: () => `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
  displayName: "OpenAI",
});

export const { listModels, chatCompletion, streamChatCompletion } = client;
