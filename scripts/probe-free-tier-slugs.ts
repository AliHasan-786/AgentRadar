// Probes candidate model slugs at the actual persona prompt size (not
// synthetic padding). For each candidate: build the literal persona prompt,
// send a real chat-completion request, capture status + first line of output.
// Logs the answer so we can pick a 5-distinct-providers panel that actually
// works on the current free-tier credit pool.

import { config } from "dotenv";
config({ path: ".env.local" });
import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { fetchCatalog } from "../lib/shopify";
import { getPersona } from "../lib/agents/personas";
import { buildPersonaPrompt, sampleForPersona } from "../lib/agents/prompts";
import { chatCompletion, OpenRouterError } from "../lib/openrouter";

interface Candidate {
  persona: "sustainable-runner" | "vegan-with-reviews";
  slug: string;
  displayName: string;
}

const CANDIDATES: Candidate[] = [
  // Anthropic slot — sustainable-runner
  { persona: "sustainable-runner", slug: "anthropic/claude-3-haiku", displayName: "Claude 3 Haiku" },
  { persona: "sustainable-runner", slug: "anthropic/claude-haiku-4.5", displayName: "Claude Haiku 4.5" },
  { persona: "sustainable-runner", slug: "anthropic/claude-3.5-haiku", displayName: "Claude 3.5 Haiku" },

  // Mistral slot — vegan-with-reviews
  { persona: "vegan-with-reviews", slug: "mistralai/mistral-7b-instruct", displayName: "Mistral 7B" },
  { persona: "vegan-with-reviews", slug: "mistralai/mistral-small-3", displayName: "Mistral Small 3" },
  { persona: "vegan-with-reviews", slug: "mistralai/mistral-small-3.1-24b-instruct", displayName: "Mistral Small 3.1 24B" },
  { persona: "vegan-with-reviews", slug: "mistralai/mistral-small-3.2-24b-instruct", displayName: "Mistral Small 3.2 24B" },
  { persona: "vegan-with-reviews", slug: "mistralai/mistral-nemo", displayName: "Mistral Nemo" },
  { persona: "vegan-with-reviews", slug: "mistralai/ministral-8b", displayName: "Ministral 8B" },
  { persona: "vegan-with-reviews", slug: "mistralai/mixtral-8x7b-instruct", displayName: "Mixtral 8x7B" },

  // :free variants worth trying for both
  { persona: "vegan-with-reviews", slug: "mistralai/mistral-small-3.1-24b-instruct:free", displayName: "Mistral Small 3.1 (free)" },
  { persona: "vegan-with-reviews", slug: "mistralai/mistral-7b-instruct:free", displayName: "Mistral 7B (free)" },

  // Open-weights non-Mistral options to keep the open-weights voice if Mistral all fails
  { persona: "vegan-with-reviews", slug: "nousresearch/hermes-3-llama-3.1-405b", displayName: "Hermes 3 405B" },
  { persona: "vegan-with-reviews", slug: "qwen/qwen3-30b-a3b-instruct-2507", displayName: "Qwen 3 30B" },
];

function summary(text: string, n = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

(async () => {
  const fetched = await fetchCatalog("allbirds.com");
  const { deduped: catalog } = dedupeProducts(normalizeCatalog(fetched.products));
  console.log(`Catalog: ${catalog.length} canonical products`);
  console.log("");

  const personas = ["sustainable-runner", "vegan-with-reviews"] as const;
  const prompts = new Map<string, { system: string; user: string; tokens: number }>();
  for (const id of personas) {
    const p = getPersona(id);
    const sampled = sampleForPersona(catalog, p.intent, 30, p.expansionKeywords);
    const built = buildPersonaPrompt(p.intent, sampled);
    const approxTokens = Math.round((built.system.length + built.user.length) / 3.5);
    prompts.set(id, { ...built, tokens: approxTokens });
    console.log(`Persona "${id}" prompt: ~${approxTokens} tokens`);
  }
  console.log("");

  console.log(
    "Slug                                                          Status     Latency  Output preview",
  );
  console.log("-".repeat(120));

  for (const c of CANDIDATES) {
    const prompt = prompts.get(c.persona)!;
    const t0 = Date.now();
    let status: string;
    let preview: string;
    try {
      const resp = await chatCompletion(
        {
          slug: c.slug,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          temperature: 0.2,
          maxTokens: 400,
          jsonMode: true,
        },
        { timeoutMs: 45000 },
      );
      const out = resp.text;
      status = "OK";
      preview = summary(out);
    } catch (err) {
      if (err instanceof OpenRouterError) {
        const m = err.body.match(/"message":"([^"]+)"/);
        status = `ERR ${err.status}`;
        preview = m ? summary(m[1], 80) : summary(err.body, 80);
      } else {
        status = "ERR";
        preview = err instanceof Error ? err.message : String(err);
      }
    }
    const latency = Date.now() - t0;
    console.log(
      `${c.slug.padEnd(60)} ${status.padEnd(10)} ${(latency + "ms").padStart(7)}  ${preview}`,
    );
  }
})();
