"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Download, FileText, History, MessageSquare, PartyPopper } from "lucide-react";
import { approveProofAction, requestRevisionAction } from "@/app/actions/proofs";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/fields";
import { DialogContent, DialogRoot } from "@/components/ui/Dialog";
import { ArtworkUploader, type UploadedArtwork } from "@/components/configurator/ArtworkUploader";
import { track } from "@/lib/analytics";
import { formatDate, cn } from "@/lib/utils";
import { useEffect } from "react";

export interface ProofVersion {
  id: string;
  version: number;
  status: "DRAFT" | "SENT" | "REVISION_REQUESTED" | "APPROVED" | "SUPERSEDED";
  previewUrl: string | null;
  downloadUrl: string;
  isImage: boolean;
  designerNotes: string | null;
  sentAt: string | null;
  spec: Record<string, unknown>;
  approval: { approvedAt: string; approvedByEmail: string } | null;
  revisions: { id: string; comment: string; createdAt: string }[];
}

const APPROVAL = "I confirm the artwork, dimensions, colors, spelling and production specifications shown above.";

function Confetti() {
  const colors = ["#08D8D8", "#008DE5", "#0755B9", "#FFD45A", "#ffffff"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 36 }).map((_, i) => (
        <motion.span key={i} className="absolute top-1/3 h-2.5 w-1.5 rounded-sm" style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length] }}
          initial={{ y: 0, opacity: 1, rotate: 0 }} animate={{ y: [0, -120 - (i % 5) * 30, 420], x: ((i % 7) - 3) * 30, opacity: [1, 1, 0], rotate: 360 + i * 20 }} transition={{ duration: 1.8 + (i % 4) * 0.2, ease: "easeOut" }} />
      ))}
    </div>
  );
}

