"use client";
import { useActionState } from "react";
import { addressAction, changePasswordAction, updateProfileAction, type FormState } from "@/app/actions/auth";
import { Checkbox, Field, Input, Select } from "@/components/ui/fields";
import { Button } from "@/components/ui/Button";
import { US_STATES } from "@/lib/services/shipping";

function Msg({ s }: { s: FormState }) {
  return s?.error ? <p role="alert" className="text-sm text-danger">{s.error}</p> : s?.success ? <p role="status" className="text-sm text-success">{s.success}</p> : null;
}

export function ProfileForm({ c }: { c: { firstName: string; lastName: string; phone: string; company: string; marketingConsent: boolean } }) {
  const [s, a, p] = useActionState(updateProfileAction, undefined);
  return (
    <form action={a} className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" htmlFor="pf-fn"><Input id="pf-fn" name="firstName" defaultValue={c.firstName} /></Field>
      <Field label="Last name" htmlFor="pf-ln"><Input id="pf-ln" name="lastName" defaultValue={c.lastName} /></Field>
      <Field label="Phone" htmlFor="pf-ph"><Input id="pf-ph" name="phone" type="tel" defaultValue={c.phone} /></Field>
      <Field label="Company" htmlFor="pf-co"><Input id="pf-co" name="company" defaultValue={c.company} /></Field>
      <Checkbox id="pf-mk" name="marketingConsent" defaultChecked={c.marketingConsent} label="Email me patch ideas and offers" className="sm:col-span-2" />
      <div className="flex items-center gap-4 sm:col-span-2"><Button size="sm" variant="dark" disabled={p}>Save profile</Button><Msg s={s} /></div>
    </form>
  );
}

export function PasswordForm() {
  const [s, a, p] = useActionState(changePasswordAction, undefined);
  return (
    <form action={a} className="grid gap-4 sm:grid-cols-2">
      <Field label="Current password" htmlFor="pw-c" required error={s?.fieldErrors?.current}><Input id="pw-c" name="current" type="password" autoComplete="current-password" required /></Field>
      <Field label="New password" htmlFor="pw-n" required error={s?.fieldErrors?.password}><Input id="pw-n" name="password" type="password" autoComplete="new-password" minLength={10} required /></Field>
      <div className="flex items-center gap-4 sm:col-span-2"><Button size="sm" variant="dark" disabled={p}>Update password</Button><Msg s={s} /></div>
    </form>
  );
}

export function AddressForm() {
  const [s, a, p] = useActionState(addressAction, undefined);
  const fe = s?.fieldErrors ?? {};
  return (
    <form action={a} className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" htmlFor="ad-fn" required error={fe.firstName}><Input id="ad-fn" name="firstName" required /></Field>
      <Field label="Last name" htmlFor="ad-ln" required error={fe.lastName}><Input id="ad-ln" name="lastName" required /></Field>
      <Field label="Address" htmlFor="ad-l1" required error={fe.line1} className="sm:col-span-2"><Input id="ad-l1" name="line1" required /></Field>
      <Field label="Apt / suite" htmlFor="ad-l2" className="sm:col-span-2"><Input id="ad-l2" name="line2" /></Field>
      <Field label="City" htmlFor="ad-city" required error={fe.city}><Input id="ad-city" name="city" required /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="State" htmlFor="ad-st" required error={fe.state}><Select id="ad-st" name="state" required><option value="">—</option>{US_STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</Select></Field>
        <Field label="ZIP" htmlFor="ad-zip" required error={fe.postalCode}><Input id="ad-zip" name="postalCode" required /></Field>
      </div>
      <input type="hidden" name="country" value="US" />
      <Checkbox id="ad-def" name="isDefault" label="Make this my default address" className="sm:col-span-2" />
      <div className="flex items-center gap-4 sm:col-span-2"><Button size="sm" variant="dark" disabled={p}>Save address</Button><Msg s={s} /></div>
    </form>
  );
}
