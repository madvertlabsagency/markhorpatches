import type { Metadata } from "next";
import { CtaBand, FaqSection, MarketingHero } from "@/components/marketing/sections";
import { BUYER_FAQS, SELLER_FAQS } from "@/content/faqs";

export const metadata: Metadata = { title: "FAQ", description: "Answers for buyers and manufacturers: cost, privacy, verification, unlock pricing and quality claims.", alternates: { canonical: "/faq" } };

export default function FaqPage() {
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [...BUYER_FAQS, ...SELLER_FAQS].map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <MarketingHero eyebrow="FAQ" title="Questions, answered." description="How PatchMatch works for buyers and for manufacturers. Can't find your answer? Contact us from the help center." />
      <FaqSection faqs={BUYER_FAQS} title="For buyers" />
      <FaqSection faqs={SELLER_FAQS} title="For manufacturers" />
      <CtaBand title="Get free patch quotes." primary={{ label: "Get Free Patch Quotes", href: "/get-quotes" }} secondary={{ label: "How PatchMatch Works", href: "/how-it-works" }} />
    </>
  );
}
