import { cn } from "@/lib/utils";
import { PatchArt } from "@/components/brand/PatchArt";

export function EmptyState({ title, description, action, className, art = "EMBROIDERED" }: { title: string; description?: string; action?: React.ReactNode; className?: string; art?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-3xl border border-dashed border-navy/15 bg-white px-6 py-14 text-center", className)}>
      <div className="w-24 -rotate-6 opacity-90">
        <PatchArt code={art} />
      </div>
      <h3 className="display mt-6 text-3xl text-navy">{title}</h3>
      {description && <p className="mt-2 max-w-md text-slate">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong.", description, action, className }: { title?: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("rounded-3xl border border-danger/20 bg-danger/5 px-6 py-10 text-center", className)}>
      <h3 className="display text-3xl text-navy">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-slate">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-navy/[.07]", className)} aria-hidden />;
}
