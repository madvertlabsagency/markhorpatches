import type { Metadata } from "next";
import { RfqWizard } from "@/components/rfq/RfqWizard";
import { wizardPrefill } from "@/app/actions/rfq";
import { getCurrentUser } from "@/lib/auth/session";
import { featureEnabled } from "@/lib/domain/rfq";

export const metadata: Metadata = {
  title: "Get Free Custom Patch Quotes",
  description: "Describe your custom patches, upload artwork and get matched with verified manufacturers. Free for buyers.",
  alternates: { canonical: "/get-quotes" },
};

export default async function GetQuotesPage({ searchParams }: { searchParams: Promise<{ type?: string; qty?: string }> }) {
  const sp = await searchParams;
  const [prefill, user, sharedEnabled] = await Promise.all([wizardPrefill(), getCurrentUser(), featureEnabled("limited_shared_rfqs")]);
  return (
    <div className="bg-bg">
      <div className="relative overflow-hidden border-b border-line bg-surface">
        <div className="grid-bg absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
        <div className="container-page relative py-10">
          <p className="eyebrow">Free quote request</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Get free custom patch quotes</h1>
          <p className="mt-2 max-w-2xl text-muted">About 2–4 minutes. We verify your request, match it with verified manufacturers, and keep your contact details private until the rules you approve allow sharing.</p>
        </div>
      </div>
      <div className="container-page py-10">
        <RfqWizard initialType={sp.type} initialQty={sp.qty} prefill={prefill} signedInEmail={user?.emailVerifiedAt ? user.email : null} sharedEnabled={sharedEnabled} />
      </div>
    </div>
  );
}
