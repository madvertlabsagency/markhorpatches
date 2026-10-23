import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge, KeyValue } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { SellerFinanceForms } from "@/components/admin/SellerFinanceForms";
import { countryName, patchTypeName } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";
import { statusTone, statusLabel } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Seller" };

export default async function AdminSeller({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin("sellers:view");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await prisma.sellerProfile.findUnique({ where: { id }, include: { capabilities: true, org: { include: { wallet: { include: { entries: { orderBy: { createdAt: "desc" }, take: 20 } } }, members: { include: { user: true } }, invoices: { orderBy: { createdAt: "desc" } } } }, unlocks: { include: { rfq: { select: { publicRef: true } } }, orderBy: { createdAt: "desc" }, take: 20 } } });
  if (!s) notFound();
  return (
    <>
      <PageHeader title={s.legalName} description={`${countryName(s.country)} · joined ${formatDate(s.createdAt)}`} actions={<><Badge tone={statusTone("ver", s.verificationStatus)}>{statusLabel(s.verificationStatus)}</Badge><Link href={`/admin/seller-verification/${s.id}`} className="text-sm font-semibold text-electric">Verification →</Link></>} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card><CardHeader title="Company" /><div className="p-5"><KeyValue cols={3} items={[
            { label: "Trading name", value: s.tradingName ?? "—" }, { label: "Contact", value: s.contactName }, { label: "Email", value: s.email }, { label: "Phone", value: s.phone ?? "—" },
            { label: "Registration #", value: s.registrationNumber ?? "—" }, { label: "Years", value: s.yearsOperating ?? "—" }, { label: "Factory", value: s.factoryLocation ?? "—" },
            { label: "Availability", value: s.availability.toLowerCase() }, { label: "Limits", value: `${s.dailyRfqLimit}/day · ${formatMoney(s.maxDailySpendMinor)}` },
          ]} /></div></Card>
          <Card><CardHeader title="Capabilities" /><DataTable rows={s.capabilities} rowKey={(c) => c.id} dense columns={[
            { key: "t", header: "Type", cell: (c) => patchTypeName(c.patchType) }, { key: "m", header: "MOQ", cell: (c) => c.moq, align: "right" }, { key: "x", header: "Max", cell: (c) => c.maxQuantity ?? "—", align: "right" },
            { key: "w", header: "Weekly", cell: (c) => c.weeklyCapacity ?? "—", align: "right" }, { key: "d", header: "Days std/rush", cell: (c) => `${c.standardDays}/${c.rushDays ?? "—"}` },
          ]} /></Card>
          <Card><CardHeader title="Recent unlocks" /><DataTable rows={s.unlocks} rowKey={(u) => u.id} dense empty={<p className="p-5 text-sm text-muted">None.</p>} columns={[
            { key: "r", header: "RFQ", cell: (u) => u.rfq.publicRef }, { key: "a", header: "Amount", cell: (u) => formatMoney(u.priceMinor), align: "right" }, { key: "m", header: "Method", cell: (u) => u.method.toLowerCase() }, { key: "s", header: "Status", cell: (u) => u.status.toLowerCase() }, { key: "d", header: "Date", cell: (u) => formatDateTime(u.createdAt) },
          ]} /></Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader title={`Credits · ${formatMoney(s.org.wallet?.balanceMinor ?? 0)}`} /><div className="p-5"><SellerFinanceForms orgId={s.orgId} sellerId={s.id} /></div>
            <ul className="divide-y divide-line border-t border-line text-xs">{s.org.wallet?.entries.map((e) => <li key={e.id} className="flex justify-between px-5 py-2"><span>{e.type.toLowerCase().replace("_", " ")} · {e.memo}</span><span className="tabular">{formatMoney(e.amountMinor)}</span></li>)}</ul>
          </Card>
          <Card><CardHeader title="Invoices" /><ul className="divide-y divide-line text-sm">{s.org.invoices.length === 0 && <li className="px-5 py-3 text-muted">None.</li>}{s.org.invoices.map((i) => <li key={i.id} className="flex justify-between px-5 py-2"><span className="tabular">{i.number}</span><span>{formatMoney(i.amountMinor)} · {i.status.toLowerCase()}</span></li>)}</ul></Card>
          <Card><CardHeader title="Team" /><ul className="divide-y divide-line text-sm">{s.org.members.map((m) => <li key={m.id} className="flex justify-between px-5 py-2"><span>{m.user.email}</span><Badge>{m.role.toLowerCase()}</Badge></li>)}</ul></Card>
        </div>
      </div>
    </>
  );
}
