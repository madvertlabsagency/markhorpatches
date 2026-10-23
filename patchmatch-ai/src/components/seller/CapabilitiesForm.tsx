"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm } from "@/components/ui/client";
import { Card, CardHeader } from "@/components/ui/primitives";
import { Checkbox, Input } from "@/components/ui/fields";
import { capabilitiesAction } from "@/app/actions/seller";
import { PATCH_TYPES, BACKINGS, BORDERS, COUNTRIES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Row = { patchType: string; moq: number; maxQuantity: number | null; weeklyCapacity: number | null; standardDays: number; rushDays: number | null; priceMin: number | null; priceMax: number | null };

export function CapabilitiesForm({ rows, backingOptions, borderOptions, shippingCountries, flags, onboarding }: { rows: Row[]; backingOptions: string[]; borderOptions: string[]; shippingCountries: string[]; flags: { artworkSupport: boolean; sampleCapable: boolean; rushCapable: boolean }; onboarding: boolean }) {
  const [enabled, setEnabled] = useState<string[]>(rows.map((r) => r.patchType));
  const byType = new Map(rows.map((r) => [r.patchType, r]));
  return (
    <ActionForm action={capabilitiesAction} submitLabel="Save capabilities" footer={onboarding ? <Link href="/seller/verification" className="text-sm font-semibold text-electric">Next: verification →</Link> : undefined}>
      <Card>
        <CardHeader title="Patch types" description="Per type: minimum order, maximum order, weekly capacity, lead times and typical unit price range (USD)." />
        <div className="divide-y divide-line">
          {PATCH_TYPES.map((p) => {
            const on = enabled.includes(p.code);
            const r = byType.get(p.code);
            const f = (k: string) => `${p.code}.${k}`;
            return (
              <div key={p.code} className={cn("px-5 py-4", on && "bg-electric/[0.03]")}>
                <label className="flex items-center gap-3 font-semibold">
                  <input type="checkbox" name="types" value={p.code} checked={on} onChange={(e) => setEnabled((s) => (e.target.checked ? [...s, p.code] : s.filter((x) => x !== p.code)))} className="h-4.5 w-4.5 accent-electric" />
                  {p.name}
                </label>
                {on && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    {[
                      ["moq", "MOQ", r?.moq, true],
                      ["maxQuantity", "Max qty", r?.maxQuantity, false],
                      ["weeklyCapacity", "Weekly capacity", r?.weeklyCapacity, false],
                      ["standardDays", "Standard days", r?.standardDays, true],
                      ["rushDays", "Rush days", r?.rushDays, false],
                      ["priceMin", "Min $/pc", r?.priceMin, false],
                      ["priceMax", "Max $/pc", r?.priceMax, false],
                    ].map(([k, label, val, req]) => (
                      <label key={k as string} className="text-xs font-medium text-muted">
                        {label as string}
                        <Input name={f(k as string)} inputMode="decimal" defaultValue={val == null ? "" : String(val)} required={req as boolean} className="tabular mt-1 h-9" />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Backing & border options" />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <fieldset><legend className="mb-2 text-sm font-medium">Backings</legend>{BACKINGS.filter((b) => b.code !== "OTHER").map((b) => <label key={b.code} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" name="backingOptions" value={b.code} defaultChecked={backingOptions.includes(b.code)} className="accent-electric" /> {b.label}</label>)}</fieldset>
            <fieldset><legend className="mb-2 text-sm font-medium">Borders</legend>{BORDERS.filter((b) => b.code !== "UNSURE").map((b) => <label key={b.code} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" name="borderOptions" value={b.code} defaultChecked={borderOptions.includes(b.code)} className="accent-electric" /> {b.label}</label>)}</fieldset>
          </div>
        </Card>
        <Card>
          <CardHeader title="Shipping & services" />
          <div className="space-y-4 p-5">
            <fieldset><legend className="mb-2 text-sm font-medium">Ships to</legend><div className="grid grid-cols-2 gap-1">{COUNTRIES.map((c) => <label key={c.code} className="flex items-center gap-2 text-sm"><input type="checkbox" name="shippingCountries" value={c.code} defaultChecked={shippingCountries.includes(c.code)} className="accent-electric" /> {c.name}</label>)}</div></fieldset>
            <Checkbox id="artworkSupport" name="artworkSupport" defaultChecked={flags.artworkSupport} label="Artwork / digitising support" />
            <Checkbox id="sampleCapable" name="sampleCapable" defaultChecked={flags.sampleCapable} label="Physical samples available" />
            <Checkbox id="rushCapable" name="rushCapable" defaultChecked={flags.rushCapable} label="Rush production available" />
          </div>
        </Card>
      </div>
    </ActionForm>
  );
}
