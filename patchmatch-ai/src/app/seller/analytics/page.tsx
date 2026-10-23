import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader, Card, StatCard } from "@/components/ui/primitives";
import { BarChart } from "@/components/charts/BarChart";
import { formatMoney } from "@/lib/money";
import { formatPercent } from "@/lib/utils";
import { patchTypeName } from "@/lib/catalog";

export const metadata: Metadata = { title: "Analytics" };

function lastMonths(n: number) {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push({ key: `${m.getUTCFullYear()}-${m.getUTCMonth()}`, label: m.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) });
  }
  return out;
}

export default async function SellerAnalytics() {
  const { seller } = await requireSeller("/seller/analytics");
  const [unlocks, quotes, matches] = await Promise.all([
    prisma.rfqUnlock.findMany({ where: { sellerId: seller.id, status: { not: "REVOKED" } }, select: { priceMinor: true, createdAt: true, rfq: { select: { patchType: true } } } }),
    prisma.quote.findMany({ where: { sellerId: seller.id, submittedAt: { not: null } }, select: { status: true } }),
    prisma.rfqMatch.count({ where: { sellerId: seller.id, status: "NOTIFIED" } }),
  ]);
  const months = lastMonths(6);
  const key = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
  const spend = months.map((m) => ({ label: m.label, value: unlocks.filter((u) => key(u.createdAt) === m.key).reduce((a, u) => a + u.priceMinor, 0) }));
  const byType = Object.entries(unlocks.reduce<Record<string, number>>((a, u) => ({ ...a, [u.rfq.patchType]: (a[u.rfq.patchType] ?? 0) + 1 }), {})).map(([k, v]) => ({ label: patchTypeName(k), value: v }));
  const won = quotes.filter((q) => q.status === "ACCEPTED").length;
  return (
    <>
      <PageHeader title="Analytics" description="Your real activity on the platform." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Opportunities received" value={matches} />
        <StatCard label="Unlock rate" value={matches ? formatPercent(unlocks.length / matches) : "—"} />
        <StatCard label="Quote rate" value={unlocks.length ? formatPercent(quotes.length / unlocks.length) : "—"} />
        <StatCard label="Win rate" value={quotes.length ? formatPercent(won / quotes.length) : "—"} hint="Buyer selected your quote" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><BarChart title="RFQ spend by month" data={spend} format={(n) => formatMoney(n, "USD", { compact: true })} /></Card>
        <Card className="p-5"><BarChart title="Unlocks by patch type" data={byType} /></Card>
      </div>
    </>
  );
}
