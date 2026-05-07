// Build-time vs live-flow notes:
// - `buildModel` is the slug used at demo-store capture time (premium tier).
// - `liveModel` is the slug used for visitor-pasted custom URLs.
// - `displayName` is what appears next to the persona row in the UI; it
//   must match the model slug that actually ran (PRD §10.3). When the live
//   tier runs, the UI uses `liveDisplayName`.
//
// LIVE TIER (default): five direct provider keys, five distinct providers,
// five distinct models. The methodology contract — "5 different LLMs see
// your store differently" — holds for every visitor-pasted URL.
//
//   sustainable-runner    → Anthropic / Claude Haiku 4.5
//   arch-support-shopper  → OpenAI / GPT-4o-mini
//   daily-walker-gift     → Groq / Llama 3.3 70B Versatile
//   minimalist-traveler   → Google AI Studio / Gemini 3 Flash
//   vegan-with-reviews    → Mistral La Plateforme / Mistral Small (dated)
//
// Each live slug is dated/versioned (e.g. claude-haiku-4-5-20251001,
// mistral-small-2603, gpt-4o-mini-2024-07-18) rather than -latest aliases,
// so the methodology page can name the exact model that ran. The two
// non-dated slugs (gemini-3-flash-preview is preview-tagged, not dated;
// llama-3.3-70b-versatile is Groq's production tier with no dated form)
// are documented as such — methodology integrity over branding cleanliness.
//
// BUILD TIER (paid OpenRouter, AGENTRADAR_TIER=build): falls through the
// dispatcher to OpenRouter for the PRD §10.1 premium panel — Sonnet 4 /
// GPT-4o / Llama 3.3 70B / Gemini Flash / Mixtral 8x22B. Used for
// demo-store capture when premium reasoning quality matters more than
// per-call cost. Requires a funded OpenRouter balance.
//
// SLUG ROUTING: the dispatcher in lib/agents/dispatch.ts recognizes the
// `*-direct/` prefixes (anthropic-direct/, openai-direct/, groq-direct/,
// google-direct/, mistral-direct/) and routes them to per-provider clients
// in lib/{anthropic,openai,groq,gemini,mistral}.ts. Build-tier slugs have
// no `*-direct/` prefix and fall through to lib/openrouter.ts.
//
// HISTORICAL NOTE (kept for the changelog): earlier in the project we
// tried OpenRouter free credits, then Gemini direct as a single-provider
// fallback, before settling on the funded 5-direct-provider configuration.
// The transient detours produced two real findings worth keeping in the
// methodology page: Gemini 2.5 Pro and Flash are thinking models that
// burn output tokens on internal reasoning at typical budgets (use
// thinkingConfig.thinkingBudget=0 if you ever wire them in for structured
// classification); and OpenAI's free tier on `sk-proj-` keys requires
// explicit billing — listing endpoints work without it but chat completions
// don't.

export type PersonaId =
  | "sustainable-runner"
  | "arch-support-shopper"
  | "daily-walker-gift"
  | "minimalist-traveler"
  | "vegan-with-reviews";

export interface Persona {
  id: PersonaId;
  buildModel: string;
  liveModel: string;
  buildDisplayName: string;
  liveDisplayName: string;
  intent: string;
  testsDimension: string;
  // Hand-curated domain vocabulary used to differentiate sampling for
  // broad-intent personas. The relevance scorer adds these to the literal
  // intent's token bag so personas like "sustainable-runner" gravitate
  // toward Tree/wool-prefixed products in catalogs that actually carry that
  // language. Without expansion, abstract intent words ("sustainable",
  // "vegan", "comfortable") match nothing at the product level and the
  // scorer's tie-breaker collapses every broad-intent sample to the same
  // 30 products. Expansions are visible to visitors via the methodology
  // page; they're not opaque heuristics.
  //
  // Note on flagship-product-dominance: even with expansion, broad-intent
  // personas on catalogs with a strong flagship (Allbirds → Tree Dasher,
  // Nike → Air Max) tend to converge on the flagship. This reflects real
  // AI shopper behavior — ChatGPT and Perplexity show the same pattern —
  // and is preserved in the verdicts; we do not correct for it.
  expansionKeywords: string[];
}

