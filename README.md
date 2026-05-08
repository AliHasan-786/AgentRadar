# AgentRadar

**See your Shopify store through AI shoppers' eyes.** AgentRadar runs five
real LLMs from five distinct providers — Anthropic, OpenAI, Groq, Google,
Mistral — against any Shopify store's public catalog with realistic shopping
prompts, and shows you the transcripts. A behavioral counterpart to the
static GEO/AEO audit tools that already exist.

🔗 **Live:** [agent-radar-one.vercel.app](https://agent-radar-one.vercel.app/)
🔗 **Methodology:** [agent-radar-one.vercel.app/methodology](https://agent-radar-one.vercel.app/methodology)
🔗 **Teardown:** [agent-radar-one.vercel.app/teardown](https://agent-radar-one.vercel.app/teardown)

## What it does

1. Paste a Shopify store URL (or click one of three pre-cached demo stores).
2. The system fetches the store's public `/products.json`, dedupes by
   `(title × productType)`, and computes 14 catalog signals.
3. Five distinct LLMs query the catalog with realistic shopping intents
   (sustainable runner / arch-support shopper / daily walker gift /
   minimalist traveler / vegan-with-reviews). Each one returns a verdict
   (recommended / ranked-low / skipped), a top product id, reasoning, and
   gap reports.
4. A deterministic 4-dimension rubric scores the catalog 0–100 with a
   visible weight + threshold config.
5. A deterministic rule library produces the top recommendations ranked by
   leverage.
6. Every prompt and every response is visible verbatim in the transcript
   modal. Every signal contribution is visible in the dimension card
   click-through. Every weight is visible on `/methodology`.

The frame: **the methodology contract is the code; the code is the
methodology contract.** Open the transcripts. Open the rubric source. If
something doesn't add up, the project hasn't met its bar.

## Why it exists

Shopify's [own
data](https://www.shopify.com/blog/how-agentic-commerce-works) shows AI-driven
traffic to stores grew 8× and orders from AI-powered searches grew 15×
between January 2025 and January 2026. McKinsey
[projects](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-agentic-commerce-opportunity-how-ai-agents-are-ushering-in-a-new-era-for-consumers-and-merchants)
$3–5T in global agentic commerce orchestration by 2030.

Existing diagnostic tools (Fudge.ai's Shopify AI Readiness Checker, Airefs,
AEO Engine) do **structural** analysis: "your FAQ schema is missing,"
"your alt text is weak." None show the merchant a transcript of what AI
agents actually say. The wedge AgentRadar fills is **behavioral, not
structural** — see [`/teardown`](https://agent-radar-one.vercel.app/teardown)
for the longer argument.

Built as a portfolio piece for the **Shopify Apprentice PM Fall 2026**
application.

## Architecture

```
app/                       Next.js 16 App Router
├── page.tsx               Landing — URL input + demo cards + value prop
├── analyze/
│   ├── page.tsx           Live custom-URL flow (SSE-driven)
│   └── [storeSlug]/       Cached demo stores (SSG via generateStaticParams)
├── methodology/page.tsx   Renders rubric config from source
├── teardown/page.tsx      Shopify-specific landscape teardown
└── api/
    ├── catalog/route.ts   POST: fetch /products.json, normalize, cache
    ├── analyze/route.ts   POST: SSE stream of persona verdicts + score
    └── score/route.ts     POST: standalone score+recs endpoint

lib/
├── shopify.ts             /products.json fetcher with paginator
├── catalog-{normalizer,signals}.ts
├── tag-utils.ts           Filter vendor-namespaced internal taxonomy
├── score/
│   ├── rubric.ts          Single config of weights + thresholds
│   ├── compute.ts         Deterministic dimension + overall score math
│   └── types.ts
├── recommendations/
│   ├── rules.ts           8-rule library, deterministic triggers
│   └── rank.ts
├── agents/
│   ├── personas.ts        5 personas with intent + expansion keywords
│   ├── prompts.ts         System prompt + relevance-weighted sampler
│   ├── runner.ts          Sync + retry-on-bad-JSON
│   ├── streaming-runner.ts SSE-yielding async generator
│   ├── dispatch.ts        Slug-prefix routing across 5 providers
│   └── verdict-parser.ts  JSON extraction + hallucination flags
├── openai-compat.ts       Generic OpenAI-shaped client factory
├── anthropic.ts           Messages API client (system as top-level field)
├── gemini.ts              Google AI Studio direct
├── groq.ts / mistral.ts / openai.ts / openrouter.ts (thin wrappers)
└── resilient-fetch.ts     undici Agent with c-ares DNS fallback

components/
├── ShoppingFloor.tsx      Cached composition root
├── LiveShoppingFloor.tsx  SSE-consuming progressive composition
├── AgentRow.tsx           idle → streaming → complete | error state machine
├── AgentTranscriptModal   Verbatim prompt + response display
├── ScoreDial.tsx          Big number with count-up animation
├── ScoreBreakdown.tsx     4-cell dimension grid + click-to-expand
├── RecommendationsList.tsx Top-3 + see-all disclosure
├── HeroInput.tsx          Landing-page URL form
└── MethodologyFooter.tsx

data/demo-stores/          Pre-captured analyses (allbirds, OV, Material Kitchen)
scripts/                   Capture, verify, probe, calibrate
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (TypeScript strict) |
| Styling | Tailwind CSS 4 |
| LLM providers | Anthropic + OpenAI + Groq + Google AI Studio + Mistral, direct |
| Build-tier fallback | OpenRouter for premium models |
| Streaming | SSE via `ReadableStream`, Node runtime |
| Hosting | Vercel free tier |

## Local dev

```bash
git clone https://github.com/AliHasan-786/AgentRadar
cd AgentRadar
npm install
cp .env.local.example .env.local
# Edit .env.local with your real keys for at least one provider.
# All five are recommended for the full panel; otherwise the persona that
# routes to the missing provider will render an honest error pill.
npm run dev
```

Required env vars (per `.env.local.example`):
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GROQ_API_KEY`
- `GOOGLE_API_KEY`
- `MISTRAL_API_KEY`
- `OPENROUTER_API_KEY` (only needed for build-tier captures)

## Capturing demo stores

```bash
npx tsx scripts/capture-demo-store.ts             # all three
npx tsx scripts/capture-demo-store.ts allbirds    # one
npx tsx scripts/verify-demo-captures.ts           # round-trip check
npx tsx scripts/retry-failed-verdicts.ts          # surgical retry
```

The capture script writes `data/demo-stores/{slug}.json` self-contained
(catalog + verdicts + score + recommendations + signals + uniqueVendorShareTop).
The verifier confirms drift = 0.00 between persisted and recomputed scores.

## Scripts (diagnostic + maintenance)

| Script | Purpose |
|---|---|
| `scripts/test-catalog.ts` | Catalog ingestion smoke test against any URL |
| `scripts/test-personas-all.ts` | 5-persona end-to-end against any catalog |
| `scripts/test-rubric.ts` | Calibration against Allbirds + OV + a stub bad-catalog |
| `scripts/probe-new-providers.ts` | Verify all 4 OpenAI-compat keys + pick dated slugs |
| `scripts/probe-review-flag.ts` | Unit-test the negation parser for the review-mention flag |
| `scripts/verify-demo-captures.ts` | Zod-validate persisted JSONs + score round-trip |

## Methodology

Click "methodology" in the live app, or read the page source directly at
`app/methodology/page.tsx`. The page renders the rubric config — weights,
thresholds, recommendation lifts — directly from
`lib/score/rubric.ts`, so changing a number in the source updates the
methodology page automatically.

Highlights worth reading there:
- **Image alt text is unavailable** from Shopify's `/products.json`; we
  therefore don't score it, and there's no `IMAGE_ALT_GAPS` rule.
  Methodology contract: don't measure what we don't have.
- **Dedup by `(title × productType)`**, not by handle. Outdoor Voices ships
  12 CloudKnit Shortsleeve products on different colorway handles;
  collapsing them is what an AI shopper would do.
- **Negation parser** for the `mentions-reviews-not-in-catalog` flag uses
  sentence-bounded clause checks, including conjunction patterns like
  "no reviews or ratings."
- **Free-tier provider gotchas** preserved as a changelog: Gemini direct
  enforces both per-day request count and a per-prompt token-throughput
  ceiling; OpenRouter's free tier dynamically tightens caps as the credit
  pool drains; OpenAI `sk-proj-` keys require explicit billing.

## What this is not

- A real production SaaS. Portfolio piece — though if a merchant finds it
  useful, please tell me.
- A predictor of what ChatGPT Shopping or Perplexity Shopping will actually
  do with your store. We are not those systems. We run leading LLMs against
  your catalog data; that's the frame, not a forecast.
- Empirically validated against revenue outcomes. The score is a heuristic;
  the rubric is published; reasonable people may weight things differently.

## Author

Ali Hasan · [github.com/AliHasan-786](https://github.com/AliHasan-786) ·
built for the Shopify Apprentice PM Fall 2026 application.
