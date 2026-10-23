import Link from "next/link";
import { isDemoMode } from "@/lib/env";

/** Shown on every page of a demo deployment: data is fictional; jump between the three presenter roles. */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="bg-[linear-gradient(90deg,#F15A24,#D2470F)] px-4 py-1.5 text-center text-xs font-semibold text-white">
      Demo environment — companies, requests and activity are fictional.{" "}
      <Link href="/demo" className="ml-1 rounded-full bg-white/20 px-2 py-0.5 underline-offset-2 hover:bg-white/30 hover:underline">
        Switch role: Admin · Manufacturer · Buyer
      </Link>
    </div>
  );
}
