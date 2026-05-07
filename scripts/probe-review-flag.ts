// Unit-style probe of the mentions-reviews-not-in-catalog flag logic.
// No API calls — runs the parser on hand-crafted reasoning strings to
// validate the negation heuristic.

import { parseVerdict } from "../lib/agents/verdict-parser";

const cases: { label: string; reasoning: string; shouldFire: boolean }[] = [
  {
    label: "Mistral's actual response (false positive case)",
    reasoning:
      "The store's catalog does not explicitly mention vegan shoes, and there are no customer reviews or ratings visible to assess the quality or popularity of the products.",
    shouldFire: false,
  },
  {
    label: "GPT-4o response — 'no review aggregation' style",
    reasoning:
      "The catalog includes trail running shoes under $150. However, no review aggregation is visible.",
    shouldFire: false,
  },
  {
    label: "Llama response — 'no customer reviews available'",
    reasoning:
      "Llama Wool Runner Fluff is a great match. There are no customer reviews available for these products.",
    shouldFire: false,
  },
  {
    label: "Hypothetical hallucination — 'has 4.5 star reviews'",
    reasoning:
      "These shoes have 4.5 star reviews and are highly rated by customers.",
    shouldFire: true,
  },
  {
    label: "Mixed sentences",
    reasoning:
      "There are no detailed product specs. The product has many positive reviews from buyers.",
    shouldFire: true,
  },
  {
    label: "Negated conjunction across 'or'",
    reasoning:
      "No reviews or ratings are visible in the catalog data.",
    shouldFire: false,
  },
  {
    label: "No review mention at all",
    reasoning: "These shoes are durable and stylish.",
    shouldFire: false,
  },
];

let passed = 0;
let failed = 0;
for (const c of cases) {
  const result = parseVerdict(
    JSON.stringify({
      verdict: "skipped",
      topProductId: null,
      reasoning: c.reasoning,
      gaps: [],
    }),
    { sampledProducts: [], catalogHasReviewSignal: false },
  );
  const fired = result.flags.includes("mentions-reviews-not-in-catalog");
  const ok = fired === c.shouldFire;
  if (ok) passed++;
  else failed++;
  console.log(
    `${ok ? "✓" : "✗"} ${c.label}: shouldFire=${c.shouldFire} fired=${fired}`,
  );
  if (!ok) console.log(`    reasoning: "${c.reasoning}"`);
}
console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
