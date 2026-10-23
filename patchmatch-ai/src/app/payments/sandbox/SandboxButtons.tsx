"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { simulateSandboxAction } from "./actions";

export function SandboxButtons({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const go = (outcome: "PAID" | "FAILED" | "CANCELLED") => start(async () => { await simulateSandboxAction(token, outcome); });
  return (
    <div className="grid gap-2">
      <Button loading={pending} onClick={() => go("PAID")}>Simulate successful payment</Button>
      <Button variant="secondary" disabled={pending} onClick={() => go("FAILED")}>Simulate declined card</Button>
      <Button variant="ghost" disabled={pending} onClick={() => go("CANCELLED")}>Cancel and return</Button>
    </div>
  );
}
