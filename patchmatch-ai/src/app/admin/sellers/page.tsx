import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge } from "@/components/ui/primitives";
import { DataTable, FilterBar, FilterSelect } from "@/components/ui/data";
import { countryName } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { statusTone, statusLabel } from "@/lib/ui-status";
import type { VerificationStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Sellers" };

export default async function AdminSellers({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin("sellers:view");
  const sp = await searchParams;
  const sellers = await prisma.sellerProfile.findMany({
    where: { ...(sp.status ? { verificationStatus: sp.status as VerificationStatus } : {}), ...(sp.q ? { OR: [{ legalName: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }] } : {}) },
    include: { org: { include: { wallet: true } }, _count: { select: { unlocks: true, quotes: true, disputes: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Sellers" />
      <FilterBar action="/admin/sellers" q={sp.q} placeholder="Company or email"><FilterSelect name="status" value={sp.status} label="Verification" options={["UNVERIFIED", "PENDING_REVIEW", "INFO_REQUIRED", "VERIFIED", "SUSPENDED", "REJECTED"].map((v) => ({ value: v, label: statusLabel(v) }))} /></FilterBar>
      <DataTable rows={sellers} rowKey={(s) => s.id} rowHref={(s) => `/admin/sellers/${s.id}`} columns={[
        { key: "n", header: "Company", cell: (s) => <>{s.legalName}{s.isDemo && <Badge tone="violet" className="ml-1">demo</Badge>}</> },
        { key: "c", header: "Country", cell: (s) => countryName(s.country), hideOnMobile: true },
        { key: "v", header: "Verification", cell: (s) => <Badge tone={statusTone("ver", s.verificationStatus)}>{statusLabel(s.verificationStatus)}</Badge> },
        { key: "u", header: "Unlocks", cell: (s) => s._count.unlocks, align: "right" },
        { key: "q", header: "Quotes", cell: (s) => s._count.quotes, align: "right", hideOnMobile: true },
        { key: "d", header: "Claims", cell: (s) => s._count.disputes, align: "right", hideOnMobile: true },
        { key: "w", header: "Credits", cell: (s) => formatMoney(s.org.wallet?.balanceMinor ?? 0), align: "right" },
      ]} />
    </>
  );
}
