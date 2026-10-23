import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { ActionButton } from "@/components/ui/client";
import { PricingRuleForm } from "@/components/admin/PricingRuleForm";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { patchTypeName } from "@/lib/catalog";
import { togglePricingRuleAction } from "../actions";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  await requireAdmin("pricing:manage");
  const [rules, history] = await Promise.all([
    prisma.pricingRule.findMany({ orderBy: [{ active: "desc" }, { tier: "asc" }, { priority: "desc" }] }),
    prisma.opportunityPriceEvent.findMany({ include: { opportunity: { include: { rfq: { select: { publicRef: true } } } } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return (
    <>
      <PageHeader title="Pricing" description="Transparent unlock pricing. The most specific, highest-priority active rule wins; the price is fixed when an opportunity is published. No surge pricing." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <DataTable rows={rules} rowKey={(r) => r.id} columns={[
          { key: "n", header: "Rule", cell: (r) => r.name }, { key: "t", header: "Tier", cell: (r) => r.tier.toLowerCase().replace("_", " ") },
          { key: "s", header: "Scope", cell: (r) => [r.patchType && patchTypeName(r.patchType), r.distributionMode?.toLowerCase().replace("_", " ")].filter(Boolean).join(" · ") || "All", hideOnMobile: true },
          { key: "p", header: "Price", cell: (r) => <>{formatMoney(r.priceMinor)}{r.discountBps ? <span className="ml-1 text-xs text-success">−{r.discountBps / 100}%</span> : null}</>, align: "right" },
          { key: "l", header: "Limits", cell: (r) => `${formatMoney(r.minMinor)}–${formatMoney(r.maxMinor)}`, hideOnMobile: true },
          { key: "w", header: "Window", cell: (r) => (r.startsAt || r.endsAt ? `${formatDate(r.startsAt)} → ${formatDate(r.endsAt)}` : "Always"), hideOnMobile: true },
          { key: "a", header: "", cell: (r) => <><Badge tone={r.active ? "green" : "neutral"}>{r.active ? "active" : "inactive"}</Badge> <ActionButton variant="ghost" action={togglePricingRuleAction.bind(null, r.id)}>{r.active ? "Deactivate" : "Activate"}</ActionButton></> },
        ]} />
        <div className="space-y-6">
          <Card><CardHeader title="New rule" /><div className="p-5"><PricingRuleForm /></div></Card>
          <Card><CardHeader title="Price history" /><ul className="divide-y divide-line text-xs">{history.map((h) => <li key={h.id} className="flex justify-between px-5 py-2"><span>{h.opportunity.rfq.publicRef} · {h.reason}</span><span className="tabular">{formatMoney(h.priceMinor)}</span></li>)}</ul></Card>
        </div>
      </div>
    </>
  );
}
