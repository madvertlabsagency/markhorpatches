import { Sparkle } from "@/components/brand/marks";
import { cn } from "@/lib/utils";

const DEFAULT = ["Free artwork support", "Digital proof", "Custom shapes", "Quality checked", "Tracked shipping", "Real human support"];

/** Infinite ticker. Pure CSS animation (paused for reduced motion via global rule). */
export function Marquee({ items = DEFAULT, className, tone = "gradient" }: { items?: string[]; className?: string; tone?: "gradient" | "navy" | "light" }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={hidden}>
      {items.map((t) => (
        <li key={t} className="flex items-center gap-8">
          <span className="display whitespace-nowrap text-3xl sm:text-4xl">{t}</span>
          <Sparkle className="h-5 w-5 opacity-80" />
        </li>
      ))}
    </ul>
  );
  return (
    <div
      data-header-theme={tone === "light" ? "light" : "dark"}
      className={cn(
        "relative flex overflow-hidden py-5 [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]",
        tone === "gradient" && "bg-signature text-white",
        tone === "navy" && "bg-navy text-white",
        tone === "light" && "bg-ice text-navy",
        className,
      )}
      role="marquee"
      aria-label={items.join(", ")}
    >
      <div className="flex animate-marquee hover:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
