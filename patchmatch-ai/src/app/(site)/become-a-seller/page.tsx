import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Ban, Coins, Filter, Gauge, Lock, Receipt, ShieldCheck } from "lucide-react";
import { CheckList, CtaBand, FaqSection, MarketingHero, ProcessSteps, SectionHeading } from "@/components/marketing/sections";
import { SELLER_FAQS } from "@/content/faqs";
import { ButtonLink } from "@/components/ui/Button";
import { RoiCalculator } from "@/components/marketing/RoiCalculator";
import { PatchArt } from "@/components/brand/PatchArt";

export const metadata: Metadata = { title: "Become a Verified Patch Manufacturer", description: "Get matched with US buyers who are already looking for custom patches. No subscription — pay only for qualified RFQs you choose to unlock.", alternates: { canonical: "/become-a-seller" } };

export default function BecomeSellerPage() {
  return (
    <>
      <MarketingHero
        eyebrow="For manufacturers"
        title="Get matched with buyers who are already looking for custom patches."
        description="Verified RFQs from buyers who confirmed their email and passed our quality review — matched to your capabilities. No subscription, no commission on orders."
        art={<div className="grid grid-cols-2 gap-5"><PatchArt type="EMBROIDERED" className="animate-float" /><PatchArt type="PVC" shape="circle" className="mt-10 animate-float [animation-delay:-3s]" /></div>}
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/register?role=seller" size="lg">Apply as a Manufacturer <ArrowRight className="h-4 w-4" /></ButtonLink>
          <ButtonLink href="/seller-pricing" variant="outlineLight" size="lg">See pricing</ButtonLink>
        </div>
      </MarketingHero>
      <section className="container-page py-20">
        <SectionHeading eyebrow="How verified RFQs work" title="Opportunities, filtered for fit." />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { i: BadgeCheck, t: "Verified buyers", b: "Every RFQ has a confirmed email and passed automated and human quality checks." },
            { i: Filter, t: "Matched to you", b: "Patch type, MOQ, capacity, lead times, shipping destinations and budget preferences." },
            { i: Lock, t: "Exclusive by default", b: "Most RFQs can be unlocked by only one manufacturer." },
            { i: Receipt, t: "Price before purchase", b: "The unlock fee is shown on every opportunity. No hidden fees, no surge pricing." },
          ].map((f) => (
            <div key={f.t} className="card p-6"><f.i className="h-6 w-6 text-electric" /><h3 className="mt-3 font-semibold">{f.t}</h3><p className="mt-1.5 text-sm text-muted">{f.b}</p></div>
          ))}
        </div>
      </section>
      <section className="bg-surface py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Seller qualification" title="Who can join" description="We onboard manufacturers who produce custom patches and can serve US buyers." />
            <div className="mt-8"><CheckList items={["Registered business (documents required)", "Your own production facility or a declared partner facility", "Sample portfolio of real work", "Ability to ship to the buyer's country", "Agreement to the Seller Terms and RFQ Quality Policy"]} /></div>
          </div>
          <div className="space-y-4">
            <div className="card p-6"><p className="flex items-center gap-2 font-semibold"><Coins className="h-5 w-5 text-electric" /> Unlock pricing</p><p className="mt-2 text-sm text-muted">Standard Verified $10 · Contact-Ready $12.50 · Premium Production-Ready $15 (pilot prices, shown on every request before you buy). <a href="/seller-pricing" className="font-semibold text-electric">Details →</a></p></div>
            <div className="card p-6"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-electric" /> Buyer contact access</p><p className="mt-2 text-sm text-muted">After a verified purchase you receive the details the buyer consented to share. Some buyers choose platform messaging only — you'll see this before you buy.</p></div>
            <div className="card p-6"><p className="flex items-center gap-2 font-semibold"><Ban className="h-5 w-5 text-warning" /> No guaranteed order</p><p className="mt-2 text-sm text-muted">An RFQ is a buying opportunity. Buyers compare quotes and may choose another supplier or not proceed.</p></div>
            <div className="card p-6"><p className="flex items-center gap-2 font-semibold"><Gauge className="h-5 w-5 text-electric" /> Refunds & credits</p><p className="mt-2 text-sm text-muted">Claims for invalid contacts, duplicates, spam or misdescribed requests within 7 days are reviewed under the <a href="/rfq-quality-policy" className="font-semibold text-electric">RFQ Quality Policy</a>.</p></div>
          </div>
        </div>
      </section>
      <section className="container-page py-20">
        <SectionHeading eyebrow="ROI calculator" title="Does it pay for your factory?" description="Plug in your own numbers. This is a hypothetical calculation, not a projection of results." />
        <div className="mt-10"><RoiCalculator /></div>
      </section>
      <section className="bg-surface py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Onboarding" title="From application to first opportunity" />
          <div className="mt-10"><ProcessSteps steps={[
            { title: "Create your account", body: "Business email and password." },
            { title: "Company & capabilities", body: "Patch types, MOQs, capacity, lead times, shipping countries." },
            { title: "Verification", body: "Upload registration documents, factory photos and 3+ samples." },
            { title: "Approval", body: "Our team reviews and approves, or asks for more information." },
          ]} /></div>
        </div>
      </section>
      <FaqSection faqs={SELLER_FAQS} />
      <CtaBand title="Apply as a manufacturer" body="Free to join. Pay only for the RFQs you choose." primary={{ label: "Apply now", href: "/register?role=seller" }} secondary={{ label: "Seller pricing", href: "/seller-pricing" }} />
    </>
  );
}
