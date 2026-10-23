import type { Metadata } from "next";
import { VerificationBadge } from "@/components/seller/VerificationBadge";
import Link from "next/link";
import { BadgeCheck, Factory, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { MarketingHero, CtaBand } from "@/components/marketing/sections";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { countryName, patchTypeName } from "@/lib/catalog";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Verified Custom Patch Manufacturers", description: "Browse manufacturers verified by PatchMatch AI. Buyers don't contact manufacturers directly — submit a request and we match you.", alternates: { canonical: "/manufacturers" } };
export const dynamic = "force-dynamic";

export default async function ManufacturersPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const sellers = await prisma.sellerProfile.findMany({
    where: { verificationStatus: "VERIFIED", isDemo: isDemoMode(), ...(type ? { capabilities: { some: { patchType: type as never } } } : {}) },
    include: { capabilities: true, _count: { select: { portfolio: { where: { isPublic: true } } } } },
    orderBy: { verifiedAt: "asc" },
    take: 60,
  });
  return (
    <>
      <MarketingHero eyebrow="Manufacturers" title="Verified manufacturers." description="Every manufacturer listed here passed our business-identity check; badges show which reviews were completed. Profiles show declared capabilities — buyers are matched through requests, so you never need to cold-contact suppliers.">
        <ButtonLink href="/get-quotes" size="lg">Get matched</ButtonLink>
      </MarketingHero>
      <section className="container-page py-14">
        {sellers.length === 0 ? (
          <EmptyState icon={Factory} title="Our verified network is being onboarded" description="We list manufacturers only after verification. Submit a request now — our team sources manually when no verified manufacturer matches." action={<ButtonLink href="/get-quotes">Submit a request</ButtonLink>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sellers.map((s) => (
              <Link key={s.id} href={`/manufacturers/${s.publicSlug}`} className="card p-5 transition hover:border-electric/40">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{s.tradingName ?? s.legalName}</p>
                  <VerificationBadge seller={s} />
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin className="h-3.5 w-3.5" /> {countryName(s.country)}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.capabilities.map((c) => <Badge key={c.patchType}>{patchTypeName(c.patchType)}</Badge>)}
                </div>
                {s.isDemo && <p className="mt-3 text-xs text-violet-600">Fictional demo profile</p>}
              </Link>
            ))}
          </div>
        )}
      </section>
      <CtaBand title="Are you a manufacturer?" primary={{ label: "Apply for verification", href: "/become-a-seller" }} />
    </>
  );
}
