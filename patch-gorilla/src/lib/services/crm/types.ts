export type CrmEventType =
  | "free_mockup_submitted"
  | "quote_submitted"
  | "configurator_abandoned"
  | "checkout_started"
  | "order_placed"
  | "proof_ready"
  | "proof_approved"
  | "support_request";

export interface CrmContact {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  company?: string | null;
}

/** Custom fields mirrored into the CRM (keys match GHL custom field keys). */
export interface CrmCustomFields {
  patch_type?: string;
  patch_size?: string;
  quantity?: number | string;
  backing?: string;
  border?: string;
  estimated_order_value?: string;
  artwork_url?: string;
  lead_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  current_order_status?: string;
}

export interface CrmEventPayload {
  type: CrmEventType;
  contact: CrmContact;
  fields: CrmCustomFields;
  orderId?: string;
  orderNumber?: string;
  valueCents?: number;
}

export interface CrmAdapter {
  readonly name: string;
  readonly enabled: boolean;
  deliver(event: CrmEventPayload, ctx: { existingOpportunityId?: string | null }): Promise<{ contactId?: string; opportunityId?: string }>;
}
