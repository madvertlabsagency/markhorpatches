import { HornMark, BrushUnderline, MountainContours } from "@/components/brand/marks";
import { Breadcrumbs } from "./Breadcrumbs";
import { Container } from "./Section";
import { cn } from "@/lib/utils";

/** Standard interior-page hero (dark by default). */
export function PageHero({ eyebrow, title, accent, description, crumbs, tone = "dark", children, aside }: { eyebrow?: string; title: React.ReactNode; accent?: string; description?: React.ReactNode; crumbs?: { name: string; path: string }[]; tone?: "dark" | "light"; children?: React.ReactNode; aside?: React.ReactNode }) {
  const dark = tone === "dark";
  return (
    <section data-header-theme={dark ? "dark" : "light"} className={cn("relative isolate overflow-hidden pb-16 pt-[calc(var(--header-h)+2.5rem)] sm:pb-20", dark ? "theme-dark" : "bg-ice text-navy")}>
      <div className={cn("pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_75%)]", dark ? "grid-texture-dark" : "grid-texture")} aria-hidden />
      {dark && <div className="pointer-events-none absolute -right-32 -top-20 h-[460px] w-[460px] rounded-full bg-electric/20 blur-[120px]" aria-hidden />}
      <MountainContours className={cn("absolute inset-x-0 bottom-0 h-3/4 w-full", dark ? "text-turquoise/20" : "text-electric/15")} lines={7} />
      <Container size="2xl" className="relative">
        {crumbs && <Breadcrumbs items={crumbs} dark={dark} className="mb-8" />}
        <div className={cn("grid grid-cols-1 items-center gap-10 [&>*]:min-w-0", aside && "lg:grid-cols-[1.2fr_1fr]")}>
          <div>
            {eyebrow && (
              <div className="mb-4 flex items-center gap-3">
                <HornMark className={cn("h-5", dark ? "text-turquoise" : "text-electric")} />
                <span className={cn("eyebrow", dark ? "text-white/70" : "text-slate")}>{eyebrow}</span>
              </div>
            )}
            <h1 className="display text-[clamp(2.6rem,8.5vw,6.6rem)] [overflow-wrap:anywhere]">{title}</h1>
            <BrushUnderline className="mt-1 h-4 w-60" />
            {accent && <p className={cn("hand mt-4 -rotate-2 text-2xl", dark ? "text-turquoise" : "text-electric")}>{accent}</p>}
            {description && <p className={cn("mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl", dark ? "text-white/75" : "text-slate")}>{description}</p>}
            {children && <div className="mt-8">{children}</div>}
          </div>
          {aside}
        </div>
      </Container>
    </section>
  );
}
