"use client";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReviewCard, type ReviewCardData } from "./ReviewCard";

export function ReviewCarousel({ reviews }: { reviews: ReviewCardData[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <div className="relative">
      <ul ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:-mx-6 sm:px-6" aria-label="Customer reviews">
        {reviews.map((r) => (
          <li key={r.id} className="w-[86%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]">
            <ReviewCard r={r} />
          </li>
        ))}
      </ul>
      {reviews.length > 3 && (
        <div className="mt-2 flex justify-end gap-2">
          <button onClick={() => scroll(-1)} className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-lift ring-1 ring-navy/10" aria-label="Previous reviews"><ChevronLeft /></button>
          <button onClick={() => scroll(1)} className="grid h-12 w-12 place-items-center rounded-full bg-navy text-white" aria-label="Next reviews"><ChevronRight /></button>
        </div>
      )}
    </div>
  );
}
