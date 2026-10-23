import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/forms/AuthShell";
import { ForgotForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a secure link that expires in one hour." footer={<Link href="/login" className="font-semibold text-electric hover:underline">Back to sign in</Link>}>
      <ForgotForm />
    </AuthShell>
  );
}
