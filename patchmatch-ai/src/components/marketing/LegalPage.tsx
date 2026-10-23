import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { LEGAL, LEGAL_UPDATED, type LegalDoc } from "@/content/legal";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Policies" className="lg:sticky lg:top-24 lg:self-start">
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {Object.values(LEGAL).map((d) => (
            <li key={d.slug}>
              <Link href={`/${d.slug}`} aria-current={d.slug === doc.slug ? "page" : undefined} className={d.slug === doc.slug ? "block rounded-lg bg-surface px-3 py-2 text-sm font-semibold shadow-[var(--shadow-card)]" : "block rounded-lg px-3 py-2 text-sm text-muted hover:text-fg"}>
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="min-w-0">
        <p className="eyebrow">Policy</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted">{LEGAL_UPDATED}</p>
        <div className="mt-6 flex gap-3 rounded-xl border border-warning/40 bg-warning/8 px-4 py-3 text-sm">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-warning" />
          <p><strong>Pending legal review.</strong> This draft describes how the platform works today. It has not yet been reviewed by counsel and may change before launch.</p>
        </div>
        <div className="prose-pm mt-8">{doc.body}</div>
      </article>
    </div>
  );
}
