"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/ui/client";
import { Badge } from "@/components/ui/primitives";
import { Input, Select } from "@/components/ui/fields";
import { inviteMemberAction, memberAction, revokeInviteAction } from "@/app/actions/seller";

export function TeamManager({ canManage, currentUserId, members, invites }: { canManage: boolean; currentUserId: string; members: { id: string; userId: string; name: string | null; email: string; role: string }[]; invites: { id: string; email: string; role: string }[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const act = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });
  return (
    <div>
      <ul className="divide-y divide-line">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <div className="min-w-0 flex-1"><p className="font-medium">{m.name ?? m.email}</p><p className="text-xs text-muted">{m.email}</p></div>
            <Badge tone={m.role === "OWNER" ? "dark" : m.role === "ADMIN" ? "blue" : "neutral"}>{m.role.toLowerCase()}</Badge>
            {canManage && m.role !== "OWNER" && m.userId !== currentUserId && (
              <div className="flex gap-2 text-xs font-semibold">
                <button className="text-electric" onClick={() => act(() => memberAction(m.id, m.role === "ADMIN" ? "MAKE_MEMBER" : "MAKE_ADMIN"))}>{m.role === "ADMIN" ? "Make member" : "Make admin"}</button>
                <button className="text-danger" onClick={() => window.confirm("Remove this member?") && act(() => memberAction(m.id, "REMOVE"))}>Remove</button>
              </div>
            )}
          </li>
        ))}
        {invites.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-5 py-3 text-sm text-muted">
            <span className="flex-1">{i.email}</span><Badge tone="amber">invited · {i.role.toLowerCase()}</Badge>
            {canManage && <button className="text-xs font-semibold text-danger" onClick={() => act(() => revokeInviteAction(i.id))}>Revoke</button>}
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="border-t border-line p-5">
          <ActionForm action={inviteMemberAction} submitLabel="Send invitation" resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end sm:space-y-0">
            <label className="text-sm font-medium">Email<Input name="email" type="email" required className="mt-1" /></label>
            <label className="text-sm font-medium">Role<Select name="role" className="mt-1"><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></Select></label>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
