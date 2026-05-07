// Probe each new provider key:
//   1. Hit listing endpoint, confirm the key works
//   2. Filter for the target model family, pick the latest stable
//   3. Make one real chat-completion call with the literal
//      arch-support-shopper persona prompt against the cached Allbirds
//      catalog
//
// If any provider's listing has 0 matches for the target family, exit
// non-zero so the caller can stop before wiring slugs into personas.ts.

import { config } from "dotenv";
config({ path: ".env.local" });

import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { fetchCatalog } from "../lib/shopify";
import { getPersona } from "../lib/agents/personas";
import { buildPersonaPrompt, sampleForPersona } from "../lib/agents/prompts";
import { resilientFetch } from "../lib/resilient-fetch";

interface ListingProbe {
  provider: string;
  url: string;
  headers: () => Record<string, string>;
  pickSlug: (models: { id: string }[]) => string | null;
  targetFamily: string;
}

interface ChatProbe {
  provider: string;
  endpoint: string;
  headers: () => Record<string, string>;
  body: (slug: string, system: string, user: string) => string;
  parseText: (json: unknown) => string;
  parseUsage: (json: unknown) => string;
}

function summary(text: string, n = 200): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

const ANTHROPIC_HEADERS = () => ({
  "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
  "anthropic-version": "2023-06-01",
  "content-type": "application/json",
});

const BEARER = (envKey: string) => () => ({
  authorization: `Bearer ${process.env[envKey] ?? ""}`,
  "content-type": "application/json",
});

const LISTING_PROBES: ListingProbe[] = [
  {
    provider: "Anthropic",
    url: "https://api.anthropic.com/v1/models",
    headers: ANTHROPIC_HEADERS,
    targetFamily: "Claude Haiku 4.5",
    pickSlug: (models) => {
      const haiku = models
        .map((m) => m.id)
        .filter((id) => /haiku/i.test(id))
        .filter((id) => /4[-.]?5/i.test(id) || /^claude-haiku-4-5/.test(id));
      if (haiku.length === 0) return null;
      // Prefer the dated/explicit slug over alias if present
      haiku.sort((a, b) => b.localeCompare(a));
      return haiku[0];
    },
  },
  {
    provider: "Groq",
    url: "https://api.groq.com/openai/v1/models",
    headers: BEARER("GROQ_API_KEY"),
    targetFamily: "Llama 3.3 70B",
    pickSlug: (models) => {
      const matches = models
        .map((m) => m.id)
        .filter((id) => /llama-3\.3-70b/i.test(id));
      if (matches.length === 0) return null;
      // Prefer "versatile" if present — that's the production tier
      const versatile = matches.find((id) => /versatile/i.test(id));
      if (versatile) return versatile;
      matches.sort();
      return matches[0];
    },
  },
  {
    provider: "Mistral",
    url: "https://api.mistral.ai/v1/models",
    headers: BEARER("MISTRAL_API_KEY"),
    targetFamily: "Mistral Small (dated, prefer 2503+)",
    pickSlug: (models) => {
      const ids = models.map((m) => m.id);
      // Methodology reproducibility: prefer the dated slug
      // (mistral-small-NNNN, e.g. 2503 for March 2025) over the
      // -latest alias.
      const dated = ids
        .filter((id) => /^mistral-small-\d{4}$/i.test(id))
        .sort()
        .reverse();
      if (dated.length > 0) return dated[0];
      // Fall back to any small-3 dated form
      const smallThreeDated = ids
        .filter((id) => /^mistral-small-3/i.test(id))
        .sort()
        .reverse();
      if (smallThreeDated.length > 0) return smallThreeDated[0];
      // Last resort — the alias
      if (ids.includes("mistral-small-latest")) return "mistral-small-latest";
      const small = ids.filter((id) => /^mistral-small/i.test(id));
      return small[0] ?? null;
    },
  },
  {
    provider: "OpenAI",
    url: "https://api.openai.com/v1/models",
    headers: BEARER("OPENAI_API_KEY"),
    targetFamily: "GPT-4o-mini (dated)",
    pickSlug: (models) => {
      const ids = models.map((m) => m.id);
      // Methodology reproducibility: prefer the dated slug
      // gpt-4o-mini-YYYY-MM-DD over the bare alias gpt-4o-mini.
      const dated = ids
        .filter((id) => /^gpt-4o-mini-\d{4}-\d{2}-\d{2}$/i.test(id))
        .sort()
        .reverse();
      if (dated.length > 0) return dated[0];
      // Allow other patterns too — gpt-4o-mini-NNNN, etc.
      const otherDated = ids
        .filter((id) => /^gpt-4o-mini-\d/i.test(id))
        .sort()
        .reverse();
      if (otherDated.length > 0) return otherDated[0];
      if (ids.includes("gpt-4o-mini")) return "gpt-4o-mini";
      return null;
    },
  },
];

