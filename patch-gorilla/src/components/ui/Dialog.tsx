"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const DialogRoot = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ title, description, children, className, side }: { title: string; description?: string; children: React.ReactNode; className?: string; side?: "right" | "bottom" | "full" }) {
  const pos =
    side === "right"
      ? "inset-y-0 right-0 h-full w-full max-w-md rounded-l-3xl data-[state=open]:animate-[drawer-in_.4s_var(--ease-brand)]"
      : side === "full"
        ? "inset-0 h-full w-full data-[state=open]:animate-[fade-in_.25s_ease]"
        : side === "bottom"
          ? "inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl data-[state=open]:animate-[sheet-in_.4s_var(--ease-brand)]"
          : "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl data-[state=open]:animate-[pop-in_.3s_var(--ease-brand)]";
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-midnight/60 backdrop-blur-sm data-[state=open]:animate-[fade-in_.2s_ease]" />
      <D.Content className={cn("fixed z-50 overflow-y-auto bg-white p-6 text-navy shadow-2xl focus:outline-none sm:p-8", pos, className)}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <D.Title className="display text-3xl">{title}</D.Title>
            {description ? <D.Description className="mt-2 text-slate">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ice text-navy transition hover:bg-navy hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
