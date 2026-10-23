import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { BUYER_FAQS, SELLER_FAQS } from "@/content/faqs";

export const metadata: Metadata = { title: "Help Center", description: "Answers for buyers and manufacturers using PatchMatch AI.", alternates: { canonical: "/help" } };

export default function HelpPage() {
  return (
    <div className="container-page py-14">
      <p className="eyebrow">Help center</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">How can we help?</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="h-buyers"><h2 id="h-buyers" className="mb-4 text-xl font-semibold">For buyers</h2><FaqAccordion items={BUYER_FAQS} /></section>
        <section aria-labelledby="h-sellers"><h2 id="h-sellers" className="mb-4 text-xl font-semibold">For manufacturers</h2><FaqAccordion items={SELLER_FAQS} /></section>
      </div>
      <div className="card mt-12 flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="font-semibold">Still need help?</p>
        <div className="flex gap-3 text-sm font-semibold">
          <Link href="/rfq/track" className="text-electric">Track a request</Link>
          <Link href="/contact" className="text-electric">Contact support</Link>
        </div>
      </div>
    </div>
  );
}
