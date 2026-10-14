"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as D from "@radix-ui/react-dialog";
import { FileText, HelpCircle, Package, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Result { type: "product" | "faq" | "article"; title: string; href: string; snippet: string }

const ICON = { product: Package, faq: HelpCircle, article: FileText };

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { results: Result[] }) => {
          setResults(d.results);
          setActive(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (r: Result) => {
    onOpenChange(false);
    router.push(r.href);
  };

  const visible = useMemo(() => (q.trim().length < 2 ? [] : results), [q, results]);
  const grouped = useMemo(() => visible.map((r, i) => ({ ...r, i })), [visible]);

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-midnight/60 backdrop-blur-sm data-[state=open]:animate-[fade-in_.2s_ease]" />
        <D.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className="fixed left-1/2 top-[10vh] z-[61] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-3xl bg-white text-navy shadow-2xl"
        >
          <D.Title className="sr-only">Search</D.Title>
          <D.Description className="sr-only">Search patches, FAQs and articles</D.Description>
          <div className="flex items-center gap-3 border-b border-line px-5">
            <Search className="h-5 w-5 text-slate" aria-hidden />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, visible.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === "Enter" && visible[active]) go(visible[active]);
              }}
              placeholder="Search patches, FAQs, guides…"
              role="combobox"
              aria-expanded={visible.length > 0}
              aria-controls="search-results"
              aria-activedescendant={visible[active] ? `sr-${active}` : undefined}
              aria-label="Search"
              className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-slate/60"
            />
            <D.Close aria-label="Close search" className="grid h-9 w-9 place-items-center rounded-full bg-ice"><X className="h-4 w-4" /></D.Close>
          </div>
          <ul id="search-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
            {grouped.map((r) => {
              const I = ICON[r.type];
              return (
                <li key={r.href + r.i} id={`sr-${r.i}`} role="option" aria-selected={active === r.i}>
                  <button onMouseEnter={() => setActive(r.i)} onClick={() => go(r)} className={cn("flex w-full items-start gap-3 rounded-2xl p-3 text-left", active === r.i && "bg-ice")}>
                    <I className="mt-0.5 h-5 w-5 shrink-0 text-electric" aria-hidden />
                    <span>
                      <span className="block font-semibold">{r.title}</span>
                      <span className="line-clamp-1 text-sm text-slate">{r.snippet}</span>
                    </span>
                    <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-slate/70">{r.type}</span>
                  </button>
                </li>
              );
            })}
            {q.trim().length >= 2 && !loading && visible.length === 0 && <li className="p-6 text-center text-slate">No results for “{q}”. Try “PVC”, “backing” or “sizing”.</li>}
            {q.trim().length < 2 && <li className="p-6 text-center text-sm text-slate">Try “iron-on”, “woven vs embroidered” or “minimum order”.</li>}
          </ul>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
