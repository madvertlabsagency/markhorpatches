import Image from "next/image";
import { BeforeAfterSlider } from "@/components/ui/BeforeAfterSlider";

/** Pixels → patch comparison. Left: flat artwork. Right: finished patch (sample photo — replace before launch). */
export function ArtworkToPatch() {
  return (
    <BeforeAfterSlider
      className="aspect-square w-full max-w-[560px] shadow-[0_40px_80px_-30px_rgb(0_0_0/.8)] ring-1 ring-white/10"
      beforeLabel="Your artwork"
      afterLabel="Finished patch"
      before={
        <div className="grid-texture grid h-full w-full place-items-center bg-[#fbfaf6]">
          <svg viewBox="0 0 200 200" className="w-[72%]" role="img" aria-label="Flat smiley-face artwork file">
            <circle cx="100" cy="100" r="84" fill="#F2A71B" stroke="#1d1d1d" strokeWidth="5" />
            <ellipse cx="74" cy="80" rx="9" ry="17" fill="#1d1d1d" />
            <ellipse cx="126" cy="80" rx="9" ry="17" fill="#1d1d1d" />
            <path d="M52 112 C 66 152, 134 152, 148 112" fill="none" stroke="#1d1d1d" strokeWidth="7" strokeLinecap="round" />
            <g fontFamily="monospace" fontSize="7" fill="#536276">
              <text x="6" y="12">smiley_final_v3.png</text>
              <text x="6" y="194">1200 × 1200 px · RGB</text>
            </g>
          </svg>
        </div>
      }
      after={
        <div className="relative h-full w-full bg-deep">
          <Image src="/placeholders/sample-smiley.webp" alt="The same smiley design as an embroidered patch (sample image)" fill sizes="560px" className="scale-[1.18] object-cover" />
        </div>
      }
    />
  );
}
