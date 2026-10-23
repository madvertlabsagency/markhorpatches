import Link from "next/link";
import { CalendarClock, Lock, MapPin, MessagesSquare, Package, Ruler, Zap } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { PatchArt } from "@/components/brand/PatchArt";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { patchTypeName } from "@/lib/catalog";
import { TIER_LABEL as QUALITY_TIER } from "@/lib/rfq/tiers";
import type { OpportunityCardData } from "@/lib/domain/opportunities";

const STAGE: Record<string, string> = { READY_7_DAYS: "Ordering ≤ 7 days", WITHIN_30_DAYS: "Ordering ≤ 30 days", COMPARING: "Comparing", RESEARCHING: "Researching" };
const MODE_LABEL: Record<string, string> = { EXCLUSIVE: "Exclusive", LIMITED_SHARED: "Limited shared", PRIVATE_INVITATION: "Private invitation", ADMIN_ASSIGNMENT: "Assigned to you" };

export function OpportunityCard({ o }: { o: OpportunityCardData }) {
  const available = o.oppStatus === "AVAILABLE" && !o.unlocked;
  const isNew = o.isNew;
  return (
    <Link href={`/seller/opportunities/${o.id}`} className={`group card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-electric/40 hover:shadow-[var(--shadow-lift)] ${isNew ? "animate-slide-in ring-2 ring-orange/50" : ""}`}>
      <div className="relative flex gap-4 p-5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
          {o.teaserId ? (
            // Blurred, metadata-free teaser (authorised server-side); never the original.
             
            <img src={`/api/files/${o.teaserId}?variant=teaser`} alt="Blurred artwork preview" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="p-2"><PatchArt type={o.patchType as never} /></div>
          )}
          {!o.unlocked && <span className="absolute right-1 bottom-1 grid h-5 w-5 place-items-center rounded-md bg-navy/80 text-white"><Lock className="h-3 w-3" /></span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="tabular text-xs font-semibold text-muted">{o.ref}</p>
            {o.score != null && <span className="tabular rounded-lg bg-gradient-to-br from-orange to-gold px-2 py-0.5 text-xs font-bold text-navy" title="Match score">{o.score}</span>}
          </div>
          <p className="mt-0.5 font-semibold">{o.quantity.toLocaleString()} × {patchTypeName(o.patchType)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {o.pricingTier && <Badge tone={o.pricingTier === "PREMIUM" ? "green" : o.pricingTier === "HIGH_INTENT" ? "blue" : "neutral"}>{QUALITY_TIER[o.pricingTier as keyof typeof QUALITY_TIER] ?? o.pricingTier}</Badge>}
            <Badge tone="neutral">{MODE_LABEL[o.mode]}</Badge>
            {isNew && <Badge tone="red" dot>New</Badge>}
            {available && o.noOffersYet && <Badge tone="amber">No offers yet — be first</Badge>}
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line px-5 py-4 text-xs">
        <div className="flex items-center gap-1.5 text-muted"><Ruler className="h-3.5 w-3.5" /><dd>{o.size ?? "Size TBC"}</dd></div>
        <div className="flex items-center gap-1.5 text-muted"><MapPin className="h-3.5 w-3.5" /><dd>{o.region}</dd></div>
        <div className="flex items-center gap-1.5 text-muted"><CalendarClock className="h-3.5 w-3.5" /><dd>{o.requiredBy ? `By ${formatDate(o.requiredBy)}` : "Flexible"}</dd></div>
        <div className="flex items-center gap-1.5 text-muted"><Package className="h-3.5 w-3.5" /><dd>{o.budgetMinor ? `Budget ${formatMoney(o.budgetMinor, o.currency, { compact: true })}` : `Est. order ${formatMoney(o.estValueMinor, o.currency, { compact: true })}`}</dd></div>
        {o.rush && <div className="flex items-center gap-1.5 font-semibold text-warning"><Zap className="h-3.5 w-3.5" /> Rush</div>}
        {o.messagingOnly && <div className="flex items-center gap-1.5 text-muted"><MessagesSquare className="h-3.5 w-3.5" /> Messaging first</div>}
        <div className="col-span-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
          <span>{o.emailVerified ? "✓ Email verified" : "Email unverified"}</span>
          <span>{o.intentReady ? `✓ Wants quotes${o.intentConfirmedAt ? ` · ${o.intentConfirmedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}` : "Intent not confirmed"}</span>
          {o.buyingStage && <span>{STAGE[o.buyingStage]}</span>}
          <span>{o.hasArtwork ? "Artwork attached" : o.artworkHelp ? "Needs artwork help" : "No artwork"}</span>
        </div>
      </dl>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-5 py-3">
        <div>
          <p className="tabular font-display text-lg font-semibold">{formatMoney(o.priceMinor, o.currency)}</p>
          <p className="text-[11px] text-muted">{o.unlocked ? "Unlocked" : o.oppStatus === "SOLD_OUT" ? "No longer available" : o.reservedByOther ? "Reserved — check back shortly" : `${o.remaining} of ${o.maxUnlocks} available`}</p>
        </div>
        <span className={available ? "rounded-xl bg-electric px-3.5 py-2 text-sm font-semibold text-[var(--pm-primary-fg)] group-hover:bg-[#B93C0A] dark:group-hover:bg-[#FF8A5B]" : "rounded-xl border border-line px-3.5 py-2 text-sm font-semibold"}>{o.unlocked ? "Open" : available ? "Unlock This RFQ" : "View"}</span>
      </div>
    </Link>
  );
}
