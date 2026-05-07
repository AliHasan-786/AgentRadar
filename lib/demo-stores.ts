// Static registry of pre-captured demo stores. Imported as JSON modules
// so Next.js bundles them with the page, no request-time fetching, no
// `/products.json` dependency at view time. Cached analyses load
// instantly per FR-7.2.
//
// To recapture: `npx tsx scripts/capture-demo-store.ts` (all three) or
// `npx tsx scripts/capture-demo-store.ts allbirds` (one).

import allbirds from "../data/demo-stores/allbirds.json";
import materialKitchen from "../data/demo-stores/material-kitchen.json";
import outdoorVoices from "../data/demo-stores/outdoor-voices.json";

import type { DemoStoreCapture } from "./types";

// Cast through unknown — the JSONs are validated against the strict shape
// at capture time and re-validated by scripts/verify-demo-captures.ts.
// Sprint 5 component types will assume this shape and the verifier is the
// runtime contract that keeps them honest.
const captures = [allbirds, outdoorVoices, materialKitchen] as unknown as DemoStoreCapture[];

export const DEMO_STORES: ReadonlyArray<DemoStoreCapture> = captures;

export function getDemoStore(slug: string): DemoStoreCapture | null {
  return captures.find((c) => c.slug === slug) ?? null;
}

export function listDemoStoreSlugs(): string[] {
  return captures.map((c) => c.slug);
}
