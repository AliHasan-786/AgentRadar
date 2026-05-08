import Link from "next/link";

// Sticky top nav present on every page. Editorial — text-only, mono labels,
// teal hover. No decoration, no logo mark, no dropdown menus. The point is
// discoverability of the secondary surfaces (methodology / teardown /
// github) that recruiters were missing in the footer.

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <nav
        aria-label="Primary"
        className="mx-auto max-w-6xl px-6 h-12 flex items-center justify-between text-xs font-mono"
      >
        <Link
          href="/"
          className="font-semibold text-neutral-900 hover:text-teal-700 tracking-tight"
        >
          AgentRadar
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/analyze/allbirds"
            className="text-neutral-700 hover:text-teal-700"
          >
            live demo
          </Link>
          <Link
            href="/methodology"
            className="text-neutral-700 hover:text-teal-700"
          >
            methodology
          </Link>
          <Link
            href="/teardown"
            className="text-neutral-700 hover:text-teal-700"
          >
            teardown
          </Link>
          <a
            href="https://github.com/AliHasan-786/AgentRadar"
            target="_blank"
            rel="noreferrer"
            className="text-neutral-700 hover:text-teal-700"
          >
            github ↗
          </a>
        </div>
      </nav>
    </header>
  );
}
