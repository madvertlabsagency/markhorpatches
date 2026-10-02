import { cn } from "@/lib/utils";

/** Tape / sticker label — a little bit of hand-made personality. */
export function StickerBadge({
  children,
  variant = "tape",
  rotate = -4,
  className,
}: {
  children: React.ReactNode;
  variant?: "tape" | "blue" | "outline" | "ink";
  rotate?: number;
  className?: string;
}) {
  const styles = {
    tape: "bg-[#efe6cf] text-navy shadow-[0_6px_14px_-6px_rgb(3_27_61/.35)] [clip-path:polygon(2%_6%,98%_0,100%_92%,1%_100%)]",
    blue: "bg-signature text-white shadow-glow [clip-path:polygon(0_8%,100%_0,97%_100%,3%_92%)]",
    outline: "border-2 border-current bg-transparent",
    ink: "bg-navy text-white",
  }[variant];
  return (
    <span
      className={cn("inline-block px-3.5 py-1.5 font-display text-sm font-extrabold uppercase leading-none tracking-wide", styles, className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}
