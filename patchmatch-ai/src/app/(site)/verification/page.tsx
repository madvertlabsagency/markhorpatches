import type { Metadata } from "next";
import { BadgeCheck, Building2, Camera, FileText, Phone, ShieldAlert, Images } from "lucide-react";
import { CtaBand, MarketingHero, SectionHeading } from "@/components/marketing/sections";
import { Badge } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Manufacturer Verification", description: "How PatchMatch AI reviews and verifies custom patch manufacturers before they can access buyer requests.", alternates: { canonical: "/verification" } };

export default function VerificationPage() {
  return (
    <>
      <MarketingHero eyebrow="Trust & safety" title="How we verify manufacturers." description="Every manufacturer is reviewed by a person before accessing protected buyer requests. Verification reduces risk — it isn't a guarantee of performance, so always review samples and terms." />
      <section className="container-page py-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { i: Building2, t: "Business registration", b: "Registration certificate or equivalent official document, matched to the legal name provided." },
            { i: Camera, t: "Factory photos", b: "Photos of the facility and equipment used for production." },
            { i: Images, t: "Sample portfolio", b: "At least three examples of real patches produced." },
            { i: Phone, t: "Contact confirmation", b: "Email verification and a business phone number." },
            { i: FileText, t: "Capability declaration", b: "Patch types, MOQs, capacity, lead times and shipping destinations, which drive matching." },
            { i: ShieldAlert, t: "Ongoing monitoring", b: "Upheld quality claims, buyer reports and unresponsiveness can lead to suspension." },
          ].map((s) => (
            <div key={s.t} className="card p-6"><s.i className="h-6 w-6 text-electric" /><h3 className="mt-3 font-semibold">{s.t}</h3><p className="mt-1.5 text-sm text-muted">{s.b}</p></div>
          ))}
        </div>
      </section>
      <section className="bg-surface py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Statuses" title="Verification states" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Unverified", "neutral", "Account created; documents not submitted."],
              ["Pending review", "blue", "Submitted and waiting for our team."],
              ["Additional information required", "amber", "We need something else before deciding."],
              ["Verified", "green", "Approved — can view and purchase matching RFQs."],
              ["Suspended", "red", "Temporarily restricted pending review."],
              ["Rejected", "red", "Not approved; the reason is shared with the applicant."],
            ].map(([n, tone, d]) => (
              <div key={n} className="card p-5"><Badge tone={tone as "neutral"} dot>{n}</Badge><p className="mt-2 text-sm text-muted">{d}</p></div>
            ))}
          </div>
          <p className="mt-8 flex items-center gap-2 text-sm text-muted"><BadgeCheck className="h-4 w-4 text-success" /> Private verification documents are never shown publicly.</p>
        </div>
      </section>
      <CtaBand title="Ready to get verified?" primary={{ label: "Apply as a manufacturer", href: "/register?role=seller" }} />
    </>
  );
}
