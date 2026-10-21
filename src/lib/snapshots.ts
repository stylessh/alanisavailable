import { VERSIONS } from "@/snapshots";

// A product's versions, made with scripts/snapshot.mjs: the frozen ones, each
// a full copy of the product (and the macOS layer under it) that keeps
// looking and behaving the way it did, and the live product, which has a
// version name of its own.
export type Snapshot = {
  id: string;
  name: string;
  date: string;
  commit: string;
};

/** One place the version switcher can go: a frozen version or the live product. */
export type Version = { id: string; name: string; href: string; date?: string };

export const CURRENT = "current";

/** Where a version opens: in the versions canvas, which moves between versions without reloading. */
export const versionHref = (slug: string, id: string) => `/${slug}/versions?v=${id}`;

/**
 * Where a product starts: its first version, so the story runs oldest to
 * newest. A product without versions opens on its own page.
 */
export function entryHref(slug: string) {
  const [first] = getVersions(slug);
  return first ? versionHref(slug, first.id) : `/${slug}`;
}

export function getSnapshots(slug: string): Snapshot[] {
  return Object.hasOwn(VERSIONS, slug) ? VERSIONS[slug].snapshots : [];
}

/** Oldest first, ending with the live product. Empty when the live product has no version name. */
export function getVersions(slug: string): Version[] {
  if (!Object.hasOwn(VERSIONS, slug)) return [];
  const { live, snapshots } = VERSIONS[slug];
  return [
    ...snapshots.map((s) => ({ id: s.id, name: s.name, date: s.date, href: `/v/${slug}/${s.id}` })),
    { id: CURRENT, name: live, href: `/${slug}` },
  ];
}
