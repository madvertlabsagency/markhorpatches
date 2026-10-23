"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/client";
import { Input } from "@/components/ui/fields";
import { matchingConfigAction } from "@/app/admin/actions";

export function MatchingConfigForm({ weights, minScore, maxNotified }: { weights: Record<string, number>; minScore: number; maxNotified: number }) {
  const [w, setW] = useState(weights);
  const total = Object.values(w).reduce((a, b) => a + (Number(b) || 0), 0);
  return (
    <ActionForm action={matchingConfigAction} submitLabel="Activate new version" confirm="Activate this configuration for all future matching runs?">
      <div className="grid grid-cols-2 gap-3">
        {Object.keys(weights).map((k) => (
          <label key={k} className="text-xs font-medium capitalize text-muted">{k}<Input name={k} inputMode="numeric" value={w[k]} onChange={(e) => setW((s) => ({ ...s, [k]: Number(e.target.value.replace(/\D/g, "")) }))} className="tabular mt-1 h-9" /></label>
        ))}
        <label className="text-xs font-medium text-muted">Min score<Input name="minScore" inputMode="numeric" defaultValue={minScore} className="tabular mt-1 h-9" /></label>
        <label className="text-xs font-medium text-muted">Max notified<Input name="maxNotified" inputMode="numeric" defaultValue={maxNotified} className="tabular mt-1 h-9" /></label>
      </div>
      <p className={total === 100 ? "text-sm text-success" : "text-sm text-danger"}>Total weight: {total}/100</p>
    </ActionForm>
  );
}
