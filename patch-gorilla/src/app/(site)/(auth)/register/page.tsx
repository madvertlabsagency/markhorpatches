import { AuthShell } from "@/components/forms/AuthShell";
import { RegisterForm } from "@/components/forms/AuthForms";

export const metadata = { title: "Create an account | Markhor Patches", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Create your account." sub="Track orders, approve proofs and reorder in two clicks.">
      <RegisterForm next={next} />
    </AuthShell>
  );
}
