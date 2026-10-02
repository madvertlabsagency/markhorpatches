import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Crown } from "@/components/brand/marks";
import { FOOTER_NAV, LEGAL_NAV } from "@/content/navigation";
import type { Settings } from "@/lib/settings-schema";

const PAYMENT_LABEL: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover", apple_pay: "Apple Pay", google_pay: "Google Pay" };

export function Footer({ settings }: { settings: Settings }) {
  const { brand, promises, payments } = settings;
  const socials = Object.entries(brand.socials).filter(([, url]) => url);
  return (
    <footer data-header-theme="dark" className="theme-dark relative overflow-hidden pb-28 pt-20 md:pb-10">
      <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="bg-signature pointer-events-none absolute -top-px left-0 h-[3px] w-full" aria-hidden />
      <div className="relative mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Logo tone="light" className="w-[190px]" />
            <p className="display mt-8 text-4xl leading-[0.9] sm:text-5xl">
              Custom patches <br />
              for <span className="text-gradient">bold brands.</span>
            </p>
            <p className="mt-5 max-w-sm text-sm text-white/60">{promises.manufacturingStatement}</p>
            <div className="mt-6 space-y-1 text-sm text-white/80">
              {brand.supportEmail && (
                <p>
                  <a className="hover:text-turquoise" href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
                </p>
              )}
              {brand.phoneDisplay && <p>{brand.phoneDisplay}</p>}
              {brand.whatsappNumber && (
                <p>
                  <a className="hover:text-turquoise" href={`https://wa.me/${brand.whatsappNumber}`} target="_blank" rel="noopener noreferrer">WhatsApp a patch expert</a>
                </p>
              )}
              <p className="text-white/50">{brand.businessHours}</p>
            </div>
            {socials.length > 0 && (
              <ul className="mt-6 flex gap-2" aria-label="Social media">
                {socials.map(([name, url]) => (
                  <li key={name}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-full border border-white/15 px-4 text-xs font-semibold uppercase tracking-wider hover:border-turquoise hover:text-turquoise">
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(FOOTER_NAV).map(([heading, links]) => (
              <nav key={heading} aria-label={heading}>
                <p className="flex items-center gap-2 font-display text-lg font-extrabold uppercase tracking-wide text-white">
                  {heading}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm text-white/60 transition-colors hover:text-turquoise">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-white/10 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-xs text-white/50">
            <Crown className="h-4 text-turquoise" />
            <span>© {new Date().getFullYear()} Patch Gorilla. All rights reserved.</span>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
            {LEGAL_NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-turquoise">{l.label}</Link>
              </li>
            ))}
          </ul>
          {payments.displayedMethods.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Accepted payment methods">
              {payments.displayedMethods.map((m) => (
                <li key={m} className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">{PAYMENT_LABEL[m]}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
