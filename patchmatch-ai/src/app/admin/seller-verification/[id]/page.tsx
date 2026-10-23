import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { PageHeader, Card, CardHeader, Badge, KeyValue } from "@/components/ui/primitives";
import { Timeline } from "@/components/ui/data";
import { VerificationDecisionForm } from "@/components/admin/VerificationDecisionForm";
import { VerificationBadge } from "@/components/seller/VerificationBadge";
import { ActionButton } from "@/components/ui/client";
import { sellerBadgeAction } from "@/app/admin/actions";
import { countryName, patchTypeName } from "@/lib/catalog";
import { formatDateTime } from "@/lib/utils";
import { statusTone, statusLabel } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Verify seller" };

export default async function VerifySeller({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin("sellers:verify");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await prisma.sellerProfile.findUnique({ where: { id }, include: { capabilities: true, documents: { include: { attachment: true } }, portfolio: true, verifications: { orderBy: { createdAt: "desc" } }, org: { include: { members: { include: { user: true } } } } } });
  if (!s) notFound();
  await audit(admin.id, "seller.view_documents", "SellerProfile", s.id);
  const owner = s.org.members.find((m) => m.role === "OWNER")?.user;
  return (
    <>
      <PageHeader title={s.legalName} description={`${countryName(s.country)} · ${s.email}`} actions={<Badge tone={statusTone("ver", s.verificationStatus)}>{statusLabel(s.verificationStatus)}</Badge>} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card><CardHeader title="Application" /><div className="p-5"><KeyValue cols={3} items={[
            { label: "Trading name", value: s.tradingName ?? "—" }, { label: "Registration #", value: s.registrationNumber ?? "—" }, { label: "Years operating", value: s.yearsOperating ?? "—" },
            { label: "Address", value: [s.addressLine1, s.city, s.region, s.postalCode].filter(Boolean).join(", ") || "—" }, { label: "Factory", value: s.factoryLocation ?? "—" }, { label: "Website", value: s.website ?? "—" },
            { label: "Contact", value: `${s.contactName} · ${s.phone ?? ""}` }, { label: "Owner email verified", value: owner?.emailVerifiedAt ? "Yes" : "No" }, { label: "Export markets", value: s.exportMarkets.join(", ") || "—" },
          ]} />{s.description && <p className="mt-4 text-sm text-muted">{s.description}</p>}</div></Card>
          <Card><CardHeader title={`Documents (${s.documents.length})`} description="Private. Access is audit-logged." /><ul className="divide-y divide-line text-sm">{s.documents.length === 0 && <li className="px-5 py-3 text-muted">None uploaded.</li>}{s.documents.map((d) => <li key={d.id} className="flex items-center gap-3 px-5 py-2.5"><FileText className="h-4 w-4 text-muted" /><a href={`/api/files/${d.attachmentId}`} className="min-w-0 flex-1 truncate text-electric">{d.attachment.originalFilename}</a><Badge>{d.kind.toLowerCase().replace("_", " ")}</Badge><span className="text-xs text-muted">{d.attachment.scanStatus.toLowerCase().replace("_", " ")}</span></li>)}</ul></Card>
          <Card><CardHeader title={`Portfolio (${s.portfolio.length})`} /><div className="grid grid-cols-3 gap-2 p-5 sm:grid-cols-5">{s.portfolio.map((p) => <img key={p.id} src={`/api/files/${p.attachmentId}?variant=preview`} alt={p.title} className="aspect-square rounded-lg object-cover" />)}</div></Card>
          <Card><CardHeader title="Declared capabilities" /><ul className="divide-y divide-line text-sm">{s.capabilities.map((c) => <li key={c.id} className="px-5 py-2">{patchTypeName(c.patchType)} · MOQ {c.moq} · {c.standardDays}d std{c.rushDays ? ` / ${c.rushDays}d rush` : ""}{c.weeklyCapacity ? ` · ${c.weeklyCapacity}/wk` : ""}</li>)}</ul></Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Verification badges" description="Shown to buyers. Grant only after the check is actually done." /><div className="space-y-4 p-5 text-sm">
            <VerificationBadge seller={s} showMeaning />
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="secondary" size="sm" action={sellerBadgeAction.bind(null, s.id, "identity", !s.identityVerifiedAt)}>{s.identityVerifiedAt ? "Remove Identity Verified" : "Mark identity verified"}</ActionButton>
              <ActionButton variant="secondary" size="sm" action={sellerBadgeAction.bind(null, s.id, "capability", !s.capabilityReviewedAt)}>{s.capabilityReviewedAt ? "Remove Capability Reviewed" : "Mark capability reviewed"}</ActionButton>
            </div>
          </div></Card>
          <Card><CardHeader title="Decision" description="The seller is notified with your reason." /><div className="p-5"><VerificationDecisionForm sellerId={s.id} status={s.verificationStatus} /></div></Card>
          <Card><CardHeader title="History" /><div className="p-5"><Timeline items={s.verifications.map((v, i) => ({ title: `${statusLabel(v.fromStatus)} → ${statusLabel(v.toStatus)}`, time: formatDateTime(v.createdAt), body: v.reason ?? undefined, tone: i === 0 ? "active" : "done" }))} /></div></Card>
        </div>
      </div>
    </>
  );
}
