"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/** Counts up to a numeric value once visible. Non-numeric strings render as-is. */
export function Counter({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const match = /^([^\d]*)([\d,.]+)(.*)$/.exec(value);
  const target = match ? Number(match[2].replace(/,/g, "")) : NaN;
  const [shown, setShown] = useState(reduce || isNaN(target) ? value : `${match?.[1] ?? ""}0${match?.[3] ?? ""}`);
  useEffect(() => {
    if (!inView || reduce || isNaN(target) || !match) return;
    const controls = animate(0, target, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(`${match[1]}${Math.round(v).toLocaleString("en-US")}${match[3]}`),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);
  return <span ref={ref} className={className}>{shown}</span>;
}
