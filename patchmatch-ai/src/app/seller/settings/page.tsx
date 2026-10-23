import type { Metadata } from "next";
import Link from "next/link";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader } from "@/components/ui/primitives";
import { SellerSettingsForms } from "@/components/seller/SellerSettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SellerSettings() {
  const { seller } = await requireSeller("/seller/settings");
  const prefs = (seller.notificationPrefs ?? {}) as { emailOpportunities?: boolean };
  return (
    <>
      <PageHeader title="Settings" />
      <SellerSettingsForms
        prefs={{ availability: seller.availability, dailyRfqLimit: seller.dailyRfqLimit, maxDailySpend: seller.maxDailySpendMinor / 100, minBudget: seller.minBudgetMinor != null ? seller.minBudgetMinor / 100 : null, emailOpportunities: prefs.emailOpportunities !== false }}
        profile={{ tradingName: seller.tradingName ?? "", description: seller.description ?? "", website: seller.website ?? "", phone: seller.phone ?? "" }}
      />
      <Card className="mt-6"><CardHeader title="Security" /><div className="p-5"><Link href="/account/security" className="text-sm font-semibold text-electric">Password & two-factor authentication →</Link></div></Card>
    </>
  );
}
