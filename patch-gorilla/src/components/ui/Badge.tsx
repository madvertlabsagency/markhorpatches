import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-ice text-slate",
  info: "bg-electric/10 text-patch",
  action: "bg-gold/15 text-[#8a5d00]",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  dark: "bg-white/10 text-white",
} as const;

export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof tones; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}
