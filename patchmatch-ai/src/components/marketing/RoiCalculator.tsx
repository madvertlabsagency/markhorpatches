"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";

/** Seller ROI calculator — purely hypothetical arithmetic on the seller's own inputs. */
export function RoiCalculator() {
  const [v, setV] = useState({ unlocks: 20, price: 20, winRate: 15, orderValue: 600, margin: 30 });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: Number(e.target.value) || 0 }));
  const spend = v.unlocks * v.price;
  const orders = (v.unlocks * v.winRate) / 100;
  const gross = orders * v.orderValue * (v.margin / 100);
  const net = gross - spend;
  const fields: { k: keyof typeof v; label: string; suffix: string; min: number; max: number; step: number }[] = [
    { k: "unlocks", label: "RFQs unlocked per month", suffix: "", min: 1, max: 200, step: 1 },
    { k: "price", label: "Average unlock price", suffix: "$", min: 5, max: 100, step: 1 },
    { k: "winRate", label: "Your win rate", suffix: "%", min: 0, max: 100, step: 1 },
    { k: "orderValue", label: "Average order value", suffix: "$", min: 50, max: 20000, step: 50 },
    { k: "margin", label: "Your gross margin", suffix: "%", min: 0, max: 90, step: 1 },
  ];
  return (
    <div className="card grid gap-8 p-6 lg:grid-cols-[1.2fr_1fr] lg:p-8">
      <div className="space-y-5">
        {fields.map((f) => (
          <div key={f.k}>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={`roi-${f.k}`} className="font-medium">{f.label}</label>
              <span className="tabular font-semibold">{f.suffix === "$" ? `$${v[f.k].toLocaleString()}` : `${v[f.k]}${f.suffix}`}</span>
            </div>
            <input id={`roi-${f.k}`} type="range" min={f.min} max={f.max} step={f.step} value={v[f.k]} onChange={set(f.k)} className="mt-2 w-full accent-electric" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-navy p-6 text-white">
        <p className="font-display text-xs tracking-[0.16em] text-cyan uppercase">Hypothetical monthly result</p>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-white/60">RFQ spend</dt><dd className="tabular">{formatMoney(spend * 100)}</dd></div>
          <div className="flex justify-between"><dt className="text-white/60">Orders won</dt><dd className="tabular">{orders.toFixed(1)}</dd></div>
          <div className="flex justify-between"><dt className="text-white/60">Gross profit from orders</dt><dd className="tabular">{formatMoney(Math.round(gross * 100))}</dd></div>
          <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold"><dt>Net after RFQ spend</dt><dd className={`tabular ${net >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatMoney(Math.round(net * 100))}</dd></div>
          <div className="flex justify-between"><dt className="text-white/60">Cost per order won</dt><dd className="tabular">{orders > 0 ? formatMoney(Math.round((spend / orders) * 100)) : "—"}</dd></div>
        </dl>
        <p className="mt-5 text-xs text-white/45">Illustration only. PatchMatch AI does not promise orders, win rates or profit.</p>
      </div>
    </div>
  );
}
