import { notFound } from "next/navigation";
import { ShoppingFloor } from "@/components/ShoppingFloor";
import { getDemoStore, listDemoStoreSlugs } from "@/lib/demo-stores";
import type { ScoreResult } from "@/lib/score/types";
import type { AgentVerdict, CatalogMetadata } from "@/lib/types";

export const dynamic = "force-static";

export function generateStaticParams() {
  return listDemoStoreSlugs().map((slug) => ({ storeSlug: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = getDemoStore(storeSlug);
  if (!store) return { title: "Demo store not found · AgentRadar" };
  return {
    title: `${store.displayName} · AgentRadar analysis`,
    description: `How 5 AI shoppers describe ${store.displayName}'s catalog. Real LLMs, real /products.json, real transcripts.`,
  };
}

export default async function CachedAnalyzePage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = getDemoStore(storeSlug);
  if (!store) notFound();

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10 font-sans">
      <div className="mx-auto max-w-4xl">
        <ShoppingFloor
          storeName={store.displayName}
          hostname={store.hostname}
          vertical={store.vertical}
          capturedAt={store.capturedAt}
          metadata={store.catalog.metadata as CatalogMetadata}
          verdicts={store.verdicts as AgentVerdict[]}
          score={store.score as ScoreResult}
          cached={true}
        />
      </div>
    </main>
  );
}
