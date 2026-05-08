import Link from "next/link";
import { LiveShoppingFloor } from "@/components/LiveShoppingFloor";
import { normalizeHostname } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live analysis · AgentRadar",
  description:
    "Watch 5 AI shoppers query a Shopify store's public catalog in real time.",
};

export default async function LiveAnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; tier?: "build" | "live" }>;
}) {
  const { url, tier } = await searchParams;

  if (!url) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-10 font-sans">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="text-xs text-neutral-500 hover:text-neutral-900 font-mono"
          >
            ← back
          </Link>
          <h1 className="text-2xl font-bold mt-4">Missing URL</h1>
          <p className="text-sm text-neutral-700 mt-2">
            This route runs a live multi-agent analysis against any Shopify
            store. It expects a <code className="font-mono text-neutral-900">?url=</code> query
            parameter pointing to the store. Try it from the landing page or
            paste a URL like{" "}
            <Link
              href="/analyze?url=allbirds.com"
              className="text-teal-700 hover:text-teal-900"
            >
              /analyze?url=allbirds.com
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  let hostname: string;
  try {
    hostname = normalizeHostname(url);
  } catch {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-10 font-sans">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="text-xs text-neutral-500 hover:text-neutral-900 font-mono"
          >
            ← back
          </Link>
          <h1 className="text-2xl font-bold mt-4">Invalid URL</h1>
          <p className="text-sm text-neutral-700 mt-2 font-mono">
            Could not parse: {url}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10 font-sans">
      <div className="mx-auto max-w-4xl">
        <LiveShoppingFloor hostname={hostname} tier={tier ?? "live"} />
      </div>
    </main>
  );
}
