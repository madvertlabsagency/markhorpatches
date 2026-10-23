import type { Metadata } from "next";
import { AuthShell } from "@/components/forms/AuthShell";
import { verifyEmailToken } from "@/app/actions/auth";
import { Alert } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : { ok: false as const, reason: "Missing token." };
  return (
    <AuthShell title={result.ok ? "Email verified" : "Verification failed"}>
      {result.ok ? (
        <div className="space-y-5">
          <Alert tone="success" title={result.already ? "Already verified" : "Thanks for confirming your email"}>You're all set.</Alert>
          <ButtonLink href="/buyer/dashboard" className="w-full">Continue</ButtonLink>
        </div>
      ) : (
        <Alert tone="error" title="We couldn't verify your email">{result.reason}</Alert>
      )}
    </AuthShell>
  );
}
