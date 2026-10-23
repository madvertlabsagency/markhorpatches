"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, CreditCard, Lock, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/fields";
import { unlockAction } from "@/app/actions/seller";
import { formatMoney } from "@/lib/money";
import { trackClient } from "@/lib/analytics/client";

export function UnlockPanel({ rfqId, priceMinor, currency, balanceMinor, purchasable, unavailableReason, cardEnabled, canBuy, mode, maxUnlocks }: {
  rfqId: string; priceMinor: number; currency: string; balanceMinor: number; purchasable: boolean; unavailableReason: string | null; cardEnabled: boolean; canBuy: boolean; messagingOnly?: boolean; mode: string; maxUnlocks: number;
}) {
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const enough = balanceMinor >= priceMinor;
  const buy = (method: "CARD" | "CREDITS") =>
    start(async () => {
      setError(null);
      trackClient("RFQUnlockStarted", { method });
      const r = await unlockAction(rfqId, method);
      if (r && !r.ok) setError(r.error);
    });
  return (
    <div className="card overflow-hidden">
      <div className="bg-navy p-5 text-white">
        <p className="flex items-center gap-2 text-sm text-white/70"><Lock className="h-4 w-4 text-cyan" /> Unlock price</p>
        <p className="tabular mt-1 font-display text-4xl font-semibold">{formatMoney(priceMinor, currency)}</p>
        <p className="mt-1 text-xs text-white/55">No hidden fees. {mode === "EXCLUSIVE" ? "Exclusive — only one manufacturer can unlock this RFQ." : `Up to ${maxUnlocks} manufacturers can unlock this RFQ.`}</p>
      </div>
      <div className="space-y-4 p-5">
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-success" /> Full specifications and original artwork</li>
          <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-success" /> Buyer contact details the buyer consented to share</li>
          <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-success" /> Messaging and quotation tools</li>
        </ul>
        {unavailableReason || !purchasable ? (
          <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{unavailableReason ?? "This opportunity can't be purchased right now."}</p>
        ) : !canBuy ? (
          <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">Only team owners and admins can purchase RFQs.</p>
        ) : (
          <>
            <Checkbox id="ack" checked={ack} onChange={(e) => setAck(e.target.checked)} label="I understand this is a buying opportunity, not a guaranteed order." description={<>Credits or refunds are handled under the <Link href="/rfq-quality-policy" target="_blank" className="text-electric underline">RFQ Quality Policy</Link>.</>} />
            <div className="space-y-2">
              <Button className="w-full" disabled={!ack || !enough} loading={pending} onClick={() => buy("CREDITS")}>
                <Wallet className="h-4 w-4" /> Unlock with credits
              </Button>
              <p className="text-center text-xs text-muted">Balance {formatMoney(balanceMinor, currency)}{!enough && <> · <Link href="/seller/billing" className="font-semibold text-electric">Add credits</Link></>}</p>
              {cardEnabled && (
                <Button variant="secondary" className="w-full" disabled={!ack} loading={pending} onClick={() => buy("CARD")}>
                  <CreditCard className="h-4 w-4" /> Pay by card
                </Button>
              )}
            </div>
          </>
        )}
        {error && <p className="flex gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert"><AlertTriangle className="h-4 w-4 shrink-0" /> {error}</p>}
        <p className="text-[11px] leading-relaxed text-muted">Access is granted only after your payment is confirmed by the payment provider (or credits are deducted). A short reservation holds the RFQ while you pay.</p>
      </div>
    </div>
  );
}
