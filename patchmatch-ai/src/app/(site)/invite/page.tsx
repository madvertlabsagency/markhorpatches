import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { Alert } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Team invitation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const inv = token ? await prisma.invitation.findUnique({ where: { tokenHash: sha256(token) }, include: { org: true } }) : null;
  const valid = inv && !inv.acceptedAt && !inv.revokedAt && inv.expiresAt > new Date();
  const user = await getCurrentUser();
  if (valid && user) {
    if (user.email !== inv.email) {
      return <div className="container-page max-w-lg py-16"><Alert tone="warning" title="Different account">This invitation was sent to {inv.email}. Sign in with that email to accept it.</Alert></div>;
    }
    await prisma.$transaction([
      prisma.organizationMember.upsert({ where: { orgId_userId: { orgId: inv.orgId, userId: user.id } }, create: { orgId: inv.orgId, userId: user.id, role: inv.role }, update: {} }),
      prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
    ]);
    await audit(user.id, "org.invite_accepted", "Organization", inv.orgId);
    redirect(inv.org.type === "SELLER" ? "/seller/dashboard" : "/buyer/dashboard");
  }
  return (
    <div className="container-page max-w-lg py-16">
      {valid ? (
        <div className="card space-y-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">Join {inv.org.name}</h1>
          <p className="text-muted">Sign in or create an account with <strong>{inv.email}</strong> to accept.</p>
          <div className="flex justify-center gap-3">
            <ButtonLink href={`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`}>Sign in</ButtonLink>
            <ButtonLink href={`/register?next=${encodeURIComponent(`/invite?token=${token}`)}`} variant="secondary">Create account</ButtonLink>
          </div>
        </div>
      ) : (
        <Alert tone="error" title="Invitation unavailable">This invitation is invalid, expired or already used.</Alert>
      )}
    </div>
  );
}
