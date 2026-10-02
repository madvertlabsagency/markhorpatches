"use client";
import { useSyncExternalStore } from "react";

/** Live configurator summary, so the WhatsApp button can prefill a helpful message. */
export interface WhatsAppContextData {
  type?: string;
  size?: string;
  quantity?: string;
  backing?: string;
  estimate?: string;
}

let state: WhatsAppContextData | null = null;
const listeners = new Set<() => void>();

export function setWhatsAppContext(next: WhatsAppContextData | null) {
  state = next;
  listeners.forEach((l) => l());
}

export function useWhatsAppContext() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => null,
  );
}

export function whatsappMessage(ctx: WhatsAppContextData | null) {
  if (!ctx?.type) return "Hi Patch Gorilla! I have a question about custom patches.";
  return [
    "Hi Patch Gorilla! I'm interested in:",
    `Patch Type: ${ctx.type}`,
    `Size: ${ctx.size ?? "—"}`,
    `Quantity: ${ctx.quantity ?? "—"}`,
    `Backing: ${ctx.backing ?? "—"}`,
    `Order Estimate: ${ctx.estimate ?? "—"}`,
  ].join("\n");
}
