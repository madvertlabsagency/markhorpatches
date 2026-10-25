import type { Metadata } from "next";
import Link from "next/link";
import { ResendVerificationButton } from "@/components/seller/ResendVerificationButton";
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
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.key} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    {i.label} <span className="text-xs text-muted">{i.required ? "· required" : "· optional"}</span>
                  </span>
                  {i.done ? (
                    <Badge tone="green">Done</Badge>
                  ) : i.key === "email" ? (
                    <ResendVerificationButton />
                  ) : i.href ? (
                    <Link href={i.href} className="rounded-full border border-electric/40 px-3 py-1 text-xs font-semibold text-electric hover:bg-electric/10">Do this →</Link>
                  ) : (
                    <Badge tone="neutral">To do</Badge>
                  )}
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-5 py-3 text-xs text-muted">Only capabilities are required to apply. Our team verifies manufacturers manually — by phone, WhatsApp or video call — and may ask you to email documents instead of uploading them.</p>
          </Card>
          {history.length > 0 && <Card><CardHeader title="History" /><div className="p-5"><Timeline items={history.map((h, i) => ({ title: statusLabel(h.toStatus), time: formatDateTime(h.createdAt), body: h.reason ?? undefined, tone: i === 0 ? "active" : "done" }))} /></div></Card>}
        </div>
        <div id="documents" className="scroll-mt-24"><VerificationUploads editable={editable} ready={ready} canSubmit={editable} docs={docs.map((d) => ({ id: d.id, kind: d.kind, name: d.attachment.originalFilename, attachmentId: d.attachmentId, createdAt: d.createdAt.toISOString() }))} /></div>
      </div>
    </>
  );
}
