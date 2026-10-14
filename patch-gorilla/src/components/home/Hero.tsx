"use client";
import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { BadgeCheck, FileCheck2, Palette, Truck } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Magnetic } from "@/components/motion/Magnetic";
import { BrushUnderline, HornMark, HandArrow, MountainContours } from "@/components/brand/marks";
import { LogoEmblem } from "@/components/brand/Logo";
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
  const yMain = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const yFloatA = useTransform(scrollYProgress, [0, 1], ["0%", "-45%"]);
  const yFloatB = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);
  const yFloatC = useTransform(scrollYProgress, [0, 1], ["0%", "-60%"]);
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
              <HornMark className="h-7 text-turquoise" />
              <span className="eyebrow text-white/80">Markhor Patches</span>
            </motion.span>
            <span className="display block text-[clamp(2.6rem,5.8vw,5.1rem)]">
              {["Custom patches", "for brands that", "don’t follow the"].map((line, i) => (
                <span key={line} className="block overflow-hidden pb-[0.04em]">
                  <motion.span className="block" initial={reduce ? false : { y: "100%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.08 + i * 0.1, ease }}>
                    {line}
                  </motion.span>
                </span>
              ))}
              <span className="relative inline-block pb-3">
                <motion.span
                  className="hand text-gradient inline-block -rotate-3 pr-2 text-[1.08em] normal-case leading-[1.05]"
                  initial={reduce ? false : { opacity: 0, scale: 0.85, rotate: -8 }}
                  animate={{ opacity: 1, scale: 1, rotate: -3 }}
                  transition={{ duration: 0.8, delay: 0.5, ease }}
                >
                  herd.
                </motion.span>
                <BrushUnderline className="absolute -bottom-1 left-0 h-4 w-full" delay={0.95} />
              </span>
            </span>
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="hand mt-4 -rotate-1 text-2xl text-turquoise">
            Made to stand out.
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45, ease }} className="mt-6 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
            Turn your artwork into premium custom patches with free design support, digital proofing, flexible quantities and a production process built around your approval.
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

        {/* Layered product composition — real patch photography leads, brand supports */}
        <div className="relative mx-auto aspect-[1/0.92] w-full max-w-[640px] lg:max-w-none">
          <MountainContours className="absolute inset-[-8%] h-[116%] w-[116%] text-turquoise/60" lines={10} />
          <div className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/20 blur-[90px]" aria-hidden />

          <motion.div
            style={reduce ? undefined : { y: yMain }}
            initial={reduce ? false : { opacity: 0, scale: 0.9, rotate: 6 }}
            animate={{ opacity: 1, scale: 1, rotate: -4 }}
            transition={{ duration: 1.2, delay: 0.15, ease }}
            className="absolute left-[24%] top-[6%] w-[58%] drop-shadow-[0_40px_50px_rgb(0_0_0/.6)]"
          >
            <Image src="/placeholders/cut-explore.webp" alt="Embroidered mountain patch with a merrowed border" width={726} height={726} priority sizes="(min-width:1024px) 30vw, 60vw" className="h-auto w-full" />
          </motion.div>

          <motion.div style={reduce ? undefined : { y: yFloatA }} initial={reduce ? false : { opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.35, ease }} className="absolute left-[2%] top-[22%] w-[30%] drop-shadow-[0_30px_40px_rgb(0_0_0/.55)]">
            <div className="animate-float [--r:-8deg]">
              <Image src="/placeholders/cut-bear.webp" alt="Embroidered bear patch with heat-cut custom shape" width={540} height={762} sizes="20vw" className="h-auto w-full" />
            </div>
          </motion.div>

          <motion.div style={reduce ? undefined : { y: yFloatB }} initial={reduce ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5, ease }} className="absolute bottom-[2%] left-[10%] w-[34%] drop-shadow-[0_30px_40px_rgb(0_0_0/.55)]">
            <div className="animate-float [--r:6deg] [animation-delay:-2s]">
              <Image src="/placeholders/cut-astronaut.webp" alt="Woven astronaut patch reading Good Things Take Time" width={540} height={540} sizes="22vw" className="h-auto w-full" />
            </div>
          </motion.div>

          <motion.div style={reduce ? undefined : { y: yFloatC }} initial={reduce ? false : { opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.65, ease }} className="absolute bottom-[10%] right-[6%] w-[26%] drop-shadow-[0_30px_40px_rgb(0_0_0/.55)]">
            <div className="animate-float [--r:-5deg] [animation-delay:-4s]">
              <Image src="/placeholders/cut-smiley.webp" alt="Chenille-style smiley patch" width={432} height={432} sizes="18vw" className="h-auto w-full" />
            </div>
          </motion.div>

          <motion.div initial={reduce ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.9, ease }} className="absolute right-[2%] top-[2%] w-[16%] opacity-90">
            <LogoEmblem className="w-full drop-shadow-[0_10px_30px_rgb(10_116_245/.45)]" sizes="120px" />
          </motion.div>

          <div className="absolute bottom-[0%] right-[0%] hidden flex-col items-end gap-1 sm:flex">
            <HandArrow direction="down-left" className="h-10 w-10 -rotate-12 text-turquoise" delay={1.2} />
            <StickerBadge variant="blue" rotate={-6} className="text-base">Proof before production</StickerBadge>
          </div>
        </div>
      </div>
    </section>
  );
}
