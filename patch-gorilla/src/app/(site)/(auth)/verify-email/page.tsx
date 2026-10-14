import Link from "next/link";
import { AuthShell } from "@/components/forms/AuthShell";
import { verifyEmailToken } from "@/app/actions/auth";

export const metadata = { title: "Confirm email | Markhor Patches", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailToken(token) : false;
  return (
    <AuthShell title={ok ? "You're verified." : "Link expired."}>
      {ok ? (
        <p>Your email is confirmed and your orders are linked to your account. <Link href="/account" className="font-semibold text-patch">Go to your account →</Link></p>
      ) : (
        <p>This confirmation link is invalid or expired. Sign in and request a new one from your account page. <Link href="/login" className="font-semibold text-patch">Sign in →</Link></p>
      )}
    </AuthShell>
  );
}