export function ProofPanel({ orderId, token, itemName, proofs, maxUploadMb }: { orderId: string; token: string | null; itemName: string; proofs: ProofVersion[]; maxUploadMb: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState(proofs[0]?.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [artwork, setArtwork] = useState<UploadedArtwork | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [pending, start] = useTransition();
  const latest = proofs[0];
  const p = proofs.find((x) => x.id === selected) ?? latest;

  useEffect(() => {
    if (latest?.status === "SENT") track("view_proof", { version: latest.version });
  }, [latest]);

  if (!latest) {
    return (
      <div className="rounded-2xl border border-dashed border-navy/20 bg-ice/50 p-6 text-center">
        <p className="font-display text-2xl font-extrabold uppercase">Proof in progress</p>
        <p className="mt-1 text-sm text-slate">Our designers are preparing your digital proof. We&apos;ll email you the moment it&apos;s ready.</p>
      </div>
    );
  }

  const awaiting = latest.status === "SENT" && p.id === latest.id;
  const spec = p.spec as Record<string, string | number | string[]>;

  const approve = () =>
    start(async () => {
      setError(null);
      const r = await approveProofAction({ orderId, token, proofId: latest.id, confirmed });
      if (!r.ok) return setError(r.error);
      track("approve_proof", { version: latest.version });
      setConfirmOpen(false);
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2600);
      router.refresh();
    });

  const revise = () =>
    start(async () => {
      setError(null);
      const r = await requestRevisionAction({ orderId, token, proofId: latest.id, comment, artworkFileId: artwork?.id ?? null });
      if (!r.ok) return setError(r.error);
      track("request_revision", { version: latest.version });
      setRevisionOpen(false);
      setComment("");
      router.refresh();
    });

  return (
    <div className="relative">
      <AnimatePresence>{celebrate && <Confetti />}</AnimatePresence>
      {awaiting && (
        <div className="mb-5 rounded-2xl bg-signature p-5 text-white">
          <p className="display text-4xl">Your proof is ready.</p>
          <p className="mt-1 text-white/85">See it before we make it. Check every detail, then approve or request a change.</p>
        </div>
      )}
      {latest.status === "APPROVED" && (
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-5 flex items-center gap-3 rounded-2xl bg-success/10 p-4 text-success">
          {celebrate ? <PartyPopper className="h-6 w-6" aria-hidden /> : <CheckCircle2 className="h-6 w-6" aria-hidden />}
          <div><p className="font-semibold">Approved. Let&apos;s make it real.</p><p className="text-sm">Proof V{latest.version} is locked{latest.approval ? ` · approved ${formatDate(latest.approval.approvedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}.</p></div>
        </motion.div>
      )}
      {latest.status === "REVISION_REQUESTED" && <p className="mb-5 rounded-2xl bg-gold/10 p-4 text-sm font-medium">We&apos;re making the changes. You&apos;ll get a new proof version by email.</p>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-2xl bg-[repeating-conic-gradient(#eef4f7_0_25%,#fff_0_50%)] bg-[length:24px_24px] ring-1 ring-line">
          {p.isImage && p.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- private signed URL
            <img src={p.previewUrl} alt={`${itemName} proof version ${p.version}`} className="mx-auto max-h-[560px] w-full object-contain" />
          ) : (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div><FileText className="mx-auto h-12 w-12 text-slate" aria-hidden /><p className="mt-3 font-semibold">Proof V{p.version} (PDF)</p><a href={p.downloadUrl} className="mt-2 inline-block text-sm font-semibold text-patch underline" target="_blank" rel="noopener noreferrer">Open the proof</a></div>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="font-display text-2xl font-extrabold uppercase">Proof V{p.version}</p>
            <a href={p.downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-patch"><Download className="h-4 w-4" aria-hidden /> Download</a>
          </div>
          <dl className="mt-3 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
            {([["Patch type", spec.patchType], ["Size", spec.size], ["Quantity", typeof spec.quantity === "number" ? spec.quantity.toLocaleString("en-US") : spec.quantity], ["Shape", spec.shape], ["Backing", spec.backing], ["Border", spec.border], ["Extras", Array.isArray(spec.extras) && spec.extras.length ? spec.extras.join(", ") : "None"]] as [string, unknown][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm"><dt className="text-slate">{k}</dt><dd className="text-right font-semibold">{String(v ?? "—")}</dd></div>
            ))}
          </dl>
          {p.designerNotes && <p className="mt-3 rounded-2xl bg-ice p-3 text-sm"><span className="font-semibold">Designer notes:</span> {p.designerNotes}</p>}
          {awaiting && (
            <div className="mt-5 grid gap-2">
              <Button size="lg" onClick={() => { setConfirmed(false); setError(null); setConfirmOpen(true); }}>Approve for production</Button>
              <Button size="md" variant="outline" onClick={() => { setError(null); setRevisionOpen(true); }}><MessageSquare className="h-4 w-4" aria-hidden /> Request a revision</Button>
            </div>
          )}
        </div>
      </div>

      {proofs.length > 1 && (
        <div className="mt-6">
          <p className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" aria-hidden /> Version history</p>
          <ol className="mt-2 flex flex-wrap gap-2">
            {proofs.map((v) => (
              <li key={v.id}>
                <button onClick={() => setSelected(v.id)} aria-pressed={v.id === p.id} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold ring-1", v.id === p.id ? "bg-navy text-white ring-navy" : "bg-white ring-line")}>
                  V{v.version} · {v.status === "SUPERSEDED" ? "Replaced" : v.status === "REVISION_REQUESTED" ? "Revision" : v.status === "APPROVED" ? "Approved" : "Current"}
                </button>
              </li>
            ))}
          </ol>
          {p.revisions.length > 0 && (
            <ul className="mt-3 space-y-2">{p.revisions.map((r) => <li key={r.id} className="rounded-xl bg-ice p-3 text-sm"><span className="font-semibold">Your revision request:</span> {r.comment} <span className="text-slate">· {formatDate(r.createdAt, { month: "short", day: "numeric" })}</span></li>)}</ul>
          )}
        </div>
      )}

      <DialogRoot open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent title="Approve for production" description={`${itemName} · Proof V${latest.version}`}>
          <label className="flex cursor-pointer gap-3 rounded-2xl bg-ice p-4">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-electric" />
            <span className="text-sm leading-relaxed">{APPROVAL}</span>
          </label>
          <p className="mt-3 text-xs text-slate">Once approved, this proof version is locked and we produce exactly what it shows.</p>
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
          <Button size="lg" className="mt-5 w-full" disabled={!confirmed || pending} onClick={approve}>{pending ? "Approving…" : "Approve proof"}</Button>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent title="Request a revision" description="Tell us what to change. Be as specific as you like.">
          <label htmlFor="rev-comment" className="text-sm font-semibold">What should we change?</label>
          <Textarea id="rev-comment" className="mt-1.5" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={3000} placeholder="e.g. Make the border navy, enlarge the text, swap the thread color to Pantone 3005" />
          <p className="mb-2 mt-4 text-sm font-semibold">Updated artwork <span className="font-normal text-slate">(optional)</span></p>
          <ArtworkUploader value={artwork} onChange={setArtwork} maxMb={maxUploadMb} compact />
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
          <Button size="lg" className="mt-5 w-full" disabled={comment.trim().length < 3 || pending} onClick={revise}>{pending ? "Sending…" : "Send revision request"}</Button>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
