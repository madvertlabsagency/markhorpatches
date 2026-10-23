"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import * as RDialog from "@radix-ui/react-dialog";
import * as RTabs from "@radix-ui/react-tabs";
import * as RTooltip from "@radix-ui/react-tooltip";
import { CheckCircle2, Copy, X, XCircle } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

type ButtonVariant = "primary" | "dark" | "secondary" | "ghost" | "danger" | "success" | "outlineLight" | "link";

export function SubmitButton({ children, pendingLabel, className, variant, size, disabled }: { children: React.ReactNode; pendingLabel?: string; className?: string; variant?: ButtonVariant; size?: "sm" | "md" | "lg"; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className={className} variant={variant} size={size} disabled={disabled}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.ok)
    return state.message ? (
      <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success">
        <CheckCircle2 className="h-4 w-4" /> {state.message}
      </p>
    ) : null;
  return (
    <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-danger">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
    </p>
  );
}

/**
 * Standard server-action form: pending state, inline success/error, optional confirm prompt,
 * optional reset on success. Works with any `(prev, formData) => Promise<ActionState>` action.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  confirm,
  className,
  submitVariant,
  submitSize = "md",
  resetOnSuccess,
  footer,
  hideSubmit,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children?: React.ReactNode;
  submitLabel?: React.ReactNode;
  pendingLabel?: string;
  confirm?: string;
  className?: string;
  submitVariant?: "primary" | "dark" | "secondary" | "ghost" | "danger" | "success";
  submitSize?: "sm" | "md" | "lg";
  resetOnSuccess?: boolean;
  footer?: React.ReactNode;
  hideSubmit?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={cn("space-y-4", className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state && !state.ok && state.fieldErrors && Object.keys(state.fieldErrors).length > 1 && (
        <ul className="space-y-1 text-sm text-danger" role="alert">
          {Object.entries(state.fieldErrors).map(([k, v]) => (
            <li key={k}>{v}</li>
          ))}
        </ul>
      )}
      {(!hideSubmit || footer) && (
        <div className="flex flex-wrap items-center gap-3">
          {!hideSubmit && (
            <SubmitButton pendingLabel={pendingLabel} variant={submitVariant} size={submitSize}>
              {submitLabel ?? "Save"}
            </SubmitButton>
          )}
          {footer}
          <FormMessage state={state} />
        </div>
      )}
      {hideSubmit && !footer && <FormMessage state={state} />}
    </form>
  );
}

export function Dialog({ trigger, title, description, children, wide }: { trigger: React.ReactNode; title: string; description?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <RDialog.Root>
      <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm data-[state=open]:animate-in" />
        <RDialog.Content className={cn("fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-lift)]", wide ? "max-w-2xl" : "max-w-lg")}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <RDialog.Title className="font-display text-lg font-semibold">{title}</RDialog.Title>
              {description ? <RDialog.Description className="mt-1 text-sm text-muted">{description}</RDialog.Description> : <RDialog.Description className="sr-only">{title}</RDialog.Description>}
            </div>
            <RDialog.Close className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Close">
              <X className="h-4 w-4" />
            </RDialog.Close>
          </div>
          {children}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function Drawer({ trigger, title, children, side = "right" }: { trigger: React.ReactNode; title: string; children: React.ReactNode; side?: "left" | "right" }) {
  return (
    <RDialog.Root>
      <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm" />
        <RDialog.Content className={cn("fixed top-0 bottom-0 z-50 flex w-[min(22rem,88vw)] flex-col bg-surface shadow-[var(--shadow-lift)]", side === "right" ? "right-0 border-l border-line" : "left-0 border-r border-line")}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <RDialog.Title className="font-display font-semibold">{title}</RDialog.Title>
            <RDialog.Description className="sr-only">{title}</RDialog.Description>
            <RDialog.Close className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Close">
              <X className="h-4 w-4" />
            </RDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function Tabs({ tabs, defaultValue }: { tabs: { value: string; label: React.ReactNode; content: React.ReactNode }[]; defaultValue?: string }) {
  return (
    <RTabs.Root defaultValue={defaultValue ?? tabs[0]?.value}>
      <RTabs.List className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2/60 p-1" aria-label="Sections">
        {tabs.map((t) => (
          <RTabs.Trigger key={t.value} value={t.value} className="rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-muted transition data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-[var(--shadow-card)]">
            {t.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {tabs.map((t) => (
        <RTabs.Content key={t.value} value={t.value}>
          {t.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={200}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content sideOffset={6} className="z-50 max-w-xs rounded-lg bg-navy px-2.5 py-1.5 text-xs text-white shadow-lg">
            {content}
            <RTooltip.Arrow className="fill-navy" />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-electric hover:bg-electric/10"
    >
      <Copy className="h-3 w-3" /> {copied ? "Copied" : label}
    </button>
  );
}
