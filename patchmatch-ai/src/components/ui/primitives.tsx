import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-surface-2 text-muted ring-line",
  blue: "bg-electric/10 text-[#B93C0A] ring-electric/25 dark:text-cyan",
  green: "bg-success/10 text-success ring-success/25",
  amber: "bg-warning/12 text-[#B45309] ring-warning/30 dark:text-warning",
  red: "bg-danger/10 text-danger ring-danger/25",
  dark: "bg-navy text-white ring-navy dark:bg-white dark:text-navy",
  violet: "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300",
} as const;
export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "neutral", className, children, dot }: { tone?: BadgeTone; className?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset", BADGE_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const ALERT = {
  info: { icon: Info, cls: "border-electric/30 bg-electric/5 text-fg", iconCls: "text-electric" },
  success: { icon: CheckCircle2, cls: "border-success/30 bg-success/5 text-fg", iconCls: "text-success" },
  warning: { icon: AlertTriangle, cls: "border-warning/40 bg-warning/8 text-fg", iconCls: "text-warning" },
  error: { icon: XCircle, cls: "border-danger/30 bg-danger/5 text-fg", iconCls: "text-danger" },
};

export function Alert({ tone = "info", title, children, className, action }: { tone?: keyof typeof ALERT; title?: React.ReactNode; children?: React.ReactNode; className?: string; action?: React.ReactNode }) {
  const a = ALERT[tone];
  const Icon = a.icon;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", a.cls, className)}>
      <Icon className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", a.iconCls)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn("text-muted", title && "mt-0.5")}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center", className)}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-electric/10 text-electric">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4", className)} aria-hidden />;
}

export function StatCard({ label, value, hint, icon: Icon, href, tone = "default" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: LucideIcon; href?: string; tone?: "default" | "attention" }) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {Icon && (
          <span className={cn("grid h-8 w-8 place-items-center rounded-lg", tone === "attention" ? "bg-warning/12 text-warning" : "bg-electric/10 text-electric")}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="tabular mt-2 font-display text-xl font-semibold tracking-tight break-words sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "card block p-5 transition hover:border-electric/40";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function PageHeader({ title, description, actions, eyebrow, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KeyValue({ items, className, cols = 2 }: { items: { label: string; value: React.ReactNode }[]; className?: string; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-muted uppercase">{i.label}</dt>
          <dd className="mt-1 text-sm break-words">{i.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-deep to-[#1E6B4B] font-display text-xs font-semibold text-cyan", className)}>{initials || "?"}</span>;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-line", className)} />;
}

export function DemoBadge() {
  return <Badge tone="violet">Fictional demo data</Badge>;
}
