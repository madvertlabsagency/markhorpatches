/**
 * Shipping & tax adapter. Default: admin-configured flat rates.
 * Swap `rates()` for a carrier API (Shippo, EasyPost, ShipStation) without touching checkout.
 */
import type { Settings } from "@/lib/settings-schema";

export type ShippingMethodCode = "standard" | "expedited";

export interface ShippingRate {
  code: ShippingMethodCode;
  label: string;
  cents: number;
  transitMin: number;
  transitMax: number;
}

export function shippingRates(settings: Settings["shipping"], merchandiseCents: number): ShippingRate[] {
  const freeStandard = settings.freeThresholdCents > 0 && merchandiseCents >= settings.freeThresholdCents;
  return [
    { code: "standard", label: freeStandard ? "Standard (free)" : "Standard", cents: freeStandard ? 0 : settings.standardCents, transitMin: settings.standardTransitMin, transitMax: settings.standardTransitMax },
    { code: "expedited", label: "Expedited", cents: settings.expeditedCents, transitMin: settings.expeditedTransitMin, transitMax: settings.expeditedTransitMax },
  ];
}

export function taxRateBps(settings: Settings["tax"], state: string | null | undefined): number {
  if (settings.mode !== "flat_by_state" || !state) return 0;
  return settings.ratesBps[state.toUpperCase()] ?? 0;
}

export function trackingUrlFor(carrier: string, tracking: string): string | null {
  const t = encodeURIComponent(tracking);
  switch (carrier.toLowerCase()) {
    case "ups":
      return `https://www.ups.com/track?tracknum=${t}`;
    case "usps":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
    case "dhl":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${t}`;
    default:
      return null;
  }
}

export const US_STATES: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"],
  ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];
