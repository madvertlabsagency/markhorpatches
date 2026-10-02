import type { Metadata } from "next";
import { getAggregateRating, getPublishedReviews } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Container, Section } from "@/components/ui/Section";
import { ReviewCard, Stars } from "@/components/reviews/ReviewCard";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { FinalCTA } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({ title: "Customer Reviews | Patch Gorilla", description: "Reviews from real Patch Gorilla customers, collected after delivery.", path: "/reviews" });

export default async function ReviewsPage() {
  const [reviews, rating] = await Promise.all([getPublishedReviews({ take: 100 }), getAggregateRating()]);
  return (
    <>
      <PageHero eyebrow="Reviews" title={<>In their <span className="text-gradient">words.</span></>} description="Every review here comes from a customer and is published by our team after delivery. We never write or buy reviews." crumbs={[{ name: "Reviews", path: "/reviews" }]}>
        {rating && (
          <div className="flex items-center gap-4"><Stars rating={Math.round(rating.ratingValue)} /><p className="text-white/80"><strong className="text-white">{rating.ratingValue}</strong> average from {rating.reviewCount} review{rating.reviewCount === 1 ? "" : "s"}</p></div>
        )}
      </PageHero>
      <Section tone="light" className="py-16 sm:py-20">
        <Container size="2xl">
          {reviews.length ? (
            <ul className="columns-1 gap-5 md:columns-2 lg:columns-3">{reviews.map((r) => <li key={r.id} className="mb-5 break-inside-avoid"><ReviewCard r={r} /></li>)}</ul>
          ) : (
            <EmptyState title="Reviews are on their way." description="We only show reviews from real, delivered orders. Check back soon." action={<ButtonLink href="/gallery" arrow>See our work</ButtonLink>} />
          )}
        </Container>
      </Section>
      <FinalCTA />
    </>
  );
}
