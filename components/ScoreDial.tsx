"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number | null;
  // When `value` transitions from null/0 to a real number, count up over
  // `animateMs`. Pass `animateMs={0}` for instant render (cached pages).
  animateMs?: number;
  label?: string;
  size?: "lg" | "sm";
}

const COUNT_STEPS = 28;

export function ScoreDial({
  value,
  animateMs = 0,
  label = "AI readiness",
  size = "lg",
}: Props) {
  const [shown, setShown] = useState<number | null>(value);
  const targetRef = useRef<number | null>(value);

  useEffect(() => {
    if (value == null) {
      setShown(null);
      targetRef.current = null;
      return;
    }
    if (animateMs === 0) {
      setShown(value);
      targetRef.current = value;
      return;
    }
    targetRef.current = value;
    const start = shown ?? 0;
    const delta = value - start;
    let step = 0;
    const interval = animateMs / COUNT_STEPS;
    const timer = setInterval(() => {
      step++;
      const t = step / COUNT_STEPS;
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = start + delta * eased;
      setShown(next);
      if (step >= COUNT_STEPS) {
        clearInterval(timer);
        setShown(targetRef.current ?? value);
      }
    }, interval);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, animateMs]);

  const display = shown == null ? "—" : Math.round(shown).toString();
  const big = size === "lg";

  return (
    <div className="flex flex-col items-end">
      <div className="text-xs uppercase tracking-wider text-neutral-500 font-mono">
        {label}
      </div>
      <div
        className={`font-bold tabular-nums leading-none text-teal-900 ${big ? "text-6xl md:text-7xl" : "text-3xl"}`}
        aria-live="polite"
      >
        {display}
        <span className="text-neutral-400 font-medium text-2xl md:text-3xl ml-1">
          / 100
        </span>
      </div>
    </div>
  );
}
