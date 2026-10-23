import type { Metadata } from "next";
import Link from "next/link";
import { Clock, FilePlus2, FileText, MailWarning, MessageSquareQuote, Radar, Trophy } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/session";
import { PageHeader, StatCard, Card, CardHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { RFQ_STATUS_LABEL } from "@/lib/state-machines";
import { statusTone } from "@/lib/ui-status";
import { patchTypeName } from "@/lib/catalog";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Buyer dashboard" };

export default async function BuyerDashboard() {
  const { user, org } = await requireBuyer();
  const where = { OR: [{ buyerOrgId: org.id }, { buyerUserId: user.id }] };
  const [rfqs, events, quotes] = await Promise.all([
    prisma.rfq.findMany({ where, include: { spec: true, _count: { select: { quotes: { where: { status: { not: "DRAFT" } } } } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.rfqStatusEvent.findMany({ where: { rfq: where }, include: { rfq: { select: { publicRef: true, id: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.quote.count({ where: { rfq: where, status: { notIn: ["DRAFT", "WITHDRAWN"] } } }),
  ]);
  const active = rfqs.filter((r) => !["CLOSED", "CANCELLED", "EXPIRED"].includes(r.status));
  const count = (...s: string[]) => rfqs.filter((r) => s.includes(r.status)).length;
  return (
    <>
      <PageHeader title={`Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}`} description="Track your requests, compare quotes and talk to manufacturers." actions={<ButtonLink href="/get-quotes"><FilePlus2 className="h-4 w-4" /> New request</ButtonLink>} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Active RFQs" value={active.length} icon={FileText} href="/buyer/rfqs" />
        <StatCard label="Awaiting verification" value={count("VERIFICATION_PENDING")} icon={MailWarning} tone={count("VERIFICATION_PENDING") ? "attention" : "default"} />
        <StatCard label="In review / matching" value={count("UNDER_REVIEW", "QUALIFIED", "MATCHING", "MANUAL_SOURCING", "CLARIFICATION_REQUIRED")} icon={Radar} />
        <StatCard label="Quotes received" value={quotes} icon={MessageSquareQuote} href="/buyer/quotes" />
        <StatCard label="Sellers selected" value={count("SELLER_SELECTED")} icon={Trophy} />
        <StatCard label="Needs your input" value={count("CLARIFICATION_REQUIRED")} icon={Clock} tone={count("CLARIFICATION_REQUIRED") ? "attention" : "default"} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Your requests" action={<Link href="/buyer/rfqs" className="text-sm font-semibold text-electric">View all</Link>} />
          {rfqs.length === 0 ? (
            <div className="p-5"><EmptyState icon={FileText} title="No requests yet" description="Describe your patch and we'll match you with verified manufacturers." action={<ButtonLink href="/get-quotes">Get free quotes</ButtonLink>} /></div>
          ) : (
            <ul className="divide-y divide-line">
              {rfqs.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link href={`/buyer/rfqs/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-2/60">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.spec?.quantity.toLocaleString()} × {patchTypeName(r.patchType)}</p>
                      <p className="text-xs text-muted">{r.publicRef} · {relativeTime(r.createdAt)} · {r._count.quotes} quote{r._count.quotes === 1 ? "" : "s"}</p>
                    </div>
                    <Badge tone={statusTone("rfq", r.status)}>{RFQ_STATUS_LABEL[r.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Recent activity" />
          <ul className="divide-y divide-line">
            {events.length === 0 && <li className="px-5 py-6 text-sm text-muted">Nothing yet.</li>}
            {events.map((e) => (
              <li key={e.id} className="px-5 py-3 text-sm">
                <Link href={`/buyer/rfqs/${e.rfq.id}`} className="font-medium hover:text-electric">{e.rfq.publicRef}</Link> — {RFQ_STATUS_LABEL[e.to]}
                <p className="text-xs text-muted">{relativeTime(e.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
