"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, Search, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PatchArt } from "@/components/brand/PatchArt";
import { ButtonLink } from "@/components/ui/Button";
import { Magnetic } from "@/components/motion/Magnetic";
import { MAIN_NAV, PATCH_NAV } from "@/content/navigation";
import { formatUSD } from "@/lib/money";
import { cn } from "@/lib/utils";
import { MobileNavigation } from "./MobileNavigation";
import { SearchDialog } from "./SearchDialog";

export interface HeaderProps {
  cartCount: number;
  signedIn: boolean;
  isStaff: boolean;
  startingPrices: Record<string, number | null>;
}

/** Sticky header that reads the tone of the section beneath it (data-header-theme). */
export function Header({ cartCount, signedIn, isStaff, startingPrices }: HeaderProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 12);
      const probe = document.elementsFromPoint(window.innerWidth / 2, 36).find((el) => el.closest("[data-header-theme]") && !el.closest("header"));
      const t = probe?.closest("[data-header-theme]")?.getAttribute("data-header-theme");
      setTheme(t === "dark" ? "dark" : "light");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  // Close menus on navigation (derived-state pattern, no effect needed).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMegaOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setMegaOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dark = theme === "dark" && !megaOpen;
  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setMegaOpen(false), 140);
  };

  return (
    <>
      <a href="#main" className="sr-only z-[80] rounded-full bg-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color,backdrop-filter] duration-500",
          scrolled || megaOpen ? (dark ? "bg-midnight/80 shadow-[0_1px_0_rgb(255_255_255/.06)] backdrop-blur-xl" : "bg-white/85 shadow-[0_1px_0_rgb(3_27_61/.08)] backdrop-blur-xl") : "bg-transparent",
          dark ? "text-white" : "text-navy",
        )}
        onMouseLeave={scheduleClose}
      >
        <div className="mx-auto flex h-[var(--header-h)] max-w-[88rem] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <Logo tone={dark ? "light" : "dark"} priority />

          <nav aria-label="Main" className="ml-2 hidden flex-1 items-center gap-0 xl:flex 2xl:ml-4">
            {MAIN_NAV.filter((i) => i.href !== "/support").map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              if ("mega" in item && item.mega) {
                return (
                  <div key={item.href} onMouseEnter={openMega}>
                    <button
                      type="button"
                      aria-expanded={megaOpen}
                      aria-controls="mega-menu"
                      onClick={() => setMegaOpen((o) => !o)}
                      className={cn("flex items-center gap-1 rounded-full px-3 py-2 text-[0.92rem] font-medium transition-colors", dark ? "hover:bg-white/10" : "hover:bg-navy/5")}
                    >
                      {item.label}
                      <ChevronDown className={cn("h-4 w-4 transition-transform", megaOpen && "rotate-180")} aria-hidden />
                    </button>
                  </div>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={scheduleClose}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative whitespace-nowrap rounded-full px-2.5 py-2 text-[0.9rem] font-medium transition-colors", dark ? "hover:bg-white/10" : "hover:bg-navy/5")}
                >
                  {item.label}
                  {active && <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-0.5 h-[3px] rounded-full bg-signature" />}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <button onClick={() => setSearchOpen(true)} aria-label="Search (Ctrl+K)" className={cn("hidden h-11 w-11 place-items-center rounded-full transition-colors min-[380px]:grid", dark ? "hover:bg-white/10" : "hover:bg-navy/5")}>
              <Search className="h-5 w-5" />
            </button>
            <Link href={isStaff ? "/admin" : signedIn ? "/account" : "/login"} aria-label={signedIn ? "My account" : "Sign in"} className={cn("hidden h-11 w-11 place-items-center rounded-full transition-colors sm:grid", dark ? "hover:bg-white/10" : "hover:bg-navy/5")}>
              <User className="h-5 w-5" />
            </Link>
            <Link href="/cart" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`} className={cn("relative grid h-10 w-10 place-items-center sm:h-11 sm:w-11 rounded-full transition-colors", dark ? "hover:bg-white/10" : "hover:bg-navy/5")}>
              <ShoppingBag className="h-5 w-5" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-signature px-1 text-[11px] font-bold text-white"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            <ButtonLink href="/build-your-patch" variant={dark ? "outline-light" : "outline"} size="sm" className="hidden lg:inline-flex xl:hidden 2xl:inline-flex">
              Build your patch
            </ButtonLink>
            <Magnetic className="hidden md:inline-flex">
              <ButtonLink href="/free-mockup" size="sm" arrow>
                Get a free mockup
              </ButtonLink>
            </Magnetic>
            <ButtonLink href="/build-your-patch" size="sm" className="h-10 px-3.5 md:hidden">
              Build
            </ButtonLink>
            <button onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen} className={cn("grid h-10 w-10 place-items-center rounded-full sm:h-11 sm:w-11 xl:hidden", dark ? "hover:bg-white/10" : "hover:bg-navy/5")}>
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {megaOpen && (
            <motion.div
              id="mega-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={openMega}
              className="absolute inset-x-0 top-full hidden border-t border-navy/5 bg-white text-navy shadow-[0_30px_60px_-30px_rgb(3_27_61/.4)] xl:block"
            >
              <div className="mx-auto grid max-w-[88rem] grid-cols-[1fr_300px] gap-10 px-8 py-8">
                <ul className="grid grid-cols-4 gap-3">
                  {PATCH_NAV.map((p) => (
                    <li key={p.href}>
                      <Link href={p.href} className="group flex h-full items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-ice">
                        <span className="w-14 shrink-0 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                          <PatchArt code={p.code} title="" />
                        </span>
                        <span>
                          <span className="block font-display text-xl font-extrabold uppercase leading-none">{p.label}</span>
                          <span className="mt-1 block text-sm leading-snug text-slate">{p.blurb}</span>
                          {startingPrices[p.code] != null && p.label !== "Name Patches" && (
                            <span className="mt-1 block text-xs font-semibold text-patch">From {formatUSD(startingPrices[p.code]!)} / ea</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="relative overflow-hidden rounded-3xl bg-midnight p-6 text-white">
                  <div className="grid-texture-dark absolute inset-0 opacity-60" aria-hidden />
                  <p className="hand relative -rotate-3 text-xl text-turquoise">Not sure which?</p>
                  <p className="display relative mt-2 text-4xl">Take the patch finder.</p>
                  <p className="relative mt-2 text-sm text-white/70">Six quick questions. One clear recommendation.</p>
                  <ButtonLink href="/patch-finder" size="sm" className="relative mt-5" arrow>
                    Find my patch
                  </ButtonLink>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <MobileNavigation open={mobileOpen} onOpenChange={setMobileOpen} signedIn={signedIn} isStaff={isStaff} onSearch={() => { setMobileOpen(false); setSearchOpen(true); }} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
