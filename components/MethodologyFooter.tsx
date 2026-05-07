import Link from "next/link";

interface Props {
  capturedAt?: string;
  productsSampled?: number;
  modelPanelLabel?: string;
}

export function MethodologyFooter({
  capturedAt,
  productsSampled,
  modelPanelLabel,
}: Props) {
  const fragments: string[] = [];
  fragments.push("Real LLMs · real catalog from /products.json");
  if (productsSampled) {
    fragments.push(`up to ${productsSampled} products sampled per persona`);
  }
  if (modelPanelLabel) {
    fragments.push(modelPanelLabel);
  }
  if (capturedAt) {
    const d = new Date(capturedAt);
    fragments.push(
      `cached ${d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`,
    );
  }

  return (
    <footer className="mt-8 pt-4 border-t border-neutral-200">
      <p className="text-xs text-neutral-500 leading-relaxed">
        <span className="font-mono">{fragments.join(" · ")}</span>
        <span className="mx-2 text-neutral-300">|</span>
        <Link
          href="/methodology"
          className="text-teal-700 hover:text-teal-900 font-medium"
        >
          audit every prompt and response →
        </Link>
      </p>
    </footer>
  );
}
