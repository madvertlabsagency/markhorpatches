import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui/primitives";
import { TeamManager } from "@/components/seller/TeamManager";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const { org, role, user } = await requireSeller("/seller/team");
  const [members, invites] = await Promise.all([
    prisma.organizationMember.findMany({ where: { orgId: org.id }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ where: { orgId: org.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  const canManage = role === "OWNER" || role === "ADMIN";
  return (
    <>
      <PageHeader title="Team" description="Owners and admins can purchase RFQs and manage billing. Members can view opportunities, quote and message." />
      <Card>
        <CardHeader title="Members" />
        <TeamManager canManage={canManage} currentUserId={user.id} members={members.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, email: m.user.email, role: m.role }))} invites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role }))} />
      </Card>
      {!canManage && <p className="mt-4 text-sm text-muted">Your role: <Badge>{role.toLowerCase()}</Badge></p>}
    </>
  );
}
