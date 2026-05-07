import { config } from "dotenv";
config({ path: ".env.local" });
import { dedupeProducts, normalizeCatalog } from "../lib/catalog-normalizer";
import { fetchCatalog } from "../lib/shopify";
import { getPersona } from "../lib/agents/personas";
import { buildPersonaPrompt, sampleForPersona } from "../lib/agents/prompts";
import { chatCompletion } from "../lib/gemini";

(async () => {
  const persona = getPersona("vegan-with-reviews");
  const fetched = await fetchCatalog("allbirds.com");
  const { deduped: catalog } = dedupeProducts(normalizeCatalog(fetched.products));
  const sampled = sampleForPersona(catalog, persona.intent, 30, persona.expansionKeywords);
  const prompt = buildPersonaPrompt(persona.intent, sampled);
  console.log(`Prompt size: ~${Math.round((prompt.system.length + prompt.user.length) / 3.5)} tokens`);

  for (let i = 1; i <= 5; i++) {
    const t0 = Date.now();
    try {
      const r = await chatCompletion(
        {
          slug: "google-direct/gemini-2.5-flash",
          systemInstruction: prompt.system,
          user: prompt.user,
          temperature: 0.2,
          maxTokens: 800,
          jsonMode: true,
        },
        { timeoutMs: 60000 },
      );
      console.log(
        `  call ${i}: OK in ${Date.now() - t0}ms · ${r.usage?.promptTokens}/${r.usage?.completionTokens}/${r.usage?.totalTokens} tokens · finish=${r.finishReason}`,
      );
      console.log(`           text head: ${r.text.slice(0, 200)}`);
    } catch (err) {
      const e = err as Error & { status?: number; body?: string };
      console.log(`  call ${i}: ERR (${e.status}) in ${Date.now() - t0}ms — ${e.body?.slice(0, 240) ?? e.message}`);
    }
    if (i < 5) await new Promise((r) => setTimeout(r, 7000)); // ~10 RPM compliant
  }
})();
