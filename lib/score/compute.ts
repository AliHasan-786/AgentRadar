import {
  DESCRIPTION,
  DESCRIPTION_GAP_KEYWORDS,
  DIMENSION_WEIGHTS,
  DISCOVERABILITY,
  SCHEMA,
  TRUST,
  TRUST_GAP_KEYWORDS,
} from "./rubric";
import type {
  DimensionScore,
  ScoreInputs,
  ScoreResult,
  SignalContribution,
} from "./types";

// === Math helpers ===

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Linear ramp 0..max over [lo, hi].
function ramp(value: number, lo: number, hi: number, max: number): number {
  if (value <= lo) return 0;
  if (value >= hi) return max;
  return ((value - lo) / (hi - lo)) * max;
}

// Trapezoid: 0 at floor, full points across [idealLow, idealHigh], 0 at ceiling.
// Penalizes both under-consolidated and over-consolidated.
function trapezoid(
  value: number,
  floor: number,
  idealLow: number,
  idealHigh: number,
  ceiling: number,
  max: number,
): number {
  if (value <= floor || value >= ceiling) return 0;
  if (value >= idealLow && value <= idealHigh) return max;
  if (value < idealLow) {
    return ramp(value, floor, idealLow, max);
  }
  return max - ramp(value, idealHigh, ceiling, max);
}

// Inverted ramp: high gap rate → low score.
function invertedRamp(value: number, topAt: number, max: number): number {
  const r = clamp(value / topAt, 0, 1);
  return max * (1 - r);
}

// === Persona-derived rates ===

function personaSurfaceRate(verdicts: ScoreInputs["verdicts"]): number {
  if (verdicts.length === 0) return 0;
  let surfaced = 0;
  let valid = 0;
  for (const v of verdicts) {
    if (v.error || !v.parsed) continue;
    valid++;
    if (
      v.parsed.verdict === "recommended" ||
      v.parsed.verdict === "ranked-low"
    ) {
      surfaced++;
    }
  }
  if (valid === 0) return 0;
  return surfaced / valid;
}

function personaGapRate(
  verdicts: ScoreInputs["verdicts"],
  keywords: readonly string[],
): number {
  if (verdicts.length === 0) return 0;
  const lowered = keywords.map((k) => k.toLowerCase());
  let valid = 0;
  let hits = 0;
  for (const v of verdicts) {
    if (v.error || !v.parsed) continue;
    valid++;
    const text = v.parsed.gaps.join(" ").toLowerCase();
    if (lowered.some((k) => text.includes(k))) hits++;
  }
  if (valid === 0) return 0;
  return hits / valid;
}

// === Dimension scorers ===

function scoreDiscoverability(inputs: ScoreInputs): DimensionScore {
  const { signals } = inputs;
  const conf = DISCOVERABILITY;
  const signalsOut: SignalContribution[] = [];

  const tagDensityPts = ramp(
    signals.averageVisibleTagsPerProduct,
    conf.tagDensity.zeroAt,
    conf.tagDensity.topAt,
    conf.tagDensity.maxPoints,
  );
  signalsOut.push({
    name: "tag density (visible tags/product)",
    value: signals.averageVisibleTagsPerProduct,
    weight: conf.tagDensity.maxPoints,
    contribution: tagDensityPts,
    source: "catalog",
  });

  const productTypePts = trapezoid(
    signals.productTypeBreadth,
    conf.productTypeBreadth.floor,
    conf.productTypeBreadth.idealLow,
    conf.productTypeBreadth.idealHigh,
    conf.productTypeBreadth.ceiling,
    conf.productTypeBreadth.maxPoints,
  );
  signalsOut.push({
    name: "product-type breadth",
    value: signals.productTypeBreadth,
    weight: conf.productTypeBreadth.maxPoints,
    contribution: productTypePts,
    source: "catalog",
  });

  const titlePts = trapezoid(
    signals.averageTitleWordCount,
    conf.titleSpecificity.zeroAt,
    conf.titleSpecificity.idealLow,
    conf.titleSpecificity.idealHigh,
    conf.titleSpecificity.ceiling,
    conf.titleSpecificity.maxPoints,
  );
  signalsOut.push({
    name: "title specificity (avg word count)",
    value: signals.averageTitleWordCount,
    weight: conf.titleSpecificity.maxPoints,
    contribution: titlePts,
    source: "catalog",
  });

  const surfaceRate = personaSurfaceRate(inputs.verdicts);
  const surfacePts = surfaceRate * conf.personaSurfaceRate.maxPoints;
  signalsOut.push({
    name: "persona surface rate (recommended + ranked-low)",
    value: surfaceRate,
    weight: conf.personaSurfaceRate.maxPoints,
    contribution: surfacePts,
    source: "persona-verdicts",
  });

  const score = clamp(
    tagDensityPts + productTypePts + titlePts + surfacePts,
    0,
    100,
  );
  return { score, signals: signalsOut };
}

