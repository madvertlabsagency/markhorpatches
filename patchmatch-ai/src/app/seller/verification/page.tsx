import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { verificationChecklist } from "@/lib/domain/sellers";
import { PageHeader, Card, CardHeader, Badge, Alert } from "@/components/ui/primitives";
import { Timeline } from "@/components/ui/data";
import { VerificationUploads } from "@/components/seller/VerificationUploads";
import { statusTone, statusLabel } from "@/lib/ui-status";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Verification" };

export default async function VerificationPage() {
  const { seller } = await requireSeller("/seller/verification");
  const [{ items, ready }, docs, history] = await Promise.all([
    verificationChecklist(seller.id),
    prisma.sellerDocument.findMany({ where: { sellerId: seller.id }, include: { attachment: true }, orderBy: { createdAt: "desc" } }),
    prisma.sellerVerification.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const latest = history.find((h) => h.toStatus === seller.verificationStatus);
  const editable = ["UNVERIFIED", "INFO_REQUIRED", "REJECTED"].includes(seller.verificationStatus);
  return (
    <>
      <PageHeader eyebrow="Step 3 of 3" title="Verification" description="Documents are private — only you and our review team can see them." actions={<Badge tone={statusTone("ver", seller.verificationStatus)} dot>{statusLabel(seller.verificationStatus)}</Badge>} />
      {seller.verificationStatus === "INFO_REQUIRED" && latest && <Alert tone="warning" className="mb-6" title="Additional information required">{latest.requestedInfo ?? latest.reason}</Alert>}
      {seller.verificationStatus === "REJECTED" && latest && <Alert tone="error" className="mb-6" title="Application not approved">{latest.reason} You may update your documents and resubmit.</Alert>}
      {seller.verificationStatus === "SUSPENDED" && latest && <Alert tone="error" className="mb-6" title="Account suspended">{latest.reason}</Alert>}
      {seller.verificationStatus === "VERIFIED" && <Alert tone="success" className="mb-6" title="You're verified">You can view and purchase matching RFQs.</Alert>}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Checklist" />
            <ul className="divide-y divide-line">{items.map((i) => <li key={i.key} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span>{i.label}</span><Badge tone={i.done ? "green" : "neutral"}>{i.done ? "Done" : "To do"}</Badge></li>)}</ul>
          </Card>
          {history.length > 0 && <Card><CardHeader title="History" /><div className="p-5"><Timeline items={history.map((h, i) => ({ title: statusLabel(h.toStatus), time: formatDateTime(h.createdAt), body: h.reason ?? undefined, tone: i === 0 ? "active" : "done" }))} /></div></Card>}
        </div>
        <VerificationUploads editable={editable} ready={ready} canSubmit={editable} docs={docs.map((d) => ({ id: d.id, kind: d.kind, name: d.attachment.originalFilename, attachmentId: d.attachmentId, createdAt: d.createdAt.toISOString() }))} />
      </div>
    </>
  );
}
