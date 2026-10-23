import Link from "next/link";
import { CheckCircle2, CircleDashed, Info } from "lucide-react";
import { TIER_DESCRIPTION, TIER_LABEL, type PricingTierCode } from "@/lib/rfq/tiers";
import { PRIVACY_LABEL, type DisclosureModeCode } from "@/lib/rfq/disclosure";
import { formatDateTime } from "@/lib/utils";

const STAGE: Record<string, string> = { READY_7_DAYS: "Ready to order within 7 days", WITHIN_30_DAYS: "Planning within 30 days", COMPARING: "Comparing manufacturers", RESEARCHING: "Researching for later" };
const INTENT: Record<string, string> = { NOT_CONFIRMED: "Not confirmed yet", READY_FOR_QUOTES: "Confirmed: wants quotations", RESEARCHING: "Comparing options for later", NO_LONGER_INTERESTED: "No longer interested", EXPIRED: "Confirmation expired" };

/** What a manufacturer knows about the buyer before buying — actual verification facts only. */
export function BuyerReadiness({ r, pricingTier, mode, slots, max }: {
  r: { emailVerifiedAt: Date | null; phoneVerifiedAt: Date | null; intentStatus: string; intentConfirmedAt: Date | null; buyingStage: string | null; artworkHelpRequested: boolean; disclosureMode: string; isDemo: boolean; _count: { artwork: number } };
  pricingTier: string; mode: string; slots: number; max: number;
}) {
  const item = (ok: boolean, label: string, detail?: string) => (
    <li className="flex gap-2">{ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" /> : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted" />}<span><span className="font-medium">{label}</span>{detail && <span className="block text-xs text-muted">{detail}</span>}</span></li>
  );
  const tier = pricingTier as PricingTierCode;
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Request quality · {TIER_LABEL[tier] ?? tier}</p>
          <p className="text-xs text-muted">{TIER_DESCRIPTION[tier]}</p>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold">{mode === "EXCLUSIVE" ? "Exclusive — one manufacturer only" : `Shared — ${slots} of ${max} slots left`}</span>
      </div>
      <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {item(!!r.emailVerifiedAt, r.emailVerifiedAt ? "Email verified" : "Email not verified", r.emailVerifiedAt ? `Confirmed via link · ${formatDateTime(r.emailVerifiedAt)}` : undefined)}
        {item(!!r.phoneVerifiedAt, r.phoneVerifiedAt ? "Phone verified" : "Phone not verified", r.phoneVerifiedAt ? undefined : "We only mark phones verified after a real check.")}
        {item(r.intentStatus === "READY_FOR_QUOTES", INTENT[r.intentStatus] ?? r.intentStatus, r.intentConfirmedAt ? `Last answer ${formatDateTime(r.intentConfirmedAt)}` : undefined)}
        {item(r.buyingStage === "READY_7_DAYS" || r.buyingStage === "WITHIN_30_DAYS", r.buyingStage ? STAGE[r.buyingStage] : "Buying stage not given")}
        {item(r._count.artwork > 0, r._count.artwork > 0 ? `Artwork attached (${r._count.artwork})` : "No artwork yet", r.artworkHelpRequested ? "Buyer asked for artwork help" : undefined)}
        {item(r.disclosureMode === "FULL_CONTACT", PRIVACY_LABEL[r.disclosureMode as DisclosureModeCode], r.disclosureMode === "FULL_CONTACT" ? "Direct contact released after a confirmed purchase" : "You'll talk with the buyer through PatchMatch messaging")}
      </ul>
      <p className="mt-4 flex gap-2 text-xs text-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> You&apos;re buying access to a sourcing opportunity. A reply, quotation acceptance or order is never guaranteed.{r.isDemo ? " Simulated demo request." : ""}</p>
    </section>
  );
}

export function QualityPolicyNote({ claimWindowDays }: { claimWindowDays: number }) {
  return (
    <section className="card grid gap-4 p-5 text-sm md:grid-cols-2">
      <div>
        <p className="font-semibold">Eligible for a credit review (within {claimWindowDays} days)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>Verified contact details turn out invalid</li>
          <li>Fake or fraudulent inquiry</li>
          <li>Duplicate request improperly resold</li>
          <li>Buyer cancelled before your purchase</li>
          <li>Material misrepresentation of the request</li>
        </ul>
      </div>
      <div>
        <p className="font-semibold">Not refundable on its own</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>The buyer doesn&apos;t reply</li>
          <li>The buyer chooses another manufacturer</li>
          <li>You don&apos;t win the order</li>
          <li>The buyer changes their mind after your purchase</li>
        </ul>
        <Link href="/rfq-quality-policy" className="mt-2 inline-block text-xs font-semibold text-electric">Read the RFQ Quality Policy →</Link>
      </div>
    </section>
  );
}