function scoreDescription(inputs: ScoreInputs): DimensionScore {
  const { signals } = inputs;
  const conf = DESCRIPTION;
  const signalsOut: SignalContribution[] = [];

  const wordsPts = trapezoid(
    signals.averageDescriptionWords,
    conf.averageDescriptionWords.zeroAt,
    conf.averageDescriptionWords.idealLow,
    conf.averageDescriptionWords.idealHigh,
    conf.averageDescriptionWords.ceiling,
    conf.averageDescriptionWords.maxPoints,
  );
  signalsOut.push({
    name: "avg description word count",
    value: signals.averageDescriptionWords,
    weight: conf.averageDescriptionWords.maxPoints,
    contribution: wordsPts,
    source: "catalog",
  });

  const useCasePts = ramp(
    signals.useCaseLanguageRate,
    conf.useCaseLanguageRate.zeroAt,
    conf.useCaseLanguageRate.topAt,
    conf.useCaseLanguageRate.maxPoints,
  );
  signalsOut.push({
    name: "use-case language rate",
    value: signals.useCaseLanguageRate,
    weight: conf.useCaseLanguageRate.maxPoints,
    contribution: useCasePts,
    source: "catalog",
  });

  const attrPts = ramp(
    signals.attributeDetailRate,
    conf.attributeDetailRate.zeroAt,
    conf.attributeDetailRate.topAt,
    conf.attributeDetailRate.maxPoints,
  );
  signalsOut.push({
    name: "attribute detail rate",
    value: signals.attributeDetailRate,
    weight: conf.attributeDetailRate.maxPoints,
    contribution: attrPts,
    source: "catalog",
  });

  const descGapRate = personaGapRate(inputs.verdicts, DESCRIPTION_GAP_KEYWORDS);
  const gapPts = invertedRamp(
    descGapRate,
    conf.personaDescriptionGapRate.invertFromTopAt,
    conf.personaDescriptionGapRate.maxPoints,
  );
  signalsOut.push({
    name: "persona description-gap rate (inverted)",
    value: descGapRate,
    weight: conf.personaDescriptionGapRate.maxPoints,
    contribution: gapPts,
    source: "persona-verdicts",
  });

  const score = clamp(wordsPts + useCasePts + attrPts + gapPts, 0, 100);
  return { score, signals: signalsOut };
}

function scoreSchema(inputs: ScoreInputs): DimensionScore {
  const { signals } = inputs;
  const conf = SCHEMA;
  const signalsOut: SignalContribution[] = [];

  const reviewPts = ramp(
    signals.reviewSignalRate,
    conf.reviewSignalRate.zeroAt,
    conf.reviewSignalRate.topAt,
    conf.reviewSignalRate.maxPoints,
  );
  signalsOut.push({
    name: "review signal rate",
    value: signals.reviewSignalRate,
    weight: conf.reviewSignalRate.maxPoints,
    contribution: reviewPts,
    source: "catalog",
  });

  const variantPts = ramp(
    signals.variantStructureRate,
    conf.variantStructureRate.zeroAt,
    conf.variantStructureRate.topAt,
    conf.variantStructureRate.maxPoints,
  );
  signalsOut.push({
    name: "variant structure rate (multi-variant products)",
    value: signals.variantStructureRate,
    weight: conf.variantStructureRate.maxPoints,
    contribution: variantPts,
    source: "catalog",
  });

  // vendor consistency: 1-5 vendors → full pts; >50 → 0; linear in between
  let vendorPts: number;
  const v = signals.uniqueVendorCount;
  if (v <= conf.vendorConsistency.idealMaxVendors) {
    vendorPts = conf.vendorConsistency.maxPoints;
  } else if (v >= conf.vendorConsistency.ceiling) {
    vendorPts = 0;
  } else {
    const span =
      conf.vendorConsistency.ceiling - conf.vendorConsistency.idealMaxVendors;
    const overshoot = v - conf.vendorConsistency.idealMaxVendors;
    vendorPts = conf.vendorConsistency.maxPoints * (1 - overshoot / span);
  }
  signalsOut.push({
    name: "vendor consistency (count)",
    value: v,
    weight: conf.vendorConsistency.maxPoints,
    contribution: vendorPts,
    source: "catalog",
  });

  const imagesPts = ramp(
    signals.averageImagesPerProduct,
    conf.averageImagesPerProduct.zeroAt,
    conf.averageImagesPerProduct.topAt,
    conf.averageImagesPerProduct.maxPoints,
  );
  signalsOut.push({
    name: "avg images per product",
    value: signals.averageImagesPerProduct,
    weight: conf.averageImagesPerProduct.maxPoints,
    contribution: imagesPts,
    source: "catalog",
  });

  const score = clamp(reviewPts + variantPts + vendorPts + imagesPts, 0, 100);
  return { score, signals: signalsOut };
}

