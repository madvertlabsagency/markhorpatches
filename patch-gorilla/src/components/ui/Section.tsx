import { cn } from "@/lib/utils";
import { Crown } from "@/components/brand/marks";

type Tone = "light" | "white" | "ice" | "dark" | "navy";

const toneClass: Record<Tone, string> = {
  white: "bg-white text-navy",
  light: "bg-offwhite text-navy",
  ice: "bg-ice text-navy",
  dark: "theme-dark",
  navy: "theme-navy",
};

/** Every page section declares its tone — the sticky header reads data-header-theme to adapt. */
export function Section({ tone = "light", className, children, id, as: Tag = "section", ...rest }: { tone?: Tone; className?: string; children: React.ReactNode; id?: string; as?: "section" | "div" | "footer" } & React.HTMLAttributes<HTMLElement>) {
  const dark = tone === "dark" || tone === "navy";
  return (
    <Tag id={id} data-header-theme={dark ? "dark" : "light"} className={cn("relative isolate", toneClass[tone], className)} {...rest}>
      {children}
    </Tag>
  );
}

export function Container({ className, children, size = "xl" }: { className?: string; children: React.ReactNode; size?: "md" | "lg" | "xl" | "2xl" }) {
  const max = { md: "max-w-3xl", lg: "max-w-5xl", xl: "max-w-7xl", "2xl": "max-w-[88rem]" }[size];
  return <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", max, className)}>{children}</div>;
}

export function SectionHeader({
  eyebrow,
  title,
  accent,
  description,
  align = "left",
  dark,
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  accent?: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  dark?: boolean;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <div className={cn("mb-4 flex items-center gap-3", align === "center" && "justify-center")}>
          <Crown className={cn("h-5", dark ? "text-turquoise" : "text-electric")} />
          <span className={cn("eyebrow", dark ? "text-white/70" : "text-slate")}>{eyebrow}</span>
        </div>
      )}
      <Tag className={cn("display text-[clamp(2.6rem,6.4vw,5rem)]", dark ? "text-white" : "text-navy")}>{title}</Tag>
      {accent && <div className={cn("hand mt-3 text-2xl -rotate-2", dark ? "text-turquoise" : "text-electric")}>{accent}</div>}
      {description && <p className={cn("mt-5 text-lg leading-relaxed", dark ? "text-white/70" : "text-slate")}>{description}</p>}
    </div>
  );
}
