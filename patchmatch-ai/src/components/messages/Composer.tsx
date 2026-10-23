"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { ActionForm } from "@/components/ui/client";
import { FileUploader, type UploadedFile } from "@/components/forms/FileUploader";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

type Quick = { label: string; kind: string; text: string; needsFile?: boolean };
const QUICK: Record<"BUYER" | "SELLER", Quick[]> = {
  BUYER: [
    { label: "Ask a question", kind: "CLARIFICATION_REQUEST", text: "Quick question about your quote: " },
    { label: "Request artwork proof", kind: "CLARIFICATION_REQUEST", text: "Could you send a digital proof of the design before we go further?" },
    { label: "Request revision", kind: "REVISION_REQUEST", text: "Could you revise the quote? I'd like to change: " },
    { label: "Approve proof", kind: "PROOF_APPROVED", text: "The proof looks great — approved." },
    { label: "Request proof changes", kind: "PROOF_CHANGES", text: "Thanks for the proof. Please change: " },
  ],
  SELLER: [
    { label: "Request clarification", kind: "CLARIFICATION_REQUEST", text: "To quote accurately, could you confirm: " },
    { label: "Upload proof", kind: "PROOF", text: "Here is your artwork proof for review.", needsFile: true },
    { label: "Follow up", kind: "TEXT", text: "Just checking in — do you have any questions about our quote?" },
    { label: "Quote sent", kind: "TEXT", text: "I've sent an itemised quotation. Happy to adjust size, backing or quantity." },
  ],
};

export function Composer({ conversationId, action, side = "BUYER" }: { conversationId: string; action: (prev: ActionState, fd: FormData) => Promise<ActionState>; side?: "BUYER" | "SELLER" }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showFiles, setShowFiles] = useState(false);
  const [kind, setKind] = useState("TEXT");
  const [body, setBody] = useState("");
  return (
    <div className="border-t border-line p-4">
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Quick actions">
        {QUICK[side].map((q) => (
          <button key={q.label} type="button" onClick={() => { setKind(q.kind); setBody(q.text); if (q.needsFile) setShowFiles(true); }} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", kind === q.kind && body === q.text ? "border-electric bg-electric/10 text-electric" : "border-line hover:border-electric/50")}>
            {q.label}
          </button>
        ))}
      </div>
      <ActionForm
        action={async (p, fd) => {
          const r = await action(p, fd);
          if (r?.ok) {
            setFiles([]);
            setBody("");
            setKind("TEXT");
          }
          return r;
        }}
        submitLabel={<><Send className="h-4 w-4" /> Send</>}
        className="space-y-3"
        submitSize="sm"
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="kind" value={kind} />
        {files.map((f) => <input key={f.id} type="hidden" name="attachmentIds" value={f.id} />)}
        <label htmlFor="body" className="sr-only">Message</label>
        <textarea
          id="body" name="body" rows={3} maxLength={5000} value={body}
          onChange={(e) => { setBody(e.target.value); if (!e.target.value) setKind("TEXT"); }}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); }}
          placeholder="Write a message… (Ctrl/⌘ + Enter to send)"
          className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-electric focus:ring-3 focus:ring-electric/15 focus:outline-none"
        />
        {showFiles ? <FileUploader purpose="MESSAGE_ATTACHMENT" value={files} onChange={setFiles} compact label={kind === "PROOF" ? "Attach the proof (image or PDF)" : "Attach files"} /> : <button type="button" onClick={() => setShowFiles(true)} className="text-xs font-semibold text-electric">+ Attach files</button>}
      </ActionForm>
    </div>
  );
}
