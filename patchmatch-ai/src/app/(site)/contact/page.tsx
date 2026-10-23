import type { Metadata } from "next";
import { MarketingHero } from "@/components/marketing/sections";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata: Metadata = { title: "Contact PatchMatch AI", description: "Questions about requests, verification or seller accounts.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <>
      <MarketingHero eyebrow="Contact" title="Talk to the PatchMatch team." description="Questions about a request, manufacturer verification or your seller account? Send us a message and a person will reply." />
      <section className="container-page grid gap-10 py-16 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-6 sm:p-8"><ContactForm /></div>
        <div className="space-y-4 text-sm text-muted">
          <p><strong className="text-fg">Buyers:</strong> track an existing request from the link in your confirmation email, or sign in.</p>
          <p><strong className="text-fg">Manufacturers:</strong> verification questions are fastest from your seller dashboard → Verification.</p>
          <p><strong className="text-fg">Privacy requests:</strong> mention “privacy request” in your message; we'll verify your identity before acting.</p>
        </div>
      </section>
    </>
  );
}
