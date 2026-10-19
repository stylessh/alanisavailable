import { PRODUCTS } from "@/products";

// Each product is a folder in src/products whose index.mdx exports
// `metadata` matching this shape; folders are registered in
// src/products/index.ts.
export type ProductMeta = {
  company: string;
  role?: string;
  summary?: string;
  favorite?: boolean;
  /** Single-color SVG in /public/products/<slug>/; recolored with `foreground`. */
  logo?: string;
  /** Card fill: any CSS background (a color or a gradient). */
  background?: string;
  foreground?: string;
  /** Optional overrides for dark mode. */
  backgroundDark?: string;
  foregroundDark?: string;
  /** Skip the sheen and highlight layers. */
  flat?: boolean;
  /** Film grain over the fill. */
  grain?: boolean;
  /** Position in the directory, after favorites. */
  order?: number;
  /** "fullscreen" renders the MDX edge to edge, with no page chrome. */
  layout?: "fullscreen";
  status?: "researching" | "applied" | "interviewing" | "closed";
};

type Slug = keyof typeof PRODUCTS;

const isSlug = (slug: string): slug is Slug => Object.hasOwn(PRODUCTS, slug);

export async function getProductSlugs(): Promise<string[]> {
  return Object.keys(PRODUCTS);
}

export async function getProduct(slug: string) {
  if (!isSlug(slug)) throw new Error(`Unknown product: ${slug}`);
  const mod = PRODUCTS[slug] as unknown as {
    default: React.ComponentType;
    metadata: ProductMeta;
  };
  return { slug, Content: mod.default, metadata: mod.metadata };
}

export async function getAllProducts() {
  const slugs = await getProductSlugs();
  const products = await Promise.all(slugs.map(getProduct));
  return products.sort(
    (a, b) =>
      Number(!!b.metadata.favorite) - Number(!!a.metadata.favorite) ||
      (a.metadata.order ?? Infinity) - (b.metadata.order ?? Infinity),
  );
}
