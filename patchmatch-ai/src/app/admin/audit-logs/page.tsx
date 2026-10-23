import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/primitives";
import { DataTable, FilterBar, Pagination } from "@/components/ui/data";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit logs" };
const PAGE = 100;

export default async function AuditLogs({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin("audit:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.q ? { OR: [{ action: { contains: sp.q, mode: "insensitive" as const } }, { entityType: { contains: sp.q, mode: "insensitive" as const } }, { entityId: sp.q }] } : {};
  const [rows, total] = await Promise.all([prisma.auditLog.findMany({ where, include: { actor: { select: { email: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }), prisma.auditLog.count({ where })]);
  return (
    <>
      <PageHeader title="Audit logs" description="Append-only record of sensitive actions." />
      <FilterBar action="/admin/audit-logs" q={sp.q} placeholder="Action, entity type or id" />
      <DataTable rows={rows} rowKey={(r) => r.id} dense columns={[
        { key: "d", header: "When", cell: (r) => formatDateTime(r.createdAt) }, { key: "a", header: "Actor", cell: (r) => r.actor?.email ?? "system" },
        { key: "ac", header: "Action", cell: (r) => <code className="text-xs">{r.action}</code> }, { key: "e", header: "Entity", cell: (r) => <span className="text-xs">{r.entityType} {r.entityId?.slice(0, 8)}</span> },
        { key: "df", header: "Details", cell: (r) => <span className="text-xs text-muted">{r.diff ? JSON.stringify(r.diff).slice(0, 140) : ""}</span>, hideOnMobile: true },
        { key: "ip", header: "IP", cell: (r) => <span className="tabular text-xs">{r.ipAddress ?? ""}</span>, hideOnMobile: true },
      ]} />
      <Pagination page={page} pageCount={Math.ceil(total / PAGE)} hrefFor={(p) => `/admin/audit-logs?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`} />
    </>
  );
}
