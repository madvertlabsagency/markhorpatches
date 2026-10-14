"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { Catalog } from "@/lib/configurator/rules";
import type { PriceTable } from "@/lib/pricing/types";
import { quoteConfiguration } from "@/lib/pricing/quote";
import { PatchArt } from "@/components/brand/PatchArt";
import { AnimatedPrice } from "@/components/motion/AnimatedPrice";
import { ButtonLink } from "@/components/ui/Button";
import { formatUSD } from "@/lib/money";
import { cn } from "@/lib/utils";

const SIZES = [2, 2.5, 3, 3.5, 4, 5];
const QTYS = [25, 50, 100, 200, 500, 1000];

export function BuilderTeaser({ catalog, tables }: { catalog: Catalog; tables: Record<string, PriceTable> }) {
  const [typeId, setTypeId] = useState(catalog.patchTypes[0]?.id ?? "");
  const [size, setSize] = useState(3);
  const [qty, setQty] = useState(100);
  const pt = catalog.patchTypes.find((p) => p.id === typeId);

  const quote = useMemo(() => {
    if (!pt) return null;
    const q = quoteConfiguration(catalog, tables, { patchTypeId: pt.id, widthIn: size, heightIn: size, quantity: Math.max(qty, pt.minQuantity), shape: null, backingId: null, borderId: null, extraIds: [] }, { partial: true });
    return q.ok ? q.line : null;
  }, [catalog, tables, pt, size, qty]);

  const effectiveQty = pt ? Math.max(qty, pt.minQuantity) : qty;
  const continueHref = pt ? `/build-your-patch?type=${pt.code}&size=${size}&qty=${effectiveQty}` : "/build-your-patch";

  return (
    <div className="grid gap-8 rounded-[2rem] bg-white p-5 shadow-lift ring-1 ring-navy/5 sm:p-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12 lg:p-10">
      <div className="space-y-8">
        <fieldset>
          <legend className="eyebrow mb-3 text-slate">1 · Patch type</legend>
          <div className="flex flex-wrap gap-2">
            {catalog.patchTypes.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === typeId}
                onClick={() => setTypeId(p.id)}
                className={cn("h-11 rounded-full border-2 px-4 text-sm font-semibold transition-all", p.id === typeId ? "border-transparent bg-navy text-white" : "border-navy/10 text-navy hover:border-navy/40")}
              >
                {p.shortName}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="eyebrow mb-3 text-slate">2 · Size</legend>
          <div className="flex flex-wrap gap-2">
            {SIZES.filter((s) => !pt || (s >= pt.minSizeIn && s <= pt.maxSizeIn)).map((s) => (
              <button key={s} type="button" aria-pressed={s === size} onClick={() => setSize(s)} className={cn("h-11 min-w-14 rounded-full border-2 px-3 font-display text-lg font-extrabold transition-all", s === size ? "border-transparent bg-signature text-white" : "border-navy/10 text-navy hover:border-navy/40")}>
                {s}&quot;
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="eyebrow mb-3 text-slate">3 · Quantity</legend>
          <div className="flex flex-wrap gap-2">
            {QTYS.map((q) => {
              const disabled = !!pt && q < pt.minQuantity;
              return (
                <button key={q} type="button" disabled={disabled} aria-pressed={q === qty} onClick={() => setQty(q)} className={cn("h-11 min-w-16 rounded-full border-2 px-3 font-display text-lg font-extrabold transition-all disabled:opacity-30", q === qty ? "border-transparent bg-signature text-white" : "border-navy/10 text-navy hover:border-navy/40")}>
                  {q.toLocaleString("en-US")}
                </button>
              );
            })}
          </div>
          {pt && qty < pt.minQuantity && <p className="mt-2 text-sm text-slate">{pt.shortName} starts at {pt.minQuantity} pieces.</p>}
        </fieldset>
      </div>

      <div className="relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] bg-midnight p-6 text-white sm:p-8">
        <div className="grid-texture-dark absolute inset-0 opacity-50" aria-hidden />
        <motion.div key={pt?.code} initial={{ rotate: -14, scale: 0.8, opacity: 0 }} animate={{ rotate: -6, scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }} className="absolute -right-6 -top-6 w-36 opacity-90 sm:w-44">
          <PatchArt code={pt?.code ?? "EMBROIDERED"} title="" />
        </motion.div>
        <div className="relative">
          <p className="eyebrow text-white/60">Example price</p>
          <p className="mt-2 text-sm text-white/70">
            {pt?.shortName} · {size}&quot; · {effectiveQty.toLocaleString("en-US")} pcs
          </p>
        </div>
        <div className="relative mt-16">
          <AnimatedPrice cents={quote?.unitPriceCents ?? null} suffix="/ patch" className="display text-7xl" />
          <p className="mt-2 text-white/70">
            Subtotal <AnimatedPrice cents={quote?.lineSubtotalCents ?? null} className="font-semibold text-white" />
          </p>
          {quote && quote.savingsCents > 0 && <p className="mt-1 text-sm font-semibold text-turquoise">You save {formatUSD(quote.savingsCents)} vs. small runs</p>}
          <p className="mt-3 text-xs text-white/50">Base price before backing &amp; extras. Final price shown before checkout.</p>
          <ButtonLink href={continueHref} className="mt-6 w-full" arrow>
            Continue building
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
