import { AuthShell } from "@/components/forms/AuthShell";
import { LoginForm } from "@/components/forms/AuthForms";

export const metadata = { title: "Sign in | Patch Gorilla", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; verified?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Welcome back." sub="Orders, proofs and saved designs — all in one place.">
      <LoginForm next={sp.next} notice={sp.reset ? "Password updated. Sign in with your new password." : sp.verified ? "Email confirmed. Sign in to continue." : undefined} />
    </AuthShell>
  );
}
