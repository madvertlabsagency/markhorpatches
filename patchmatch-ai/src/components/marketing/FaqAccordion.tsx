"use client";

import * as A from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <A.Root type="single" collapsible className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {items.map((f, i) => (
        <A.Item key={f.q} value={`q${i}`}>
          <A.Header>
            <A.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-[15px] font-semibold">
              {f.q}
              <Plus className="h-4 w-4 shrink-0 text-electric transition-transform duration-300 group-data-[state=open]:rotate-45" aria-hidden />
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden px-5 pb-4 text-sm leading-relaxed text-muted">{f.a}</A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
