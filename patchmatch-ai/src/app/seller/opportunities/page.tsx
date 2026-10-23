import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, ShieldAlert } from "lucide-react";
import { requireSeller } from "@/lib/auth/session";
import { listSellerOpportunities } from "@/lib/domain/opportunities";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { OpportunityCard } from "@/components/seller/OpportunityCard";
import { AutoRefresh } from "@/components/live/AutoRefresh";
import { LiveDot } from "@/components/live/LiveFeed";
import { PATCH_TYPES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Opportunities" };

const VALUES = [
  { v: undefined, label: "Any value" },
  { v: "300", label: "$300+" },
  { v: "1000", label: "$1,000+" },
  { v: "5000", label: "$5,000+" },
];

type SP = { view?: string; type?: string; min?: string; fresh?: string };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { seller } = await requireSeller("/seller/opportunities");
  const sp = await searchParams;
  if (seller.verificationStatus !== "VERIFIED") return <EmptyState icon={ShieldAlert} title="Verification required" description="Only verified manufacturers can view protected RFQs." action={<Link href="/seller/verification" className="font-semibold text-electric">Go to verification</Link>} />;
  const min = Number(sp.min ?? 0);
  const opps = await listSellerOpportunities(seller.id, { status: sp.view === "all" ? "all" : "open", patchType: sp.type, minValueMinor: min > 0 ? min * 100 : undefined, noOffers: sp.fresh === "1" });
  const href = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `/seller/opportunities${qs.size ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs font-semibold transition", active ? "border-navy bg-navy text-white dark:border-white dark:bg-white dark:text-navy" : "border-line hover:border-electric/50");
  return (
    <>
      <AutoRefresh />
      <PageHeader
        title="Opportunities"
        description="Anonymised requests matched to your capabilities. Exclusive requests disappear the moment another manufacturer claims them — buyer identity is revealed only after a confirmed purchase, within the buyer's consent."
        actions={<LiveDot label={`${opps.length} live`} />}
      />
      <div className="mb-5 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-line bg-surface-2/60 p-1">
            <Link href={href({ view: undefined })} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", !sp.view ? "bg-surface shadow-[var(--shadow-card)]" : "text-muted")}>Open</Link>
            <Link href={href({ view: "all" })} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", sp.view === "all" ? "bg-surface shadow-[var(--shadow-card)]" : "text-muted")}>All</Link>
          </div>
          <Link href={href({ fresh: sp.fresh === "1" ? undefined : "1" })} className={chip(sp.fresh === "1")} aria-pressed={sp.fresh === "1"}>No offers yet</Link>
          {VALUES.map((v) => (
            <Link key={v.label} href={href({ min: v.v })} className={chip((sp.min ?? undefined) === v.v)} aria-pressed={(sp.min ?? undefined) === v.v}>{v.label}</Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PATCH_TYPES.map((p) => (
            <Link key={p.code} href={href({ type: sp.type === p.code ? undefined : p.code })} className={cn("rounded-full border px-3 py-1 text-xs font-medium", sp.type === p.code ? "border-electric bg-electric/10 text-electric" : "border-line")}>{p.name.replace(" patches", "")}</Link>
          ))}
        </div>
      </div>
      {opps.length === 0 ? (
        <EmptyState icon={Inbox} title="Nothing matches right now" description="New requests appear here automatically when they match your capabilities. We never show requests you're not eligible for." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{opps.map((o) => <OpportunityCard key={o.id} o={o} />)}</div>
      )}
    </>
  );
}
