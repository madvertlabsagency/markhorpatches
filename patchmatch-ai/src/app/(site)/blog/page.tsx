import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "@/content/articles";
import { Badge } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog — Custom Patch Sourcing Guides", description: "Practical guides on specifying, sourcing and comparing custom patches.", alternates: { canonical: "/blog" } };

export default function BlogPage() {
  return (
    <div className="container-page py-14">
      <p className="eyebrow">Blog</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Guides for better patch sourcing</h1>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {ARTICLES.map((a) => (
          <Link key={a.slug} href={`/blog/${a.slug}`} className="group card flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-electric/40">
            <Badge tone="blue">{a.tag}</Badge>
            <h2 className="mt-4 text-lg leading-snug font-semibold group-hover:text-electric">{a.title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted">{a.excerpt}</p>
            <p className="mt-4 text-xs text-muted">{formatDate(a.date)} · {a.readMinutes} min read</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
