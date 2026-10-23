import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireBuyer } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader } from "@/components/ui/primitives";
import { BuyerSettingsForms } from "@/components/forms/BuyerSettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function BuyerSettings() {
  const { user, org } = await requireBuyer("/buyer/settings");
  const [profile, marketing] = await Promise.all([
    prisma.buyerProfile.findUnique({ where: { orgId: org.id } }),
    prisma.consentRecord.findFirst({ where: { email: user.email, kind: "MARKETING" }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <BuyerSettingsForms name={user.name ?? ""} phone={user.phone ?? ""} companyName={profile?.companyName ?? ""} marketing={!!marketing?.granted} />
        <Card>
          <CardHeader title="Security" />
          <div className="space-y-2 p-5 text-sm">
            <p>Email: <strong>{user.email}</strong> {user.emailVerifiedAt ? "(verified)" : "(not verified)"}</p>
            <Link href="/account/security" className="font-semibold text-electric">Password & two-factor authentication →</Link>
          </div>
        </Card>
      </div>
    </>
  );
}
