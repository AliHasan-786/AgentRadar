import type { Recommendation } from "../score/types";

// Rank by leverage (pointsLift desc). Tie-break: rules affecting more
// products go first. Stable sort preserves rule-library declaration order
// for further ties.
export function rankRecommendations(
  recs: Recommendation[],
): Recommendation[] {
  return [...recs].sort((a, b) => {
    if (b.pointsLift !== a.pointsLift) return b.pointsLift - a.pointsLift;
    return b.productCount - a.productCount;
  });
}

export interface RecommendationsView {
  top3: Recommendation[];
  rest: Recommendation[];
}

export function partitionRecommendations(
  recs: Recommendation[],
): RecommendationsView {
  const ranked = rankRecommendations(recs);
  return {
    top3: ranked.slice(0, 3),
    rest: ranked.slice(3),
  };
}
