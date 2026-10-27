import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EMBEDS } from "@/products/embeds";

// A product's app on its own, edge to edge, for another site to frame
// (trypane.app shows them as windows on its canvas). next.config.ts limits
// who may frame these pages; they stay out of search.

export function generateStaticParams() {
  return Object.keys(EMBEDS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/embed/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const embed = EMBEDS[slug];
  if (!embed) return {};
  return { title: embed.name, robots: { index: false, follow: false } };
}

export default function EmbedPage({ params }: PageProps<"/embed/[slug]">) {
  return (
    <Suspense>
      <Embed params={params} />
    </Suspense>
  );
}

async function Embed({ params }: Pick<PageProps<"/embed/[slug]">, "params">) {
  const { slug } = await params;
  const embed = EMBEDS[slug];
  if (!embed) notFound();
  return (
    <>
      {/* the frame is the window: no page scroll, and the app's own color behind it while it loads */}
      <style>{`html, body { background: ${embed.background}; overflow: hidden; overscroll-behavior: none; }`}</style>
      <embed.Embed />
    </>
  );
}
