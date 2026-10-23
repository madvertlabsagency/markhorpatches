import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * PatchMatch AI mark: two stitched patches overlapping — buyer requirement and manufacturer
 * capability — with the matched overlap highlighted. Pure vector, works at 16px.
 */
export function LogoMark({ className, title = "PatchMatch AI" }: { className?: string; title?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const a = `pma${uid}`, b = `pmb${uid}`, c = `pmc${uid}`;
  return (
    <svg viewBox="0 0 48 48" className={cn("h-8 w-8", className)} role="img" aria-label={title}>
      <defs>
        <linearGradient id={a} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#12305A" />
          <stop offset="1" stopColor="#0A0F1C" />
        </linearGradient>
        <linearGradient id={b} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00B4FF" />
          <stop offset="1" stopColor="#00E5FF" />
        </linearGradient>
        <clipPath id={c}>
          <rect x="4" y="4" width="26" height="26" rx="8" />
        </clipPath>
      </defs>
      <rect x="4" y="4" width="26" height="26" rx="8" fill={`url(#${a})`} />
      <rect x="18" y="18" width="26" height="26" rx="8" fill={`url(#${b})`} />
      <g clipPath={`url(#${c})`}>
        <rect x="18" y="18" width="26" height="26" rx="8" fill="#FFFFFF" />
      </g>
      <rect x="7.5" y="7.5" width="19" height="19" rx="5" fill="none" stroke="#00E5FF" strokeWidth="1.4" strokeDasharray="2.6 2.2" opacity="0.9" />
      <rect x="21.5" y="21.5" width="19" height="19" rx="5" fill="none" stroke="#0A0F1C" strokeWidth="1.4" strokeDasharray="2.6 2.2" opacity="0.55" />
    </svg>
  );
}

export function Logo({ className, tone = "dark", stacked = false }: { className?: string; tone?: "dark" | "light"; stacked?: boolean }) {
  const text = tone === "light" ? "text-white" : "text-fg";
  return (
    <span className={cn("inline-flex items-center gap-2.5", stacked && "flex-col gap-1.5", className)}>
      <LogoMark className={stacked ? "h-12 w-12" : "h-8 w-8"} />
      <span className={cn("font-display text-[1.15rem] leading-none font-bold tracking-tight", text, stacked && "text-center")}>
        Patch<span className="text-electric">Match</span>
        <span className={cn("ml-1 rounded-md px-1 py-0.5 align-middle text-[0.62rem] font-semibold tracking-wider", tone === "light" ? "bg-white/10 text-cyan" : "bg-electric/10 text-electric")}>AI</span>
      </span>
    </span>
  );
}
