import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Alert } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { AdSpendForm } from "@/components/admin/AdSpendForm";
import { formatMoney } from "@/lib/money";
import { formatDate, daysAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Marketing" };

export default async function MarketingPage() {
  await requireAdmin("marketing:manage");
  const since = daysAgo(30);
  const [attr, spend, sold] = await Promise.all([
    prisma.marketingAttribution.groupBy({ by: ["utmSource", "utmCampaign"], where: { createdAt: { gte: since }, rfqId: { not: null }, rfq: { isDemo: false } }, _count: true, orderBy: { _count: { utmSource: "desc" } } }),
    prisma.adSpendEntry.findMany({ where: { date: { gte: since } }, orderBy: { date: "desc" } }),
    prisma.marketingAttribution.findMany({ where: { createdAt: { gte: since }, rfq: { isDemo: false, unlocks: { some: { status: "ACTIVE" } } } }, select: { utmSource: true } }),
  ]);
  const totalSpend = spend.reduce((a, s) => a + s.amountMinor, 0);
  const tracking = [["GA4", process.env.NEXT_PUBLIC_GA4_ID], ["GTM", process.env.NEXT_PUBLIC_GTM_ID], ["Meta Pixel", process.env.NEXT_PUBLIC_META_PIXEL_ID], ["Meta Conversions API", process.env.META_CAPI_TOKEN]];
  return (
    <>
      <PageHeader title="Marketing" description="First-touch attribution from UTM/click IDs. No artwork or buyer PII is sent to ad platforms." />
      <Alert tone="info" className="mb-6" title="Tracking integrations">{tracking.map(([k, v]) => `${k}: ${v ? "configured" : "not configured"}`).join(" · ")}</Alert>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card><CardHeader title="RFQs by source (30 days)" />
            <DataTable rows={attr} rowKey={(a) => `${a.utmSource}:${a.utmCampaign}`} dense empty={<p className="p-5 text-sm text-muted">No attributed RFQs yet.</p>} columns={[
              { key: "s", header: "Source", cell: (a) => a.utmSource ?? "(none)" }, { key: "c", header: "Campaign", cell: (a) => a.utmCampaign ?? "—" },
              { key: "n", header: "RFQs", cell: (a) => a._count, align: "right" }, { key: "sold", header: "Sold", cell: (a) => sold.filter((x) => x.utmSource === a.utmSource).length, align: "right" },
            ]} />
          </Card>
          <Card><CardHeader title={`Ad spend (30 days) · ${formatMoney(totalSpend)}`} />
            <DataTable rows={spend} rowKey={(s) => s.id} dense empty={<p className="p-5 text-sm text-muted">No spend recorded.</p>} columns={[
              { key: "d", header: "Date", cell: (s) => formatDate(s.date) }, { key: "c", header: "Channel", cell: (s) => s.channel }, { key: "cp", header: "Campaign", cell: (s) => s.campaign ?? "—" },
              { key: "a", header: "Amount", cell: (s) => formatMoney(s.amountMinor), align: "right" }, { key: "l", header: "Leads", cell: (s) => s.leads ?? "—", align: "right" },
            ]} />
          </Card>
        </div>
        <Card><CardHeader title="Record ad spend" description="Used for buyer CPL and effective cost per sold RFQ." /><div className="p-5"><AdSpendForm /></div></Card>
      </div>
    </>
  );
}
