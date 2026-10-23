import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Coins, Inbox, MessageSquareQuote, Percent, RotateCcw, Trophy, Unlock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { listSellerOpportunities } from "@/lib/domain/opportunities";
import { verificationChecklist } from "@/lib/domain/sellers";
import { PageHeader, StatCard, Card, CardHeader, EmptyState, Badge } from "@/components/ui/primitives";
import { OpportunityCard } from "@/components/seller/OpportunityCard";
import { ButtonLink } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { formatPercent } from "@/lib/utils";
import { statusTone, statusLabel } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Seller dashboard" };

export default async function SellerDashboard() {
  const { seller, org } = await requireSeller();
  if (seller.verificationStatus !== "VERIFIED") {
    const { items } = await verificationChecklist(seller.id);
    return (
      <>
        <PageHeader title="Welcome to PatchMatch" description="Complete these steps to get verified and start receiving matching RFQs." />
        <Card className="max-w-2xl">
          <CardHeader title="Verification checklist" action={<Badge tone={statusTone("ver", seller.verificationStatus)}>{statusLabel(seller.verificationStatus)}</Badge>} />
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.key} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{i.label}</span>
                <Badge tone={i.done ? "green" : "neutral"}>{i.done ? "Done" : "To do"}</Badge>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 p-5"><ButtonLink href="/seller/capabilities" variant="secondary">Capabilities</ButtonLink><ButtonLink href="/seller/verification">Verification</ButtonLink></div>
        </Card>
      </>
    );
  }
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [opps, unlocks, quotes, won, wallet, credits] = await Promise.all([
    listSellerOpportunities(seller.id),
    prisma.rfqUnlock.findMany({ where: { sellerId: seller.id, status: { not: "REVOKED" } }, select: { priceMinor: true, method: true, createdAt: true, rfqId: true, status: true } }),
    prisma.quote.findMany({ where: { sellerId: seller.id, submittedAt: { not: null } }, select: { status: true, rfqId: true } }),
    prisma.quote.count({ where: { sellerId: seller.id, status: "ACCEPTED" } }),
    prisma.wallet.findUnique({ where: { orgId: org.id } }),
    prisma.refund.findMany({ where: { unlock: { sellerId: seller.id }, status: "PROCESSED" }, select: { amountMinor: true } }),
  ]);
  const recent = unlocks.filter((u) => u.createdAt >= since);
  const spend = recent.filter((u) => u.method !== "COMPLIMENTARY").reduce((a, u) => a + u.priceMinor, 0);
  const quotedRfqs = new Set(quotes.map((q) => q.rfqId));
  const responded = quotes.filter((q) => ["VIEWED", "CLARIFICATION_REQUESTED", "ACCEPTED", "REJECTED"].includes(q.status)).length;
  return (
    <>
      <PageHeader title="Dashboard" description="Matching opportunities and your performance on the platform." actions={<ButtonLink href="/seller/opportunities"><Inbox className="h-4 w-4" /> View opportunities</ButtonLink>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Available now" value={opps.length} icon={Inbox} href="/seller/opportunities" />
        <StatCard label="RFQs purchased" value={unlocks.length} icon={Unlock} href="/seller/unlocked-rfqs" hint={`${recent.length} in 30 days`} />
        <StatCard label="Spend (30d)" value={formatMoney(spend)} icon={Coins} href="/seller/transactions" />
        <StatCard label="Quotes sent" value={quotes.length} icon={MessageSquareQuote} href="/seller/quotes" />
        <StatCard label="Buyer response rate" value={quotes.length ? formatPercent(responded / quotes.length) : "—"} icon={Percent} hint="Quotes viewed or answered" />
        <StatCard label="Won (buyer selected)" value={won} icon={Trophy} />
        <StatCard label="Avg. time to quote" value={seller.avgResponseMinutes != null ? `${Math.round(seller.avgResponseMinutes / 60)}h` : "—"} icon={Clock} hint={seller.avgResponseMinutes == null ? "Needs 3+ quotes" : undefined} />
        <StatCard label="Credits / refunds" value={formatMoney(credits.reduce((a, r) => a + r.amountMinor, 0))} icon={RotateCcw} href="/seller/quality-claims" hint={`Balance ${formatMoney(wallet?.balanceMinor ?? 0)}`} />
      </div>
      <div className="mt-8">
        <div className="mb-4 flex items-end justify-between"><h2 className="text-lg font-semibold">New matching RFQs</h2><Link href="/seller/opportunities" className="text-sm font-semibold text-electric">See all</Link></div>
        {opps.length === 0 ? <EmptyState icon={Inbox} title="No open opportunities right now" description="We'll notify you when a qualified RFQ matches your capabilities. Broadening patch types or shipping destinations increases matches." action={<ButtonLink href="/seller/capabilities" variant="secondary">Review capabilities</ButtonLink>} /> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{opps.slice(0, 6).map((o) => <OpportunityCard key={o.id} o={o} />)}</div>
        )}
      </div>
      {unlocks.length > 0 && quotedRfqs.size < unlocks.filter((u) => u.status === "ACTIVE").length && (
        <p className="mt-6 text-sm text-muted">You have unlocked RFQs without a quote. <Link href="/seller/unlocked-rfqs" className="font-semibold text-electric">Send quotes →</Link></p>
      )}
    </>
  );
}
