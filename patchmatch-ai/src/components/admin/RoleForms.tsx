"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Input, Select } from "@/components/ui/fields";
import { grantPermissionAction, setRoleAction } from "@/app/admin/actions";

export function RoleForms({ permissions }: { permissions: string[] }) {
  return (
    <div className="space-y-6">
      <ActionForm action={setRoleAction} submitLabel="Set role" confirm="Change this user's platform role? They will be signed out.">
        <Field id="email" label="User email"><Input id="email" name="email" type="email" required /></Field>
        <Field id="role" label="Role"><Select id="role" name="role"><option value="SUPPORT">Support</option><option value="REVIEWER">Reviewer</option><option value="FINANCE">Finance</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super admin</option><option value="NONE">Remove staff access</option></Select></Field>
      </ActionForm>
      <div className="border-t border-line pt-5">
        <ActionForm action={grantPermissionAction} submitLabel="Grant permission" submitVariant="secondary">
          <Field id="gemail" label="Staff email"><Input id="gemail" name="email" type="email" required /></Field>
          <Field id="permission" label="Permission"><Select id="permission" name="permission">{permissions.map((p) => <option key={p}>{p}</option>)}</Select></Field>
        </ActionForm>
      </div>
    </div>
  );
}
