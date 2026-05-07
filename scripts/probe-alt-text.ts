import { resilientFetch } from "../lib/resilient-fetch";

const TARGETS = ["allbirds.com", "outdoorvoices.com"];

interface RawImg {
  id?: number;
  alt?: string | null;
  src: string;
  position?: number;
}
interface RawProduct {
  id: number;
  title: string;
  handle: string;
  images: RawImg[];
}

async function probe(host: string) {
  console.log(`\n=== ${host} — raw image alt audit ===`);
  const res = await resilientFetch(`https://${host}/products.json?limit=10&page=1`, {
    headers: { accept: "application/json", "user-agent": "AgentRadar/0.1" },
  });
  if (!res.ok) {
    console.log(`HTTP ${res.status}`);
    return;
  }
  const body = (await res.json()) as { products: RawProduct[] };
  const products = body.products.slice(0, 10);

  console.log(`Inspected ${products.length} products. First product raw image objects:`);
  if (products[0]) {
    console.log(JSON.stringify(products[0].images, null, 2).slice(0, 800));
  }

  let imagesTotal = 0;
  let altPresent = 0;
  let altNonEmpty = 0;
  let altNull = 0;
  let altUndefined = 0;
  let altEmptyString = 0;

  for (const p of products) {
    for (const img of p.images || []) {
      imagesTotal++;
      const altKeyExists = "alt" in img;
      const altValue = img.alt;
      if (altKeyExists) altPresent++;
      if (altValue === null) altNull++;
      else if (altValue === undefined) altUndefined++;
      else if (typeof altValue === "string" && altValue.trim() === "") altEmptyString++;
      else if (typeof altValue === "string" && altValue.trim().length > 0) altNonEmpty++;
    }
  }
  console.log(`Across ${imagesTotal} images on first ${products.length} products:`);
  console.log(`  alt key present:    ${altPresent}/${imagesTotal}`);
  console.log(`  alt = null:         ${altNull}`);
  console.log(`  alt = undefined:    ${altUndefined}`);
  console.log(`  alt = "":           ${altEmptyString}`);
  console.log(`  alt = non-empty:    ${altNonEmpty}`);
}

(async () => {
  for (const t of TARGETS) {
    await probe(t);
  }
})();
