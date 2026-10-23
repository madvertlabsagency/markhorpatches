import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/session";
import { RfqStatusPanel } from "@/components/rfq/RfqStatusPanel";
import { BuyerRfqTools } from "@/components/rfq/BuyerRfqTools";
import { BUYER_EDITABLE_STATUSES } from "@/lib/state-machines";

export const metadata: Metadata = { title: "Request details" };

export default async function BuyerRfqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, org } = await requireBuyer(`/buyer/rfqs/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const rfq = await prisma.rfq.findUnique({ where: { id }, include: { spec: true } });
  if (!rfq || !(rfq.buyerOrgId === org.id || rfq.buyerUserId === user.id)) notFound();
  const editable = (BUYER_EDITABLE_STATUSES as readonly string[]).includes(rfq.status);
  const closable = !["CLOSED", "CANCELLED", "EXPIRED"].includes(rfq.status);
  return (
    <div className="space-y-6">
      <RfqStatusPanel rfqId={rfq.id} audience="buyer" />
      <BuyerRfqTools rfqId={rfq.id} editable={editable} closable={closable} clarification={rfq.status === "CLARIFICATION_REQUIRED"} spec={{ width: rfq.spec?.width ?? null, height: rfq.spec?.height ?? null, quantity: rfq.spec?.quantity ?? 0, colorCount: rfq.spec?.colorCount ?? null, requiredBy: rfq.spec?.requiredBy?.toISOString().slice(0, 10) ?? "", destinationPostal: rfq.spec?.destinationPostal ?? "" }} />
    </div>
  );
}
