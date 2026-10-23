import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui/primitives";
import { RoleForms } from "@/components/admin/RoleForms";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  await requireAdmin("roles:manage");
  const [staff, grants] = await Promise.all([
    prisma.user.findMany({ where: { platformRole: { not: "NONE" } }, orderBy: { platformRole: "asc" } }),
    prisma.roleGrant.findMany(),
  ]);
  const roles = Object.keys(ROLE_PERMISSIONS).filter((r) => r !== "NONE") as (keyof typeof ROLE_PERMISSIONS)[];
  return (
    <>
      <PageHeader title="Roles & permissions" description="Platform roles are defined in code and reviewed with it; custom grants add individual permissions. Role changes sign the user out." />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card><CardHeader title="Staff" />
          <ul className="divide-y divide-line text-sm">{staff.map((u) => <li key={u.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5"><span className="flex-1">{u.email}</span><Badge tone="dark">{u.platformRole}</Badge><Badge tone={u.mfaEnabledAt ? "green" : "red"}>{u.mfaEnabledAt ? "MFA on" : "MFA off"}</Badge>{grants.filter((g) => g.userId === u.id).map((g) => <Badge key={g.id} tone="blue">+{g.permission}</Badge>)}<span className="text-xs text-muted">last login {formatDate(u.lastLoginAt)}</span></li>)}</ul>
        </Card>
        <Card><CardHeader title="Assign role / grant permission" /><div className="p-5"><RoleForms permissions={[...PERMISSIONS]} /></div></Card>
      </div>
      <Card className="mt-6 overflow-x-auto"><CardHeader title="Permission matrix" />
        <table className="w-full min-w-[700px] text-xs">
          <thead><tr className="border-b border-line"><th className="px-3 py-2 text-left">Permission</th>{roles.map((r) => <th key={r} className="px-2 py-2">{r}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{PERMISSIONS.map((p) => <tr key={p}><td className="px-3 py-1.5 font-mono">{p}</td>{roles.map((r) => <td key={r} className="text-center">{ROLE_PERMISSIONS[r].includes(p) ? "✓" : ""}</td>)}</tr>)}</tbody>
        </table>
      </Card>
    </>
  );
}
