import { CheckCircle2, Circle } from "lucide-react";
import { PROJECT_STEPS } from "@/lib/domain/projects";
import { ProjectUpdateForm } from "./ProjectUpdateForm";
import { cn, formatDateTime } from "@/lib/utils";
import type { ProjectStatus } from "@/generated/prisma/client";

type P = { rfqId: string; status: ProjectStatus; isDemo: boolean; events: { id: string; status: ProjectStatus; note: string | null; createdAt: Date }[] };

/** Shared project status board (buyer + manufacturer). Not an order or payment record. */
export function ProjectTracker({ project, audience }: { project: P; audience: "buyer" | "seller" }) {
  const idx = PROJECT_STEPS.findIndex((s) => s.status === project.status);
  const next = PROJECT_STEPS.slice(idx + 1).filter((s) => (audience === "seller" ? !["PROOF_APPROVED", "DELIVERED"].includes(s.status) : ["PROOF_APPROVED", "DELIVERED"].includes(s.status)));
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">Project status {project.isDemo && <span className="ml-1 rounded-full bg-gold/25 px-2 py-0.5 text-[10px] font-bold text-[#7A5A22] uppercase dark:text-gold">Simulated</span>}</p>
          <p className="text-xs text-muted">Updated by the buyer and manufacturer. Payment and delivery terms are agreed directly between you — PatchMatch doesn't process order payments.</p>
        </div>
      </div>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PROJECT_STEPS.map((s, i) => {
          const done = project.status !== "CANCELLED" && i <= idx;
          const ev = project.events.filter((e) => e.status === s.status).at(-1);
          return (
            <li key={s.status} className={cn("rounded-xl border p-3 text-sm", done ? "border-green/40 bg-green/5" : "border-line")}>
              <p className="flex items-center gap-1.5 font-semibold">{done ? <CheckCircle2 className="h-4 w-4 text-green" /> : <Circle className="h-4 w-4 text-muted" />}{s.label}</p>
              <p className="mt-1 text-xs text-muted">{ev ? formatDateTime(ev.createdAt) : s.hint}</p>
              {ev?.note && <p className="mt-1 text-xs">{ev.note}</p>}
            </li>
          );
        })}
      </ol>
      {project.status === "CANCELLED" && <p className="mt-3 text-sm text-danger">This project was cancelled.</p>}
      {next.length > 0 && project.status !== "CANCELLED" && project.status !== "DELIVERED" && <ProjectUpdateForm rfqId={project.rfqId} audience={audience} options={next.map((s) => ({ value: s.status, label: s.label }))} />}
    </section>
  );
}
