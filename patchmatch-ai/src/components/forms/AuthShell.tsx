import Link from "next/link";
import { ShieldCheck, Lock, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PatchArt } from "@/components/brand/PatchArt";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <main id="main" className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" aria-label="PatchMatch AI home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[1.7rem] font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
      <aside className="relative hidden overflow-hidden bg-navy text-white lg:block" aria-hidden>
        <div className="grid-bg-dark absolute inset-0" />
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-electric/30 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-cyan/15 blur-[110px]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="grid grid-cols-3 gap-6 opacity-95">
            <PatchArt type="EMBROIDERED" className="w-full animate-float [--r:-6deg]" />
            <PatchArt type="PVC" shape="circle" className="mt-14 w-full animate-float [--r:5deg] [animation-delay:-2s]" />
            <PatchArt type="WOVEN" shape="rounded" className="w-full animate-float [--r:-3deg] [animation-delay:-4s]" />
          </div>
          <div>
            <p className="font-display text-3xl leading-tight font-semibold">
              Your patch. Your specs.
              <br />
              <span className="text-cyan">Your perfect manufacturer.</span>
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-cyan" /> Manufacturers are verified by people, not just software
              </li>
              <li className="flex items-center gap-2.5">
                <Lock className="h-4 w-4 text-cyan" /> Buyer contact details stay private until consent rules allow
              </li>
              <li className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-cyan" /> AI-assisted matching, with human review
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
