import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { demandByPatchType, fastestSellers, rangeFromDays, bucketByDay } from "@/lib/admin/metrics";
import { PageHeader, Card, CardHeader } from "@/components/ui/primitives";
import { BarChart } from "@/components/charts/BarChart";
import { ForecastSimulator } from "@/components/admin/ForecastSimulator";
import { FUNNEL_EVENTS } from "@/lib/analytics/events";
import { patchTypeName } from "@/lib/catalog";
import { isDemoMode } from "@/lib/env";
import { Alert } from "@/components/ui/primitives";
import Link from "next/link";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalytics({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  await requireAdmin("analytics:view");
  // ?demo=1 on a demo deployment shows the fictional dataset instead — always under the simulated-metrics label.
  const demoOnly = isDemoMode() && (await searchParams).demo === "1";
  const range = rangeFromDays(30);
  const [events, demand, fastest, rfqs, aiCost] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ["name"], where: { isDemo: demoOnly, createdAt: { gte: range.from } }, _count: true }),
    demandByPatchType(range, demoOnly),
    fastestSellers(5, demoOnly),
    prisma.rfq.findMany({ where: { isDemo: demoOnly, createdAt: { gte: range.from }, status: { not: "DRAFT" } }, select: { createdAt: true } }),
    prisma.aIExecution.aggregate({ where: { createdAt: { gte: range.from } }, _sum: { costMicros: true, inputTokens: true, outputTokens: true }, _count: true }),
  ]);
  const count = (n: string) => events.find((e) => e.name === n)?._count ?? 0;
  return (
    <>
      <PageHeader
        title={demoOnly ? "Demo analytics" : "Analytics"}
        description={demoOnly ? "Last 30 days of fictional demo data." : "Last 30 days, production data only."}
        actions={isDemoMode() ? <Link href={demoOnly ? "/admin/analytics" : "/admin/analytics?demo=1"} className="text-sm font-semibold text-electric hover:underline">{demoOnly ? "Show production data" : "Show demo data"}</Link> : undefined}
      />
      {demoOnly && <Alert tone="warning" className="mb-6" title="SIMULATED DEMO METRICS — NOT ACTUAL BUSINESS PERFORMANCE">These figures come from fictional, simulated demo records.</Alert>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><BarChart title="Funnel events" data={FUNNEL_EVENTS.map((e) => ({ label: e.replace(/^RFQ|^Seller|^Buyer/, "").slice(0, 10) || e, value: count(e) }))} /></Card>
        <Card className="p-5"><BarChart title="RFQs per day" data={bucketByDay(rfqs.map((r) => ({ at: r.createdAt, value: 1 })), range)} /></Card>
        <Card className="p-5"><BarChart title="Demand by patch type" data={demand.map((d) => ({ label: patchTypeName(d.patchType), value: d.count }))} /></Card>
        <Card>
          <CardHeader title="Fastest responding sellers" description={demoOnly ? "Average response time (simulated demo figures)." : "Average unlock-to-quote time (real data, ≥3 quotes)."} />
          <ul className="divide-y divide-line text-sm">{fastest.length === 0 && <li className="px-5 py-3 text-muted">Not enough data yet.</li>}{fastest.map((s) => <li key={s.legalName} className="flex justify-between px-5 py-2"><span>{s.tradingName ?? s.legalName}</span><span className="tabular">{Math.round((s.avgResponseMinutes ?? 0) / 60)}h</span></li>)}</ul>
          <div className="border-t border-line px-5 py-3 text-xs text-muted">AI usage (30d): {aiCost._count} calls · {(aiCost._sum.inputTokens ?? 0).toLocaleString()} in / {(aiCost._sum.outputTokens ?? 0).toLocaleString()} out tokens · ${((aiCost._sum.costMicros ?? 0) / 1_000_000).toFixed(2)}</div>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Financial forecasting simulator" description="Hypothetical — illustrates the inputs, not a prediction or target." />
        <div className="p-5"><ForecastSimulator /></div>
      </Card>
    </>
  );
}
