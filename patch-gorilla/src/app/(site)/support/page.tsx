import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, Mail, MessageCircle, Package } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getFaqs } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section } from "@/components/ui/Section";
import { SupportForm } from "@/components/forms/SupportForm";
import { FAQSection } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({ title: "Support — Talk to a Patch Expert | Patch Gorilla", description: "Questions about custom patches, artwork, proofs or an existing order? Real humans, fast answers.", path: "/support" });

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const [{ topic }, settings, faqs] = await Promise.all([searchParams, getSettings(), getFaqs({ general: true })]);
  const { brand } = settings;
  const channels = [
    brand.whatsappNumber && { icon: MessageCircle, title: "WhatsApp", body: "Fastest answers from a patch expert.", href: `https://wa.me/${brand.whatsappNumber}`, cta: "Chat now", external: true },
    brand.supportEmail && { icon: Mail, title: "Email", body: brand.supportEmail, href: `mailto:${brand.supportEmail}`, cta: "Send email", external: true },
    { icon: Package, title: "Track an order", body: "Proof status, production and shipping.", href: "/track-order", cta: "Track order" },
    { icon: HelpCircle, title: "FAQ", body: "Sizing, backings, timelines and more.", href: "/faq", cta: "Read FAQ" },
  ].filter(Boolean) as { icon: typeof Mail; title: string; body: string; href: string; cta: string; external?: boolean }[];
  return (
    <>
      <PageHero eyebrow="Support" title={<>Real humans. <span className="text-gradient">Real answers.</span></>} description={`${brand.businessHours}. We usually reply within one business day.`} crumbs={[{ name: "Support", path: "/support" }]} />
      <Section tone="light" className="py-16 sm:py-20">
        <Container size="2xl">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {channels.map((c) => (
              <li key={c.title}>
                <Link href={c.href} target={c.external ? "_blank" : undefined} rel={c.external ? "noopener noreferrer" : undefined} className="flex h-full flex-col rounded-[var(--radius-patch)] bg-white p-6 shadow-lift ring-1 ring-navy/5 transition hover:-translate-y-1">
                  <c.icon className="h-7 w-7 text-electric" aria-hidden />
                  <h2 className="display mt-4 text-3xl">{c.title}</h2>
                  <p className="mt-1 flex-1 break-words text-sm text-slate">{c.body}</p>
                  <span className="mt-4 font-semibold text-patch">{c.cta} →</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div><h2 className="display text-5xl">Send us a message.</h2><p className="mt-3 text-slate">Include your order number if it&apos;s about an existing order.</p></div>
            <div className="rounded-[1.5rem] bg-white p-6 ring-1 ring-line sm:p-8"><SupportForm defaultTopic={topic} /></div>
          </div>
        </Container>
      </Section>
      <FAQSection faqs={faqs.slice(0, 8)} tone="white" />
    </>
  );
}
