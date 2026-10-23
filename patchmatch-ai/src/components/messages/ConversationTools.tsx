"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Flag, Share2 } from "lucide-react";
import { shareContactAction } from "@/app/actions/intent";
import { reportConversationAction } from "@/app/actions/messages";

/** Per-conversation actions: share contact (buyer, option B), report, quick links. */
export function ConversationTools({ side, conversationId, rfqId, sellerId, privacy, contactShared, reported, detailHref }: { side: "BUYER" | "SELLER"; conversationId: string; rfqId: string; sellerId: string; privacy: string; contactShared: boolean; reported: boolean; hasProof: boolean; detailHref: string }) {
  const [shareState, share, sharing] = useActionState(shareContactAction, null);
  const [reportState, report, reporting] = useActionState(reportConversationAction, null);
  const [showReport, setShowReport] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 pt-3 text-xs">
      <Link href={detailHref} className="font-semibold text-electric">{side === "BUYER" ? "View & compare quotes" : "Submit or revise quote"}</Link>
      {side === "BUYER" && privacy === "BUYER_SELECTED" && !contactShared && (
        <form action={share}>
          <input type="hidden" name="rfqId" value={rfqId} />
          <input type="hidden" name="sellerId" value={sellerId} />
          <button disabled={sharing} className="inline-flex items-center gap-1 font-semibold text-green disabled:opacity-60"><Share2 className="h-3.5 w-3.5" /> Share my contact details with this manufacturer</button>
        </form>
      )}
      {side === "BUYER" && contactShared && privacy !== "PLATFORM_MESSAGING_ONLY" && <span className="text-muted">Your contact details are shared with this manufacturer.</span>}
      {reported ? <span className="text-muted">Reported — our team is reviewing.</span> : (
        <button type="button" onClick={() => setShowReport((v) => !v)} className="inline-flex items-center gap-1 text-muted hover:text-danger"><Flag className="h-3.5 w-3.5" /> Report</button>
      )}
      {showReport && !reported && (
        <form action={report} className="flex w-full flex-wrap items-center gap-2">
          <input type="hidden" name="conversationId" value={conversationId} />
          <select name="reason" className="h-9 rounded-lg border border-line bg-surface px-2 text-xs" aria-label="Reason">
            <option value="SPAM">Spam</option>
            <option value="ABUSE">Abusive</option>
            <option value="OFF_PLATFORM_PRESSURE">Pressure to move off-platform</option>
            <option value="SCAM">Suspected scam</option>
            <option value="OTHER">Other</option>
          </select>
          <input name="details" maxLength={1000} placeholder="Details (optional)" className="h-9 min-w-40 flex-1 rounded-lg border border-line bg-surface px-2 text-xs" />
          <button disabled={reporting} className="h-9 rounded-lg bg-danger px-3 font-semibold text-white">Send report</button>
        </form>
      )}
      {[shareState, reportState].map((s, i) => s && <span key={i} className={s.ok ? "text-success" : "text-danger"} role="status">{s.ok ? s.message : s.error}</span>)}
    </div>
  );
}
