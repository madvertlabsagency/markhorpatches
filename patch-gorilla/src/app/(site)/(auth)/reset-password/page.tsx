import { AuthShell } from "@/components/forms/AuthShell";
import { ResetForm } from "@/components/forms/AuthForms";

export const metadata = { title: "Choose a new password | Markhor Patches", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="New password.">
      {token ? <ResetForm token={token} /> : <p>This link is missing its token. Please request a new reset link.</p>}
    </AuthShell>
  );
}
