/**
 * Tiny, safe Markdown-lite renderer for CMS articles (## / ### headings, paragraphs, - and 1. lists, **bold**, [links](url)).
 * Produces React elements — never raw HTML — so admin content can't inject scripts.
 */
import Link from "next/link";
import type { ReactNode } from "react";

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${keyBase}-${i++}`}>{tok.slice(2, -2)}</strong>);
    else {
      const [, label, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      const safe = /^(https?:\/\/|\/|#|mailto:)/.test(href) ? href : "#";
      out.push(safe.startsWith("/") ? <Link key={`${keyBase}-${i++}`} href={safe} className="font-semibold text-patch underline">{label}</Link> : <a key={`${keyBase}-${i++}`} href={safe} rel="noopener noreferrer" className="font-semibold text-patch underline">{label}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose-pg">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (!lines.length) return null;
        if (lines[0].startsWith("### ")) return <h3 key={i}>{inline(lines[0].slice(4), `h${i}`)}</h3>;
        if (lines[0].startsWith("## ")) {
          const rest = lines.slice(1).join(" ");
          return (
            <div key={i}>
              <h2>{inline(lines[0].slice(3), `h${i}`)}</h2>
              {rest && <p>{inline(rest, `p${i}`)}</p>}
            </div>
          );
        }
        if (lines.every((l) => /^- /.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2), `l${i}${j}`)}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ""), `o${i}${j}`)}</li>)}</ol>;
        return <p key={i}>{inline(lines.join(" "), `p${i}`)}</p>;
      })}
    </div>
  );
}
