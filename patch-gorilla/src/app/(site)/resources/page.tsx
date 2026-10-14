import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/States";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { FinalCTA } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({ title: "Custom Patch Guides & Resources | Markhor Patches", description: "Guides on patch types, sizing, backings, artwork preparation and pricing.", path: "/resources" });

export default async function ResourcesPage() {
  const articles = await getArticles();
  return (
    <>
      <PageHero eyebrow="Learning center" title={<>Know your <span className="text-gradient">patches.</span></>} description="Straight answers on patch types, sizing, backings, artwork and pricing." crumbs={[{ name: "Resources", path: "/resources" }]} />
      <Section tone="light" className="py-16 sm:py-20">
        <Container size="2xl">
          {articles.length ? (
            <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a, i) => (
                <StaggerItem key={a.id}>
                  <Link href={`/resources/${a.slug}`} className={`group flex h-full flex-col rounded-[var(--radius-patch)] p-7 shadow-lift ring-1 transition hover:-translate-y-1 ${i % 3 === 0 ? "bg-navy text-white ring-transparent" : "bg-white ring-navy/5"}`}>
                    <p className={`eyebrow ${i % 3 === 0 ? "text-turquoise" : "text-electric"}`}>{a.category?.name ?? "Guide"} · {a.readingMinutes} min</p>
                    <h2 className="display mt-4 text-3xl">{a.title}</h2>
                    <p className={`mt-3 flex-1 ${i % 3 === 0 ? "text-white/70" : "text-slate"}`}>{a.excerpt}</p>
                    <p className={`mt-5 text-xs ${i % 3 === 0 ? "text-white/50" : "text-slate"}`}>{a.publishedAt ? formatDate(a.publishedAt) : ""}</p>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          ) : <EmptyState title="Guides coming soon." />}
        </Container>
      </Section>
      <FinalCTA />
    </>
  );
}
