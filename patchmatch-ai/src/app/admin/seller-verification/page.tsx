import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data";
import { countryName } from "@/lib/catalog";
import { relativeTime } from "@/lib/utils";
import { statusTone, statusLabel } from "@/lib/ui-status";

export const metadata: Metadata = { title: "Seller verification" };

export default async function VerificationQueue() {
  await requireAdmin("sellers:verify");
  const sellers = await prisma.sellerProfile.findMany({ where: { verificationStatus: { in: ["PENDING_REVIEW", "INFO_REQUIRED", "UNVERIFIED"] } }, include: { _count: { select: { documents: true, portfolio: true, capabilities: true } }, verifications: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "asc" } });
  return (
    <>
      <PageHeader title="Seller verification" description="Pending review first. Never approve without documents, factory photos and samples." />
      <DataTable rows={sellers.sort((a, b) => Number(b.verificationStatus === "PENDING_REVIEW") - Number(a.verificationStatus === "PENDING_REVIEW"))} rowKey={(s) => s.id} rowHref={(s) => `/admin/seller-verification/${s.id}`} empty={<EmptyState icon={BadgeCheck} title="No sellers waiting" />} columns={[
        { key: "n", header: "Company", cell: (s) => s.legalName }, { key: "c", header: "Country", cell: (s) => countryName(s.country) },
        { key: "st", header: "Status", cell: (s) => <Badge tone={statusTone("ver", s.verificationStatus)}>{statusLabel(s.verificationStatus)}</Badge> },
        { key: "d", header: "Docs / samples / types", cell: (s) => `${s._count.documents} / ${s._count.portfolio} / ${s._count.capabilities}`, hideOnMobile: true },
        { key: "w", header: "Since", cell: (s) => relativeTime(s.verifications[0]?.createdAt ?? s.createdAt) },
      ]} />
    </>
  );
}
