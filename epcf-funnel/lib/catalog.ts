// EP-CF patch catalog: every product, its questions in EP-CF's order, the options and price tiers.
// Generated from ep-cf.com by scripts/build-catalog.mjs (see docs/EPCF-CATALOG.md). Shared by the
// browser (configurator) and the server (validation and the estimate saved with the lead).
import data from './catalog.json';

export type Option = {
  id: string;
  label: string;
  note?: string;
  img?: string | null;
  price: number; // added per piece
  setup: number; // one time setup fee
  discount?: number; // turnaround discount in percent
  mm?: string | null; // size options
  tiers?: [number, number, number][]; // size options: [min qty, max qty, unit price]
};

// Funnel phases used for analytics: 1 product, 2 quantity, 3 size, 4 style options, 5 artwork, 6 turnaround, 7 contact.
export type Step = {
  id: string;
  phase: number;
  kind: 'quantity' | 'size' | 'single' | 'upload' | 'turnaround';
  question: string;
  help: string;
  source: string; // EP-CF's own step title
  options?: Option[];
  min?: number;
  max?: number;
};

export type Product = {
  slug: string;
  name: string;
  title: string;
  blurb: string;
  badge: string | null;
  img: string;
  basePrice: number;
  from: number;
  qtyMin: number;
  qtyMax: number;
  discountMinQty: number;
  moldFee: number;
  steps: Step[];
};

export const CATALOG = data as unknown as { capturedAt: string; source: string; products: Product[] };
export const PRODUCTS = CATALOG.products;

export function getProduct(slug: string | null | undefined): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

// answers: step id -> option id. quantity is separate.
export type Answers = Record<string, string>;

export function selectedOptions(p: Product, answers: Answers): { step: Step; option: Option }[] {
  const out: { step: Step; option: Option }[] = [];
  for (const step of p.steps) {
    const id = answers[step.id];
    const option = id ? step.options?.find((o) => o.id === id) : undefined;
    if (option) out.push({ step, option });
  }
  return out;
}

export type Estimate = { unit: number; subtotal: number; setup: number; discountPct: number; discount: number; total: number; tierLabel: string | null; nextTier: { qty: number; unit: number } | null };

// Same formula as EP-CF's configurator: size tier price for the quantity, plus each option's per piece
// price, times quantity, plus setup fees; the turnaround discount applies from the discount minimum.
export function estimate(p: Product, answers: Answers, quantity: number): Estimate {
  const picks = selectedOptions(p, answers);
  const size = picks.find((x) => x.step.kind === 'size')?.option;
  const tiers = size?.tiers || [];
  const tier = tiers.find(([min, max]) => quantity >= min && quantity <= max) || (tiers.length ? tiers[tiers.length - 1] : null);
  const base = tier ? tier[2] : p.basePrice;
  const extra = picks.reduce((t, x) => t + (x.option.price || 0), 0);
  const unit = base + extra;
  const setup = picks.reduce((t, x) => t + (x.option.setup || 0), 0);
  const subtotal = unit * quantity + setup;
  const turn = picks.find((x) => x.step.kind === 'turnaround')?.option;
  const discountPct = quantity >= p.discountMinQty ? turn?.discount || 0 : 0;
  const discount = subtotal * (discountPct / 100);
  const next = tier ? tiers.find(([min]) => min > tier[1]) : null;
  return {
    unit,
    subtotal,
    setup,
    discountPct,
    discount,
    total: subtotal - discount + (p.moldFee || 0),
    tierLabel: tier ? `${tier[0].toLocaleString('en-US')} to ${tier[1].toLocaleString('en-US')} pcs` : null,
    nextTier: next ? { qty: next[0], unit: next[2] + extra } : null,
  };
}

// The quantity brackets the lead score and the GHL fields already use.
export function quantityBracket(q: number): string {
  if (q >= 1000) return '1,000+';
  if (q >= 500) return '500 to 999';
  if (q >= 250) return '250 to 499';
  if (q >= 100) return '100 to 249';
  if (q >= 50) return '50 to 99';
  if (q >= 25) return '25 to 49';
  return '10 to 24';
}

export const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
