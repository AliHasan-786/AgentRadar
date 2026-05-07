// Mistral La Plateforme direct integration. OpenAI-compatible Chat
// Completions at api.mistral.ai/v1. Mistral Small (dated, e.g.
// 2603 = March 2026) for the vegan-with-reviews persona.

import { createOpenAICompatClient } from "./openai-compat";

export const MISTRAL_SLUG_PREFIX = "mistral-direct/";

const client = createOpenAICompatClient({
  baseUrl: "https://api.mistral.ai/v1",
  slugPrefix: MISTRAL_SLUG_PREFIX,
  authHeader: () => `Bearer ${process.env.MISTRAL_API_KEY ?? ""}`,
  displayName: "Mistral",
});

export const { listModels, chatCompletion, streamChatCompletion } = client;
