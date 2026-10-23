import type { Metadata } from "next";
import { requireBuyer } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/primitives";
import { Inbox } from "@/components/messages/Inbox";
import { buyerMarkReadAction, buyerSendMessageAction } from "@/app/actions/buyer";

export const metadata: Metadata = { title: "Messages" };

export default async function BuyerMessages({ searchParams }: { searchParams: Promise<{ c?: string; rfq?: string; q?: string }> }) {
  const { user, org } = await requireBuyer("/buyer/messages");
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Messages" description="Conversations with manufacturers approved to contact you." />
      <Inbox side="BUYER" where={{ rfq: { OR: [{ buyerOrgId: org.id }, { buyerUserId: user.id }] } }} selectedId={sp.c} rfqFilter={sp.rfq} query={sp.q} basePath="/buyer/messages" sendAction={buyerSendMessageAction} markRead={buyerMarkReadAction} />
    </>
  );
}
