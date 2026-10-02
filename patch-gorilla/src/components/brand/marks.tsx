"use client";
/**
 * Recurring hand-drawn brand elements: crown, brush underline, arrows, scribbles,
 * sticker/tape labels and thread lines. Strokes "draw" in when scrolled into view.
 */
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const draw = (delay = 0, duration = 0.9) => ({
  initial: { pathLength: 0, opacity: 0 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true, margin: "-40px" },
  transition: { pathLength: { delay, duration, ease: [0.22, 1, 0.36, 1] as const }, opacity: { delay, duration: 0.01 } },
});

function useDraw(delay?: number, duration?: number) {
  const reduce = useReducedMotion();
  return reduce ? {} : draw(delay, duration);
}

export function Crown({ className, delay = 0 }: { className?: string; delay?: number }) {
  const d = useDraw(delay, 0.8);
  return (
    <svg viewBox="0 0 64 44" fill="none" className={cn("h-8 w-auto", className)} aria-hidden>
      <motion.path
        {...d}
        d="M5 38 L4 9 L18 24 L31 4 L44 23 L59 8 L57 37 C40 34 22 34 5 38 Z"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrushUnderline({ className, delay = 0.2 }: { className?: string; delay?: number }) {
  const d = useDraw(delay, 1.1);
  return (
    <svg viewBox="0 0 420 34" preserveAspectRatio="none" className={cn("h-4 w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="pg-brush" x1="0" x2="1">
          <stop offset="0" stopColor="#0755B9" />
          <stop offset=".55" stopColor="#008DE5" />
          <stop offset="1" stopColor="#08D8D8" />
        </linearGradient>
      </defs>
      <motion.path {...d} d="M6 22 C 90 10, 210 6, 412 12" stroke="url(#pg-brush)" strokeWidth="11" strokeLinecap="round" fill="none" />
      <motion.path {...useDraw((delay ?? 0) + 0.35, 0.8)} d="M60 29 C 150 22, 260 21, 360 23" stroke="url(#pg-brush)" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".7" />
    </svg>
  );
}

export function HandArrow({ className, direction = "down-right", delay = 0.3 }: { className?: string; direction?: "down-right" | "down-left" | "right" | "curl"; delay?: number }) {
  const d = useDraw(delay, 0.7);
  const head = useDraw(delay + 0.55, 0.3);
  const paths: Record<string, [string, string]> = {
    "down-right": ["M6 6 C 10 30, 24 46, 52 52", "M40 44 L53 52 L41 60"],
    "down-left": ["M54 6 C 50 30, 36 46, 8 52", "M20 44 L7 52 L19 60"],
    right: ["M4 30 C 20 18, 40 16, 60 28", "M50 18 L61 28 L48 34"],
    curl: ["M6 40 C 2 18, 30 4, 40 22 C 46 34, 30 40, 26 30 C 22 18, 44 10, 60 20", "M50 10 L60 20 L47 25"],
  };
  const [line, tip] = paths[direction];
  return (
    <svg viewBox="0 0 64 64" fill="none" className={cn("h-12 w-12", className)} aria-hidden>
      <motion.path {...d} d={line} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <motion.path {...head} d={tip} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Scribble({ className }: { className?: string }) {
  const d = useDraw(0.1, 1);
  return (
    <svg viewBox="0 0 120 40" fill="none" className={cn("h-6 w-auto", className)} aria-hidden>
      <motion.path {...d} d="M4 30 C 14 6, 26 6, 28 22 C 30 36, 44 34, 50 18 C 56 4, 70 8, 72 22 C 74 34, 90 34, 96 16 C 100 6, 110 8, 116 14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden fill="currentColor">
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" />
    </svg>
  );
}

/** Animated "thread" connector used between process steps. */
export function ThreadLine({ className, vertical }: { className?: string; vertical?: boolean }) {
  const d = useDraw(0.1, 1.6);
  return vertical ? (
    <svg viewBox="0 0 20 400" preserveAspectRatio="none" fill="none" className={cn("w-5", className)} aria-hidden>
      <motion.path {...d} d="M10 0 C 18 60, 2 120, 10 200 C 18 280, 2 340, 10 400" stroke="url(#pg-thread-v)" strokeWidth="2.5" strokeDasharray="7 6" />
      <defs>
        <linearGradient id="pg-thread-v" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0755B9" />
          <stop offset="1" stopColor="#08D8D8" />
        </linearGradient>
      </defs>
    </svg>
  ) : (
    <svg viewBox="0 0 1000 40" preserveAspectRatio="none" fill="none" className={cn("h-10 w-full", className)} aria-hidden>
      <motion.path {...d} d="M0 20 C 120 4, 220 36, 340 20 C 460 4, 560 36, 680 20 C 800 4, 900 36, 1000 20" stroke="url(#pg-thread-h)" strokeWidth="2.5" strokeDasharray="8 7" />
      <defs>
        <linearGradient id="pg-thread-h" x1="0" x2="1">
          <stop offset="0" stopColor="#0755B9" />
          <stop offset=".5" stopColor="#008DE5" />
          <stop offset="1" stopColor="#08D8D8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
