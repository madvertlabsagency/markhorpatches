import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import * as Accordion from "@/components/marketing/FaqAccordion";
import { ButtonLink } from "@/components/ui/Button";
import { PatchArt } from "@/components/brand/PatchArt";
import { PATCH_TYPES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, description, align = "left", className, dark }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; align?: "left" | "center"; className?: string; dark?: boolean }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className={cn("eyebrow", dark && "text-cyan")}>{eyebrow}</p>}
      <h2 className={cn("mt-2 text-3xl leading-[1.1] font-semibold tracking-tight sm:text-[2.6rem]", dark && "text-white")}>{title}</h2>
      {description && <p className={cn("mt-4 text-base leading-relaxed", dark ? "text-white/65" : "text-muted")}>{description}</p>}
    </div>
  );
}

/** Stitch-numbered process steps (signature motif: dashed stitched connector). */
export function ProcessSteps({ steps, dark }: { steps: { title: string; body: string }[]; dark?: boolean }) {
  return (
    <ol className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <span className={cn("pointer-events-none absolute top-6 right-8 left-8 hidden border-t-2 border-dashed lg:block", dark ? "border-white/15" : "border-electric/25")} aria-hidden />
      {steps.map((s, i) => (
        <li key={s.title} className="relative">
          <span className={cn("relative z-10 grid h-12 w-12 place-items-center rounded-2xl font-display text-lg font-bold", dark ? "bg-electric text-navy" : "bg-navy text-cyan")}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className={cn("mt-4 text-lg font-semibold", dark && "text-white")}>{s.title}</h3>
          <p className={cn("mt-1.5 text-sm leading-relaxed", dark ? "text-white/60" : "text-muted")}>{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function PatchTypeGrid({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7" : "sm:grid-cols-2 lg:grid-cols-4")}>
      {PATCH_TYPES.map((p, i) => (
        <Link key={p.code} href={`/patch-types/${p.slug}`} className="group card relative overflow-hidden p-4 transition duration-300 hover:-translate-y-1 hover:border-electric/40 hover:shadow-[var(--shadow-lift)]">
          <div className={cn("mx-auto transition duration-500 group-hover:scale-105 group-hover:rotate-[-3deg]", compact ? "w-20" : "w-28")}>
            <PatchArt type={p.code} shape={(["shield", "circle", "rounded"] as const)[i % 3]} />
          </div>
          <p className={cn("mt-3 font-display font-semibold", compact ? "text-center text-sm" : "text-base")}>{p.name.replace(" patches", "")}</p>
          {!compact && <p className="mt-1 text-sm text-muted">{p.short}</p>}
          {!compact && (
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-electric">
              Learn more <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export function CheckList({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-[15px]">
          <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", dark ? "bg-cyan/15 text-cyan" : "bg-electric/12 text-electric")}>
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className={dark ? "text-white/80" : "text-fg/85"}>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function FaqSection({ faqs, title = "Frequently asked questions" }: { faqs: { q: string; a: string }[]; title?: string }) {
  return (
    <section className="container-page py-20">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading eyebrow="FAQ" title={title} description={<>Can't find an answer? <Link href="/help" className="font-semibold text-electric hover:underline">Visit the help center</Link>.</>} />
        <Accordion.FaqAccordion items={faqs} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }).replace(/</g, "\\u003c") }} />
    </section>
  );
}

export function CtaBand({ title, body, primary, secondary }: { title: string; body?: string; primary: { label: string; href: string }; secondary?: { label: string; href: string } }) {
  return (
    <section className="container-page pb-20">
      <div className="relative overflow-hidden rounded-[2rem] bg-navy px-6 py-14 text-white sm:px-14">
        <div className="grid-bg-dark absolute inset-0" aria-hidden />
        <div className="absolute -top-24 right-10 h-72 w-72 rounded-full bg-electric/35 blur-[100px]" aria-hidden />
        <div className="pointer-events-none absolute inset-3 rounded-[1.6rem] border border-dashed border-white/12" aria-hidden />
        <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
            {body && <p className="mt-3 text-white/65">{body}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={primary.href} size="lg">
              {primary.label} <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            {secondary && (
              <ButtonLink href={secondary.href} variant="outlineLight" size="lg">
                {secondary.label}
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MarketingHero({ eyebrow, title, description, children, art }: { eyebrow: string; title: React.ReactNode; description: React.ReactNode; children?: React.ReactNode; art?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div className="grid-bg-dark absolute inset-0" aria-hidden />
      <div className="absolute -top-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-electric/25 blur-[130px]" aria-hidden />
      <div className="container-page relative grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="eyebrow text-cyan">{eyebrow}</p>
          <h1 className="mt-3 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">{description}</p>
          {children && <div className="mt-8">{children}</div>}
        </div>
        {art && <div className="relative mx-auto w-full max-w-sm">{art}</div>}
      </div>
    </section>
  );
}
