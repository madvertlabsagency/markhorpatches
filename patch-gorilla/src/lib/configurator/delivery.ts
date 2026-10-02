/** Business-day arithmetic for delivery estimates (US, weekends excluded; holidays ignored). */

export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export interface DeliveryEstimateInput {
  productionDays: number;
  rushProductionDays: number;
  rush: boolean;
  /** Days to produce and approve a proof before production starts. */
  proofDays?: number;
  transitDaysMin: number;
  transitDaysMax: number;
  from?: Date;
}

export function estimateDelivery(i: DeliveryEstimateInput) {
  const production = i.rush ? i.rushProductionDays : i.productionDays;
  const proof = i.proofDays ?? 1;
  const from = i.from ?? new Date();
  const shipDate = addBusinessDays(from, proof + production);
  return {
    productionDays: production,
    shipDate,
    earliest: addBusinessDays(shipDate, i.transitDaysMin),
    latest: addBusinessDays(shipDate, i.transitDaysMax),
    totalBusinessDaysMax: proof + production + i.transitDaysMax,
  };
}
