"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeroInput() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setSubmitting(true);
    router.push(`/analyze?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-10 flex flex-col sm:flex-row gap-3 max-w-2xl"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={submitting}
        placeholder="yourstore.com or store.myshopify.com"
        autoComplete="off"
        spellCheck={false}
        className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-3 text-base font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={submitting || !value.trim()}
        className="rounded-md bg-teal-700 px-6 py-3 text-base font-semibold text-white transition hover:bg-teal-800 disabled:bg-neutral-300 disabled:text-neutral-500"
      >
        {submitting ? "Loading…" : "Run analysis"}
      </button>
    </form>
  );
}
