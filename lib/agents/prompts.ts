import { visibleTags } from "../tag-utils";
import type { CanonicalProduct } from "../types";

export { visibleTags };

const SYSTEM_PROMPT = `You are a helpful AI shopping assistant. A shopper has come to you with the
intent below. You are evaluating a single store's catalog and deciding whether
to recommend it, mention it but rank it lower than alternatives, or skip it.

You must base your decision only on the catalog data provided. Do not invent
products that aren't in the data. Do not invent reviews. Do not invent
specifications.

Output a single JSON object with exactly these fields:
{
  "verdict": one of ["recommended", "ranked-low", "skipped"],
  "topProductId": the id of the single best match, or null if skipped,
  "reasoning": 1-3 sentences explaining your decision,
  "gaps": an array of strings, each describing a piece of catalog data that
          would have helped you make a stronger recommendation if it were
          present (e.g., "no arch support spec in descriptions",
          "no review aggregation visible")
}

Output only valid JSON. No prose before or after.`;

// 250 chars per description is enough for the model to answer "does this match
// the intent?" — full marketing copy doesn't earn its prompt-token cost.
// Tightened from 400 after the Allbirds verdict reproduced unchanged.
const DESC_TRUNCATE = 250;

// Tag filtering lives in lib/tag-utils.ts so the rubric and prompt
// formatting share one source of truth.

function tokensOfIntent(intent: string): string[] {
  return intent
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

const STOPWORDS = new Set([
  "the", "for", "with", "and", "from", "that", "this", "find", "show",
  "have", "has", "are", "any", "looking", "please", "good", "best",
  "ideally", "shopper", "shop", "store", "would", "could", "should",
  "year", "years", "old", "their", "them", "they", "him", "her",
]);

export function scoreRelevance(
  product: CanonicalProduct,
  intentTokens: string[],
  expansionKeywords: string[] = [],
): number {
  const haystack = (
    product.title +
    " " +
    visibleTags(product.tags).join(" ") +
    " " +
    product.productType +
    " " +
    product.description
  ).toLowerCase();
  let score = 0;
  for (const tok of intentTokens) {
    if (STOPWORDS.has(tok)) continue;
    if (haystack.includes(tok)) score++;
  }
  for (const kw of expansionKeywords) {
    const k = kw.toLowerCase();
    if (k.length === 0) continue;
    if (haystack.includes(k)) score++;
  }
  return score;
}

export function sampleForPersona(
  products: CanonicalProduct[],
  intent: string,
  limit: number,
  expansionKeywords: string[] = [],
): CanonicalProduct[] {
  if (products.length <= limit) return products;
  const tokens = tokensOfIntent(intent);
  const scored = products.map((p) => ({
    p,
    score: scoreRelevance(p, tokens, expansionKeywords),
  }));
  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.p.images.length !== b.p.images.length) {
      return b.p.images.length - a.p.images.length;
    }
    return (b.p.description?.length ?? 0) - (a.p.description?.length ?? 0);
  });
  return scored.slice(0, limit).map((x) => x.p);
}

export function formatProductForPrompt(p: CanonicalProduct): string {
  const cleanTags = visibleTags(p.tags);
  const tags = cleanTags.length > 0 ? cleanTags.join(", ") : "(none)";
  const desc =
    p.description.length > DESC_TRUNCATE
      ? p.description.slice(0, DESC_TRUNCATE) + "…"
      : p.description;
  const priceLine =
    p.priceMin === p.priceMax
      ? `${p.priceMin} ${p.currency}`
      : `${p.priceMin}-${p.priceMax} ${p.currency}`;
  return [
    `ID: ${p.id}`,
    `Title: ${p.title}`,
    `Type: ${p.productType || "(none)"}`,
    `Tags: ${tags}`,
    `Price: ${priceLine}`,
    `Description (first ${DESC_TRUNCATE} chars): ${desc || "(none)"}`,
  ].join("\n");
}

export function buildUserPrompt(
  intent: string,
  sampled: CanonicalProduct[],
): string {
  const list = sampled.map(formatProductForPrompt).join("\n\n");
  return `Shopper intent: ${intent}

Store catalog (sampled, ${sampled.length} products shown):
${list}`;
}

export function buildPersonaPrompt(
  intent: string,
  sampled: CanonicalProduct[],
): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(intent, sampled),
  };
}
