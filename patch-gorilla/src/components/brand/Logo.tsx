import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Official Markhor Patches brand assets (supplied files — never redrawn, never stretched).
 *  • markhor-emblem.png  — circular emblem with horns (transparent)
 *  • markhor-badge.png   — full badge: emblem + MARKHOR PATCHES wordmark + tagline
 *  • markhor-icon-*.png  — app / favicon icon
 * Every image keeps its intrinsic aspect ratio (h-auto + object-contain), so the circle can never distort.
 */
export const EMBLEM = { src: "/brand/markhor-emblem.png", width: 1209, height: 1188 };
export const BADGE = { src: "/brand/markhor-badge.png", width: 1056, height: 1160 };

/** Navigation lockup: official emblem + typeset wordmark. Swap for an official horizontal lockup file when supplied. */
export function Logo({ tone = "dark", className, href = "/", priority }: { tone?: "dark" | "light"; className?: string; href?: string | null; priority?: boolean }) {
  const lockup = (
    <span className={cn("inline-flex items-center gap-2 sm:gap-2.5", className)}>
      <Image src={EMBLEM.src} alt="" width={EMBLEM.width} height={EMBLEM.height} priority={priority} sizes="56px" className="h-auto w-9 shrink-0 object-contain min-[380px]:w-10 sm:w-11" aria-hidden />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-[1.15rem] font-black uppercase tracking-[0.02em] min-[380px]:text-[1.35rem] sm:text-[1.6rem]", tone === "light" ? "text-white" : "text-navy")}>Markhor</span>
        <span className={cn("mt-0.5 font-display text-[0.6rem] font-extrabold uppercase tracking-[0.42em] min-[380px]:text-[0.7rem] sm:text-[0.78rem]", tone === "light" ? "text-turquoise" : "text-electric")}>Patches</span>
      </span>
      <span className="sr-only">Markhor Patches</span>
    </span>
  );
  if (!href) return lockup;
  return (
    <Link href={href} aria-label="Markhor Patches — home" className="inline-flex shrink-0 items-center">
      {lockup}
    </Link>
  );
}

/** The full official badge (emblem + wordmark + tagline). Works on light and dark backgrounds. */
export function LogoBadge({ className, priority, sizes = "240px" }: { className?: string; priority?: boolean; sizes?: string }) {
  return <Image src={BADGE.src} alt="Markhor Patches — Custom patches for bold brands" width={BADGE.width} height={BADGE.height} priority={priority} sizes={sizes} className={cn("h-auto w-48 object-contain", className)} />;
}

/** Emblem only (horns + mountain + circle). Decorative by default. */
export function LogoEmblem({ className, alt = "", sizes = "160px", priority }: { className?: string; alt?: string; sizes?: string; priority?: boolean }) {
  return <Image src={EMBLEM.src} alt={alt} aria-hidden={alt ? undefined : true} width={EMBLEM.width} height={EMBLEM.height} sizes={sizes} priority={priority} className={cn("h-auto w-16 object-contain", className)} />;
}
