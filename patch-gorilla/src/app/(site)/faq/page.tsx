import type { Metadata } from "next";
import { getFaqs } from "@/lib/data/public";
import { pageMetadata, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section } from "@/components/ui/Section";
import { Accordion } from "@/components/ui/Accordion";
import { JsonLd } from "@/components/JsonLd";
import { FinalCTA } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({ title: "Custom Patch FAQ | Patch Gorilla", description: "Answers about mockups, proofs, artwork, sizing, pricing, minimums, production times, backings and shipping.", path: "/faq" });

export default async function FAQPage() {
  const faqs = await getFaqs({ general: true });
  const groups = Array.from(new Set(faqs.map((f) => f.category)));
  return (
    <>
      <PageHero eyebrow="FAQ" title={<>Questions? <span className="text-gradient">Answered.</span></>} crumbs={[{ name: "FAQ", path: "/faq" }]} />
      <Section tone="light" className="py-16 sm:py-20">
        <Container size="lg">
          <nav aria-label="FAQ categories" className="no-scrollbar -mx-4 mb-10 flex gap-2 overflow-x-auto px-4">
            {groups.map((g) => <a key={g} href={`#${g.replace(/\W+/g, "-").toLowerCase()}`} className="whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line hover:ring-navy">{g}</a>)}
          </nav>
          {groups.map((g) => (
            <section key={g} id={g.replace(/\W+/g, "-").toLowerCase()} className="mb-12 scroll-mt-24">
              <h2 className="display text-4xl">{g}</h2>
              <Accordion className="mt-4" items={faqs.filter((f) => f.category === g).map((f) => ({ id: f.id, q: f.question, a: f.answer }))} />
            </section>
          ))}
        </Container>
      </Section>
      <FinalCTA />
      <JsonLd data={faqJsonLd(faqs)} />
    </>
  );
}
