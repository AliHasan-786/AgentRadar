// Groq direct integration. Uses Groq's OpenAI-compatible Chat Completions
// endpoint at api.groq.com/openai/v1. Llama 3.3 70B Versatile lives here
// for the daily-walker-gift persona.

import { createOpenAICompatClient } from "./openai-compat";

export const GROQ_SLUG_PREFIX = "groq-direct/";

const client = createOpenAICompatClient({
  baseUrl: "https://api.groq.com/openai/v1",
  slugPrefix: GROQ_SLUG_PREFIX,
  authHeader: () => `Bearer ${process.env.GROQ_API_KEY ?? ""}`,
  displayName: "Groq",
});

export const { listModels, chatCompletion, streamChatCompletion } = client;
