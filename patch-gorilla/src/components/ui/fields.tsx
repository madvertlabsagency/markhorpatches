import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full min-w-0 rounded-xl border border-line bg-white px-4 text-base text-navy placeholder:text-slate/60 transition-colors focus:border-electric focus:outline-none focus:ring-4 focus:ring-electric/15 disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(base, "h-12", className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(base, "min-h-28 py-3 leading-relaxed", className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return (
    <select ref={ref} className={cn(base, "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%23536276%22 stroke-width=%221.6%22 fill=%22none%22/></svg>')] bg-[right_1rem_center] bg-no-repeat pr-10", className)} {...p}>
      {children}
    </select>
  );
});

export function Field({ label, htmlFor, error, hint, required, children, className }: { label: string; htmlFor: string; error?: string | null; hint?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy">
        {label}
        {required ? <span className="text-electric" aria-hidden> *</span> : <span className="ml-1 font-normal text-slate">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate" id={`${htmlFor}-hint`}>{hint}</p>}
      {error && (
        <p role="alert" id={`${htmlFor}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ id, label, className, ...p }: { id: string; label: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3 text-sm text-navy/80", className)}>
      <input id={id} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-electric" {...p} />
      <span>{label}</span>
    </label>
  );
}
