import { redirect, notFound } from "next/navigation";
import { requireSeller } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { reconcilePayment } from "@/lib/domain/unlock";
import { Alert } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

/** Return URL after hosted checkout. Status is read from the provider — never from query params. */
export default async function PaymentReturn({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const { org } = await requireSeller("/seller/billing");
  const { payment: id } = await searchParams;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const owned = await prisma.payment.findUnique({ where: { id } });
  if (!owned || owned.orgId !== org.id) notFound();
  const payment = await reconcilePayment(id);
  if (payment?.status === "PAID" && payment.rfqId) redirect(`/seller/opportunities/${payment.rfqId}`);
  if (payment?.status === "FAILED" || payment?.status === "CANCELLED") redirect(`/seller/opportunities/${payment.rfqId}?payment=failed`);
  return (
    <div className="mx-auto max-w-lg py-10">
      <Alert tone="info" title="Payment processing">We're waiting for confirmation from the payment provider. The RFQ unlocks automatically once the payment is confirmed — you'll get a notification and a receipt.</Alert>
      {payment?.rfqId && <ButtonLink href={`/seller/opportunities/${payment.rfqId}`} variant="secondary" className="mt-4">Back to opportunity</ButtonLink>}
    </div>
  );
}
