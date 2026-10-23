import "server-only";
import sharp from "sharp";

/**
 * Preview generation for raster artwork.
 *  • preview: re-encoded WebP ≤1200px — strips EXIF/GPS/ICC/XMP metadata (sharp drops metadata by default).
 *  • teaser:  tiny, heavily blurred WebP for locked opportunity cards — conveys shape/colour,
 *             not legible text, so brand names in artwork can't identify the buyer before unlock.
 */
export async function generatePreviews(input: Buffer): Promise<{ preview: Buffer; teaser: Buffer; width: number; height: number }> {
  const img = sharp(input, { failOn: "error", limitInputPixels: 80_000_000 }).rotate();
  const meta = await img.metadata();
  const preview = await img.clone().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const teaser = await sharp(input, { failOn: "error", limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: 48, height: 48, fit: "inside" })
    .blur(2.2)
    .resize({ width: 320, height: 320, fit: "inside", kernel: "cubic" })
    .blur(6)
    .webp({ quality: 60 })
    .toBuffer();
  return { preview, teaser, width: meta.width ?? 0, height: meta.height ?? 0 };
}

/** Privacy-preserving artwork statistics for AI/rules analysis (the image itself is never sent anywhere). */
export async function artworkStats(input: Buffer) {
  const img = sharp(input, { failOn: "error", limitInputPixels: 80_000_000 });
  const meta = await img.metadata();
  const { data } = await img.clone().resize(48, 48, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Set<number>();
  for (let i = 0; i + 2 < data.length; i += 3) buckets.add(((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5));
  const distinct = buckets.size;
  return {
    widthPx: meta.width,
    heightPx: meta.height,
    hasTransparency: !!meta.hasAlpha,
    distinctColorsEstimate: distinct,
    colorComplexity: (distinct <= 8 ? "low" : distinct <= 40 ? "medium" : "high") as "low" | "medium" | "high",
  };
}
