import { config } from "dotenv";
config({ path: ".env.local" });
import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { fetchCatalog } from "../lib/shopify";
import { getPersona } from "../lib/agents/personas";
import { buildPersonaPrompt, sampleForPersona } from "../lib/agents/prompts";
import { chatCompletion } from "../lib/gemini";

const SLUGS = [
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
];

(async () => {
  const persona = getPersona("arch-support-shopper");
  const fetched = await fetchCatalog("allbirds.com");
  const { deduped: catalog } = dedupeProducts(normalizeCatalog(fetched.products));
  const sampled = sampleForPersona(catalog, persona.intent, 30, persona.expansionKeywords);
  const prompt = buildPersonaPrompt(persona.intent, sampled);
  console.log(`Prompt size: ~${Math.round((prompt.system.length + prompt.user.length) / 3.5)} tokens`);

  for (const slug of SLUGS) {
    console.log(`\n=== ${slug} ===`);
    const t0 = Date.now();
    try {
      const r = await chatCompletion(
        {
          slug: `google-direct/${slug}`,
          systemInstruction: prompt.system,
          user: prompt.user,
          temperature: 0.2,
          maxTokens: 800,
          jsonMode: true,
        },
        { timeoutMs: 60000 },
      );
      console.log(
        `  OK in ${Date.now() - t0}ms · tokens=${r.usage?.promptTokens}/${r.usage?.completionTokens}/${r.usage?.totalTokens} · finish=${r.finishReason}`,
      );
      console.log(`  output: ${r.text.slice(0, 400)}`);
    } catch (err) {
      const e = err as Error & { status?: number; body?: string };
      console.log(`  ERR (${e.status}) in ${Date.now() - t0}ms: ${e.body?.slice(0, 240) ?? e.message}`);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
})();
