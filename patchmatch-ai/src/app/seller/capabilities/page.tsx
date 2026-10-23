import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireSeller } from "@/lib/auth/session";
import { PageHeader, Alert } from "@/components/ui/primitives";
import { CapabilitiesForm } from "@/components/seller/CapabilitiesForm";

export const metadata: Metadata = { title: "Capabilities" };

export default async function CapabilitiesPage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const { seller } = await requireSeller("/seller/capabilities");
  const sp = await searchParams;
  const caps = await prisma.sellerCapability.findMany({ where: { sellerId: seller.id } });
  return (
    <>
      <PageHeader eyebrow={sp.onboarding ? "Step 2 of 3" : undefined} title="Manufacturing capabilities" description="Matching uses these as hard filters — be accurate. Overstating capacity or lead times leads to quality claims and suspension." />
      {sp.onboarding && <Alert tone="success" className="mb-6" title="Company saved">Now tell us what you make. Then upload verification documents.</Alert>}
      <CapabilitiesForm
        rows={caps.map((c) => ({ patchType: c.patchType, moq: c.moq, maxQuantity: c.maxQuantity, weeklyCapacity: c.weeklyCapacity, standardDays: c.standardDays, rushDays: c.rushDays, priceMin: c.priceMinMinor != null ? c.priceMinMinor / 100 : null, priceMax: c.priceMaxMinor != null ? c.priceMaxMinor / 100 : null }))}
        backingOptions={seller.backingOptions}
        borderOptions={seller.borderOptions}
        shippingCountries={seller.shippingCountries}
        flags={{ artworkSupport: seller.artworkSupport, sampleCapable: seller.sampleCapable, rushCapable: seller.rushCapable }}
        onboarding={!!sp.onboarding}
      />
    </>
  );
}
