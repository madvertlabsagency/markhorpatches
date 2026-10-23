import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge } from "@/components/ui/primitives";
import { DataTable, FilterBar, FilterSelect, Pagination } from "@/components/ui/data";
import { patchTypeName, PATCH_TYPES } from "@/lib/catalog";
import { formatDate } from "@/lib/utils";
import { RFQ_STATUS_LABEL } from "@/lib/state-machines";
import { statusTone } from "@/lib/ui-status";
import type { Prisma, RfqStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "All RFQs" };
const PAGE = 50;

export default async function AdminRfqs({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string; demo?: string }> }) {
  await requireAdmin("rfq:review");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.RfqWhereInput = {
    ...(sp.status ? { status: sp.status as RfqStatus } : {}),
    ...(sp.type ? { patchType: sp.type as never } : {}),
    ...(sp.demo === "only" ? { isDemo: true } : sp.demo === "all" ? {} : { isDemo: false }),
    ...(sp.q ? { OR: [{ publicRef: { contains: sp.q, mode: "insensitive" } }, { contactEmail: { contains: sp.q, mode: "insensitive" } }, { contactCompany: { contains: sp.q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total] = await Promise.all([prisma.rfq.findMany({ where, include: { spec: true, qualifications: { where: { isCurrent: true } }, opportunity: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }), prisma.rfq.count({ where })]);
  const qs = (p: number) => `/admin/rfqs?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), ...(sp.type ? { type: sp.type } : {}), ...(sp.demo ? { demo: sp.demo } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader title="All RFQs" description={`${total.toLocaleString()} matching`} />
      <FilterBar action="/admin/rfqs" q={sp.q} placeholder="RFQ ID, email or company">
        <FilterSelect name="status" value={sp.status} label="Status" options={Object.entries(RFQ_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
        <FilterSelect name="type" value={sp.type} label="Type" options={PATCH_TYPES.map((p) => ({ value: p.code, label: p.name }))} />
        <FilterSelect name="demo" value={sp.demo} label="Data" options={[{ value: "only", label: "Demo only" }, { value: "all", label: "Include demo" }]} />
      </FilterBar>
      <DataTable rows={rows} rowKey={(r) => r.id} rowHref={(r) => `/admin/rfq-review/${r.id}`} dense columns={[
        { key: "r", header: "RFQ", cell: (r) => <span className="tabular">{r.publicRef}</span> },
        { key: "w", header: "Request", cell: (r) => `${r.spec?.quantity.toLocaleString()} × ${patchTypeName(r.patchType)}` },
        { key: "b", header: "Buyer", cell: (r) => r.contactCompany ?? r.contactName, hideOnMobile: true },
        { key: "t", header: "Tier", cell: (r) => (r.qualifications[0] ? <Badge tone={statusTone("tier", r.qualifications[0].tier)}>{r.qualifications[0].tier}</Badge> : "—") },
        { key: "o", header: "Opportunity", cell: (r) => (r.opportunity ? <Badge tone={statusTone("opp", r.opportunity.status)}>{r.opportunity.status.toLowerCase().replace("_", " ")}</Badge> : "—"), hideOnMobile: true },
        { key: "s", header: "Status", cell: (r) => <Badge tone={statusTone("rfq", r.status)}>{RFQ_STATUS_LABEL[r.status]}</Badge> },
        { key: "d", header: "Created", cell: (r) => <>{formatDate(r.createdAt)}{r.isDemo && <Badge tone="violet" className="ml-1">demo</Badge>}</>, hideOnMobile: true },
      ]} />
      <Pagination page={page} pageCount={Math.ceil(total / PAGE)} hrefFor={qs} />
    </>
  );
}
