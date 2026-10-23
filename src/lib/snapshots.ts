import { VERSIONS } from "@/snapshots";

// A product's versions, made with scripts/snapshot.mjs: the frozen ones, each
// a full copy of the product (and the macOS layer under it) that keeps
// looking and behaving the way it did, and the live product, which has a
// version name of its own.
export type Snapshot = {
  id: string;
  name: string;
  /** the idea it's a variant of, when several snapshots tried one thing different ways */
  group?: string;
  date: string;
  commit: string;
};

/** One variant of a version that tried an idea several ways, by the frozen copy it opens. */
export type Variant = { id: string; name: string; href: string };

/**
 * One place the version switcher can go: a frozen version or the live
 * product. A group of variants is one version named for the group, opening on
 * its first variant (whose id it takes), with the rest a step down.
 */
export type Version = { id: string; name: string; href: string; date?: string; variants?: Variant[] };

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
  const versions: Version[] = [];
  for (const s of snapshots) {
    const href = `/v/${slug}/${s.id}`;
    const last = versions.at(-1);
    // a variant joins the group the snapshot before it started
    if (s.group && last?.variants && last.name === s.group) last.variants.push({ id: s.id, name: s.name, href });
    else if (s.group) versions.push({ id: s.id, name: s.group, date: s.date, href, variants: [{ id: s.id, name: s.name, href }] });
    else versions.push({ id: s.id, name: s.name, date: s.date, href });
  }
  return [...versions, { id: CURRENT, name: live, href: `/${slug}` }];
}

/** The version a frozen copy belongs to: itself, or the group it's a variant of. */
export function versionOf(versions: Version[], id: string) {
  return versions.find((v) => v.id === id || v.variants?.some((x) => x.id === id));
}

/** Every page a version can show: itself, or each of its variants. */
export const pagesOf = (v: Version) => v.variants?.map((x) => x.href) ?? [v.href];
