import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-fg shadow-[var(--shadow-card)] transition placeholder:text-muted/70 hover:border-muted/40 focus:border-electric focus:ring-3 focus:ring-electric/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, "min-h-24 py-2.5", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(control, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235B6B80%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[position:right_0.9rem_center] bg-no-repeat pr-9", className)} {...props}>
      {children}
    </select>
  );
});

export function Label({ htmlFor, children, optional, className }: { htmlFor?: string; children: React.ReactNode; optional?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-sm font-medium text-fg", className)}>
      {children}
      {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
    </label>
  );
}

export function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-muted">{children}</p>;
}

/** Label + control + hint + error with correct aria wiring. */
export function Field({ id, label, optional, hint, error, children, className }: { id: string; label: React.ReactNode; optional?: boolean; hint?: React.ReactNode; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      {children}
      {hint && !error && <Hint>{hint}</Hint>}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

export function Checkbox({ id, label, description, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3 text-sm", className)}>
      <input id={id} type="checkbox" className="mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer rounded border-line accent-electric" {...props} />
      <span>
        <span className="font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-muted">{description}</span>}
      </span>
    </label>
  );
}

/** Large selectable card (radio/checkbox) used in the RFQ wizard and settings. */
export function ChoiceCard({ selected, onSelect, title, description, icon, className, type = "radio", disabled }: { selected: boolean; onSelect: () => void; title: React.ReactNode; description?: React.ReactNode; icon?: React.ReactNode; className?: string; type?: "radio" | "checkbox"; disabled?: boolean }) {
  return (
    <button
      type="button"
      role={type}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border bg-surface p-4 text-left transition-all duration-200",
        selected ? "border-electric shadow-[0_0_0_3px_rgb(0_180_255/0.15)]" : "border-line hover:border-electric/40 hover:bg-surface-2/60",
        disabled && "opacity-50",
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
      </span>
      <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 transition", type === "radio" ? "rounded-full" : "rounded-md", selected ? "border-electric bg-electric" : "border-line")} aria-hidden>
        {selected && <span className={cn("bg-navy", type === "radio" ? "h-1.5 w-1.5 rounded-full" : "h-2 w-2 rounded-sm")} />}
      </span>
    </button>
  );
}
