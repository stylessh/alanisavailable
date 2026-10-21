import type { MetadataRoute } from "next";
import { getProductSlugs } from "@/lib/products";

const BASE_URL = "https://alanisavailable.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getProductSlugs();
  return [
    { url: BASE_URL, priority: 1 },
    ...slugs.map((slug) => ({ url: `${BASE_URL}/${slug}`, priority: 0.8 })),
  ];
}
