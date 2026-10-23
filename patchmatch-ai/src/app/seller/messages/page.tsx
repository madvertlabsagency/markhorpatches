import type { Metadata } from "next";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/primitives";
import { Inbox } from "@/components/messages/Inbox";
import { sellerMarkReadAction, sellerSendMessageAction } from "@/app/actions/seller";

export const metadata: Metadata = { title: "Messages" };

export default async function SellerMessages({ searchParams }: { searchParams: Promise<{ c?: string; rfq?: string }> }) {
  const { seller } = await requireSeller("/seller/messages");
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Messages" description="Conversations with buyers whose RFQs you've unlocked." />
      <Inbox side="SELLER" where={{ sellerId: seller.id, rfq: { unlocks: { some: { sellerId: seller.id, status: { in: ["ACTIVE", "CREDITED", "REFUNDED"] } } } } }} selectedId={sp.c} rfqFilter={sp.rfq} basePath="/seller/messages" sendAction={sellerSendMessageAction} markRead={sellerMarkReadAction} />
    </>
  );
}
