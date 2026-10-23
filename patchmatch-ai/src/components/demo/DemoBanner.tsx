import Link from "next/link";
import { isDemoMode } from "@/lib/env";

/** Shown on every page of a demo deployment: data is fictional; jump between the three presenter roles. */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div role="note" aria-label="Demo mode" className="bg-[linear-gradient(90deg,#F15A24,#D2470F)] px-4 py-1.5 text-center text-xs font-semibold text-white">
      <span className="tracking-wide">DEMO MODE — SIMULATED ACTIVITY</span>
      <span className="hidden sm:inline"> · Fictional companies, requests and payments. No real email, SMS or charges.</span>{" "}
      <span className="ml-1 inline-flex gap-1">
        <Link href="/demo/admin" className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30">Admin</Link>
        <Link href="/demo/manufacturer" className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30">Manufacturer</Link>
        <Link href="/demo/buyer" className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30">Buyer</Link>
      </span>
    </div>
  );
}
