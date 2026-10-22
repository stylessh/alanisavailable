"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatDate, VERSION_KEY_MESSAGE, type VersionKey, VersionBar, versionKey } from "@/components/version-switcher";
import { PrefetchPages } from "@/lib/prefetch";
import type { Version } from "@/lib/snapshots";
import { type Camera, fit, lerp, loadCamera, type Rect, sane, saveCamera, zoomAt } from "./camera";

const PAD = 64; // screen pixels around everything when fitting it all
const LABEL = 36; // screen pixels a frame's name takes above it
const DRAG = 4; // screen pixels a press moves before it pans instead of clicking
const STEP = 1.25; // zoom per key press
const FADE = 160; // ms the label and outline take to fade before zooming in

// A touchscreen as the main input: a phone or tablet, with a phone or tablet's memory.
const TOUCH = "(pointer: coarse)";
const subscribeTouch = (change: () => void) => {
  const query = matchMedia(TOUCH);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

const ease = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Every version of a product side by side, oldest to newest, each a live
 * page in a frame the size of this window. It's for moving between versions,
 * not editing them: drag, scroll or pinch to look around, click a version to
 * zoom into it. An open version fills the window and is the real thing (its
 * frame takes input), and the switcher slides between versions without ever
 * reloading one. `?v=<id>` names the open version, so Back works.
 *
 * Arriving on a version loads that one first and the rest once it's up, so
 * they're ready before you switch. Until a frame has loaded it shows
 * `backdrop` (the picture its page opens on), then fades its page in.
 *
 * Phones and tablets run one version at a time: every frame is a whole
 * desktop laid out at full size, and a few at once is more memory than iOS
 * gives a tab (Safari kills the page). There, only the open version (or the
 * last one opened, in the overview) is live; the others show their backdrop
 * and load from the HTTP cache, prefetched, when you switch to them.
 */
export function VersionsCanvas({
  slug,
  title,
  versions,
  backdrop,
}: {
  slug: string;
  title: string;
  versions: Version[];
  backdrop?: { src: string; srcSet?: string };
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const camera = useRef<Camera>({ x: 0, y: 0, z: 1 });
  const frame = useRef(0);
  const animation = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // each frame is the size of the window, so an open version is exactly the page it is
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // a saved view belongs to the versions it was saved with: a new one starts from all of them
  const storageKey = `alanisavailable:versions-canvas:${slug}:${versions.map((v) => v.id).join(",")}`;

  const params = useSearchParams();
  const asked = params.get("v");
  const openIndex = versions.findIndex((v) => v.id === asked);
  const open = openIndex >= 0 ? versions[openIndex].id : null;
  const openRef = useRef(open);
  // the open version has finished zooming in; the switcher waits for it
  const [settled, setSettled] = useState(false);

  const single = useSyncExternalStore(subscribeTouch, () => matchMedia(TOUCH).matches, () => false);
  const [lastOpen, setLastOpen] = useState(open);
  if (open && open !== lastOpen) setLastOpen(open);

  // Frames whose page has loaded, and frames that have started loading: the
  // open one goes first, the rest follow once any frame is up (in the
  // overview they all start together). A started frame never stops, except
  // in single mode, where only one is ever live.
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const [started, setStarted] = useState<ReadonlySet<string>>(() => new Set());
  const live = single ? (open ?? lastOpen) : null;
  if (single) {
    const only = new Set(live ? [live] : []);
    if (started.size !== only.size || [...only].some((id) => !started.has(id))) setStarted(only);
    if ([...loaded].some((id) => !only.has(id))) setLoaded(new Set([...loaded].filter((id) => only.has(id))));
  } else {
    const due = versions.filter((v) => !open || v.id === open || loaded.size > 0).map((v) => v.id);
    if (due.some((id) => !started.has(id))) setStarted(new Set([...started, ...due]));
  }

  const gap = size ? Math.round(size.w * 0.12) : 0;
  const rectOf = useCallback(
    (i: number): Rect => ({ x: i * (size!.w + gap), y: 0, w: size!.w, h: size!.h }),
    [size, gap],
  );

  // One transform write per animation frame, straight to the DOM: moving the
  // camera never rerenders the previews.
  const apply = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const { x, y, z } = camera.current;
      world.current?.style.setProperty("transform", `translate3d(${x}px, ${y}px, 0) scale(${z})`);
      world.current?.style.setProperty("--inv", String(1 / z));
    });
  }, []);

  // only the overview is remembered; an open version is in the URL
  const set = useCallback(
    (next: Camera) => {
      camera.current = sane(next);
      apply();
      if (openRef.current) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveCamera(storageKey, camera.current), 400);
    },
    [apply, storageKey],
  );

  const stop = () => cancelAnimationFrame(animation.current);

  // while the camera zooms into or out of a version, the frame under the
  // pointer isn't being pointed at, so it shows no hover outline
  const moving = (on: boolean) => {
    if (on) world.current?.setAttribute("data-moving", "");
    else world.current?.removeAttribute("data-moving");
  };
  // a gesture that takes the camera over ends the move
  const interrupt = () => {
    stop();
    moving(false);
  };

  const animateTo = useCallback(
    (to: Camera, ms: number, curve = ease, done?: () => void) => {
      stop();
      const from = camera.current;
      const start = performance.now();
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        set(lerp(from, to, curve(t), cx, cy));
        if (t < 1) animation.current = requestAnimationFrame(tick);
        else done?.();
      };
      animation.current = requestAnimationFrame(tick);
    },
    [set],
  );

  const fitAll = useCallback((): Camera => {
    const last = rectOf(versions.length - 1);
    const all = { x: 0, y: 0, w: last.x + last.w, h: last.h };
    const c = fit(all, window.innerWidth, window.innerHeight - LABEL, PAD);
    return { ...c, y: c.y + LABEL };
  }, [rectOf, versions.length]);

  const fitOne = useCallback((i: number) => fit(rectOf(i), window.innerWidth, window.innerHeight), [rectOf]);

  const home = useCallback(() => loadCamera(storageKey) ?? fitAll(), [storageKey, fitAll]);

  const frameOf = (i: number) => world.current?.querySelectorAll("iframe")[i];

  // Moving between versions only changes the URL; the effect below moves the camera.
  const go = useCallback(
    (id: string | null) => {
      if (id === openRef.current) return;
      if (!openRef.current) {
        saveCamera(storageKey, camera.current);
        setSettled(false);
      }
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("v", id);
      else url.searchParams.delete("v");
      window.history.pushState(null, "", url);
    },
    [storageKey],
  );

  useLayoutEffect(() => {
    const measure = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // The camera follows the open version: arriving puts it in place, opening
  // zooms in once the label has faded, switching slides across, closing pulls
  // back out to where the overview was.
  const placed = useRef(false);
  useLayoutEffect(() => {
    if (!size) return;
    const was = openRef.current;
    openRef.current = open;
    if (!placed.current) {
      placed.current = true;
      set(open ? fitOne(openIndex) : home());
      if (open) requestAnimationFrame(() => setSettled(true));
      return;
    }
    if (open === was) {
      // the window changed size: an open version keeps filling it
      if (open) set(fitOne(openIndex));
      return;
    }
    const focus = () => frameOf(openIndex)?.contentWindow?.focus();
    if (!open) {
      moving(true);
      animateTo(home(), 650, easeInOut, () => {
        setSettled(false);
        moving(false);
      });
      viewport.current?.focus({ preventScroll: true });
    } else if (!was) {
      stop();
      moving(true);
      const arrived = () => {
        setSettled(true);
        moving(false);
        focus();
      };
      const t = setTimeout(() => animateTo(fitOne(openIndex), 600, easeInOut, arrived), FADE);
      return () => clearTimeout(t);
    } else {
      animateTo(fitOne(openIndex), 550, easeInOut, focus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, size]);

  // ⌃⌥← and ⌃⌥→ step through versions and ⌃⌥↑ shows them all, from here or
  // from inside an open version (which passes them up)
  useEffect(() => {
    const step = (key: VersionKey) => {
      if (key === "ArrowUp") return go(null);
      if (!openRef.current) return;
      const next = versions[versions.findIndex((v) => v.id === openRef.current) + (key === "ArrowLeft" ? -1 : 1)];
      if (next) go(next.id);
    };
    const keydown = (e: KeyboardEvent) => {
      const key = versionKey(e);
      if (!key) return;
      e.preventDefault();
      step(key);
    };
    const message = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === VERSION_KEY_MESSAGE) step(e.data.key);
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("message", message);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("message", message);
    };
  }, [go, versions]);

  // Gestures, in the overview only: drag anywhere to pan (a press that
  // doesn't move is a click), Space-drag and middle-drag too, wheel or two
  // fingers to pan, ⌘/Ctrl-wheel or pinch to zoom around the pointer.
  useEffect(() => {
    const el = viewport.current;
    if (!el || !size) return;
    const pointers = new Map<number, { x: number; y: number }>();
    const origins = new Map<number, { x: number; y: number }>();
    let moved = false;
    let space = false;
    let pinch: { d: number; z: number } | null = null;
    let gestureZ = 1;


    const start = (e: PointerEvent) => origins.get(e.pointerId) ?? { x: e.clientX, y: e.clientY };
    const down = (e: PointerEvent) => {
      if (openRef.current) return;
      if (e.button === 1) e.preventDefault(); // no middle-click autoscroll
      if (e.button !== 0 && e.button !== 1) return;
      interrupt();
      origins.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 0) moved = space || e.button === 1;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (moved) el.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: camera.current.z };
        moved = true;
      }
    };
    const move = (e: PointerEvent) => {
      const last = pointers.get(e.pointerId);
      if (!last) return;
      const p = { x: e.clientX, y: e.clientY };
      if (!moved && Math.hypot(p.x - start(e).x, p.y - start(e).y) > DRAG) {
        moved = true;
        el.setPointerCapture(e.pointerId);
      }
      if (!moved) return;
      pointers.set(e.pointerId, p);
      const c = camera.current;
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const factor = (pinch.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d / c.z;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const panned = { ...c, x: c.x + (p.x - last.x) / 2, y: c.y + (p.y - last.y) / 2 };
        set(zoomAt(panned, factor, mid.x, mid.y));
      } else {
        set({ ...c, x: c.x + p.x - last.x, y: c.y + p.y - last.y });
      }
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      origins.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    // a press that panned never also opens the version it ended on
    const click = (e: MouseEvent) => {
      if (!moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    };
    const auxclick = (e: MouseEvent) => {
      if (e.button === 1 && moved) {
        e.preventDefault();
        moved = false;
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (openRef.current) return;
      interrupt();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const c = camera.current;
      if (e.ctrlKey || e.metaKey) set(zoomAt(c, Math.exp((-e.deltaY * unit) / 200), e.clientX, e.clientY));
      else set({ ...c, x: c.x - e.deltaX * unit, y: c.y - e.deltaY * unit });
    };
    // Safari's trackpad pinch
    type GestureEvent = UIEvent & { scale: number; clientX: number; clientY: number };
    const gestureStart = (e: Event) => {
      e.preventDefault();
      gestureZ = camera.current.z;
    };
    const gestureChange = (e: Event) => {
      e.preventDefault();
      if (openRef.current) return;
      const g = e as GestureEvent;
      set(zoomAt(camera.current, (gestureZ * g.scale) / camera.current.z, g.clientX, g.clientY));
    };

    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A|IFRAME)$/.test(t.tagName));
    const keydown = (e: KeyboardEvent) => {
      if (openRef.current) return;
      if (e.key === " " && !typing(e.target)) {
        e.preventDefault();
        space = true;
        return;
      }
      if (e.target !== el || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = camera.current;
      const step = e.shiftKey ? 320 : 80;
      const pans: Record<string, [number, number]> = {
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      };
      const center = [window.innerWidth / 2, window.innerHeight / 2] as const;
      if (pans[e.key]) set({ ...c, x: c.x + pans[e.key][0], y: c.y + pans[e.key][1] });
      else if (e.key === "+" || e.key === "=") set(zoomAt(c, STEP, ...center));
      else if (e.key === "-" || e.key === "_") set(zoomAt(c, 1 / STEP, ...center));
      else if (e.key === "1") animateTo(fitAll(), 350);
      else return;
      e.preventDefault();
    };
    const release = () => {
      space = false;
      pointers.clear();
      origins.clear();
      pinch = null;
    };
    const keyup = (e: KeyboardEvent) => {
      if (e.key === " ") space = false;
    };
    const hidden = () => document.hidden && release();

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    el.addEventListener("click", click, { capture: true });
    el.addEventListener("auxclick", auxclick, { capture: true });
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("gesturestart", gestureStart);
    el.addEventListener("gesturechange", gestureChange);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
      el.removeEventListener("click", click, { capture: true });
      el.removeEventListener("auxclick", auxclick, { capture: true });
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("gesturestart", gestureStart);
      el.removeEventListener("gesturechange", gestureChange);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", hidden);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      cancelAnimationFrame(animation.current);
      clearTimeout(saveTimer.current);
      if (placed.current && !openRef.current) saveCamera(storageKey, camera.current);
    },
    [storageKey],
  );

  const select = (e: React.MouseEvent, id: string | null) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(id);
  };

  // keyboard focus on a version that's off screen brings it into view; a
  // click focuses it too, but opening it already moves the camera there in
  // one zoom, and panning first would split that into two moves
  const reveal = (e: React.FocusEvent, i: number) => {
    if (openRef.current || !e.currentTarget.matches(":focus-visible")) return;
    const r = rectOf(i);
    const { x, y, z } = camera.current;
    const left = r.x * z + x, right = (r.x + r.w) * z + x, top = r.y * z + y, bottom = (r.y + r.h) * z + y;
    if (left >= 0 && top >= LABEL && right <= window.innerWidth && bottom <= window.innerHeight) return;
    animateTo({ z, x: window.innerWidth / 2 - (r.x + r.w / 2) * z, y: window.innerHeight / 2 - (r.y + r.h / 2) * z }, 350);
  };

  const hrefOf = (id: string | null) => (id ? `/${slug}/versions?v=${id}` : `/${slug}/versions`);

  return (
    <div
      ref={viewport}
      tabIndex={0}
      aria-label={`${title} versions. Drag or use the arrow keys to look around, + and − to zoom, 1 to see them all.`}
      className="versions-canvas fixed inset-0 cursor-default touch-none overflow-hidden overscroll-none bg-background outline-none select-none"
    >
      <div
        ref={world}
        data-open={open ? "" : undefined}
        className="group/world absolute top-0 left-0 origin-top-left will-change-transform"
        style={{ ["--inv" as string]: 1 }}
      >
        {size &&
          versions.map((v, i) => {
            const r = rectOf(i);
            const isOpen = v.id === open;
            return (
              <a
                key={v.id}
                href={hrefOf(v.id)}
                onClick={(e) => select(e, v.id)}
                onFocus={(e) => reveal(e, i)}
                draggable={false}
                tabIndex={open ? -1 : 0}
                aria-label={`Open ${v.name}`}
                className="group absolute block outline-none"
                style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
              >
                {/* names and outlines fade out before a version opens, and back in after it closes */}
                {/* as wide on screen as the frame is, so names never run into the next one: on
                    a small frame the type gets smaller, the date goes, then the name truncates */}
                <span
                  className="@container absolute bottom-full left-0 origin-bottom-left pb-2.5 transition-opacity delay-300 duration-200 group-data-[open]/world:opacity-0 group-data-[open]/world:delay-0 group-data-[open]/world:duration-150"
                  style={{ width: `calc(${r.w}px / var(--inv))`, transform: "scale(var(--inv))" }}
                >
                  <span className="flex items-baseline gap-2 text-[11px] whitespace-nowrap text-muted-foreground @[12rem]:text-[13px]">
                    <span className="min-w-0 truncate font-medium text-foreground">{v.name}</span>
                    {v.date && <span className="hidden shrink-0 tabular-nums @[10rem]:inline">{formatDate(v.date)}</span>}
                  </span>
                </span>
                {/* an open version squares its corners and drops its edge as it fills the window */}
                <span
                  className="absolute inset-0 overflow-hidden bg-black transition-[border-radius,box-shadow] duration-500 ease-in-out"
                  style={{
                    borderRadius: isOpen ? 0 : "calc(10px * var(--inv))",
                    boxShadow: isOpen ? "none" : "0 0 0 calc(1px * var(--inv)) var(--border)",
                  }}
                >
                  {backdrop && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={backdrop.src}
                      srcSet={backdrop.srcSet}
                      sizes="100vw"
                      alt=""
                      draggable={false}
                      className="absolute inset-0 size-full object-cover"
                    />
                  )}
                  {/* a frame that hasn't started (or was let go) isn't there at all, so its page is freed */}
                  {started.has(v.id) && (
                    <iframe
                      src={v.href}
                      title={v.name}
                      tabIndex={isOpen ? 0 : -1}
                      aria-hidden={!isOpen}
                      onLoad={() => setLoaded((s) => (s.has(v.id) ? s : new Set(s).add(v.id)))}
                      className={`relative size-full border-0 transition-opacity duration-200 ${loaded.has(v.id) ? "" : "opacity-0"} ${isOpen ? "" : "pointer-events-none"}`}
                    />
                  )}
                </span>
                {/* hover and keyboard focus outline, kept the same width at any zoom; none while zooming in or out */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[open]/world:opacity-0! group-data-[moving]/world:opacity-0! group-data-[moving]/world:transition-none"
                  style={{
                    borderRadius: "calc(10px * var(--inv))",
                    boxShadow: "0 0 0 calc(2px * var(--inv)) var(--foreground)",
                  }}
                />
              </a>
            );
          })}
      </div>

      {single && <PrefetchPages hrefs={versions.filter((v) => v.id !== live).map((v) => v.href)} />}

      <VersionBar
        versions={versions}
        current={open}
        hidden={!open || !settled}
        render={(id, props) => <a href={hrefOf(id)} onClick={(e) => select(e, id)} {...props} />}
      />
    </div>
  );
}
