import { z } from "zod";

export const shapeEnum = z.enum(["CIRCLE", "SQUARE", "RECTANGLE", "SHIELD", "OVAL", "CUSTOM"]);

/** Wire format for a configuration coming from the browser. Prices are NEVER accepted from the client. */
export const configurationInput = z.object({
  patchTypeId: z.string().min(1),
  widthIn: z.coerce.number().positive().max(24),
  heightIn: z.coerce.number().positive().max(24),
  quantity: z.coerce.number().int().positive().max(1_000_000),
  shape: shapeEnum,
  backingId: z.string().min(1).nullable(),
  borderId: z.string().min(1).nullable(),
  extraIds: z.array(z.string().min(1)).max(20).default([]),
  artworkStatus: z.enum(["UPLOADED", "NEEDS_DESIGN_HELP", "SEND_LATER"]).default("SEND_LATER"),
  artworkFileId: z.string().min(1).nullable().optional(),
  notes: z.string().max(2000).optional().nullable(),
  name: z.string().max(120).optional().nullable(),
});

export type ConfigurationInput = z.infer<typeof configurationInput>;

export const contactInput = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
});

export const addressInput = z.object({
  firstName: z.string().trim().min(1, "Required").max(80),
  lastName: z.string().trim().min(1, "Required").max(80),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  line1: z.string().trim().min(3, "Enter a street address").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter a city").max(100),
  state: z.string().trim().length(2, "Choose a state"),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
  country: z.literal("US").default("US"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export type AddressInput = z.infer<typeof addressInput>;
