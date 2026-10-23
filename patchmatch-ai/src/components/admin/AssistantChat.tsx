"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/fields";
import { askAssistantAction } from "@/app/admin/assistant/actions";

const EXAMPLES = ["Which RFQs are unmatched?", "Which patch type has the highest demand?", "Which sellers respond fastest?", "What is our effective cost per sold RFQ?", "Which transactions require attention?"];

export function AssistantChat() {
  const [q, setQ] = useState("");
  const [log, setLog] = useState<{ q: string; a: string; links: { label: string; href: string }[]; source: string }[]>([]);
  const [pending, start] = useTransition();
  const ask = (question: string) =>
    start(async () => {
      const r = await askAssistantAction(question);
      if (r) setLog((l) => [{ q: question, a: r.answer, links: r.links, source: r.source }, ...l]);
      setQ("");
    });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{EXAMPLES.map((e) => <button key={e} type="button" onClick={() => ask(e)} className="rounded-full border border-line px-3 py-1 text-xs font-medium hover:border-electric/50">{e}</button>)}</div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about marketplace performance…" aria-label="Question" maxLength={500} />
        <Button type="submit" loading={pending}><Sparkles className="h-4 w-4" /> Ask</Button>
      </form>
      <ul className="space-y-3" aria-live="polite">
        {log.map((l, i) => (
          <li key={i} className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold">{l.q}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{l.a}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">{l.links.map((x) => <Link key={x.href} href={x.href} className="font-semibold text-electric">{x.label} →</Link>)}<span className="text-muted">source: {l.source}</span></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
