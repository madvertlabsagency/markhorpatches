import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/forms/AuthShell";
import { LoginForm } from "@/components/forms/AuthForms";
import { Alert } from "@/components/ui/primitives";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; reason?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your RFQs, opportunities and quotes."
      footer={
        <>
          New here?{" "}
          <Link href={`/register${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="font-semibold text-electric hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {isDemoMode() && (
        <Alert tone="info" className="mb-5" title="Demo environment">
          Use a ready-made account: <Link href="/demo" className="font-semibold text-electric hover:underline">enter as Admin, Manufacturer or Buyer</Link>.
        </Alert>
      )}
      {sp.reset && <Alert tone="success" className="mb-5" title="Password updated">Sign in with your new password.</Alert>}
      {sp.reason === "expired" && <Alert tone="info" className="mb-5" title="Session expired">For security, admin sessions expire after 12 hours.</Alert>}
      {sp.error === "google" && <Alert tone="error" className="mb-5" title="Google sign-in failed">Please try again or use your password.</Alert>}
      <LoginForm next={sp.next} googleEnabled={!!process.env.GOOGLE_CLIENT_ID} />
    </AuthShell>
  );
}
