import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-black uppercase leading-none text-navy">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-slate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl bg-white p-5 ring-1 ring-line", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-xl font-extrabold uppercase text-navy">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const body = (
    <div className="h-full rounded-2xl bg-white p-5 ring-1 ring-line transition hover:ring-navy/30">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate">{label}</p>
      <p className="mt-2 font-display text-4xl font-black text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: string }) {
  const rows = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-offwhite text-xs uppercase tracking-wider text-slate">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {rows === 0 && <p className="p-8 text-center text-sm text-slate">{empty ?? "Nothing here yet."}</p>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warn" | "error"; children: React.ReactNode }) {
  const t = { info: "bg-electric/10 text-patch", success: "bg-success/10 text-success", warn: "bg-gold/15 text-[#7a5200]", error: "bg-danger/10 text-danger" }[tone];
  return <div role={tone === "error" ? "alert" : "status"} className={cn("mb-4 rounded-xl px-4 py-3 text-sm font-medium", t)}>{children}</div>;
}

export const inputCls = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20";
export const btnCls = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white transition hover:bg-patch disabled:opacity-50";
export const btnGhostCls = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-navy transition hover:border-navy";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate">{children}</label>;
}

/** Shows ?ok= / ?error= flash messages set by admin server actions. */
export function Flash({ sp }: { sp: { ok?: string; error?: string } }) {
  return (
    <>
      {sp.ok && <Notice tone="success">{sp.ok}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
    </>
  );
}
