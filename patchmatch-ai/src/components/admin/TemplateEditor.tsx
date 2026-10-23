"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/client";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/fields";
import { saveTemplateAction } from "@/app/admin/actions";

type T = { key: string; description: string; variables: string[]; override: { subject: string; body: string; active: boolean } | null };

export function TemplateEditor({ templates }: { templates: T[] }) {
  const [key, setKey] = useState(templates[0]?.key);
  const t = templates.find((x) => x.key === key)!;
  return (
    <div className="space-y-4">
      <Select value={key} onChange={(e) => setKey(e.target.value)} aria-label="Template">{templates.map((x) => <option key={x.key} value={x.key}>{x.key} — {x.description}{x.override?.active ? " (overridden)" : ""}</option>)}</Select>
      <p className="text-xs text-muted">Variables: {t.variables.map((v) => `{{${v}}}`).join(", ")}</p>
      <ActionForm key={key} action={saveTemplateAction} submitLabel="Save template">
        <input type="hidden" name="key" value={key} />
        <Field id="subject" label="Subject"><Input id="subject" name="subject" defaultValue={t.override?.subject ?? ""} required /></Field>
        <Field id="body" label="Body (plain text, blank line = paragraph)"><Textarea id="body" name="body" rows={6} defaultValue={t.override?.body ?? ""} required /></Field>
        <Checkbox id="active" name="active" defaultChecked={t.override?.active ?? false} label="Use this override" />
      </ActionForm>
    </div>
  );
}
