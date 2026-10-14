"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Wrench } from "lucide-react";

const HIDE_ON = ["/build-your-patch", "/checkout", "/cart", "/free-mockup", "/admin", "/login", "/register", "/order"];

/** Persistent, compact mobile actions. Hidden where the page has its own sticky CTA. */
export function MobileActionBar() {
  const pathname = usePathname();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-white/90 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-2 gap-2">
        <Link href="/build-your-patch" className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-navy/15 font-display text-base font-extrabold uppercase tracking-wide text-navy">
          <Wrench className="h-4 w-4" aria-hidden /> Build your patch
        </Link>
        <Link href="/free-mockup" className="bg-signature flex h-12 items-center justify-center gap-2 rounded-full font-display text-base font-extrabold uppercase tracking-wide text-white">
          <Sparkles className="h-4 w-4" aria-hidden /> Free mockup
        </Link>
      </div>
    </div>
  );
}
