import type { CanonicalProduct } from "../types";

export type VerdictValue = "recommended" | "ranked-low" | "skipped";

export interface ParsedVerdict {
  verdict: VerdictValue;
  topProductId: string | null;
  reasoning: string;
  gaps: string[];
  flags: VerdictFlag[];
}

export type VerdictFlag =
  | "invalid-json"
  | "invented-product-id"
  | "mentions-reviews-not-in-catalog"
  | "missing-fields"
  | "invalid-verdict-value";

export interface VerdictParseResult {
  ok: boolean;
  parsed: ParsedVerdict | null;
  rawResponse: string;
  flags: VerdictFlag[];
  errorMessage?: string;
}

const VERDICT_VALUES: VerdictValue[] = ["recommended", "ranked-low", "skipped"];

function extractJsonBlock(text: string): string | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function reviewMentioned(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(reviews?|ratings?|stars?|verified buyer)\b/.test(lower);
}

const REVIEW_TERM_RE = /\b(reviews?|ratings?|stars?|aggregation|verified buyer)\b/g;
const NEGATION_RE =
  /\b(no|not|none|without|lack|lacks|lacking|missing|absent|cannot|cant|can't|doesn't|don't|isn't|aren't|unable|unavailable|nor)\b/;

// Returns true if every review/rating mention in `text` sits inside a clause
// that contains a negation word ("no reviews", "lack of ratings", "no
// customer reviews or ratings"). Walks each review-term occurrence and looks
// at up-to-the-last-sentence-end words preceding it; flag fires only when at
// least one review mention has no negation in scope. Suppresses the false
// positive on conjunctions like "no customer reviews or ratings" where a
// single "no" should cover both nouns.
function reviewMentionsAllNegated(text: string): boolean {
  const lower = text.toLowerCase();
  const matches = [...lower.matchAll(REVIEW_TERM_RE)];
  if (matches.length === 0) return true;
  for (const m of matches) {
    const idx = m.index ?? 0;
    const before = lower.slice(0, idx);
    const lastSentenceEnd = Math.max(
      before.lastIndexOf("."),
      before.lastIndexOf("!"),
      before.lastIndexOf("?"),
      before.lastIndexOf(";"),
    );
    const clause = before.slice(lastSentenceEnd + 1);
    if (!NEGATION_RE.test(clause)) return false;
  }
  return true;
}

export function parseVerdict(
  rawResponse: string,
  context: { sampledProducts: CanonicalProduct[]; catalogHasReviewSignal: boolean },
): VerdictParseResult {
  const flags: VerdictFlag[] = [];
  const block = extractJsonBlock(rawResponse);
  if (!block) {
    return {
      ok: false,
      parsed: null,
      rawResponse,
      flags: ["invalid-json"],
      errorMessage: "could not locate JSON object in response",
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(block);
  } catch (err) {
    return {
      ok: false,
      parsed: null,
      rawResponse,
      flags: ["invalid-json"],
      errorMessage:
        err instanceof Error ? err.message : "failed to parse JSON",
    };
  }

  if (!json || typeof json !== "object") {
    return {
      ok: false,
      parsed: null,
      rawResponse,
      flags: ["invalid-json"],
      errorMessage: "response was not a JSON object",
    };
  }

  const obj = json as Record<string, unknown>;
  const missing: string[] = [];
  if (!("verdict" in obj)) missing.push("verdict");
  if (!("topProductId" in obj)) missing.push("topProductId");
  if (!("reasoning" in obj)) missing.push("reasoning");
  if (!("gaps" in obj)) missing.push("gaps");
  if (missing.length > 0) flags.push("missing-fields");

  const verdictRaw = asString(obj.verdict).toLowerCase().trim();
  let verdict: VerdictValue;
  if (VERDICT_VALUES.includes(verdictRaw as VerdictValue)) {
    verdict = verdictRaw as VerdictValue;
  } else {
    flags.push("invalid-verdict-value");
    verdict = "skipped";
  }

  let topProductId: string | null = null;
  const rawTop = obj.topProductId;
  if (rawTop != null && rawTop !== "") {
    const id = asString(rawTop);
    if (context.sampledProducts.some((p) => p.id === id)) {
      topProductId = id;
    } else {
      flags.push("invented-product-id");
      topProductId = null;
    }
  }

  const reasoning = asString(obj.reasoning).trim();
  const gaps = Array.isArray(obj.gaps)
    ? obj.gaps.map(asString).filter((g) => g.length > 0)
    : [];

  if (
    !context.catalogHasReviewSignal &&
    reviewMentioned(reasoning) &&
    !reviewMentionsAllNegated(reasoning)
  ) {
    flags.push("mentions-reviews-not-in-catalog");
  }

  return {
    ok: flags.length === 0 || (flags.length === 1 && flags[0] === "missing-fields"),
    parsed: {
      verdict,
      topProductId,
      reasoning,
      gaps,
      flags: [...flags],
    },
    rawResponse,
    flags,
  };
}
