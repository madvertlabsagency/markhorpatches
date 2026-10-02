import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Official supplied logo files — never redrawn. `tone` picks the light- or dark-background version. */
export function Logo({ tone = "dark", className, href = "/", priority }: { tone?: "dark" | "light"; className?: string; href?: string | null; priority?: boolean }) {
  const img = (
    <Image
      src={tone === "light" ? "/brand/logo-horizontal-reverse.png" : "/brand/logo-horizontal.png"}
      alt="Patch Gorilla"
      width={1876}
      height={388}
      priority={priority}
      sizes="180px"
      className={cn("h-auto w-[150px] sm:w-[172px]", className)}
    />
  );
  if (!href) return img;
  return (
    <Link href={href} aria-label="Patch Gorilla — home" className="inline-flex shrink-0 items-center">
      {img}
    </Link>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return <Image src="/brand/logo-mark.png" alt="" width={560} height={388} className={cn("h-auto w-10", className)} aria-hidden />;
}
