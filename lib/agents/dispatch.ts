// Provider dispatcher. Routes a chat-completion request to the right
// upstream API based on the slug prefix:
//   anthropic-direct/* → lib/anthropic.ts (Messages API, not OpenAI-compat)
//   google-direct/*    → lib/gemini.ts (Google AI Studio)
//   groq-direct/*      → lib/groq.ts (OpenAI-compat via openai-compat)
//   mistral-direct/*   → lib/mistral.ts (OpenAI-compat)
//   openai-direct/*    → lib/openai.ts (OpenAI-compat)
//   anything else      → lib/openrouter.ts (build-tier slugs land here)
//
// The runner consumes one normalized shape ({text, finishReason, usage})
// regardless of provider, so the methodology contract stays clean: same
// prompt structure, same retry behavior, same flag pipeline. Provider
// differences live here.

import {
  ANTHROPIC_SLUG_PREFIX,
  chatCompletion as anthropicChat,
  streamChatCompletion as anthropicStream,
} from "../anthropic";
import {
  GEMINI_SLUG_PREFIX,
  chatCompletion as geminiChat,
  streamChatCompletion as geminiStream,
} from "../gemini";
import {
  GROQ_SLUG_PREFIX,
  chatCompletion as groqChat,
  streamChatCompletion as groqStream,
} from "../groq";
import {
  MISTRAL_SLUG_PREFIX,
  chatCompletion as mistralChat,
  streamChatCompletion as mistralStream,
} from "../mistral";
import {
  OPENAI_SLUG_PREFIX,
  chatCompletion as openaiChat,
  streamChatCompletion as openaiStream,
} from "../openai";
import {
  chatCompletion as openrouterChat,
  streamChatCompletion as openrouterStream,
} from "../openrouter";
import type { ChatRequest, ChatResponse, StreamChunk } from "../openai-compat";

export interface NormalizedUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface NormalizedChatResponse {
  text: string;
  finishReason: string | null;
  usage: NormalizedUsage | null;
}

export interface DispatchChatRequest {
  slug: string;
  systemPrompt: string;
  userPrompt: string;
  // For retry-on-bad-JSON: the prior assistant response and the nudge
  // user message. OpenAI-compat providers handle these natively as
  // multi-turn; Anthropic uses native multi-turn too; Gemini folds them
  // into a single user message because its `contents[]` can't carry
  // assistant turns in this synchronous path.
  assistantPrior?: string;
  retryNudge?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface DispatchStreamRequest {
  slug: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DispatchStreamChunk {
  type: "delta" | "done";
  delta?: string;
  finishReason?: string | null;
  usage?: NormalizedUsage | null;
}

type Provider =
  | "anthropic"
  | "gemini"
  | "groq"
  | "mistral"
  | "openai"
  | "openrouter";

function pickProvider(slug: string): Provider {
  if (slug.startsWith(ANTHROPIC_SLUG_PREFIX)) return "anthropic";
  if (slug.startsWith(GEMINI_SLUG_PREFIX)) return "gemini";
  if (slug.startsWith(GROQ_SLUG_PREFIX)) return "groq";
  if (slug.startsWith(MISTRAL_SLUG_PREFIX)) return "mistral";
  if (slug.startsWith(OPENAI_SLUG_PREFIX)) return "openai";
  return "openrouter";
}

function openAICompatFn(provider: Provider) {
  switch (provider) {
    case "groq":
      return { chat: groqChat, stream: groqStream };
    case "mistral":
      return { chat: mistralChat, stream: mistralStream };
    case "openai":
      return { chat: openaiChat, stream: openaiStream };
    case "openrouter":
      return { chat: openrouterChat, stream: openrouterStream };
    default:
      throw new Error(`openAICompatFn called with non-compat provider: ${provider}`);
  }
}

export async function dispatchChat(
  req: DispatchChatRequest,
  opts: { timeoutMs?: number } = {},
): Promise<NormalizedChatResponse> {
  const provider = pickProvider(req.slug);

  // Anthropic — system as top-level field, native multi-turn for retry.
  if (provider === "anthropic") {
    const messages: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: req.userPrompt },
    ];
    if (req.assistantPrior) {
      messages.push({ role: "assistant", content: req.assistantPrior });
      if (req.retryNudge) {
        messages.push({ role: "user", content: req.retryNudge });
      }
    }
    const r = await anthropicChat(
      {
        slug: req.slug,
        system: req.systemPrompt,
        messages,
        temperature: req.temperature,
        maxTokens: req.maxTokens,
      },
      { timeoutMs: opts.timeoutMs },
    );
    return { text: r.text, finishReason: r.finishReason, usage: r.usage };
  }

  // Gemini — synchronous path can't carry assistant turns; fold the
  // assistant-prior + nudge into the user prompt as a continuation.
  if (provider === "gemini") {
    const user = req.assistantPrior
      ? `${req.userPrompt}\n\n[Previous response]: ${req.assistantPrior}\n\n${req.retryNudge ?? ""}`
      : req.userPrompt;
    const r = await geminiChat(
      {
        slug: req.slug,
        systemInstruction: req.systemPrompt,
        user,
        temperature: req.temperature,
        maxTokens: req.maxTokens,
        jsonMode: req.jsonMode,
      },
      { timeoutMs: opts.timeoutMs },
    );
    return { text: r.text, finishReason: r.finishReason, usage: r.usage };
  }

  // OpenAI-compat: groq, mistral, openai, openrouter
  const messages: ChatRequest["messages"] = [
    { role: "system", content: req.systemPrompt },
    { role: "user", content: req.userPrompt },
  ];
  if (req.assistantPrior) {
    messages.push({ role: "assistant", content: req.assistantPrior });
    if (req.retryNudge) {
      messages.push({ role: "user", content: req.retryNudge });
    }
  }
  const { chat } = openAICompatFn(provider);
  const r: ChatResponse = await chat(
    {
      slug: req.slug,
      messages,
      temperature: req.temperature,
      maxTokens: req.maxTokens,
      jsonMode: req.jsonMode,
    },
    { timeoutMs: opts.timeoutMs },
  );
  return r;
}

export async function* dispatchStream(
  req: DispatchStreamRequest,
  opts: { timeoutMs?: number; abortSignal?: AbortSignal } = {},
): AsyncGenerator<DispatchStreamChunk> {
  const provider = pickProvider(req.slug);

  if (provider === "anthropic") {
    for await (const c of anthropicStream(
      {
        slug: req.slug,
        system: req.systemPrompt,
        messages: [{ role: "user", content: req.userPrompt }],
        temperature: req.temperature,
        maxTokens: req.maxTokens,
      },
      opts,
    )) {
      yield c;
    }
    return;
  }

  if (provider === "gemini") {
    for await (const c of geminiStream(
      {
        slug: req.slug,
        systemInstruction: req.systemPrompt,
        user: req.userPrompt,
        temperature: req.temperature,
        maxTokens: req.maxTokens,
        jsonMode: true,
      },
      opts,
    )) {
      yield c;
    }
    return;
  }

  // OpenAI-compat streaming
  const messages: ChatRequest["messages"] = [
    { role: "system", content: req.systemPrompt },
    { role: "user", content: req.userPrompt },
  ];
  const { stream } = openAICompatFn(provider);
  for await (const c of stream(
    {
      slug: req.slug,
      messages,
      temperature: req.temperature,
      maxTokens: req.maxTokens,
      jsonMode: true,
    },
    opts,
  ) as AsyncGenerator<StreamChunk>) {
    yield c;
  }
}
