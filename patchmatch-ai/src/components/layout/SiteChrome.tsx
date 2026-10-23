import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { FOOTER_NAV, LEGAL_NAV, MAIN_NAV } from "@/content/navigation";
import { MobileNav } from "./MobileNav";
import { getCurrentUser, membershipOf } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";

export async function SiteHeader() {
  const user = await getCurrentUser().catch(() => null);
  const home = user ? (isStaff(user.platformRole) ? "/admin" : membershipOf(user, "SELLER") ? "/seller/dashboard" : "/buyer/dashboard") : null;
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="PatchMatch AI home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {MAIN_NAV.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {home ? (
            <ButtonLink href={home} variant="secondary" size="sm" className="hidden sm:inline-flex">
              Dashboard
            </ButtonLink>
          ) : (
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-fg sm:block">
              Sign in
            </Link>
          )}
          <ButtonLink href="/get-quotes" size="sm" className="hidden sm:inline-flex">
            Get free quotes <ArrowRight className="h-4 w-4" />
          </ButtonLink>
          <MobileNav links={MAIN_NAV} signedInHref={home} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-navy text-white">
      <div className="grid-bg-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="container-page relative py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_3fr]">
          <div>
            <Logo tone="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">Your patch. Your specs. Your perfect manufacturer. A sourcing marketplace connecting US buyers with verified custom patch manufacturers.</p>
            <p className="mt-4 text-xs text-white/40">A Madvert Labs venture.</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {FOOTER_NAV.map((col) => (
              <div key={col.title}>
                <p className="font-display text-xs font-semibold tracking-[0.14em] text-cyan uppercase">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm text-white/65 transition hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} PatchMatch AI. PatchMatch AI does not manufacture patches or take payment for orders; agreements are made directly between buyers and manufacturers.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-4">
            {LEGAL_NAV.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
