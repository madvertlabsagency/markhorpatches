"use client";

import { useState, useTransition } from "react";
import { MailWarning } from "lucide-react";
import { resendVerificationAction } from "@/app/actions/auth";

export function VerifyBanner() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm">
      <MailWarning className="h-4 w-4 text-warning" />
      <span>Verify your email to link your requests and receive quotes.</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { const r = await resendVerificationAction(); setMsg(r && r.ok ? r.message ?? "Sent" : r && !r.ok ? r.error : null); })}
        className="font-semibold text-electric hover:underline"
      >
        {msg ?? "Resend email"}
      </button>
    </div>
  );
}
