import Link from "next/link";
import { search } from "@/lib/search";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section } from "@/components/ui/Section";

export const metadata = { title: "Search | Markhor Patches", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const results = await search(q);
  return (
    <>
      <PageHero tone="light" title="Search" crumbs={[{ name: "Search", path: "/search" }]}>
        <form action="/search" role="search"><label htmlFor="q" className="sr-only">Search</label><input id="q" name="q" defaultValue={q} placeholder="Search patches, FAQs, guides" className="h-14 w-full max-w-xl rounded-full border border-line bg-white px-6 text-lg focus:border-electric focus:outline-none" /></form>
      </PageHero>
      <Section tone="white" className="py-12">
        <Container size="lg">
          {q && <p className="mb-6 text-slate">{results.length} result{results.length === 1 ? "" : "s"} for “{q}”</p>}
          <ul className="space-y-3">{results.map((r, i) => <li key={i}><Link href={r.href} className="block rounded-2xl p-4 ring-1 ring-line hover:ring-navy/30"><span className="text-xs font-semibold uppercase tracking-wider text-electric">{r.type}</span><span className="mt-1 block font-semibold">{r.title}</span><span className="line-clamp-2 text-sm text-slate">{r.snippet}</span></Link></li>)}</ul>
        </Container>
      </Section>
    </>
  );
}
