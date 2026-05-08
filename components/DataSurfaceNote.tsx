// Disclosure of the data surface AgentRadar tests. Surfaced inline on
// the analysis page (not buried in methodology) because the limitation
// is fundamental to interpreting the score: /products.json exposes a
// stripped subset of what Shopify Catalog syndicates to UCP-integrated
// agents. A merchant should know the score reflects the public-web view.

export function DataSurfaceNote() {
  return (
    <aside className="border-l-2 border-neutral-300 pl-4 py-1 text-[12px] text-neutral-600 leading-relaxed max-w-3xl">
      <span className="block uppercase tracking-wider text-[10px] text-neutral-500 font-mono mb-1">
        Data surface tested
      </span>
      AgentRadar fetches the public{" "}
      <code className="font-mono text-neutral-800">/products.json</code> feed —
      titles, descriptions, types, tags, variants. Shopify&apos;s first-party
      Catalog channel via UCP also syndicates richer category metafields
      (Color, Neckline, Target gender, Sleeve length type, etc.) to integrated
      agents. This score reflects how a generic public-web LLM perceives the
      catalog, not the richer feed UCP-integrated agents see.
    </aside>
  );
}
