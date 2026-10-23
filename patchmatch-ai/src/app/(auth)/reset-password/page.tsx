import type { Metadata } from "next";
import { AuthShell } from "@/components/forms/AuthShell";
import { ResetForm } from "@/components/forms/AuthForms";
import { Alert } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" subtitle="All other sessions will be signed out.">
      {token ? <ResetForm token={token} /> : <Alert tone="error" title="Missing reset token">Open the link from your email again.</Alert>}
    </AuthShell>
  );
}
