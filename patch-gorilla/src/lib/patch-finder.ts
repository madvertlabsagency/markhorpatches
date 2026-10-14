/** Patch Finder scoring — pure and unit-tested. Returns patch type codes ranked best-first with reasons. */

export type Answers = {
  placement?: "hats" | "apparel" | "bags" | "uniforms" | "jackets";
  detail?: "simple" | "moderate" | "fine" | "photo";
  environment?: "indoor" | "outdoor";
  texture?: "stitched" | "flat" | "rubber" | "fuzzy" | "leather" | "raised";
  budget?: "value" | "balanced" | "premium";
  quantity?: "small" | "medium" | "large";
};

export const QUESTIONS: { key: keyof Answers; q: string; options: { value: string; label: string; hint?: string }[] }[] = [
  { key: "placement", q: "What is it going on?", options: [{ value: "hats", label: "Hats" }, { value: "apparel", label: "T-shirts & hoodies" }, { value: "jackets", label: "Jackets" }, { value: "uniforms", label: "Uniforms & workwear" }, { value: "bags", label: "Bags & gear" }] },
  { key: "detail", q: "How detailed is the artwork?", options: [{ value: "simple", label: "Simple & bold", hint: "Few colors, thick lines" }, { value: "moderate", label: "Moderate" }, { value: "fine", label: "Fine detail", hint: "Small text, thin lines" }, { value: "photo", label: "Photo or gradients" }] },
  { key: "environment", q: "Indoor or outdoor?", options: [{ value: "indoor", label: "Mostly indoor / everyday" }, { value: "outdoor", label: "Outdoor, wet or rugged" }] },
  { key: "texture", q: "What texture do you want?", options: [{ value: "stitched", label: "Classic stitched" }, { value: "flat", label: "Flat & smooth" }, { value: "rubber", label: "Soft rubber" }, { value: "fuzzy", label: "Fuzzy varsity" }, { value: "leather", label: "Premium leather" }, { value: "raised", label: "Raised / 3D" }] },
  { key: "budget", q: "Budget priority?", options: [{ value: "value", label: "Best value" }, { value: "balanced", label: "Balanced" }, { value: "premium", label: "Premium look" }] },
  { key: "quantity", q: "Roughly how many?", options: [{ value: "small", label: "Under 50" }, { value: "medium", label: "50–300" }, { value: "large", label: "300+" }] },
];

type Code = "EMBROIDERED" | "WOVEN" | "PVC" | "CHENILLE" | "LEATHER" | "PRINTED" | "PUFF_3D";
const ALL: Code[] = ["EMBROIDERED", "WOVEN", "PVC", "CHENILLE", "LEATHER", "PRINTED", "PUFF_3D"];

export function recommend(a: Answers): { code: Code; score: number; reasons: string[] }[] {
  const s: Record<Code, { score: number; reasons: string[] }> = Object.fromEntries(ALL.map((c) => [c, { score: c === "EMBROIDERED" ? 1 : 0, reasons: [] }])) as never;
  const add = (c: Code, n: number, why?: string) => {
    s[c].score += n;
    if (why && n > 0) s[c].reasons.push(why);
  };

  switch (a.texture) {
    case "stitched": add("EMBROIDERED", 6, "Classic stitched texture"); add("PUFF_3D", 2); break;
    case "flat": add("WOVEN", 5, "Flat, smooth finish"); add("PRINTED", 4, "Smooth printed surface"); break;
    case "rubber": add("PVC", 7, "Soft rubber feel"); break;
    case "fuzzy": add("CHENILLE", 8, "Varsity-style fuzzy texture"); break;
    case "leather": add("LEATHER", 8, "Premium leather label"); break;
    case "raised": add("PUFF_3D", 6, "Raised, dimensional look"); add("PVC", 3, "3D molded layers"); break;
  }
  switch (a.detail) {
    case "fine": add("WOVEN", 6, "Holds fine detail and small text"); add("PRINTED", 3); add("CHENILLE", -4); add("PUFF_3D", -3); break;
    case "photo": add("PRINTED", 8, "Reproduces photos and gradients"); add("WOVEN", 2); add("CHENILLE", -5); add("PVC", -3); break;
    case "simple": add("CHENILLE", 2); add("PUFF_3D", 2); add("PVC", 2); add("EMBROIDERED", 1); break;
    case "moderate": add("EMBROIDERED", 2, "Handles moderate detail well"); break;
  }
  if (a.environment === "outdoor") { add("PVC", 6, "Waterproof and weather resistant"); add("CHENILLE", -3); add("LEATHER", -1); }
  switch (a.placement) {
    case "hats": add("LEATHER", 3, "A hat favorite"); add("PUFF_3D", 3, "Pops on hat fronts"); add("WOVEN", 1); break;
    case "jackets": add("CHENILLE", 3, "Made for jackets"); add("EMBROIDERED", 2); break;
    case "uniforms": add("EMBROIDERED", 3, "Durable for daily wear"); add("WOVEN", 2); break;
    case "bags": add("PVC", 3, "Tough enough for gear"); break;
    case "apparel": add("EMBROIDERED", 2); add("WOVEN", 1); break;
  }
  if (a.budget === "value") { add("PRINTED", 2, "Great value"); add("WOVEN", 2, "Great value"); add("LEATHER", -2); add("PVC", -1); }
  if (a.budget === "premium") { add("LEATHER", 2); add("CHENILLE", 1); add("PUFF_3D", 1); }
  if (a.quantity === "small") { add("PVC", -2); add("EMBROIDERED", 1, "Low minimums"); add("PRINTED", 1); }
  if (a.quantity === "large") add("PVC", 1);

  return ALL.map((code) => ({ code, score: s[code].score, reasons: Array.from(new Set(s[code].reasons)) })).sort((x, y) => y.score - x.score);
}
