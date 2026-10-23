import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge, Alert } from "@/components/ui/primitives";
import { DataTable, FilterBar, FilterSelect } from "@/components/ui/data";
import { ActionButton } from "@/components/ui/client";
import { InvoicePaidForm, IssueInvoiceForSeller } from "@/components/admin/InvoiceForms";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatDate } from "@/lib/utils";
import { statusTone } from "@/lib/ui-status";
import { allProviders, paymentProvider } from "@/lib/services/payments";
import { reconcileAction, voidInvoiceAction } from "../actions";
import type { PaymentStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Payments & invoices" };

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ status?: string; invoiceFor?: string; amount?: string }> }) {
  await requireAdmin("payments:view");
  const sp = await searchParams;
  const [payments, invoices, sellers, webhooks] = await Promise.all([
    prisma.payment.findMany({ where: sp.status ? { status: sp.status as PaymentStatus } : {}, include: { org: { select: { name: true } }, attempts: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.invoice.findMany({ include: { org: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.organization.findMany({ where: { type: "SELLER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const active = paymentProvider();
  return (
    <>
      <PageHeader title="Payments & invoices" description="Card payments via the configured provider; credit top-ups via manual invoices." />
      <Alert tone={active.name === "sandbox" ? "warning" : "info"} className="mb-6" title={`Active provider: ${active.displayName}`}>
        {allProviders().map((p) => `${p.displayName}: ${p.configured ? "configured" : "not integrated"}`).join(" · ")}
      </Alert>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <FilterBar action="/admin/payments"><FilterSelect name="status" value={sp.status} label="Status" options={["CREATED", "PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED", "DISPUTED"].map((v) => ({ value: v, label: v.toLowerCase() }))} /></FilterBar>
          <DataTable rows={payments} rowKey={(p) => p.id} dense columns={[
            { key: "d", header: "Created", cell: (p) => formatDateTime(p.createdAt) },
            { key: "o", header: "Seller", cell: (p) => <>{p.org.name}{p.isDemo && <Badge tone="violet" className="ml-1">demo</Badge>}</> },
            { key: "pu", header: "Purpose", cell: (p) => (p.purpose === "RFQ_UNLOCK" ? "unlock" : "top-up"), hideOnMobile: true },
            { key: "pr", header: "Provider / ref", cell: (p) => <span className="text-xs">{p.provider} · <span className="tabular">{p.providerRef ?? "—"}</span></span>, hideOnMobile: true },
            { key: "a", header: "Amount", cell: (p) => formatMoney(p.amountMinor, p.currency), align: "right" },
            { key: "s", header: "Status", cell: (p) => <><Badge tone={statusTone("pay", p.status)}>{p.status.toLowerCase()}</Badge>{p.failureReason && <span className="block text-[11px] text-muted">{p.failureReason}</span>}</> },
            { key: "x", header: "", cell: (p) => (["CREATED", "PENDING", "REQUIRES_AUTHENTICATION", "PROCESSING"].includes(p.status) && p.providerRef ? <ActionButton variant="ghost" action={reconcileAction.bind(null, p.id)}>Reconcile</ActionButton> : null) },
          ]} />
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Issue invoice" /><div className="p-5"><IssueInvoiceForSeller sellers={sellers} defaultOrg={sp.invoiceFor} defaultAmount={sp.amount ? String(Number(sp.amount) / 100) : undefined} /></div></Card>
          <Card>
            <CardHeader title="Invoices" />
            <ul className="divide-y divide-line">
              {invoices.length === 0 && <li className="px-5 py-3 text-sm text-muted">None.</li>}
              {invoices.map((i) => (
                <li key={i.id} className="space-y-2 px-5 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><span className="tabular font-medium">{i.number}</span><Badge tone={i.status === "PAID" ? "green" : i.status === "ISSUED" ? "amber" : "neutral"}>{i.status.toLowerCase()}</Badge></div>
                  <p className="text-muted">{i.org.name} · {formatMoney(i.amountMinor)} · due {formatDate(i.dueAt)}{i.paymentReference ? ` · ref ${i.paymentReference}` : ""}</p>
                  {i.status === "ISSUED" && <div className="flex flex-wrap items-start gap-2"><InvoicePaidForm invoiceId={i.id} /><ActionButton variant="ghost" confirm="Void this invoice?" action={voidInvoiceAction.bind(null, i.id)}>Void</ActionButton></div>}
                </li>
              ))}
            </ul>
          </Card>
          <Card><CardHeader title="Recent webhook events" /><ul className="divide-y divide-line text-xs">{webhooks.map((w) => <li key={w.id} className="flex justify-between gap-2 px-5 py-2"><span>{w.provider} · {w.type}</span><span className={w.signatureValid ? "text-success" : "text-danger"}>{w.signatureValid ? (w.processedAt ? "processed" : w.error ?? "pending") : "invalid signature"}</span></li>)}</ul></Card>
        </div>
      </div>
    </>
  );
}
