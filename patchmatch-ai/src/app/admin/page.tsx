import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, ClipboardCheck, CreditCard, Radar, Scale, ShieldBan } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { executiveMetrics, operationalQueues, rangeFromDays } from "@/lib/admin/metrics";
import { PageHeader, StatCard, Card, CardHeader, Badge } from "@/components/ui/primitives";
import { BarChart } from "@/components/charts/BarChart";
import { formatMoney } from "@/lib/money";
import { formatPercent, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Command center" };

const RANGES = [7, 30, 90];

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ days?: string; demo?: string }> }) {
  await requireAdmin("admin:view");
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const includeDemo = sp.demo === "1";
  const [m, q] = await Promise.all([executiveMetrics(rangeFromDays(days), includeDemo), operationalQueues()]);
  const money = (v: number | null) => (v == null ? "—" : formatMoney(v));
  const pct = (v: number | null) => (v == null ? "—" : formatPercent(v, 0));
  return (
    <>
      <PageHeader
        title="Command center"
        description={includeDemo ? "Including fictional demo data — not for reporting." : "Production data only (demo records excluded)."}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-line bg-surface-2/60 p-1">
              {RANGES.map((r) => <Link key={r} href={`/admin?days=${r}${includeDemo ? "&demo=1" : ""}`} className={cn("rounded-lg px-3 py-1 text-sm font-medium", r === days ? "bg-surface shadow-[var(--shadow-card)]" : "text-muted")}>{r}d</Link>)}
            </div>
            <Link href={`/admin?days=${days}${includeDemo ? "" : "&demo=1"}`} className="text-xs font-semibold text-muted hover:text-fg">{includeDemo ? "Hide demo" : "Include demo"}</Link>
          </div>
        }
      />
      {includeDemo && <div className="mb-4"><Badge tone="violet">Demo data included</Badge></div>}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {[
          { label: "RFQs to review", v: q.review, href: "/admin/rfq-review", icon: ClipboardCheck },
          { label: "Awaiting buyer", v: q.clarification, href: "/admin/rfqs?status=CLARIFICATION_REQUIRED", icon: AlertTriangle },
          { label: "Matching / manual", v: q.manual, href: "/admin/matching", icon: Radar },
          { label: "Seller verifications", v: q.verification, href: "/admin/seller-verification", icon: BadgeCheck },
          { label: "Open claims", v: q.claims, href: "/admin/disputes", icon: Scale },
          { label: "Failed payments (7d)", v: q.failedPayments, href: "/admin/payments?status=FAILED", icon: CreditCard },
          { label: "Open reports", v: q.reports, href: "/admin/messages", icon: ShieldBan },
        ].map((x) => <StatCard key={x.label} label={x.label} value={x.v} icon={x.icon} href={x.href} tone={x.v > 0 ? "attention" : "default"} />)}
      </div>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Funnel · last {days} days</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Raw leads" value={m.rawLeads} />
        <StatCard label="Verified" value={m.verified} />
        <StatCard label="Qualified RFQs" value={m.qualified} hint={`${pct(m.qualificationRate)} of verified`} />
        <StatCard label="Matched" value={m.matched} hint={`Match rate ${pct(m.matchRate)}`} />
        <StatCard label="RFQs sold" value={m.sold} hint={`Sell-through ${pct(m.sellThroughRate)}`} />
        <StatCard label="Unlocks" value={m.unlockCount} />
        <StatCard label="Payment success" value={pct(m.paymentSuccessRate)} />
        <StatCard label="Avg. time to quote" value={m.avgResponseHours == null ? "—" : `${m.avgResponseHours.toFixed(1)}h`} />
      </div>
      <h2 className="mt-6 mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Economics</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Gross revenue" value={money(m.grossRevenueMinor)} />
        <StatCard label="Refunds / credits" value={money(m.refundsMinor)} hint={`Refund rate ${pct(m.refundRate)}`} />
        <StatCard label="Net revenue" value={money(m.netRevenueMinor)} />
        <StatCard label="Revenue / sold RFQ" value={money(m.revenuePerSoldMinor)} />
        <StatCard label="Ad spend" value={money(m.adSpendMinor)} hint={m.adSpendMinor ? undefined : "Record spend in Marketing"} />
        <StatCard label="Buyer CPL" value={money(m.buyerCplMinor)} />
        <StatCard label="Effective cost / sold" value={money(m.effectiveCostPerSoldMinor)} />
        <StatCard label="Contribution" value={money(m.contributionMinor)} hint="Before fixed overhead" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5"><BarChart title="Unlock revenue per day" data={m.dailyRevenue} format={(n) => formatMoney(n, "USD", { compact: true })} emptyText="No unlock revenue in this period" /></Card>
        <Card>
          <CardHeader title="Supply" />
          <div className="grid grid-cols-2 gap-3 p-5">
            <StatCard label="Sellers" value={m.sellersTotal} href="/admin/sellers" />
            <StatCard label="Verified" value={m.sellersVerified} />
            <StatCard label="Active (30d)" value={m.sellersActive30} hint="Purchased ≥1 RFQ" />
            <StatCard label="Activation" value={pct(m.sellerActivation)} />
          </div>
        </Card>
      </div>
    </>
  );
}
