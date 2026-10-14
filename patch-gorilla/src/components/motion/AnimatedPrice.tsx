"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatUSD } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Price that rolls when it changes. aria-live so screen readers hear updates. */
export function AnimatedPrice({ cents, className, suffix }: { cents: number | null; className?: string; suffix?: string }) {
  const reduce = useReducedMotion();
  const text = cents === null ? "—" : formatUSD(cents);
  return (
    <span className={cn("relative inline-flex overflow-hidden tabular-nums", className)} aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          initial={reduce ? false : { y: "70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: "-70%", opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {text}
        </motion.span>
      </AnimatePresence>
      {suffix && <span className="ml-1 self-end text-[0.45em] font-semibold normal-case tracking-normal opacity-70">{suffix}</span>}
    </span>
  );
}
