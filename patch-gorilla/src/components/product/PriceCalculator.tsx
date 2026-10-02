"use client";
import { useEffect, useMemo, useState } from "react";
import type { Catalog } from "@/lib/configurator/rules";
import { allowedBackings } from "@/lib/configurator/rules";
import type { PriceTable } from "@/lib/pricing/types";
import { quoteConfiguration } from "@/lib/pricing/quote";
import { AnimatedPrice } from "@/components/motion/AnimatedPrice";
import { ButtonLink } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/fields";
import { formatUSD } from "@/lib/money";
import { track } from "@/lib/analytics";

/** Single-product calculator used on product pages. Same engine as the configurator and checkout. */
export function PriceCalculator({ catalog, tables, patchTypeId }: { catalog: Catalog; tables: Record<string, PriceTable>; patchTypeId: string }) {
  const pt = catalog.patchTypes.find((p) => p.id === patchTypeId)!;
  const [w, setW] = useState(3);
  const [h, setH] = useState(3);
  const [qty, setQty] = useState(Math.max(100, pt.minQuantity));
  const backings = allowedBackings(catalog, pt);
  const [backingId, setBackingId] = useState<string | null>(backings[0]?.id ?? null);

  useEffect(() => track("view_product", { patch_type: pt.code }), [pt.code]);

  const q = useMemo(
    () => quoteConfiguration(catalog, tables, { patchTypeId, widthIn: w || 0, heightIn: h || 0, quantity: qty || 0, shape: null, backingId, borderId: null, extraIds: [] }, { partial: true }),
    [catalog, tables, patchTypeId, w, h, qty, backingId],
  );

  const err = !q.ok ? q.pricingError ?? q.violations[0]?.message : null;
  return (
    <div className="grid grid-cols-1 gap-6 rounded-[2rem] bg-white p-5 shadow-lift ring-1 ring-navy/5 sm:p-8 lg:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 [&>*]:min-w-0">
        <Field label='Width (in)' htmlFor="calc-w" required>
          <Input id="calc-w" type="number" inputMode="decimal" step="0.25" min={pt.minSizeIn} max={pt.maxSizeIn * 1.5} value={w} onChange={(e) => setW(Number(e.target.value))} />
        </Field>
        <Field label='Height (in)' htmlFor="calc-h" required>
          <Input id="calc-h" type="number" inputMode="decimal" step="0.25" min={0.5} max={pt.maxSizeIn * 1.5} value={h} onChange={(e) => setH(Number(e.target.value))} />
        </Field>
        <Field label="Quantity" htmlFor="calc-q" required hint={`Minimum ${pt.minQuantity}`}>
          <Input id="calc-q" type="number" inputMode="numeric" min={pt.minQuantity} step={1} value={qty} onChange={(e) => setQty(Math.round(Number(e.target.value)))} />
        </Field>
        <Field label="Backing" htmlFor="calc-b" required>
          <Select id="calc-b" value={backingId ?? ""} onChange={(e) => setBackingId(e.target.value || null)}>
            {backings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.modifierValue ? ` (+${formatUSD(b.modifierValue)}/ea)` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-col justify-between rounded-[1.5rem] bg-midnight p-6 text-white">
        <div>
          <p className="eyebrow text-white/60">Your estimate</p>
          {err ? <p role="alert" className="mt-4 text-gold-hi">{err}</p> : null}
          <div className="mt-4">
            <AnimatedPrice cents={q.ok ? q.line.unitPriceCents : null} suffix="/ patch" className="display text-6xl" />
            <p className="mt-2 text-white/70">
              Subtotal <AnimatedPrice cents={q.ok ? q.line.lineSubtotalCents : null} className="font-semibold text-white" />
            </p>
            {q.ok && q.line.savingsCents > 0 && <p className="mt-1 text-sm font-semibold text-turquoise">Volume savings: {formatUSD(q.line.savingsCents)}</p>}
          </div>
        </div>
        <ButtonLink href={`/build-your-patch?type=${pt.code}&w=${w}&h=${h}&qty=${qty}${backingId ? `&backing=${backingId}` : ""}`} className="mt-6 w-full" arrow>
          Customize this patch
        </ButtonLink>
      </div>
    </div>
  );
}
