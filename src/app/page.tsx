import { AvailableFor } from "@/components/available-for";
import { CardScroller } from "@/components/card-scroller";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/container";
import { emailHref, xDmHref } from "@/lib/contact";
import { PrefetchPages, preloadWallpaper } from "@/lib/prefetch";
import { getAllProducts } from "@/lib/products";
import { entryHref, getVersions } from "@/lib/snapshots";

export default async function Home() {
  const products = await getAllProducts();
  // While the visitor reads, fetch what a card opens onto: the wallpaper and
  // each product's first version, the page its canvas frame loads first.
  preloadWallpaper("low");
  const firsts = products.flatMap((p) => getVersions(p.slug).slice(0, 1).map((v) => v.href));

  return (
    <Container className="flex min-h-dvh flex-col">
      <header className="mb-12 space-y-8">
        <AvailableFor />
        <p className="text-normal max-w-md text-pretty">
          As a fun way to market myself, I&apos;m going to rebuild and improve
          my favorite products and apps and share the process online.
        </p>
      </header>

      <Section>
        {products.length === 0 ? (
          <p className="text-normal text-muted-foreground">
            The first one is on its way.
          </p>
        ) : (
          <CardScroller>
            {products.map((p) => (
              <ProductCard key={p.slug} href={entryHref(p.slug)} metadata={p.metadata} />
            ))}
          </CardScroller>
        )}
      </Section>

      <PrefetchPages hrefs={firsts} />

      <Section className="mt-auto pb-0">
        <p className="text-normal text-muted-foreground">
          Wanna reach out? Send me an{" "}
          <a
            href={xDmHref}
            target="_blank"
            rel="noopener noreferrer"
            className="link text-foreground"
          >
            X DM
          </a>{" "}
          or an{" "}
          <a href={emailHref} className="link text-foreground">
            email
          </a>
          .
        </p>
      </Section>
    </Container>
  );
}

function Section({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`py-8 ${className}`}>
      {children}
    </section>
  );
}
