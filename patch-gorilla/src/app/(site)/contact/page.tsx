import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section } from "@/components/ui/Section";
import { SupportForm } from "@/components/forms/SupportForm";

export const metadata: Metadata = pageMetadata({ title: "Contact Patch Gorilla", description: "Get in touch about custom patches, quotes and orders.", path: "/contact" });

export default async function ContactPage() {
  const { brand, promises } = await getSettings();
  return (
    <>
      <PageHero eyebrow="Contact" title={<>Let&apos;s talk <span className="text-gradient">patches.</span></>} crumbs={[{ name: "Contact", path: "/contact" }]} />
      <Section tone="light" className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4 text-lg">
              {brand.supportEmail && <p><span className="block text-sm text-slate">Email</span><a href={`mailto:${brand.supportEmail}`} className="font-semibold text-patch">{brand.supportEmail}</a></p>}
              {brand.phoneDisplay && <p><span className="block text-sm text-slate">Phone</span>{brand.phoneDisplay}</p>}
              {brand.whatsappNumber && <p><span className="block text-sm text-slate">WhatsApp</span><a href={`https://wa.me/${brand.whatsappNumber}`} className="font-semibold text-patch" target="_blank" rel="noopener noreferrer">Chat with a patch expert</a></p>}
              <p><span className="block text-sm text-slate">Hours</span>{brand.businessHours}</p>
              <p className="text-sm text-slate">{promises.manufacturingStatement}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-6 ring-1 ring-line sm:p-8"><SupportForm /></div>
          </div>
        </Container>
      </Section>
    </>
  );
}
