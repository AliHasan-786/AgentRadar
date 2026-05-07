import { fetchCatalog } from "../lib/shopify";

(async () => {
  const fetched = await fetchCatalog("outdoorvoices.com");
  const byTitle = new Map<string, { handles: Set<string>; ids: string[] }>();
  for (const p of fetched.products) {
    const title = p.title;
    if (!byTitle.has(title)) {
      byTitle.set(title, { handles: new Set(), ids: [] });
    }
    const entry = byTitle.get(title)!;
    entry.handles.add(p.handle);
    entry.ids.push(String(p.id));
  }
  const dupTitles = Array.from(byTitle.entries())
    .filter(([, v]) => v.ids.length > 1)
    .sort((a, b) => b[1].ids.length - a[1].ids.length)
    .slice(0, 10);
  console.log(`Titles appearing on >1 product (top 10):`);
  for (const [title, v] of dupTitles) {
    console.log(`  "${title}" — ${v.ids.length} ids, ${v.handles.size} distinct handles`);
    console.log(`    handles: ${Array.from(v.handles).join(", ")}`);
  }
})();
