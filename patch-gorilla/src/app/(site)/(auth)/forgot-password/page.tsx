import { AuthShell } from "@/components/forms/AuthShell";
import { ForgotForm } from "@/components/forms/AuthForms";

export const metadata = { title: "Reset password | Patch Gorilla", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell title="Forgot it?" sub="Happens to the best of us. We'll email you a reset link.">
      <ForgotForm />
    </AuthShell>
  );
}
