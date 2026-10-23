"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { quoteAction } from "@/app/actions/buyer";

export function QuoteActions({ rfqId, quoteId, status, shortlisted, selectable, conversationId }: { rfqId: string; quoteId: string; status: string; shortlisted: boolean; selectable: boolean; conversationId: string | null }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (status === "SUBMITTED" || status === "REVISED") void quoteAction(rfqId, quoteId, "VIEW");
  }, [rfqId, quoteId, status]);
  const run = (action: Parameters<typeof quoteAction>[2], confirmText?: string, ask?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    let message: string | undefined;
    if (ask) {
      message = window.prompt(ask) ?? undefined;
      if (!message) return;
    }
    start(async () => {
      const r = await quoteAction(rfqId, quoteId, action, message);
      setMsg(r && !r.ok ? r.error : r?.message ?? null);
    });
  };
  const open = !["ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"].includes(status);
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
      {conversationId && (
        <Link href={`/buyer/messages?c=${conversationId}`} className="text-electric hover:underline">
          Message
        </Link>
      )}
      {open && (
        <button type="button" disabled={pending} onClick={() => run(shortlisted ? "UNSHORTLIST" : "SHORTLIST")} className="text-electric hover:underline disabled:opacity-50">
          {shortlisted ? "Remove from shortlist" : "Shortlist"}
        </button>
      )}
      {open && status !== "CLARIFICATION_REQUESTED" && (
        <button type="button" disabled={pending} onClick={() => run("CLARIFY", undefined, "What would you like the manufacturer to clarify?")} className="text-electric hover:underline disabled:opacity-50">
          Ask a question
        </button>
      )}
      {open && selectable && (
        <button type="button" disabled={pending} onClick={() => run("SELECT", "Select this manufacturer as your preferred supplier? They will be notified. You still agree the order directly with them.")} className="text-success hover:underline disabled:opacity-50">
          Select
        </button>
      )}
      {open && (
        <button type="button" disabled={pending} onClick={() => run("REJECT", "Decline this quote?")} className="text-muted hover:text-danger disabled:opacity-50">
          Decline
        </button>
      )}
      {msg && <span className="basis-full font-medium text-muted" role="status">{msg}</span>}
    </div>
  );
}
