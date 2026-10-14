import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Markhor Patches — Custom patches for brands that don't follow the herd";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  const [emblem, font] = await Promise.all([
    readFile(path.join(process.cwd(), "public/brand/markhor-emblem-640.png")),
    readFile(path.join(process.cwd(), "src/app/fonts/barlow-condensed-latin-900-normal.woff")).catch(() => null),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "64px 72px", background: "radial-gradient(circle at 78% 40%, #0A4AD6 0%, #081A36 45%, #050B18 80%)", color: "white", fontFamily: "Barlow" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 10, color: "#0AD2F7", textTransform: "uppercase" }}>Markhor Patches</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 104, lineHeight: 0.9, textTransform: "uppercase", marginTop: 24 }}>
            <span>Custom patches</span>
            <span>for brands that</span>
            <span style={{ color: "#0AD2F7" }}>don&apos;t follow the herd.</span>
          </div>
          <div style={{ marginTop: 36, height: 8, width: 320, background: "linear-gradient(110deg,#0A2A6B,#0A6CF2,#0AD2F7)", borderRadius: 8 }} />
        </div>
        {/* Official emblem at its intrinsic aspect ratio (1209 × 1188) — never stretched */}
        <img src={`data:image/png;base64,${emblem.toString("base64")}`} width={380} height={373} alt="" />
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Barlow", data: font, weight: 900 }] : [] },
  );
}
