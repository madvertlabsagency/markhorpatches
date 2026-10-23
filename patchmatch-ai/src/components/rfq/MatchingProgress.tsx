"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, FileSearch, MailCheck, MessageSquareQuote, Radar, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "verify", label: "Email verified", icon: MailCheck },
  { key: "review", label: "Reviewed", icon: FileSearch },
  { key: "match", label: "Matched", icon: Radar },
  { key: "notify", label: "Manufacturers notified", icon: Send },
  { key: "quotes", label: "Quotes", icon: MessageSquareQuote },
];

function stageIndex(status: string) {
  switch (status) {
    case "DRAFT":
    case "SUBMITTED":
    case "VERIFICATION_PENDING":
      return 0;
    case "UNDER_REVIEW":
    case "CLARIFICATION_REQUIRED":
      return 1;
    case "QUALIFIED":
    case "MATCHING":
    case "MANUAL_SOURCING":
      return 2;
    case "SELLER_NOTIFIED":
      return 3;
    default:
      return 4;
  }
}

/**
 * Matching progress — driven only by the RFQ's real status and real counts from the database.
 * The pulse animates the CURRENT stage; it never implies live activity that isn't happening.
 */
export function MatchingProgress({ status, message, eligible, notified, unlocks, quotes }: { status: string; message: string; eligible: number; notified: number; unlocks: number; quotes: number }) {
  const reduce = useReducedMotion();
  const idx = stageIndex(status);
  const terminal = ["CLOSED", "CANCELLED", "EXPIRED"].includes(status);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white sm:p-8">
      <div className="grid-bg-dark absolute inset-0 opacity-70" aria-hidden />
      <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-electric/25 blur-[90px]" aria-hidden />
      <div className="relative">
        <p className="text-sm text-white/70">{message}</p>
        <ol className="mt-6 grid grid-cols-5 gap-2" aria-label="Request progress">
          {STAGES.map((s, i) => {
            const done = i < idx || (i === idx && (i === 4 ? quotes > 0 : false)) || (terminal && i <= idx);
            const current = i === idx && !done && !terminal;
            return (
              <li key={s.key} className="flex flex-col items-center text-center" aria-current={current ? "step" : undefined}>
                <div className="relative">
                  {current && !reduce && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-cyan/50" aria-hidden />}
                  <motion.span
                    initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className={cn("relative grid h-11 w-11 place-items-center rounded-full border", done ? "border-success bg-success text-white" : current ? "border-cyan bg-cyan text-navy" : "border-white/15 bg-white/5 text-white/40")}
                  >
                    {done ? <Check className="h-5 w-5" strokeWidth={3} /> : <s.icon className="h-5 w-5" />}
                  </motion.span>
                </div>
                <span className={cn("mt-2 text-[11px] leading-tight font-medium sm:text-xs", done || current ? "text-white" : "text-white/40")}>{s.label}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full bg-gradient-to-r from-orange to-gold" initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.min(100, ((idx + (quotes > 0 ? 1 : 0.5)) / STAGES.length) * 100)}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Eligible verified manufacturers", eligible],
            ["Notified", notified],
            ["Approved to contact you", unlocks],
            ["Quotes received", quotes],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <dt className="text-[11px] text-white/50">{k}</dt>
              <dd className="tabular mt-0.5 font-display text-xl font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
