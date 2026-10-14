import { describe, expect, it } from "vitest";
import { recommend } from "@/lib/patch-finder";

describe("patch finder", () => {
  it("fine detail → woven", () => expect(recommend({ detail: "fine", texture: "flat" })[0].code).toBe("WOVEN"));
  it("classic stitched → embroidered", () => expect(recommend({ texture: "stitched", detail: "moderate" })[0].code).toBe("EMBROIDERED"));
  it("outdoor → PVC", () => expect(recommend({ environment: "outdoor", placement: "bags" })[0].code).toBe("PVC"));
  it("varsity texture → chenille", () => expect(recommend({ texture: "fuzzy", placement: "jackets" })[0].code).toBe("CHENILLE"));
  it("premium apparel label → leather", () => expect(recommend({ texture: "leather", placement: "hats", budget: "premium" })[0].code).toBe("LEATHER"));
  it("photos → printed", () => expect(recommend({ detail: "photo" })[0].code).toBe("PRINTED"));
  it("always returns every type so users can override", () => expect(recommend({})).toHaveLength(7));
});
