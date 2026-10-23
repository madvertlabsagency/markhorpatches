import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPayload } from "@/lib/crypto";
import { IntentPrompt, PrivacyForm, RemindersToggle } from "@/components/rfq/BuyerControls";

export const metadata: Metadata = { title: "Your quote request", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Signed link from emails: confirm interest, change privacy, or stop reminders — no sign-in needed. */
export default async function IntentPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const p = verifyPayload<{ rfqId: string; p: string }>(token ?? null);
  if (!p || p.p !== "buyer") notFound();
  const rfq = await prisma.rfq.findUnique({ where: { id: p.rfqId }, include: { spec: true, conversations: { where: { contactSharedAt: { not: null } }, select: { id: true } } } });
  if (!rfq) notFound();
  const auth = { token: token! };
  return (
    <div className="container-page max-w-2xl space-y-5 py-14">
      <div>
        <p className="eyebrow">Request {rfq.publicRef}</p>
        <h1 className="mt-1 text-3xl font-bold">{rfq.spec?.quantity.toLocaleString()} × {rfq.patchType.toLowerCase().replace("_", " ")} patches</h1>
      </div>
      <IntentPrompt auth={auth} status={rfq.intentStatus} confirmedAt={rfq.intentConfirmedAt?.toISOString() ?? null} />
      <PrivacyForm auth={auth} mode={rfq.disclosureMode} sharedWith={rfq.disclosureMode === "FULL_CONTACT" ? -1 : rfq.conversations.length} />
      <RemindersToggle auth={auth} optOut={rfq.remindersOptOut} />
    </div>
  );
}
