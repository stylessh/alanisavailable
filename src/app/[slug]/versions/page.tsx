import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VersionsCanvas } from "@/components/versions-canvas/versions-canvas";
import { preloadWallpaper } from "@/lib/prefetch";
import { getProduct, getProductSlugs } from "@/lib/products";
import { getVersions } from "@/lib/snapshots";
import { WALLPAPER } from "@/os/macos/data";

export async function generateMetadata({
  params,
}: PageProps<"/[slug]/versions">): Promise<Metadata> {
  const { slug } = await params;
  if (!(await getProductSlugs()).includes(slug)) return {};
  const { metadata } = await getProduct(slug);
  return { title: `${metadata.company} versions` };
}

export default function VersionsPage({ params }: PageProps<"/[slug]/versions">) {
  return (
    <Suspense>
      <Versions params={params} />
    </Suspense>
  );
}

async function Versions({ params }: Pick<PageProps<"/[slug]/versions">, "params">) {
  const { slug } = await params;
  const versions = getVersions(slug);
  if (versions.length === 0) notFound();
  const { metadata } = await getProduct(slug);
  preloadWallpaper("high");
  // Versioned products are desktop apps on the macOS shell, so each frame
  // shows the wallpaper until its version has loaded on top of it.
  return <VersionsCanvas slug={slug} title={metadata.company} versions={versions} backdrop={WALLPAPER} />;
}
