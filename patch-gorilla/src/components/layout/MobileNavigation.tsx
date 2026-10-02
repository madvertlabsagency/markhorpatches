"use client";
import Link from "next/link";
import * as D from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PatchArt } from "@/components/brand/PatchArt";
import { ButtonLink } from "@/components/ui/Button";
import { MAIN_NAV, PATCH_NAV } from "@/content/navigation";

export function MobileNavigation({ open, onOpenChange, signedIn, isStaff }: { open: boolean; onOpenChange: (o: boolean) => void; signedIn: boolean; isStaff: boolean }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-midnight/70 backdrop-blur-sm data-[state=open]:animate-[fade-in_.2s_ease]" />
        <D.Content className="theme-dark fixed inset-0 z-[61] flex flex-col overflow-y-auto data-[state=open]:animate-[fade-in_.25s_ease]">
          <D.Title className="sr-only">Menu</D.Title>
          <D.Description className="sr-only">Site navigation</D.Description>
          <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden />
          <div className="relative flex h-[var(--header-h)] items-center justify-between px-4 sm:px-6">
            <Logo tone="light" className="w-[136px]" />
            <D.Close className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Close menu">
              <X className="h-6 w-6" />
            </D.Close>
          </div>
          <div className="relative flex-1 px-4 pb-10 sm:px-6">
            <p className="eyebrow mt-4 text-white/50">Patches</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {PATCH_NAV.map((p, i) => (
                <motion.li key={p.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
                  <Link href={p.href} onClick={() => onOpenChange(false)} className="flex min-h-14 items-center gap-3 rounded-2xl bg-white/5 p-3 active:bg-white/10">
                    <span className="w-9 shrink-0"><PatchArt code={p.code} title="" /></span>
                    <span className="font-display text-lg font-extrabold uppercase leading-none">{p.label}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
            <nav aria-label="Mobile" className="mt-8">
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {MAIN_NAV.filter((n) => !("mega" in n)).map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} onClick={() => onOpenChange(false)} className="display flex min-h-14 items-center justify-between py-3 text-4xl">
                      {n.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={isStaff ? "/admin" : signedIn ? "/account" : "/login"} onClick={() => onOpenChange(false)} className="display flex min-h-14 items-center py-3 text-4xl">
                    {isStaff ? "Admin" : signedIn ? "My account" : "Sign in"}
                  </Link>
                </li>
                <li>
                  <Link href="/track-order" onClick={() => onOpenChange(false)} className="display flex min-h-14 items-center py-3 text-4xl">
                    Track order
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="mt-8 grid gap-3">
              <ButtonLink href="/free-mockup" size="lg" arrow onClick={() => onOpenChange(false)}>Get a free mockup</ButtonLink>
              <ButtonLink href="/build-your-patch" size="lg" variant="outline-light" onClick={() => onOpenChange(false)}>Build your patch</ButtonLink>
            </div>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
