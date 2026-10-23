"use client";

import { useState } from "react";
import { DEFAULT_FORECAST, forecastDay, forecastPeriod, type ForecastInputs } from "@/lib/analytics/forecast";
import { formatMoney } from "@/lib/money";

type Field = { k: keyof ForecastInputs; label: string; kind: "money" | "pct" | "num"; min: number; max: number; step: number };
const FIELDS: Field[] = [
  { k: "dailyAdSpendMinor", label: "Daily ad spend", kind: "money", min: 0, max: 500_000, step: 1000 },
  { k: "rawCplMinor", label: "Raw CPL", kind: "money", min: 50, max: 5000, step: 25 },
  { k: "qualificationRate", label: "Qualification rate", kind: "pct", min: 0, max: 1, step: 0.01 },
  { k: "matchRate", label: "Match rate", kind: "pct", min: 0, max: 1, step: 0.01 },
  { k: "sellThroughRate", label: "Sell-through", kind: "pct", min: 0, max: 1, step: 0.01 },
  { k: "avgUnlockMinor", label: "Avg unlock price", kind: "money", min: 500, max: 10_000, step: 100 },
  { k: "refundRate", label: "Refund rate", kind: "pct", min: 0, max: 0.5, step: 0.01 },
  { k: "variableCostPerSoldMinor", label: "Variable cost / sold", kind: "money", min: 0, max: 2000, step: 50 },
];

export function ForecastSimulator() {
  const [i, setI] = useState<ForecastInputs>(DEFAULT_FORECAST);
  const d = forecastDay(i);
  const m30 = forecastPeriod(i, 30);
  const m90 = forecastPeriod(i, 90);
  const fmt = (f: Field, v: number) => (f.kind === "money" ? formatMoney(v) : f.kind === "pct" ? `${Math.round(v * 100)}%` : v);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.k}>
            <div className="flex justify-between text-sm"><label htmlFor={`f-${f.k}`}>{f.label}</label><span className="tabular font-semibold">{fmt(f, Number(i[f.k] ?? 0))}</span></div>
            <input id={`f-${f.k}`} type="range" min={f.min} max={f.max} step={f.step} value={Number(i[f.k] ?? 0)} onChange={(e) => setI((s) => ({ ...s, [f.k]: Number(e.target.value) }))} className="mt-1 w-full accent-electric" />
          </div>
        ))}
        <label className="block text-sm">Seller demand cap (unlocks/day, blank = unconstrained)
          <input type="number" min={0} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-3" value={i.sellerDemandCap ?? ""} onChange={(e) => setI((s) => ({ ...s, sellerDemandCap: e.target.value === "" ? null : Number(e.target.value) }))} />
        </label>
        <button type="button" onClick={() => setI(DEFAULT_FORECAST)} className="text-xs font-semibold text-electric">Reset to documented defaults</button>
      </div>
      <div className="overflow-x-auto">
        <table className="tabular w-full min-w-[420px] text-sm">
          <caption className="mb-2 text-left text-xs text-muted">Hypothetical projection — not a forecast of actual results.</caption>
          <thead className="text-left text-xs text-muted uppercase"><tr><th className="py-2">Metric</th><th className="py-2 text-right">Per day</th><th className="py-2 text-right">30 days</th><th className="py-2 text-right">90 days</th></tr></thead>
          <tbody className="divide-y divide-line">
            {[
              ["Raw leads", d.rawLeads, m30.rawLeads, m90.rawLeads],
              ["Qualified RFQs", d.qualified, m30.qualified, m90.qualified],
              ["Sold RFQs", d.sold, m30.sold, m90.sold],
              ["Gross revenue", formatMoney(d.grossRevenueMinor), formatMoney(m30.grossRevenueMinor), formatMoney(m90.grossRevenueMinor)],
              ["Advertising cost", formatMoney(d.adSpendMinor), formatMoney(m30.adSpendMinor), formatMoney(m90.adSpendMinor)],
              ["Other variable costs", formatMoney(d.variableCostMinor), formatMoney(m30.variableCostMinor), formatMoney(m90.variableCostMinor)],
              ["Contribution (pre-overhead)", formatMoney(d.contributionMinor), formatMoney(m30.contributionMinor), formatMoney(m90.contributionMinor)],
            ].map((r) => <tr key={r[0] as string}><td className="py-2">{r[0]}</td><td className="py-2 text-right">{r[1]}</td><td className="py-2 text-right">{r[2]}</td><td className="py-2 text-right">{r[3]}</td></tr>)}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">Effective cost per sold RFQ: {d.effectiveCostPerSoldMinor != null ? formatMoney(d.effectiveCostPerSoldMinor) : "—"} · Net revenue per sold RFQ: {d.revenuePerSoldMinor != null ? formatMoney(d.revenuePerSoldMinor) : "—"}</p>
      </div>
    </div>
  );
}
