import type { Metadata } from "next";
import { CreditCard, Landmark, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge, Alert, StatCard } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { RequestInvoiceForm } from "@/components/seller/RequestInvoiceForm";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { paymentProvider } from "@/lib/services/payments";

export const metadata: Metadata = { title: "Billing & credits" };

export default async function BillingPage() {
  const { org, seller, role } = await requireSeller("/seller/billing");
  const [wallet, invoices, bank] = await Promise.all([
    prisma.wallet.findUnique({ where: { orgId: org.id }, include: { entries: { orderBy: { createdAt: "desc" }, take: 50 } } }),
    prisma.invoice.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "desc" } }),
    prisma.platformSetting.findUnique({ where: { key: "bankTransfer" } }),
  ]);
  const provider = paymentProvider();
  const b = (bank?.value ?? {}) as Record<string, string>;
  const canBill = role === "OWNER" || role === "ADMIN";
  return (
    <>
      <PageHeader title="Billing & credits" description="Prepaid credits are deducted only when you unlock an RFQ. Funds are never taken in advance without an invoice you pay." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Credit balance" value={formatMoney(wallet?.balanceMinor ?? 0, wallet?.currency)} icon={Wallet} />
        <StatCard label="Daily spending cap" value={formatMoney(seller.maxDailySpendMinor)} icon={CreditCard} hint={`Max ${seller.dailyRfqLimit} unlocks/day`} href="/seller/settings" />
        <StatCard label="Card payments" value={provider.configured && provider.capabilities.hostedCheckout ? provider.displayName.split(" (")[0] : "Not yet available"} icon={Landmark} hint={provider.name === "sandbox" ? "Test mode — no real charges" : undefined} />
      </div>
      {provider.name === "sandbox" && <Alert tone="info" className="mt-4" title="Sandbox payments">Card checkout uses a test gateway; no money moves. Production card payments require an approved Pakistani payment provider.</Alert>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="Add credits by invoice" description="Finance issues an invoice with bank transfer details. Credits are added when payment is received." />
          <div className="p-5">{canBill ? <RequestInvoiceForm /> : <p className="text-sm text-muted">Only owners and admins can manage billing.</p>}</div>
          {(b.bankName || b.iban) && (
            <div className="border-t border-line p-5 text-sm">
              <p className="font-semibold">Bank transfer details</p>
              <p className="mt-1 text-muted">{b.accountName} · {b.bankName}</p>
              <p className="tabular text-muted">IBAN {b.iban} · SWIFT {b.swift}</p>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Invoices" />
          <DataTable rows={invoices} rowKey={(i) => i.id} empty={<p className="p-5 text-sm text-muted">No invoices yet.</p>} dense columns={[
            { key: "n", header: "Invoice", cell: (i) => <span className="tabular">{i.number}</span> },
            { key: "a", header: "Amount", cell: (i) => formatMoney(i.amountMinor, i.currency), align: "right" },
            { key: "d", header: "Due", cell: (i) => formatDate(i.dueAt) },
            { key: "s", header: "Status", cell: (i) => <Badge tone={i.status === "PAID" ? "green" : i.status === "ISSUED" ? "amber" : "neutral"}>{i.status.toLowerCase()}</Badge> },
          ]} />
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Credit ledger" description="Every change to your balance, with running total." />
        <DataTable rows={wallet?.entries ?? []} rowKey={(e) => e.id} empty={<p className="p-5 text-sm text-muted">No credit activity yet.</p>} dense columns={[
          { key: "d", header: "Date", cell: (e) => formatDate(e.createdAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) },
          { key: "t", header: "Type", cell: (e) => e.type.toLowerCase().replace("_", " ") },
          { key: "m", header: "Description", cell: (e) => e.memo ?? "—", hideOnMobile: true },
          { key: "a", header: "Amount", cell: (e) => <span className={e.amountMinor < 0 ? "" : "text-success"}>{e.amountMinor > 0 ? "+" : ""}{formatMoney(e.amountMinor, e.currency)}</span>, align: "right" },
          { key: "b", header: "Balance", cell: (e) => formatMoney(e.balanceAfter, e.currency), align: "right" },
        ]} />
      </Card>
    </>
  );
}
