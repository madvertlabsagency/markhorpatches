import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, membershipOf } from "@/lib/auth/session";
import { SellerApplicationForm } from "@/components/seller/SellerApplicationForm";

export const metadata: Metadata = { title: "Manufacturer application", robots: { index: false } };

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/register?role=seller");
  if (membershipOf(user, "SELLER")) redirect("/seller/dashboard");
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">Step 1 of 3 · Company</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tell us about your company</h1>
      <p className="mt-2 text-muted">Next you'll add manufacturing capabilities and verification documents. Our team reviews every application manually.</p>
      <div className="card mt-8 p-6 sm:p-8"><SellerApplicationForm defaultEmail={user.email} defaultName={user.name ?? ""} /></div>
    </div>
  );
}
