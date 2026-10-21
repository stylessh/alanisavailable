import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VersionsCanvas } from "@/components/versions-canvas/versions-canvas";
import { getProduct, getProductSlugs } from "@/lib/products";
import { getVersions } from "@/lib/snapshots";

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
  return <VersionsCanvas slug={slug} title={metadata.company} versions={versions} />;
}
