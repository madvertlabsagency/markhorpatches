import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, ShieldAlert } from "lucide-react";
import { requireSeller } from "@/lib/auth/session";
import { listSellerOpportunities } from "@/lib/domain/opportunities";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { OpportunityCard } from "@/components/seller/OpportunityCard";
import { PATCH_TYPES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ view?: string; type?: string }> }) {
  const { seller } = await requireSeller("/seller/opportunities");
  const sp = await searchParams;
  if (seller.verificationStatus !== "VERIFIED") return <EmptyState icon={ShieldAlert} title="Verification required" description="Only verified manufacturers can view protected RFQs." action={<Link href="/seller/verification" className="font-semibold text-electric">Go to verification</Link>} />;
  const opps = await listSellerOpportunities(seller.id, { status: sp.view === "all" ? "all" : "open", patchType: sp.type });
  const tab = (v: string | undefined, label: string) => (
    <Link href={`/seller/opportunities${v ? `?view=${v}` : ""}`} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", (sp.view ?? undefined) === v ? "bg-surface shadow-[var(--shadow-card)]" : "text-muted")}>{label}</Link>
  );
  return (
    <>
      <PageHeader title="Opportunities" description="Anonymised RFQs matched to your capabilities. Buyer identity is revealed only after a confirmed purchase, within the buyer's consent." />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-line bg-surface-2/60 p-1">{tab(undefined, "Open")}{tab("all", "All")}</div>
        <div className="flex flex-wrap gap-1.5">
          {PATCH_TYPES.map((p) => <Link key={p.code} href={`/seller/opportunities?${new URLSearchParams({ ...(sp.view ? { view: sp.view } : {}), ...(sp.type === p.code ? {} : { type: p.code }) })}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", sp.type === p.code ? "border-electric bg-electric/10 text-electric" : "border-line")}>{p.name.replace(" patches", "")}</Link>)}
        </div>
      </div>
      {opps.length === 0 ? <EmptyState icon={Inbox} title="Nothing here yet" description="New opportunities appear when qualified RFQs match your capabilities. We never show you RFQs you're not eligible for." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{opps.map((o) => <OpportunityCard key={o.id} o={o} />)}</div>}
    </>
  );
}
