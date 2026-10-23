import { cn } from "@/lib/utils";

/**
 * PatchMatch AI emblem: the supplied embroidered "P" patch with needle and thread
 * (raster from the approved brand kit — replace with the vector master when available).
 */
export function LogoMark({ className, title = "PatchMatch AI" }: { className?: string; title?: string }) {
  return <img src="/brand/emblem.webp" alt={title} width={442} height={506} className={cn("h-9 w-auto shrink-0 drop-shadow-[0_2px_3px_rgb(11_31_59/0.25)]", className)} />;
}

export function Logo({ className, tone = "dark", stacked = false, tagline = false }: { className?: string; tone?: "dark" | "light"; stacked?: boolean; tagline?: boolean }) {
  const text = tone === "light" ? "text-white" : "text-navy dark:text-white";
  return (
    <span className={cn("inline-flex items-center gap-2", stacked && "flex-col gap-1.5", className)}>
      <LogoMark className={stacked ? "h-14" : "h-9"} title="" />
      <span className={cn("flex flex-col", stacked && "items-center")}>
        <span className={cn("font-display text-[1.25rem] leading-none font-bold tracking-tight", text)}>
          Patch<span className="text-orange">Match</span>
          <span className="ml-0.5 text-orange">AI</span>
        </span>
        {tagline && <span className={cn("mt-1 text-[0.5rem] font-semibold tracking-[0.28em] uppercase", tone === "light" ? "text-white/70" : "text-muted")}>Custom patch sourcing platform</span>}
      </span>
    </span>
  );
}
