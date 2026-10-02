"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

/**
 * CMS-driven video. Never fakes a video: with no source configured, shows the still image only.
 * Lazy: the <video> element isn't created until the visitor presses play.
 */
export function VideoSection({ videoUrl, posterUrl, title }: { videoUrl: string; posterUrl: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-deep ring-1 ring-white/10">
      {playing && videoUrl ? (
        <video ref={ref} src={videoUrl} poster={posterUrl} controls autoPlay playsInline preload="metadata" className="h-full w-full object-cover">
          <track kind="captions" />
        </video>
      ) : (
        <>
          <Image src={posterUrl} alt={title} fill sizes="(min-width:1024px) 70vw, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-midnight/10 to-transparent" />
          {videoUrl ? (
            <button onClick={() => setPlaying(true)} className="group absolute inset-0 grid place-items-center" aria-label={`Play video: ${title}`}>
              <span className="bg-signature grid h-24 w-24 place-items-center rounded-full text-white shadow-glow ring-8 ring-white/10 transition-transform duration-500 group-hover:scale-110">
                <Play className="ml-1 h-9 w-9" fill="currentColor" aria-hidden />
              </span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
