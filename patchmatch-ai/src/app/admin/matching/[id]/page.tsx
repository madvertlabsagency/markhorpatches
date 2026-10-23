import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge, Alert, KeyValue } from "@/components/ui/primitives";
import { ActionButton } from "@/components/ui/client";
import { PublishForm } from "@/components/admin/PublishForm";
import { patchTypeName, countryName } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";
import { RFQ_STATUS_LABEL } from "@/lib/state-machines";
import { statusTone } from "@/lib/ui-status";
import { priceOpportunity } from "@/lib/pricing/engine";
import { featureEnabled } from "@/lib/domain/rfq";
import { loadPricingRules } from "@/lib/domain/matching";
import { opportunityStatusAction, overrideMatchAction, rematchAction } from "../../actions";
import type { FactorScore } from "@/lib/matching/engine";

export const metadata: Metadata = { title: "Match RFQ" };

export default async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin("matching:manage");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const rfq = await prisma.rfq.findUnique({ where: { id }, include: { spec: true, qualifications: { where: { isCurrent: true } }, opportunity: { include: { priceHistory: { orderBy: { createdAt: "desc" } } } }, matches: { include: { seller: true }, orderBy: [{ eligible: "desc" }, { score: "desc" }] }, unlocks: { include: { seller: true } }, reservations: { where: { status: "ACTIVE" }, include: { seller: true } } } });
  if (!rfq) notFound();
  const q = rfq.qualifications[0];
  const suggested = q ? priceOpportunity(await loadPricingRules(), q.pricingTier, rfq.patchType, "EXCLUSIVE") : null;
  const sharedEnabled = await featureEnabled("limited_shared_rfqs");
  const s = rfq.spec!;
  const canPublish = ["MATCHING", "SELLER_NOTIFIED", "MANUAL_SOURCING"].includes(rfq.status);
  return (
    <>
      <PageHeader eyebrow={rfq.publicRef} title={`${s.quantity.toLocaleString()} × ${patchTypeName(rfq.patchType)} → ${[s.destinationState, countryName(s.destinationCountry)].filter(Boolean).join(", ")}`} description={`Needed by ${formatDate(s.requiredBy)} · Tier ${q?.tier ?? "—"} · ${q?.pricingTier.toLowerCase().replace("_", " ") ?? ""}`} actions={<><Badge tone={statusTone("rfq", rfq.status)}>{RFQ_STATUS_LABEL[rfq.status]}</Badge><ActionButton action={rematchAction.bind(null, rfq.id)}>Re-run matching</ActionButton><Link href={`/admin/rfq-review/${rfq.id}`} className="text-sm font-semibold text-electric">Review →</Link></>} />
      {rfq.status === "MANUAL_SOURCING" && <Alert tone="warning" className="mb-4" title="Manual sourcing">No verified manufacturer passed every hard filter. Source manually, onboard a supplier, then re-run matching. Never assign an ineligible seller.</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader title={`Candidates (${rfq.matches.length})`} description="Ineligible sellers never see the opportunity. Approve/reject overrides are audit-logged." />
          <div className="divide-y divide-line">
            {rfq.matches.length === 0 && <p className="p-5 text-sm text-muted">Matching hasn't run yet.</p>}
            {rfq.matches.map((m) => {
              const b = m.breakdown as unknown as Record<string, FactorScore>;
              return (
                <details key={m.id} className="group px-5 py-3">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                    <span className={m.eligible ? "tabular grid h-9 w-9 place-items-center rounded-lg bg-electric/15 font-display font-bold text-electric" : "grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-xs text-muted"}>{m.eligible ? m.score : "✕"}</span>
                    <span className="min-w-0 flex-1"><span className="font-medium">{m.seller.tradingName ?? m.seller.legalName}</span><span className="block text-xs text-muted">{countryName(m.seller.country)} · {m.eligible ? m.explanation?.slice(0, 120) : m.ineligibleReasons.join("; ")}</span></span>
                    <Badge tone={m.status === "NOTIFIED" ? "green" : m.status === "APPROVED" ? "blue" : m.status === "REJECTED" ? "red" : "neutral"}>{m.status.toLowerCase()}</Badge>
                    {m.seller.isDemo && <Badge tone="violet">demo</Badge>}
                  </summary>
                  <div className="mt-3 grid gap-4 pl-12 md:grid-cols-[1fr_auto]">
                    {m.eligible && b ? (
                      <div className="grid gap-2 sm:grid-cols-2">{Object.entries(b).map(([k, f]) => <div key={k} className="text-xs"><div className="flex justify-between"><span className="capitalize">{k}</span><span className="tabular text-muted">{f.points}/{f.weight}</span></div><div className="mt-1 h-1 rounded-full bg-surface-2"><div className="h-full rounded-full bg-chart" style={{ width: `${f.value * 100}%` }} /></div><p className="text-muted">{f.note}</p></div>)}</div>
                    ) : <p className="text-xs text-muted">{m.ineligibleReasons.join(" · ")}</p>}
                    <div className="flex flex-col gap-2">
                      {m.eligible && m.status !== "APPROVED" && m.status !== "NOTIFIED" && <ActionButton action={async (note?: string) => { "use server"; return overrideMatchAction(m.id, "APPROVE", note ?? ""); }} prompt="Reason for approving this match:">Approve</ActionButton>}
                      {m.status !== "REJECTED" && <ActionButton variant="ghost" action={async (note?: string) => { "use server"; return overrideMatchAction(m.id, "REJECT", note ?? ""); }} prompt="Reason for rejecting this match:">Reject</ActionButton>}
                    </div>
                  </div>
                  {m.overrideNote && <p className="mt-2 pl-12 text-xs text-muted">Override: {m.overrideNote}</p>}
                </details>
              );
            })}
          </div>
        </Card>
        <div className="space-y-6">
          {rfq.opportunity && (
            <Card>
              <CardHeader title="Opportunity" action={<Badge tone={statusTone("opp", rfq.opportunity.status)}>{rfq.opportunity.status.toLowerCase().replace("_", " ")}</Badge>} />
              <div className="space-y-4 p-5">
                <KeyValue items={[
                  { label: "Mode", value: rfq.opportunity.distributionMode.toLowerCase().replace("_", " ") }, { label: "Price", value: formatMoney(rfq.opportunity.priceMinor, rfq.opportunity.currency) },
                  { label: "Unlocks", value: `${rfq.opportunity.unlockCount} / ${rfq.opportunity.maxUnlocks}` }, { label: "Expires", value: formatDate(rfq.opportunity.expiresAt) },
                ]} />
                {rfq.reservations.length > 0 && <p className="text-xs text-muted">Active reservation: {rfq.reservations.map((r) => r.seller.legalName).join(", ")}</p>}
                {rfq.unlocks.length > 0 && <p className="text-sm">Unlocked by: {rfq.unlocks.map((u) => `${u.seller.legalName} (${u.status.toLowerCase()})`).join(", ")}</p>}
                <div className="flex flex-wrap gap-2">
                  {rfq.opportunity.status === "AVAILABLE" && <ActionButton action={opportunityStatusAction.bind(null, rfq.id, "PAUSED")}>Pause</ActionButton>}
                  {rfq.opportunity.status === "PAUSED" && <ActionButton action={opportunityStatusAction.bind(null, rfq.id, "AVAILABLE")}>Resume</ActionButton>}
                  {["AVAILABLE", "PAUSED", "DRAFT"].includes(rfq.opportunity.status) && <ActionButton variant="danger" confirm="Withdraw this opportunity? Sellers will no longer be able to buy it." action={opportunityStatusAction.bind(null, rfq.id, "WITHDRAWN")}>Withdraw</ActionButton>}
                </div>
                {rfq.opportunity.priceHistory.length > 0 && <ul className="text-xs text-muted">{rfq.opportunity.priceHistory.map((p) => <li key={p.id}>{formatDateTime(p.createdAt)} · {formatMoney(p.priceMinor)} · {p.reason}</li>)}</ul>}
              </div>
            </Card>
          )}
          {canPublish && (!rfq.opportunity || rfq.opportunity.unlockCount === 0) && (
            <Card>
              <CardHeader title={rfq.opportunity ? "Republish / change recipients" : "Publish opportunity"} description={`Suggested price ${suggested ? formatMoney(suggested.priceMinor) : "— (enterprise: set manually)"} · buyer consented to ${rfq.maxRecipients} recipient(s)`} />
              <div className="p-5"><PublishForm rfqId={rfq.id} sharedEnabled={sharedEnabled} maxRecipients={rfq.maxRecipients} eligible={rfq.matches.filter((m) => m.eligible).map((m) => ({ id: m.sellerId, label: `${m.seller.tradingName ?? m.seller.legalName} · ${m.score}` }))} needsPrice={!suggested} /></div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
