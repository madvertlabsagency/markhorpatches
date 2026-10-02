import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Patch Gorilla — Custom patches for bold brands";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  const [logo, font] = await Promise.all([
    readFile(path.join(process.cwd(), "public/brand/logo-horizontal-reverse.png")),
    readFile(path.join(process.cwd(), "src/app/fonts/barlow-condensed-latin-900-normal.woff")).catch(() => null),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "radial-gradient(circle at 80% 20%, #0755B9 0%, #020B1D 60%)", color: "white" }}>
        <img src={`data:image/png;base64,${logo.toString("base64")}`} width={360} height={74} alt="" />
        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Barlow", fontSize: 120, lineHeight: 0.9, textTransform: "uppercase" }}>
          <span>Custom patches</span>
          <span style={{ background: "linear-gradient(110deg,#1f8bff,#08D8D8)", backgroundClip: "text", color: "transparent" }}>for bold brands.</span>
        </div>
        <div style={{ height: 8, width: 360, background: "linear-gradient(110deg,#06347E,#087CCB,#08D8D8)", borderRadius: 8 }} />
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Barlow", data: font, weight: 900 }] : [] },
  );
}
