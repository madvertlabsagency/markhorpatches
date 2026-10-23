"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as RDialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function MobileNav({ links, signedInHref }: { links: { label: string; href: string }[]; signedInHref: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);
  return (
    <RDialog.Root open={open} onOpenChange={setOpen}>
      <RDialog.Trigger className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </RDialog.Trigger>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm" />
        <RDialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(24rem,90vw)] flex-col bg-surface p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <Logo />
            <RDialog.Title className="sr-only">Menu</RDialog.Title>
            <RDialog.Description className="sr-only">Site navigation</RDialog.Description>
            <RDialog.Close className="grid h-10 w-10 place-items-center rounded-xl hover:bg-surface-2" aria-label="Close menu">
              <X className="h-5 w-5" />
            </RDialog.Close>
          </div>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-xl px-3 py-3 font-display text-lg font-medium hover:bg-surface-2">
                {l.label}
              </Link>
            ))}
            <Link href="/help" className="rounded-xl px-3 py-3 font-display text-lg font-medium hover:bg-surface-2">
              Help
            </Link>
          </nav>
          <div className="mt-auto space-y-2">
            <Link href="/get-quotes" className="flex h-12 items-center justify-center rounded-xl bg-electric font-semibold text-navy">
              Get free custom patch quotes
            </Link>
            <Link href={signedInHref ?? "/login"} className="flex h-12 items-center justify-center rounded-xl border border-line font-semibold">
              {signedInHref ? "Go to dashboard" : "Sign in"}
            </Link>
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
