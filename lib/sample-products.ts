import type { CanonicalProduct } from "./types";

export function sampleProducts(
  products: CanonicalProduct[],
  limit: number,
): CanonicalProduct[] {
  if (products.length <= limit) return products;
  const sorted = [...products].sort((a, b) => {
    const aScore =
      (a.images.length > 0 ? 1 : 0) +
      (a.tags.length > 0 ? 1 : 0) +
      (a.description.length > 100 ? 1 : 0);
    const bScore =
      (b.images.length > 0 ? 1 : 0) +
      (b.tags.length > 0 ? 1 : 0) +
      (b.description.length > 100 ? 1 : 0);
    if (aScore !== bScore) return bScore - aScore;
    return a.title.localeCompare(b.title);
  });
  return sorted.slice(0, limit);
}
