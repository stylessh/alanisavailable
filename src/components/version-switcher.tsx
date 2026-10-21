"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { PrefetchPages } from "@/lib/prefetch";
import type { Version } from "@/lib/snapshots";

const subscribeNothing = () => () => {};

/** The ⌃⌥ arrow shortcuts: ← and → step through versions, ↑ shows them all. */
export type VersionKey = "ArrowLeft" | "ArrowRight" | "ArrowUp";
export function versionKey(e: KeyboardEvent): VersionKey | null {
  if (!e.ctrlKey || !e.altKey || e.metaKey || e.shiftKey) return null;
  return e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" ? e.key : null;
}
export const VERSION_KEY_MESSAGE = "versions-canvas:key";

/**
 * The switcher on a product page opened on its own. Its versions open in the
 * versions canvas, which plays them without reloading; inside the canvas the
 * page is in a frame, so it passes its shortcuts up to the canvas instead.
 */
export function VersionSwitcher({ slug, versions, current }: { slug: string; versions: Version[]; current: string }) {
  const router = useRouter();
  const framed = useSyncExternalStore(subscribeNothing, () => window.self !== window.top, () => true);
  const canvas = `/${slug}/versions`;
  const hrefOf = (id: string | null) => (id ? `${canvas}?v=${id}` : canvas);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = versionKey(e);
      if (!key) return;
      e.preventDefault();
      e.stopPropagation();
      if (framed) {
        window.parent.postMessage({ type: VERSION_KEY_MESSAGE, key }, window.location.origin);
        return;
      }
      const index = versions.findIndex((v) => v.id === current);
      const to = key === "ArrowUp" ? null : versions[index + (key === "ArrowLeft" ? -1 : 1)]?.id;
      if (to !== undefined) router.push(hrefOf(to));
    };
    // capture, so the app on the page (a terminal, say) never sees the shortcut
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  });

  if (framed || versions.length === 0) return null;
  return (
    <>
      <VersionBar
        versions={versions}
        current={current}
        render={(id, props) => <Link href={hrefOf(id)} {...props} />}
      />
      {/* the canvas loads every version in a frame; have them cached by then */}
      <PrefetchPages hrefs={versions.filter((v) => v.id !== current).map((v) => v.href)} />
    </>
  );
}

type ItemProps = { className: string; title: string; "aria-label"?: string; "aria-current"?: "page"; children: React.ReactNode };

/**
 * The switcher in the bottom-right corner, with no container behind it: a
 * button for all versions, then one per version, the shown one selected. `render` draws each
 * item as a link or button; `id` is the version, or null for all of them.
 */
export function VersionBar({
  versions,
  current,
  render,
  hidden = false,
}: {
  versions: Version[];
  current: string | null;
  render: (id: string | null, props: ItemProps) => React.ReactNode;
  hidden?: boolean;
}) {
  return (
    <nav
      aria-label="Versions"
      aria-hidden={hidden || undefined}
      inert={hidden}
      className="fixed right-3 bottom-3 z-[5000] flex items-center gap-0.5 font-sans text-[12.5px] font-medium text-white/60 [text-shadow:0_1px_2px_rgb(0_0_0/0.4)] transition-[opacity,translate] duration-300 ease-out data-[hidden]:pointer-events-none data-[hidden]:translate-y-1 data-[hidden]:opacity-0"
      data-hidden={hidden || undefined}
    >
      {render(null, {
        className: ITEM,
        title: "All versions (⌃⌥↑)",
        "aria-label": "All versions",
        children: (
          <svg aria-hidden width="13" height="13" viewBox="0 0 14 14" fill="currentColor" className="mx-auto">
            <rect x="1" y="1" width="5" height="5" rx="1.5" />
            <rect x="8" y="1" width="5" height="5" rx="1.5" />
            <rect x="1" y="8" width="5" height="5" rx="1.5" />
            <rect x="8" y="8" width="5" height="5" rx="1.5" />
          </svg>
        ),
      })}
      {versions.map((v) => (
        <span key={v.id} className="contents">
          {render(v.id, {
            className: `${ITEM} px-2.5`,
            title: v.date ? `${v.name} · ${v.date}` : v.name,
            "aria-current": v.id === current ? "page" : undefined,
            children: v.name,
          })}
        </span>
      ))}
    </nav>
  );
}

const ITEM =
  "grid h-[26px] min-w-[26px] place-items-center rounded-md tabular-nums outline-none transition-colors duration-150 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 aria-[current=page]:bg-white/15 aria-[current=page]:text-white";
