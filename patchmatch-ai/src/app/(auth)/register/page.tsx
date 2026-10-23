import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/forms/AuthShell";
import { RegisterForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string; next?: string }> }) {
  const sp = await searchParams;
  const role = sp.role === "seller" ? "seller" : "buyer";
  return (
    <AuthShell
      title={role === "seller" ? "Apply as a manufacturer" : "Create your account"}
      subtitle={role === "seller" ? "Create your login first. Next you'll add your company, capabilities and verification documents." : "Track your requests, compare quotes and message manufacturers in one place."}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-electric hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm defaultRole={role} next={sp.next} googleEnabled={!!process.env.GOOGLE_CLIENT_ID} />
    </AuthShell>
  );
}