const CHAT_PROBES: Record<string, ChatProbe> = {
  Anthropic: {
    provider: "Anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    headers: ANTHROPIC_HEADERS,
    body: (slug, system, user) =>
      JSON.stringify({
        model: slug,
        max_tokens: 800,
        system,
        messages: [{ role: "user", content: user }],
      }),
    parseText: (json) => {
      const r = json as { content?: { text?: string }[] };
      return r.content?.[0]?.text ?? "";
    },
    parseUsage: (json) => {
      const r = json as {
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      return `prompt=${r.usage?.input_tokens ?? "?"} completion=${r.usage?.output_tokens ?? "?"}`;
    },
  },
  Groq: {
    provider: "Groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    headers: BEARER("GROQ_API_KEY"),
    body: (slug, system, user) =>
      JSON.stringify({
        model: slug,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    parseText: (json) => {
      const r = json as {
        choices?: { message?: { content?: string } }[];
      };
      return r.choices?.[0]?.message?.content ?? "";
    },
    parseUsage: (json) => {
      const r = json as {
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return `prompt=${r.usage?.prompt_tokens ?? "?"} completion=${r.usage?.completion_tokens ?? "?"}`;
    },
  },
  Mistral: {
    provider: "Mistral",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    headers: BEARER("MISTRAL_API_KEY"),
    body: (slug, system, user) =>
      JSON.stringify({
        model: slug,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    parseText: (json) => {
      const r = json as {
        choices?: { message?: { content?: string } }[];
      };
      return r.choices?.[0]?.message?.content ?? "";
    },
    parseUsage: (json) => {
      const r = json as {
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return `prompt=${r.usage?.prompt_tokens ?? "?"} completion=${r.usage?.completion_tokens ?? "?"}`;
    },
  },
  OpenAI: {
    provider: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    headers: BEARER("OPENAI_API_KEY"),
    body: (slug, system, user) =>
      JSON.stringify({
        model: slug,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    parseText: (json) => {
      const r = json as {
        choices?: { message?: { content?: string } }[];
      };
      return r.choices?.[0]?.message?.content ?? "";
    },
    parseUsage: (json) => {
      const r = json as {
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return `prompt=${r.usage?.prompt_tokens ?? "?"} completion=${r.usage?.completion_tokens ?? "?"}`;
    },
  },
};

(async () => {
  // Build the literal arch-support-shopper prompt against Allbirds, the same
  // prompt these models will see in production captures.
  const persona = getPersona("arch-support-shopper");
  const fetched = await fetchCatalog("allbirds.com");
  const { deduped: catalog } = dedupeProducts(normalizeCatalog(fetched.products));
  const sampled = sampleForPersona(catalog, persona.intent, 30, persona.expansionKeywords);
  const prompt = buildPersonaPrompt(persona.intent, sampled);
  console.log(`Using arch-support-shopper prompt against allbirds.com`);
  console.log(`Prompt size: ~${Math.round((prompt.system.length + prompt.user.length) / 3.5)} tokens\n`);

  let bailedEarly = false;
  const picked: { provider: string; slug: string }[] = [];

  for (const probe of LISTING_PROBES) {
    console.log("=".repeat(80));
    console.log(`${probe.provider} — listing (target: ${probe.targetFamily})`);
    console.log("=".repeat(80));

    const t0 = Date.now();
    let res: Response;
    try {
      res = await resilientFetch(probe.url, { headers: probe.headers() });
    } catch (err) {
      console.log(`  LISTING NETWORK ERROR: ${err instanceof Error ? err.message : err}`);
      bailedEarly = true;
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      console.log(`  LISTING FAILED ${res.status}: ${body.slice(0, 240)}`);
      bailedEarly = true;
      continue;
    }
    const body = (await res.json()) as { data?: { id: string }[] };
    const models = body.data ?? [];
    console.log(`  listing OK: ${models.length} models in catalog (${Date.now() - t0}ms)`);

    const slug = probe.pickSlug(models);
    if (!slug) {
      console.log(`  NO MATCHES for ${probe.targetFamily}`);
      console.log(`  (sample of available IDs: ${models.slice(0, 5).map((m) => m.id).join(", ")})`);
      bailedEarly = true;
      continue;
    }
    console.log(`  picked slug: ${slug}`);

    // Now make the real persona-prompt call.
    const chat = CHAT_PROBES[probe.provider];
    const t1 = Date.now();
    let chatRes: Response;
    try {
      chatRes = await resilientFetch(chat.endpoint, {
        method: "POST",
        headers: chat.headers(),
        body: chat.body(slug, prompt.system, prompt.user),
      });
    } catch (err) {
      console.log(`  CHAT NETWORK ERROR: ${err instanceof Error ? err.message : err}`);
      bailedEarly = true;
      continue;
    }
    if (!chatRes.ok) {
      const errBody = await chatRes.text();
      console.log(`  CHAT FAILED ${chatRes.status}: ${errBody.slice(0, 320)}`);
      bailedEarly = true;
      continue;
    }
    const chatJson = await chatRes.json();
    const text = chat.parseText(chatJson);
    const usage = chat.parseUsage(chatJson);
    console.log(`  chat OK (${Date.now() - t1}ms): ${usage}`);
    console.log(`  output head: ${summary(text)}`);

    picked.push({ provider: probe.provider, slug });
  }

  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  for (const p of picked) {
    console.log(`  ${p.provider.padEnd(12)} → ${p.slug}`);
  }
  if (bailedEarly) {
    console.log("\nOne or more probes failed. Resolve before wiring slugs into personas.ts.");
    process.exit(1);
  }
  process.exit(0);
})();
