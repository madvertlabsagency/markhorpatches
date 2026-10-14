import { PageHero } from "@/components/ui/PageHero";
import { Container, Section } from "@/components/ui/Section";
import { Markdown } from "@/lib/markdown";

/** Legal page shell. Content is a TEMPLATE — have it reviewed by counsel before launch. */
export function LegalPage({ title, path, updated, body }: { title: string; path: string; updated: string; body: string }) {
  return (
    <>
      <PageHero tone="light" title={title} crumbs={[{ name: title, path }]} description={`Last updated ${updated}`} />
      <Section tone="white" className="py-16"><Container size="md">
        <p className="mb-8 rounded-xl bg-gold/10 p-4 text-sm text-navy">Template content — review with legal counsel and replace bracketed details before launch.</p>
        <Markdown source={body} />
      </Container></Section>
    </>
  );
}
