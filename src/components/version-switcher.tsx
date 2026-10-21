"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
 *
 * Under 1200px wide the row would run into the Dock, so it folds into one
 * button that opens the same items as a menu.
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
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const shown = open && !hidden;

  useEffect(() => {
    if (!shown) return;
    const outside = (e: PointerEvent) => !menu.current?.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", outside, { capture: true });
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", outside, { capture: true });
      window.removeEventListener("keydown", escape);
    };
  }, [shown]);

  const titleOf = (v: Version) => (v.date ? `${v.name} · ${v.date}` : v.name);

  return (
    <nav
      aria-label="Versions"
      aria-hidden={hidden || undefined}
      inert={hidden}
      className="fixed right-3 bottom-3 z-[5000] font-sans text-[12.5px] font-medium text-white/60 [text-shadow:0_1px_2px_rgb(0_0_0/0.4)] transition-[opacity,translate] duration-300 ease-out data-[hidden]:pointer-events-none data-[hidden]:translate-y-1 data-[hidden]:opacity-0"
      data-hidden={hidden || undefined}
    >
      <div className="hidden items-center gap-0.5 min-[1200px]:flex">
        {render(null, { className: ITEM, title: "All versions (⌃⌥↑)", "aria-label": "All versions", children: <GridIcon /> })}
        {versions.map((v) => (
          <span key={v.id} className="contents">
            {render(v.id, {
              className: `${ITEM} px-2.5`,
              title: titleOf(v),
              "aria-current": v.id === current ? "page" : undefined,
              children: v.name,
            })}
          </span>
        ))}
      </div>

      <div ref={menu} className="relative min-[1200px]:hidden">
        {shown && (
          // picking an item closes the menu; the item itself navigates
          <div
            onClick={() => setOpen(false)}
            className="absolute right-0 bottom-full mb-1.5 flex min-w-44 flex-col gap-px rounded-xl bg-neutral-900/85 p-1 text-white/70 shadow-lg ring-1 ring-white/10 backdrop-blur-xl [text-shadow:none]"
          >
            {render(null, {
              className: MENU_ITEM,
              title: "All versions",
              children: (
                <>
                  <GridIcon />
                  All versions
                </>
              ),
            })}
            <hr className="mx-2 my-1 border-white/10" />
            {versions.map((v) => (
              <span key={v.id} className="contents">
                {render(v.id, {
                  className: MENU_ITEM,
                  title: titleOf(v),
                  "aria-current": v.id === current ? "page" : undefined,
                  children: (
                    <>
                      <span className="flex-1">{v.name}</span>
                      {v.date && <span className="text-[11.5px] text-white/40 tabular-nums">{formatDate(v.date)}</span>}
                    </>
                  ),
                })}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          aria-expanded={shown}
          aria-label="Versions"
          title="Versions"
          onClick={() => setOpen((o) => !o)}
          className={`${ITEM} aria-expanded:bg-white/15 aria-expanded:text-white`}
        >
          <StackIcon />
        </button>
      </div>
    </nav>
  );
}

const ITEM =
  "grid h-[26px] min-w-[26px] place-items-center rounded-md tabular-nums outline-none transition-colors duration-150 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 aria-[current=page]:bg-white/15 aria-[current=page]:text-white";

const MENU_ITEM =
  "flex h-8 items-center gap-2 rounded-lg px-2.5 outline-none transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white aria-[current=page]:bg-white/15 aria-[current=page]:text-white";

function GridIcon() {
  return (
    <svg aria-hidden width="13" height="13" viewBox="0 0 14 14" fill="currentColor" className="shrink-0">
      <rect x="1" y="1" width="5" height="5" rx="1.5" />
      <rect x="8" y="1" width="5" height="5" rx="1.5" />
      <rect x="1" y="8" width="5" height="5" rx="1.5" />
      <rect x="8" y="8" width="5" height="5" rx="1.5" />
    </svg>
  );
}

/** Versions stacked one on another. */
function StackIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M7 1.5 12.5 4.25 7 7 1.5 4.25Z" />
      <path d="M1.5 7 7 9.75 12.5 7" />
      <path d="M1.5 9.75 7 12.5 12.5 9.75" />
    </svg>
  );
}

export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
