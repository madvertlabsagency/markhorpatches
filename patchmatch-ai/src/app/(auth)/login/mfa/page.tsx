import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/forms/AuthShell";
import { MfaForm } from "@/components/forms/AuthForms";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Two-factor verification", robots: { index: false } };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.mfaEnabledAt) redirect("/account/security?mfa=required");
  const { next } = await searchParams;
  return (
    <AuthShell title="Two-factor verification" subtitle={`Enter the code for ${session.user.email}.`}>
      <MfaForm next={next} />
    </AuthShell>
  );
}
