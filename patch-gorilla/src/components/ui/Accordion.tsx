"use client";
import * as A from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({ items, className, dark }: { items: { id: string; q: string; a: string }[]; className?: string; dark?: boolean }) {
  return (
    <A.Root type="single" collapsible className={cn("divide-y", dark ? "divide-white/10" : "divide-navy/10", className)}>
      {items.map((it) => (
        <A.Item key={it.id} value={it.id} className="group">
          <A.Header>
            <A.Trigger className={cn("flex w-full items-center justify-between gap-6 py-6 text-left font-display text-[1.45rem] font-extrabold uppercase leading-tight tracking-wide transition-colors", dark ? "text-white hover:text-turquoise" : "text-navy hover:text-patch")}>
              {it.q}
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all duration-300 group-data-[state=open]:rotate-45 group-data-[state=open]:border-transparent group-data-[state=open]:bg-signature group-data-[state=open]:text-white", dark ? "border-white/20" : "border-navy/15")}>
                <Plus className="h-4 w-4" aria-hidden />
              </span>
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden data-[state=closed]:animate-[acc-up_.3s_ease] data-[state=open]:animate-[acc-down_.35s_var(--ease-gorilla)]">
            <p className={cn("max-w-3xl pb-6 text-lg leading-relaxed", dark ? "text-white/70" : "text-slate")}>{it.a}</p>
          </A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
