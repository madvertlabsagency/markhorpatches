"use client";

import { motion, useReducedMotion } from "motion/react";
import { BadgeCheck, FileImage, Lock, MapPin, Package, Timer } from "lucide-react";

/**
 * Illustrative product visual for the hero: an anonymised RFQ "spec sheet" stitched to three
 * manufacturer profiles. Explicitly labelled as an example — no live activity is implied.
 */
const SELLERS = [
  { name: "Manufacturer A", region: "Pakistan", score: 92, note: "Embroidered · MOQ 100" },
  { name: "Manufacturer B", region: "United States", score: 86, note: "Rush capable" },
  { name: "Manufacturer C", region: "Pakistan", score: 79, note: "Woven & PVC" },
];

export function MatchVisual() {
  const reduce = useReducedMotion();
  const fade = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } });
  return (
    <div className="relative">
      <p className="absolute -top-7 right-0 font-display text-[11px] tracking-[0.18em] text-white/40 uppercase">Example illustration</p>
      <div className="grid items-center gap-5 sm:grid-cols-[1.05fr_1fr]">
        {/* RFQ spec sheet */}
        <motion.div {...fade(0.1)} className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-2 rounded-xl border border-dashed border-cyan/30" aria-hidden />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs tracking-[0.16em] text-cyan uppercase">RFQ · PM-7K3Q9X</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">Tier A</span>
            </div>
            <p className="mt-3 font-display text-lg font-semibold">500 × Embroidered patches</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
              {[
                { icon: Package, k: "Size", v: '3" × 3", merrowed' },
                { icon: Timer, k: "Needed by", v: "In 6 weeks" },
                { icon: MapPin, k: "Ships to", v: "California, US" },
                { icon: FileImage, k: "Artwork", v: "Vector PDF" },
              ].map((r) => (
                <div key={r.k} className="rounded-lg bg-white/5 px-2.5 py-2">
                  <dt className="flex items-center gap-1.5 text-white/45">
                    <r.icon className="h-3.5 w-3.5" /> {r.k}
                  </dt>
                  <dd className="mt-0.5 font-medium text-white/90">{r.v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-navy/60 px-3 py-2 text-xs text-white/60">
              <Lock className="h-3.5 w-3.5 text-cyan" /> Buyer name, email and phone hidden until unlock
            </div>
          </div>
        </motion.div>

        {/* Matches */}
        <div className="relative space-y-3">
          <svg className="pointer-events-none absolute top-0 -left-6 hidden h-full w-6 sm:block" viewBox="0 0 24 300" preserveAspectRatio="none" aria-hidden>
            {[50, 150, 250].map((y, i) => (
              <motion.path
                key={y}
                d={`M0 150 C 12 150, 12 ${y}, 24 ${y}`}
                fill="none"
                stroke="#00E5FF"
                strokeOpacity="0.6"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                initial={reduce ? undefined : { pathLength: 0 }}
                animate={reduce ? undefined : { pathLength: 1 }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.6 }}
              />
            ))}
          </svg>
          {SELLERS.map((s, i) => (
            <motion.div key={s.name} {...fade(0.45 + i * 0.15)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-xl">
              <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-electric to-cyan font-display text-sm font-bold text-navy">
                {s.score}
                <span className="absolute -right-1 -bottom-1 grid h-4.5 w-4.5 place-items-center rounded-full bg-navy">
                  <BadgeCheck className="h-3.5 w-3.5 text-cyan" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{s.name}</p>
                <p className="truncate text-xs text-white/50">
                  {s.region} · {s.note}
                </p>
              </div>
            </motion.div>
          ))}
          <p className="pl-1 text-[11px] text-white/40">Match score: capability, capacity, delivery, quality, budget, responsiveness, logistics.</p>
        </div>
      </div>
    </div>
  );
}
