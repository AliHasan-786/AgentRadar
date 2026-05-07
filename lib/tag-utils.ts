// Strip vendor-namespaced internal taxonomy tags from a Shopify product's tag
// array. Allbirds for example publishes tags like `allbirds::carbon-score =>
// 8.78`, `loop::returnable => true`, `YGroup_*`, `YCRF_*` — these are
// merchant-internal IDs, not customer-meaningful descriptors. They flood
// catalogs that use them and pollute both the LLM prompt budget and the
// tag-density score in the rubric. We strip them at both surfaces from one
// source of truth (this file) so methodology consistency is preserved.
//
// Methodology disclosure (renders into /content/methodology.md in Sprint 7):
// "Tags containing `::` (vendor-namespaced internal taxonomy) and tags
// matching `YGroup_*` / `YCRF_*` (Yotpo collection-key conventions) are
// excluded from both the LLM prompt and the tag-density signal in the
// discoverability rubric. The filter is in lib/tag-utils.ts and is the same
// at both surfaces."

export function isCustomerVisibleTag(tag: string): boolean {
  if (tag.includes("::")) return false;
  if (/^YGroup_/i.test(tag)) return false;
  if (/^YCRF_/i.test(tag)) return false;
  return true;
}

export function visibleTags(tags: string[]): string[] {
  return tags.filter(isCustomerVisibleTag);
}