export const PERSONAS: Persona[] = [
  {
    id: "sustainable-runner",
    buildModel: "anthropic/claude-sonnet-4",
    liveModel: "anthropic-direct/claude-haiku-4-5-20251001",
    buildDisplayName: "Claude Sonnet 4",
    liveDisplayName: "Claude Haiku 4.5",
    intent:
      "find me sustainable running shoes from a brand with strong environmental practices",
    testsDimension: "Trust signals + brand authority",
    expansionKeywords: [
      "wool",
      "tree",
      "merino",
      "recycled",
      "natural",
      "carbon",
      "eucalyptus",
      "renewable",
      "sugarcane",
      "organic",
    ],
  },
  {
    id: "arch-support-shopper",
    buildModel: "openai/gpt-4o",
    liveModel: "openai-direct/gpt-4o-mini-2024-07-18",
    buildDisplayName: "GPT-4o",
    liveDisplayName: "GPT-4o mini",
    intent:
      "trail running shoe under $150 with good arch support, please show specs",
    testsDimension: "Description quality + schema",
    expansionKeywords: [
      "outsole",
      "midsole",
      "stability",
      "cushion",
      "rubber",
      "grip",
      "lugs",
      "responsive",
      "drop",
      "performance",
    ],
  },
  {
    id: "daily-walker-gift",
    buildModel: "meta-llama/llama-3.3-70b-instruct",
    liveModel: "groq-direct/llama-3.3-70b-versatile",
    buildDisplayName: "Llama 3.3 70B",
    liveDisplayName: "Llama 3.3 70B (Groq)",
    intent:
      "looking for a comfortable shoe for someone in their 60s who walks daily, ideally a gift",
    testsDimension: "Use-case tagging + discoverability",
    expansionKeywords: [
      "everyday",
      "lounge",
      "casual",
      "soft",
      "cozy",
      "slip-on",
      "loafer",
      "walking",
      "all-day",
      "supportive",
    ],
  },
  {
    id: "minimalist-traveler",
    buildModel: "google/gemini-2.5-flash",
    liveModel: "google-direct/gemini-3-flash-preview",
    buildDisplayName: "Gemini 2.5 Flash",
    liveDisplayName: "Gemini 3 Flash",
    // Note: gemini-3-flash-preview is the only live-tier slug not dated.
    // Google AI Studio carries no dated form for this generation yet; the
    // -preview suffix is documented as the active versioning marker.
    // Methodology page should call this out explicitly so a recruiter
    // doesn't assume oversight.
    intent:
      "minimalist sneaker for travel — lightweight, easy to clean, neutral color",
    testsDimension: "Tag richness + attribute detail",
    expansionKeywords: [
      "lightweight",
      "machine-washable",
      "washable",
      "breathable",
      "low-profile",
      "low-top",
      "classic",
      "white",
      "black",
      "grey",
    ],
  },
  {
    id: "vegan-with-reviews",
    buildModel: "mistralai/mixtral-8x22b-instruct",
    liveModel: "mistral-direct/mistral-small-2603",
    buildDisplayName: "Mixtral 8x22B",
    liveDisplayName: "Mistral Small 2603",
    intent:
      "vegan shoes with strong customer reviews — show me the rating breakdown",
    testsDimension: "Review schema + trust signals",
    expansionKeywords: [
      "vegan",
      "synthetic",
      "non-leather",
      "plant-based",
      "canvas",
      "cotton",
      "cruelty-free",
      "linen",
      "hemp",
    ],
  },
];

export function getPersona(id: PersonaId): Persona {
  const p = PERSONAS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown persona: ${id}`);
  return p;
}

export function modelForPersona(
  persona: Persona,
  tier: "build" | "live",
): { slug: string; displayName: string } {
  if (tier === "build") {
    return { slug: persona.buildModel, displayName: persona.buildDisplayName };
  }
  return { slug: persona.liveModel, displayName: persona.liveDisplayName };
}
