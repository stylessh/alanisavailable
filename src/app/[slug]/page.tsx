import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/container";
import { getProduct, getProductSlugs } from "@/lib/products";

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  // Cache Components requires at least one param; this placeholder 404s
  // until the first product is added.
  if (slugs.length === 0) return [{ slug: "_template" }];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!(await getProductSlugs()).includes(slug)) return {};
  const { metadata } = await getProduct(slug);
  return { title: metadata.company };
}

// Every known slug is prerendered, so this boundary never shows a fallback
// for real pages; it keeps reading `params` from blocking navigation.
export default function ProductPage({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense>
      <Product params={params} />
    </Suspense>
  );
}

async function Product({ params }: Pick<PageProps<"/[slug]">, "params">) {
  const { slug } = await params;
  if (!(await getProductSlugs()).includes(slug)) notFound();
  const { Content, metadata } = await getProduct(slug);

  if (metadata.layout === "fullscreen") return <Content />;

  return (
    <Container>
      <Link
        href="/"
        className="text-normal link text-muted-foreground hover:text-foreground"
      >
        ← Back
      </Link>
      <article className="prose prose-sm prose-neutral dark:prose-invert mt-12 max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-h1:text-lg prose-h2:text-[15px] prose-p:text-[14px] prose-p:leading-relaxed">
        <Content />
      </article>
    </Container>
  );
}
