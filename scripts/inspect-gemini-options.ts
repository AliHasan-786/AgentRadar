import { config } from "dotenv";
config({ path: ".env.local" });
import { listModels } from "../lib/openrouter";

(async () => {
  const models = await listModels();
  const gemini = models
    .filter((m) => m.id.toLowerCase().includes("gemini"))
    .filter((m) => !m.id.toLowerCase().includes("image"))
    .sort((a, b) => a.id.localeCompare(b.id));
  console.log(`${gemini.length} Gemini models on OpenRouter:\n`);
  for (const m of gemini) {
    const meta = m as Record<string, unknown> & { id: string };
    const pricing = meta.pricing as
      | { prompt?: string; completion?: string }
      | undefined;
    console.log(
      `  ${meta.id.padEnd(50)} ctx=${String(meta.context_length ?? "?").padStart(7)} ` +
        `prompt=$${pricing?.prompt ?? "?"}/M completion=$${pricing?.completion ?? "?"}/M`,
    );
  }
})();
