import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES } from "@/content/articles";
import { CtaBand } from "@/components/marketing/sections";
import { formatDate } from "@/lib/utils";

export const dynamicParams = false;
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICLES.find((x) => x.slug === slug);
  return a ? { title: a.title, description: a.excerpt, alternates: { canonical: `/blog/${a.slug}` }, openGraph: { type: "article", title: a.title } } : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) notFound();
  return (
    <>
      <article className="container-page max-w-3xl py-14">
        <Link href="/blog" className="text-sm font-semibold text-electric">← All guides</Link>
        <p className="eyebrow mt-6">{a.tag}</p>
        <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{a.title}</h1>
        <p className="mt-3 text-sm text-muted">{formatDate(a.date)} · {a.readMinutes} min read</p>
        <div className="prose-pm mt-8">{a.body}</div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: a.title, datePublished: a.date, publisher: { "@type": "Organization", name: "PatchMatch AI" } }).replace(/</g, "\\u003c") }} />
      </article>
      <CtaBand title="Put it into practice" primary={{ label: "Get free quotes", href: "/get-quotes" }} />
    </>
  );
}
