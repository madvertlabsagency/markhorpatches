import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Badge } from "@/components/ui/primitives";
import { DataTable, FilterBar } from "@/components/ui/data";
import { ActionButton } from "@/components/ui/client";
import { formatDate } from "@/lib/utils";
import { disableUserAction } from "../actions";

export const metadata: Metadata = { title: "Buyers" };

export default async function AdminBuyers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin("buyers:view");
  const { q } = await searchParams;
  const users = await prisma.user.findMany({
    where: { platformRole: "NONE", memberships: { some: { org: { type: "BUYER" } } }, ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}) },
    include: { memberships: { include: { org: { include: { _count: { select: { rfqs: true } } } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const guestCount = await prisma.rfq.count({ where: { buyerOrgId: null } });
  return (
    <>
      <PageHeader title="Buyers" description={`Registered buyer accounts. ${guestCount} RFQ(s) were submitted by guests without an account.`} />
      <FilterBar action="/admin/buyers" q={q} placeholder="Email or name" />
      <DataTable rows={users} rowKey={(u) => u.id} columns={[
        { key: "e", header: "Email", cell: (u) => u.email },
        { key: "n", header: "Name", cell: (u) => u.name ?? "—" },
        { key: "r", header: "RFQs", cell: (u) => u.memberships.find((m) => m.org.type === "BUYER")?.org._count.rfqs ?? 0, align: "right" },
        { key: "v", header: "Verified", cell: (u) => (u.emailVerifiedAt ? <Badge tone="green">yes</Badge> : <Badge tone="amber">no</Badge>), hideOnMobile: true },
        { key: "d", header: "Joined", cell: (u) => <>{formatDate(u.createdAt)}{u.isDemo && <Badge tone="violet" className="ml-1">demo</Badge>}</>, hideOnMobile: true },
        { key: "a", header: "", cell: (u) => <ActionButton variant="ghost" confirm={u.disabledAt ? "Re-enable this account?" : "Disable this account and sign them out?"} action={disableUserAction.bind(null, u.id, !u.disabledAt)}>{u.disabledAt ? "Enable" : "Disable"}</ActionButton> },
      ]} />
    </>
  );
}
