import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getArticles } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { Markdown } from "@/lib/markdown";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container, Section } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/JsonLd";
import { HornMark, BrushUnderline } from "@/components/brand/marks";
import { FinalCTA } from "@/components/home/sections";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return prisma.article.findFirst({ where: { slug, published: true }, include: { category: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load((await params).slug);
  return a ? pageMetadata({ title: a.seoTitle ?? `${a.title} | Markhor Patches`, description: a.seoDescription ?? a.excerpt, path: `/resources/${a.slug}`, type: "article", image: a.coverImageUrl ?? undefined }) : {};
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = await load(slug);
  if (!a) notFound();
  const others = (await getArticles()).filter((x) => x.id !== a.id).slice(0, 3);
  return (
    <>
      <section data-header-theme="dark" className="theme-dark relative overflow-hidden pb-16 pt-[calc(var(--header-h)+2.5rem)]">
        <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <Container size="lg" className="relative">
          <Breadcrumbs dark items={[{ name: "Resources", path: "/resources" }, { name: a.title, path: `/resources/${a.slug}` }]} className="mb-8" />
          <div className="mb-4 flex items-center gap-3"><HornMark className="h-5 text-turquoise" /><span className="eyebrow text-white/70">{a.category?.name ?? "Guide"} · {a.readingMinutes} min read</span></div>
          <h1 className="display text-[clamp(2.6rem,7vw,5rem)]">{a.title}</h1>
          <BrushUnderline className="mt-2 h-4 w-60" />
          <p className="mt-6 max-w-2xl text-xl text-white/75">{a.excerpt}</p>
          <p className="mt-4 text-sm text-white/50">{a.authorName}{a.publishedAt ? ` · ${formatDate(a.publishedAt)}` : ""}</p>
        </Container>
      </section>
      <Section tone="white" className="py-16 sm:py-20">
        <Container size="md">
          <Markdown source={a.body} />
          <div className="mt-12 rounded-[1.5rem] bg-ice p-8">
            <p className="display text-3xl">Ready to make yours?</p>
            <div className="mt-4 flex flex-wrap gap-3"><ButtonLink href="/build-your-patch" arrow>Build your patch</ButtonLink><ButtonLink href="/free-mockup" variant="outline">Get a free mockup</ButtonLink></div>
          </div>
        </Container>
      </Section>
      {others.length > 0 && (
        <Section tone="light" className="py-16">
          <Container>
            <h2 className="display text-4xl">Keep reading</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">{others.map((o) => <li key={o.id}><Link href={`/resources/${o.slug}`} className="block h-full rounded-2xl bg-white p-6 ring-1 ring-line hover:ring-navy/30"><p className="font-display text-2xl font-extrabold uppercase leading-tight">{o.title}</p><p className="mt-2 text-sm text-slate">{o.excerpt}</p></Link></li>)}</ul>
          </Container>
        </Section>
      )}
      <FinalCTA />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.excerpt, author: { "@type": "Organization", name: a.authorName }, publisher: { "@type": "Organization", name: "Markhor Patches", logo: { "@type": "ImageObject", url: siteUrl("/brand/logo-horizontal.png") } }, datePublished: a.publishedAt?.toISOString(), dateModified: a.updatedAt.toISOString(), mainEntityOfPage: siteUrl(`/resources/${a.slug}`) }} />
    </>
  );
}
