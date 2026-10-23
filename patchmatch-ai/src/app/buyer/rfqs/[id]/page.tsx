import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/session";
import { RfqStatusPanel } from "@/components/rfq/RfqStatusPanel";
import { BuyerRfqTools } from "@/components/rfq/BuyerRfqTools";
import { BUYER_EDITABLE_STATUSES } from "@/lib/state-machines";
import { IntentPrompt, PrivacyForm, RemindersToggle } from "@/components/rfq/BuyerControls";
import { ProjectTracker } from "@/components/rfq/ProjectTracker";

export const metadata: Metadata = { title: "Request details" };

export default async function BuyerRfqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, org } = await requireBuyer(`/buyer/rfqs/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const rfq = await prisma.rfq.findUnique({ where: { id }, include: { spec: true, project: { include: { events: { orderBy: { createdAt: "asc" } } } }, conversations: { where: { contactSharedAt: { not: null } }, select: { id: true } } } });
  if (!rfq || !(rfq.buyerOrgId === org.id || rfq.buyerUserId === user.id)) notFound();
  const editable = (BUYER_EDITABLE_STATUSES as readonly string[]).includes(rfq.status);
  const closable = !["CLOSED", "CANCELLED", "EXPIRED"].includes(rfq.status);
  return (
    <div className="space-y-6">
      <RfqStatusPanel rfqId={rfq.id} audience="buyer" />
      {closable && <IntentPrompt auth={{ rfqId: rfq.id }} status={rfq.intentStatus} confirmedAt={rfq.intentConfirmedAt?.toISOString() ?? null} />}
      {rfq.project && <ProjectTracker project={rfq.project} audience="buyer" />}
      <div className="grid gap-6 lg:grid-cols-2">
        <PrivacyForm auth={{ rfqId: rfq.id }} mode={rfq.disclosureMode} sharedWith={rfq.conversations.length} />
        <div className="card space-y-3 p-5">
          <p className="font-semibold">Reminders</p>
          <RemindersToggle auth={{ rfqId: rfq.id }} optOut={rfq.remindersOptOut} />
        </div>
      </div>
      <BuyerRfqTools rfqId={rfq.id} editable={editable} closable={closable} clarification={rfq.status === "CLARIFICATION_REQUIRED"} spec={{ width: rfq.spec?.width ?? null, height: rfq.spec?.height ?? null, quantity: rfq.spec?.quantity ?? 0, colorCount: rfq.spec?.colorCount ?? null, requiredBy: rfq.spec?.requiredBy?.toISOString().slice(0, 10) ?? "", destinationPostal: rfq.spec?.destinationPostal ?? "" }} />
    </div>
  );
}
