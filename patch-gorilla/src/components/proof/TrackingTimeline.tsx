import { Check } from "lucide-react";
import type { OrderStatus } from "@/generated/prisma/enums";
import { TRACKING_STEPS, trackingStepIndex } from "@/lib/orders/status";
import { formatDate, cn } from "@/lib/utils";

/** Customer-facing progress. Uses the furthest step ever reached (history) so detours like revisions don't move it backwards. */
export function TrackingTimeline({ status, events, dark }: { status: OrderStatus; events: { status: OrderStatus; createdAt: Date; note?: string | null }[]; dark?: boolean }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return <p className="rounded-2xl bg-danger/5 p-4 font-semibold text-danger">This order was {status === "CANCELLED" ? "cancelled" : "refunded"}.</p>;
  }
  const reached = Math.max(trackingStepIndex(status), ...events.map((e) => trackingStepIndex(e.status)));
  const when = (idx: number) => events.find((e) => trackingStepIndex(e.status) === idx)?.createdAt;
  return (
    <ol className="relative space-y-0" aria-label="Order progress">
      {TRACKING_STEPS.map((s, i) => {
        const done = i < reached || (i === reached && (status === "DELIVERED" || i === 0));
        const current = i === reached && !done;
        const at = when(i);
        return (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0" aria-current={current ? "step" : undefined}>
            {i < TRACKING_STEPS.length - 1 && <span className={cn("absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5", i < reached ? "bg-signature" : dark ? "bg-white/10" : "bg-navy/10")} aria-hidden />}
            <span className={cn("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold", done ? "bg-signature text-white" : current ? "bg-white text-patch ring-4 ring-electric/30" : dark ? "bg-white/10 text-white/50" : "bg-ice text-slate")}>
              {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              {current && <span className="absolute inset-0 animate-ping rounded-full bg-electric/30" aria-hidden />}
            </span>
            <div className="pt-1">
              <p className={cn("font-semibold", !done && !current && (dark ? "text-white/50" : "text-slate"))}>{s.label}{current && <span className="ml-2 text-xs font-bold uppercase tracking-wider text-electric">In progress</span>}</p>
              {at && (done || current) && <p className={cn("text-xs", dark ? "text-white/50" : "text-slate")}>{formatDate(at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
