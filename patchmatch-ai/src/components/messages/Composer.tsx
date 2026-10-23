"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { ActionForm } from "@/components/ui/client";
import { FileUploader, type UploadedFile } from "@/components/forms/FileUploader";
import type { ActionState } from "@/lib/action-state";

export function Composer({ conversationId, action }: { conversationId: string; action: (prev: ActionState, fd: FormData) => Promise<ActionState> }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showFiles, setShowFiles] = useState(false);
  return (
    <div className="border-t border-line p-4">
      <ActionForm action={async (p, fd) => { const r = await action(p, fd); if (r?.ok) setFiles([]); return r; }} submitLabel={<><Send className="h-4 w-4" /> Send</>} resetOnSuccess className="space-y-3" submitSize="sm">
        <input type="hidden" name="conversationId" value={conversationId} />
        {files.map((f) => <input key={f.id} type="hidden" name="attachmentIds" value={f.id} />)}
        <label htmlFor="body" className="sr-only">Message</label>
        <textarea id="body" name="body" rows={3} maxLength={5000} placeholder="Write a message…" className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-electric focus:ring-3 focus:ring-electric/15 focus:outline-none" />
        {showFiles ? <FileUploader purpose="MESSAGE_ATTACHMENT" value={files} onChange={setFiles} compact label="Attach files" /> : <button type="button" onClick={() => setShowFiles(true)} className="text-xs font-semibold text-electric">+ Attach files</button>}
      </ActionForm>
    </div>
  );
}
