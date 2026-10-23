"use client";

import { ActionForm } from "@/components/ui/client";
import { Card, CardHeader } from "@/components/ui/primitives";
import { Checkbox, Field, Input } from "@/components/ui/fields";
import { buyerSettingsAction, marketingConsentAction } from "@/app/actions/buyer";

export function BuyerSettingsForms({ name, phone, companyName, marketing }: { name: string; phone: string; companyName: string; marketing: boolean }) {
  return (
    <>
      <Card>
        <CardHeader title="Profile" />
        <div className="p-5">
          <ActionForm action={buyerSettingsAction}>
            <Field id="name" label="Full name"><Input id="name" name="name" defaultValue={name} required /></Field>
            <Field id="companyName" label="Company" optional><Input id="companyName" name="companyName" defaultValue={companyName} /></Field>
            <Field id="phone" label="Phone" optional><Input id="phone" name="phone" defaultValue={phone} /></Field>
          </ActionForm>
        </div>
      </Card>
      <Card>
        <CardHeader title="Email preferences" description="Transactional emails about your requests are always sent." />
        <div className="p-5">
          <ActionForm action={marketingConsentAction} submitLabel="Save preference">
            <Checkbox id="marketing" name="marketing" defaultChecked={marketing} label="Occasional tips and offers from PatchMatch AI" />
          </ActionForm>
        </div>
      </Card>
    </>
  );
}
