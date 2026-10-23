import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreditCard, FlaskConical, Lock } from "lucide-react";
import { verifyPayload } from "@/lib/crypto";
import { paymentProvider } from "@/lib/services/payments";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/brand/Logo";
import { formatMoney } from "@/lib/money";
import { SandboxButtons } from "./SandboxButtons";

export const metadata: Metadata = { title: "Sandbox checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Hosted page of the SANDBOX gateway. Disabled unless the sandbox provider is active. */
export default async function SandboxCheckout({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (paymentProvider().name !== "sandbox") notFound();
  const { token } = await searchParams;
  const data = verifyPayload<{ providerRef: string; paymentId: string; amountMinor: number; currency: string; returnUrl: string; cancelUrl: string }>(token);
  if (!data) notFound();
  const user = await getCurrentUser();
  const payment = await prisma.payment.findUnique({ where: { id: data.paymentId } });
  if (!payment || !user || !user.memberships.some((m) => m.orgId === payment.orgId)) notFound();
  return (
    <div className="grid min-h-dvh place-items-center bg-surface-2 px-4">
      <div className="card w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4"><Logo /><span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-[#B45309]"><FlaskConical className="h-3.5 w-3.5" /> Sandbox</span></div>
        <div className="space-y-5 p-6">
          <div>
            <p className="text-sm text-muted">Amount</p>
            <p className="tabular font-display text-3xl font-semibold">{formatMoney(data.amountMinor, data.currency)}</p>
            <p className="tabular mt-1 text-xs text-muted">Ref {data.providerRef}</p>
          </div>
          <div className="rounded-xl border border-dashed border-line p-4 text-sm text-muted"><CreditCard className="mb-2 h-5 w-5" />Test gateway — no card details are collected and no money moves. Choose an outcome to simulate the provider's signed webhook.</div>
          <SandboxButtons token={token!} />
          <p className="flex items-center gap-1.5 text-xs text-muted"><Lock className="h-3.5 w-3.5" /> The platform grants access only after verifying the webhook signature and amount.</p>
        </div>
      </div>
    </div>
  );
}
