// Turns a submission into a checked order: product and every answer must exist in the catalog,
// required steps must be answered, and the estimate is recalculated here, never trusted from the browser.
import { estimate, getProduct, quantityBracket, type Answers, type Estimate, type Product } from './catalog';

export type OrderLine = { k: string; v: string };
export type CheckedOrder = {
  product: Product;
  quantity: number;
  answers: Answers;
  lines: OrderLine[]; // "Shape: Circle" style lines in EP-CF's step order
  estimate: Estimate;
  size: string | null;
  backing: string | null;
  turnaround: string | null;
  bracket: string;
};

export function checkOrder(slug: string, quantity: number, raw: Record<string, string>): { ok: true; order: CheckedOrder } | { ok: false; error: string } {
  const product = getProduct(slug);
  if (!product) return { ok: false, error: 'Choose a patch type to continue.' };
  if (quantity < product.qtyMin || quantity > product.qtyMax) {
    return { ok: false, error: `Enter a quantity between ${product.qtyMin} and ${product.qtyMax.toLocaleString('en-US')}.` };
  }
  const answers: Answers = {};
  const lines: OrderLine[] = [{ k: 'Patch type', v: product.title }];
  let size: string | null = null;
  let backing: string | null = null;
  let turnaround: string | null = null;
  for (const step of product.steps) {
    if (step.kind === 'quantity') {
      lines.push({ k: 'Quantity', v: `${quantity.toLocaleString('en-US')} pcs` });
      continue;
    }
    if (step.kind === 'upload') continue;
    const option = step.options?.find((o) => o.id === raw[step.id]);
    if (!option) return { ok: false, error: `Answer "${step.question}" to continue.` };
    answers[step.id] = option.id;
    const label = step.kind === 'turnaround' ? `${option.label} (${option.note})` : option.label;
    lines.push({ k: stepLabel(step.source), v: label });
    if (step.kind === 'size') size = option.label;
    if (/backing/i.test(step.source)) backing = option.label;
    if (step.kind === 'turnaround') turnaround = label;
  }
  return { ok: true, order: { product, quantity, answers, lines, estimate: estimate(product, answers, quantity), size, backing, turnaround, bracket: quantityBracket(quantity) } };
}

// "Select Patch Border" -> "Patch border"
export function stepLabel(source: string): string {
  const t = source.replace(/^select\s+(select\s+)?(or enter\s+)?/i, '').trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
