import type { Metadata } from "next";
import { CtaBand, MarketingHero, SectionHeading } from "@/components/marketing/sections";

export const metadata: Metadata = { title: "About PatchMatch AI", description: "Why we built a sourcing marketplace for custom patches.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <>
      <MarketingHero eyebrow="About" title="Custom patch sourcing should be faster, safer and more transparent." description="PatchMatch AI is a sourcing marketplace that connects buyers — primarily in the United States — with verified custom patch manufacturers in Pakistan, the United States and beyond." />
      <section className="container-page grid gap-12 py-20 lg:grid-cols-2">
        <SectionHeading eyebrow="Our mission" title="Make every patch request easy to quote and fair to everyone." />
        <div className="prose-pm">
          <p>Buyers struggle to find capable manufacturers and get comparable quotes. Manufacturers waste time on vague, unqualified enquiries. We sit in between: we make requests complete and verified, protect buyer privacy, and route each request to manufacturers that can actually fulfil it.</p>
          <p>Our business model is simple and public: <strong>manufacturers pay a published fee to access a qualified request</strong>. Buyers pay nothing. We don't take commission on orders, hold payments, or sell advertising placement in matching.</p>
          <p>PatchMatch AI is a <strong>Madvert Labs</strong> venture. We're launching carefully — with human review at every critical step — and we'd rather tell you no manufacturer matched than invent one.</p>
        </div>
      </section>
      <CtaBand title="Have a patch in mind?" primary={{ label: "Get free quotes", href: "/get-quotes" }} secondary={{ label: "Contact us", href: "/contact" }} />
    </>
  );
}
