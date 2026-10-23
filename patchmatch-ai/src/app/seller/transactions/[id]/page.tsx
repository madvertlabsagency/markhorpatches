import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { LogoMark } from "@/components/brand/Logo";
import { PrintButton } from "@/components/ui/PrintButton";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { seller } = await requireSeller();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const u = await prisma.rfqUnlock.findUnique({ where: { id }, include: { rfq: { select: { publicRef: true } }, payment: true, refunds: true } });
  if (!u || u.sellerId !== seller.id) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end print:hidden"><PrintButton /></div>
      <article className="card p-8 print:border-0 print:shadow-none">
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-2"><LogoMark className="h-9" /><span className="font-display text-lg font-bold">PatchMatch AI</span></div>
          <div className="text-right"><p className="text-xs text-muted uppercase">Receipt</p><p className="tabular font-semibold">{u.receiptNumber}</p></div>
        </header>
        <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-muted">Billed to</dt><dd className="font-medium">{seller.legalName}<br />{seller.email}</dd></div>
          <div className="text-right"><dt className="text-muted">Date</dt><dd className="font-medium">{formatDateTime(u.createdAt)}</dd></div>
        </dl>
        <table className="tabular mt-8 w-full text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-muted uppercase"><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-line"><td className="py-3">Access to qualified RFQ {u.rfq.publicRef}</td><td className="py-3 text-right">{formatMoney(u.priceMinor, u.currency)}</td></tr>
            {u.refunds.map((r) => <tr key={r.id} className="border-b border-line text-muted"><td className="py-3">{r.method === "CREDIT" ? "Credit issued" : "Refund"} — {r.reason}</td><td className="py-3 text-right">−{formatMoney(r.amountMinor, r.currency)}</td></tr>)}
          </tbody>
          <tfoot><tr><td className="pt-3 font-semibold">Total paid</td><td className="pt-3 text-right font-semibold">{formatMoney(u.priceMinor, u.currency)}</td></tr></tfoot>
        </table>
        <p className="mt-6 text-sm text-muted">Payment method: {u.method === "CREDITS" ? "Prepaid credits" : u.method === "CARD" ? `Card via ${u.payment?.provider ?? "provider"}${u.payment?.providerRef ? ` (ref ${u.payment.providerRef})` : ""}` : u.method.toLowerCase()}</p>
        <p className="mt-6 text-xs text-muted">This receipt confirms access to a buying opportunity. It does not represent a manufacturing order. Tax details and the issuing entity's registration will appear here once confirmed.</p>
      </article>
    </div>
  );
}
