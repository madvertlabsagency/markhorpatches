import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Hide on small screens. */
  hideOnMobile?: boolean;
  align?: "left" | "right";
}

/** Server-rendered responsive table. On mobile, rows become stacked cards. */
export function DataTable<T>({ rows, columns, rowKey, rowHref, empty, dense }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; rowHref?: (r: T) => string; empty?: React.ReactNode; dense?: boolean }) {
  if (!rows.length) return <>{empty}</>;
  const pad = dense ? "px-3 py-2" : "px-4 py-3";
  return (
    <div className="card overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-2/60">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn(pad, "text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase", c.align === "right" ? "text-right" : "text-left", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={rowKey(r)} className={cn("transition-colors", rowHref && "hover:bg-surface-2/60")}>
                {columns.map((c, i) => (
                  <td key={c.key} className={cn(pad, "align-middle", c.align === "right" && "text-right tabular", c.className)}>
                    {i === 0 && rowHref ? (
                      <Link href={rowHref(r)} className="font-medium text-fg hover:text-electric">
                        {c.cell(r)}
                      </Link>
                    ) : (
                      c.cell(r)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => {
          const body = (
            <div className="space-y-1.5 px-4 py-3.5">
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((c, i) => (
                  <div key={c.key} className={cn("flex items-start justify-between gap-3 text-sm", i === 0 && "font-semibold")}>
                    {i > 0 && <span className="text-xs text-muted">{c.header}</span>}
                    <span className={cn("min-w-0 text-right", i === 0 && "text-left")}>{c.cell(r)}</span>
                  </div>
                ))}
            </div>
          );
          return <li key={rowKey(r)}>{rowHref ? <Link href={rowHref(r)} className="block hover:bg-surface-2/60">{body}</Link> : body}</li>;
        })}
      </ul>
    </div>
  );
}

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        <Link aria-disabled={page <= 1} href={hrefFor(Math.max(1, page - 1))} className={cn("inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-surface px-3 hover:bg-surface-2", page <= 1 && "pointer-events-none opacity-40")}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Link>
        <Link aria-disabled={page >= pageCount} href={hrefFor(Math.min(pageCount, page + 1))} className={cn("inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-surface px-3 hover:bg-surface-2", page >= pageCount && "pointer-events-none opacity-40")}>
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  );
}

/** GET-form filter bar: works without JavaScript, keeps state in the URL. */
export function FilterBar({ action, q, placeholder = "Search…", children }: { action: string; q?: string; placeholder?: string; children?: React.ReactNode }) {
  return (
    <form action={action} method="get" className="mb-4 flex flex-wrap items-center gap-2" role="search">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder} className="h-10 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm focus:border-electric focus:ring-3 focus:ring-electric/15 focus:outline-none" />
      </div>
      {children}
      <button className="h-10 rounded-xl bg-navy px-4 text-sm font-semibold text-white dark:bg-white dark:text-navy">Apply</button>
    </form>
  );
}

export function FilterSelect({ name, value, options, label }: { name: string; value?: string; options: { value: string; label: string }[]; label: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} aria-label={label} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm focus:border-electric focus:outline-none">
      <option value="">{label}: all</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Timeline({ items }: { items: { title: React.ReactNode; time?: React.ReactNode; body?: React.ReactNode; tone?: "default" | "active" | "done" }[] }) {
  return (
    <ol className="relative space-y-5 border-l border-line pl-5">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className={cn("absolute top-1 -left-[26.5px] h-3 w-3 rounded-full border-2 border-surface ring-2", it.tone === "active" ? "bg-electric ring-electric/30" : it.tone === "done" ? "bg-success ring-success/25" : "bg-line ring-line")} aria-hidden />
          <p className="text-sm font-medium">{it.title}</p>
          {it.time && <p className="text-xs text-muted">{it.time}</p>}
          {it.body && <div className="mt-1 text-sm text-muted">{it.body}</div>}
        </li>
      ))}
    </ol>
  );
}
