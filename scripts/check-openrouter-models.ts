import { config } from "dotenv";
config({ path: ".env.local" });
import { listModels } from "../lib/openrouter";

const PRD_SLUGS = [
  "anthropic/claude-sonnet-4",
  "openai/gpt-4o",
  "meta-llama/llama-3.3-70b-instruct",
  "google/gemini-2.0-flash-exp",
  "mistralai/mixtral-8x22b-instruct",
];

function suggestSwap(slug: string, available: string[]): string[] {
  const family = slug.split("/")[1].split("-")[0].toLowerCase();
  const matches = available
    .filter((id) => id.toLowerCase().includes(family))
    .slice(0, 6);
  return matches;
}

(async () => {
  let models;
  try {
    models = await listModels();
  } catch (err) {
    console.error("Failed to list models:", err);
    process.exit(1);
  }
  const ids = models.map((m) => m.id);
  console.log(`OpenRouter has ${ids.length} models in catalog.\n`);

  for (const slug of PRD_SLUGS) {
    const exact = ids.includes(slug);
    if (exact) {
      const m = models.find((x) => x.id === slug)! as Record<string, unknown> & {
        id: string;
      };
      const pricing = m.pricing as
        | { prompt?: string; completion?: string }
        | undefined;
      console.log(`[OK]   ${slug}`);
      console.log(
        `         name=${m.name ?? "?"} ctx=${m.context_length ?? "?"} ` +
          `prompt=$${pricing?.prompt ?? "?"}/M completion=$${pricing?.completion ?? "?"}/M`,
      );
    } else {
      console.log(`[MISS] ${slug}  — not in current catalog`);
      const swaps = suggestSwap(slug, ids);
      if (swaps.length > 0) {
        console.log(`         candidates: ${swaps.join(", ")}`);
      }
    }
  }
})();