function scoreTrust(inputs: ScoreInputs): DimensionScore {
  const { signals } = inputs;
  const conf = TRUST;
  const signalsOut: SignalContribution[] = [];

  const policyPts = ramp(
    signals.policyKeywordRate,
    conf.policyKeywordRate.zeroAt,
    conf.policyKeywordRate.topAt,
    conf.policyKeywordRate.maxPoints,
  );
  signalsOut.push({
    name: "policy keyword rate",
    value: signals.policyKeywordRate,
    weight: conf.policyKeywordRate.maxPoints,
    contribution: policyPts,
    source: "catalog",
  });

  const brandPts = ramp(
    inputs.uniqueVendorShareTop,
    conf.vendorBrandClarity.floorAt,
    conf.vendorBrandClarity.topAt,
    conf.vendorBrandClarity.maxPoints,
  );
  signalsOut.push({
    name: "dominant-vendor share (brand clarity)",
    value: inputs.uniqueVendorShareTop,
    weight: conf.vendorBrandClarity.maxPoints,
    contribution: brandPts,
    source: "catalog",
  });

  const reviewPts = ramp(
    signals.reviewSignalRate,
    conf.reviewSignalAsTrustSignal.zeroAt,
    conf.reviewSignalAsTrustSignal.topAt,
    conf.reviewSignalAsTrustSignal.maxPoints,
  );
  signalsOut.push({
    name: "review signal rate (trust)",
    value: signals.reviewSignalRate,
    weight: conf.reviewSignalAsTrustSignal.maxPoints,
    contribution: reviewPts,
    source: "catalog",
  });

  const trustGapRate = personaGapRate(inputs.verdicts, TRUST_GAP_KEYWORDS);
  const gapPts = invertedRamp(
    trustGapRate,
    conf.personaTrustGapRate.invertFromTopAt,
    conf.personaTrustGapRate.maxPoints,
  );
  signalsOut.push({
    name: "persona trust-gap rate (inverted)",
    value: trustGapRate,
    weight: conf.personaTrustGapRate.maxPoints,
    contribution: gapPts,
    source: "persona-verdicts",
  });

  const score = clamp(policyPts + brandPts + reviewPts + gapPts, 0, 100);
  return { score, signals: signalsOut };
}

// === Top-level entry point ===

export function computeScore(
  inputs: ScoreInputs,
  recommendations: ScoreResult["recommendations"] = [],
): ScoreResult {
  const dimensions = {
    discoverability: scoreDiscoverability(inputs),
    description: scoreDescription(inputs),
    schema: scoreSchema(inputs),
    trust: scoreTrust(inputs),
  };

  const overall = clamp(
    DIMENSION_WEIGHTS.discoverability * dimensions.discoverability.score +
      DIMENSION_WEIGHTS.description * dimensions.description.score +
      DIMENSION_WEIGHTS.schema * dimensions.schema.score +
      DIMENSION_WEIGHTS.trust * dimensions.trust.score,
    0,
    100,
  );

  return {
    overall: Math.round(overall * 10) / 10,
    dimensions,
    recommendations,
    computedAt: new Date().toISOString(),
  };
}
