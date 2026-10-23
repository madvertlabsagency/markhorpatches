"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PATCH_TYPES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Quick RFQ starter: pre-fills the wizard with patch type and quantity. */
export function QuickStart({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  const [type, setType] = useState("EMBROIDERED");
  const [qty, setQty] = useState("250");
  const dark = tone === "dark";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/get-quotes?type=${type}&qty=${encodeURIComponent(qty)}`);
      }}
      className={cn("grid gap-2 rounded-2xl p-2 sm:grid-cols-[1.3fr_0.8fr_auto]", dark ? "border border-white/10 bg-white/[0.07] backdrop-blur-xl" : "border border-line bg-surface shadow-[var(--shadow-lift)]")}
      aria-label="Start a quote request"
    >
      <label className="sr-only" htmlFor="qs-type">
        Patch type
      </label>
      <select id="qs-type" value={type} onChange={(e) => setType(e.target.value)} className={cn("h-12 rounded-xl px-3.5 text-[15px] font-medium focus:outline-none", dark ? "bg-white/5 text-white [&>option]:text-navy" : "bg-surface-2")}>
        {PATCH_TYPES.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name}
          </option>
        ))}
        <option value="NOT_SURE">Not sure yet</option>
      </select>
      <label className="sr-only" htmlFor="qs-qty">
        Quantity
      </label>
      <div className="relative">
        <input id="qs-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, "").slice(0, 7))} className={cn("tabular h-12 w-full rounded-xl pr-12 pl-3.5 text-[15px] font-medium focus:outline-none", dark ? "bg-white/5 text-white" : "bg-surface-2")} />
        <span className={cn("pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm", dark ? "text-white/50" : "text-muted")}>pcs</span>
      </div>
      <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-electric px-5 font-semibold text-[var(--pm-primary-fg)] shadow-[var(--shadow-glow)] transition hover:bg-[#19BDFF]">
        Get free quotes <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
