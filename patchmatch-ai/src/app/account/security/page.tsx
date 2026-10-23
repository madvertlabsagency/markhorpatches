import type { Metadata } from "next";
import Link from "next/link";
import { requireUser, membershipOf } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { Logo } from "@/components/brand/Logo";
import { Alert, Card, CardHeader } from "@/components/ui/primitives";
import { SecurityForms } from "@/components/forms/SecurityForms";

export const metadata: Metadata = { title: "Account security", robots: { index: false } };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ mfa?: string }> }) {
  const user = await requireUser("/account/security");
  const { mfa } = await searchParams;
  const back = isStaff(user.platformRole) ? "/admin" : membershipOf(user, "SELLER") ? "/seller/settings" : "/buyer/settings";
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-surface"><div className="container-page flex h-16 items-center justify-between"><Link href="/"><Logo /></Link><Link href={back} className="text-sm font-semibold text-electric">← Back</Link></div></header>
      <main id="main" className="container-page max-w-3xl space-y-6 py-10">
        <h1 className="text-2xl font-semibold">Account security</h1>
        {mfa === "required" && <Alert tone="warning" title="Two-factor authentication required">Staff accounts must enable two-factor authentication before accessing the admin command center.</Alert>}
        <Card>
          <CardHeader title="Two-factor authentication" description={user.mfaEnabledAt ? "On — you'll be asked for a code when signing in." : "Protect your account with an authenticator app (Google Authenticator, 1Password, Authy…)."} />
          <div className="p-5"><SecurityForms mfaEnabled={!!user.mfaEnabledAt} isStaff={isStaff(user.platformRole)} email={user.email} hasPassword={!!user.passwordHash} /></div>
        </Card>
      </main>
    </div>
  );
}
