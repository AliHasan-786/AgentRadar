import type { ParsedVerdict, VerdictFlag } from "../agents/verdict-parser";
import type { CatalogSignals } from "../types";

export type DimensionId =
  | "discoverability"
  | "description"
  | "schema"
  | "trust";

export interface SignalContribution {
  name: string;
  value: number | string | boolean;
  weight: number;
  contribution: number;
  source: "catalog" | "persona-verdicts";
}

export interface DimensionScore {
  score: number;
  signals: SignalContribution[];
}

export interface ScoreResult {
  overall: number;
  dimensions: Record<DimensionId, DimensionScore>;
  recommendations: Recommendation[];
  computedAt: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  dimension: DimensionId;
  pointsLift: number;
  productCount: number;
  evidence: string[];
}

export interface VerdictSummary {
  personaId: string;
  modelSlug: string;
  displayName: string;
  parsed: ParsedVerdict | null;
  flags: VerdictFlag[];
  error: string | null;
}

export interface ScoreInputs {
  signals: CatalogSignals;
  verdicts: VerdictSummary[];
  productCount: number;
  uniqueVendorShareTop: number;
}
