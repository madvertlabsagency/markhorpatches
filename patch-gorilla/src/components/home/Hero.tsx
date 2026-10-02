"use client";
import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { BadgeCheck, FileCheck2, Palette, Truck } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Magnetic } from "@/components/motion/Magnetic";
import { BrushUnderline, Crown, HandArrow } from "@/components/brand/marks";
import { PatchArt } from "@/components/brand/PatchArt";
import { StickerBadge } from "@/components/brand/StickerBadge";
import { Counter } from "@/components/motion/Counter";

const ease = [0.22, 1, 0.36, 1] as const;

const TRUST = [
  { icon: Palette, label: "Free artwork support" },
  { icon: FileCheck2, label: "Digital proof" },
  { icon: BadgeCheck, label: "Quality checked" },
  { icon: Truck, label: "Tracked shipping" },
];

export function Hero({ metrics }: { metrics: { value: string; label: string }[] }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yImage = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const yFloatA = useTransform(scrollYProgress, [0, 1], ["0%", "-60%"]);
  const yFloatB = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);

  return (
    <section ref={ref} data-header-theme="dark" className="theme-dark relative isolate overflow-hidden pt-[var(--header-h)]">
      {/* atmosphere */}
      <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_75%)]" aria-hidden />
      <div className="pointer-events-none absolute -right-40 top-10 h-[640px] w-[640px] rounded-full bg-electric/25 blur-[140px]" aria-hidden />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-patch/30 blur-[120px]" aria-hidden />
      <div className="thread-noise pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid max-w-[88rem] items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:px-8 lg:pb-24 lg:pt-14">
        <motion.div style={reduce ? undefined : { opacity: fadeOut }} className="relative z-10">
          <h1>
            <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="mb-5 flex items-center gap-3">
              <Crown className="h-7 text-turquoise" />
              <span className="eyebrow text-white/75">Custom patches for bold brands</span>
            </motion.span>
            <span className="display block text-[clamp(3.6rem,11vw,8.6rem)]">
              <span className="block overflow-hidden pb-[0.04em]">
                <motion.span className="block" initial={reduce ? false : { y: "100%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.1, ease }}>
                  Any design.
                </motion.span>
              </span>
              <span className="relative block overflow-hidden pb-[0.08em]">
                <motion.span className="text-gradient block" initial={reduce ? false : { y: "100%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.22, ease }}>
                  Any style.
                </motion.span>
              </span>
            </span>
          </h1>
          <BrushUnderline className="-mt-1 h-5 w-[min(560px,88%)]" delay={0.8} />

          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45, ease }} className="mt-7 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
            From embroidered and woven to PVC, leather and chenille — turn your artwork into premium custom patches built around your design.
          </motion.p>

          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 grid max-w-xl grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4" aria-label="What's included">
            {TRUST.map(({ icon: I, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-[0.82rem] font-medium leading-tight text-white/85 sm:flex-col sm:items-start sm:gap-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-turquoise/40 bg-turquoise/5 text-turquoise">
                  <I className="h-5 w-5" aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </motion.ul>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.75, ease }} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Magnetic>
              <ButtonLink href="/free-mockup" size="lg" arrow className="w-full sm:w-auto">
                Get a free mockup
              </ButtonLink>
            </Magnetic>
            <ButtonLink href="/build-your-patch" size="lg" variant="outline-light">
              Build your patch
            </ButtonLink>
          </motion.div>
          <p className="mt-4 text-sm text-white/55">Nothing goes into production until you approve it.</p>

          {metrics.length > 0 && (
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-6">
              {metrics.map((m) => (
                <div key={m.label}>
                  <dt className="text-xs uppercase tracking-widest text-white/50">{m.label}</dt>
                  <dd className="display text-4xl"><Counter value={m.value} /></dd>
                </div>
              ))}
            </dl>
          )}
        </motion.div>

        {/* Layered patch composition */}
        <div className="relative mx-auto w-full max-w-[680px] lg:max-w-none">
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.94, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, delay: 0.15, ease }}
            style={reduce ? undefined : { y: yImage }}
            className="relative aspect-[780/600] w-full [mask-image:radial-gradient(ellipse_62%_62%_at_55%_50%,black_42%,transparent_100%)]"
          >
            <Image
              src="/placeholders/hero-composition.webp"
              alt="An assortment of custom embroidered and woven patches — bear, mountain, smiley, astronaut and a 'your design here' patch on dark denim"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </motion.div>

          <motion.div style={reduce ? undefined : { y: yFloatA }} className="absolute -left-2 bottom-4 w-20 sm:-left-6 sm:w-28 lg:-left-10" aria-hidden>
            <div className="animate-float [--r:-10deg]">
              <PatchArt code="PVC" title="" />
            </div>
          </motion.div>
          <motion.div style={reduce ? undefined : { y: yFloatB }} className="absolute -top-2 right-0 w-16 sm:w-24" aria-hidden>
            <div className="animate-float [--r:8deg] [animation-delay:-3s]">
              <PatchArt code="PUFF_3D" title="" />
            </div>
          </motion.div>
          <div className="absolute bottom-[8%] right-[2%] hidden flex-col items-end gap-1 sm:flex">
            <HandArrow direction="down-left" className="h-10 w-10 -rotate-12 text-turquoise" delay={1.2} />
            <StickerBadge variant="blue" rotate={-7} className="text-base">Proof before production</StickerBadge>
          </div>
        </div>
      </div>
    </section>
  );
}
