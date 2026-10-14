"use client";
/**
 * Recurring Markhor brand elements: horn mark, mountain contours, horn divider, summit trail,
 * brush underline, arrows, scribbles,
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

/** Signature device: two curved strokes echoing the Markhor's spiralled horns. Use small and sparingly. */
export function HornMark({ className, delay = 0 }: { className?: string; delay?: number }) {
  const d = useDraw(delay, 0.9);
  const d2 = useDraw(delay + 0.12, 0.9);
  return (
    <svg viewBox="0 0 64 44" fill="none" className={cn("h-8 w-auto", className)} aria-hidden>
      <motion.path {...d} d="M29 41 C 20 33, 25 25, 17 19 C 10 14, 9 8, 13 2" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <motion.path {...d2} d="M35 41 C 44 33, 39 25, 47 19 C 54 14, 55 8, 51 2" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <motion.path {...d} d="M22 27 C 24 25.5, 26 25.5, 27 26.5 M42 27 C 40 25.5, 38 25.5, 37 26.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

/** Topographic mountain contours — background line art for dark/light sections. */
export function MountainContours({ className, lines = 9 }: { className?: string; lines?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" fill="none" className={cn("pointer-events-none", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => {
        const k = i * 22;
        const path = `M-20 ${520 - k * 0.2} C 160 ${470 - k}, 300 ${360 - k * 1.2}, 470 ${300 - k * 1.1} S 640 ${150 - k * 0.6}, 720 ${110 + k * 0.3} S 880 ${260 - k}, 1000 ${330 - k * 0.8} S 1160 ${420 - k * 0.5}, 1240 ${470 - k * 0.3}`;
        return (
          <motion.path
            key={i}
            d={path}
            stroke="currentColor"
            strokeWidth={i === 0 ? 1.6 : 1}
            opacity={0.55 - i * 0.045}
            initial={reduce ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 2.2, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}
    </svg>
  );
}

/** A section divider that curves like a pair of horns meeting at the centre. */
export function HornDivider({ className }: { className?: string }) {
  const d = useDraw(0.1, 1.4);
  return (
    <svg viewBox="0 0 1200 60" preserveAspectRatio="none" fill="none" className={cn("h-10 w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="pg-horn-div" x1="0" x2="1">
          <stop offset="0" stopColor="#0A4AD6" stopOpacity="0" />
          <stop offset=".5" stopColor="#0AD2F7" />
          <stop offset="1" stopColor="#0A4AD6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path {...d} d="M0 50 C 300 50, 420 46, 520 30 C 560 22, 585 12, 600 6 C 615 12, 640 22, 680 30 C 780 46, 900 50, 1200 50" stroke="url(#pg-horn-div)" strokeWidth="2.5" />
    </svg>
  );
}

/** Ascending summit trail — connects process steps like a path up a mountain. */
export function SummitTrail({ className }: { className?: string }) {
  const d = useDraw(0.1, 2);
  return (
    <svg viewBox="0 0 1000 120" preserveAspectRatio="none" fill="none" className={cn("w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="pg-trail" x1="0" x2="1">
          <stop offset="0" stopColor="#0A4AD6" />
          <stop offset=".6" stopColor="#0A74F5" />
          <stop offset="1" stopColor="#0AD2F7" />
        </linearGradient>
      </defs>
      <motion.path {...d} d="M0 110 C 80 104, 120 92, 166 88 C 220 83, 260 76, 333 70 C 400 64, 440 56, 500 50 C 570 43, 610 36, 666 30 C 730 23, 780 17, 833 12 C 900 6, 950 4, 1000 2" stroke="url(#pg-trail)" strokeWidth="2.5" strokeDasharray="8 7" />
    </svg>
  );
}

export function BrushUnderline({ className, delay = 0.2 }: { className?: string; delay?: number }) {
  const d = useDraw(delay, 1.1);
  return (
    <svg viewBox="0 0 420 34" preserveAspectRatio="none" className={cn("h-4 w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="pg-brush" x1="0" x2="1">
          <stop offset="0" stopColor="#0A4AD6" />
          <stop offset=".55" stopColor="#0A74F5" />
          <stop offset="1" stopColor="#0AD2F7" />
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
