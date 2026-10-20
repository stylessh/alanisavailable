"use client";

import { animate, AnimatePresence, motion, type MotionValue, useMotionValue, useTransform } from "motion/react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icon";

// The image viewer (from the recording): the whole window dims to black at
// 82% and the image sits centered; the tool that produced it ("Read") is
// named bottom-left, a "1 of 3" pager with arrows sits bottom-center and a
// close button top-right. ← → page, Escape closes.
//
// A group of images opens as a carousel: the picture on show sits in the
// middle and its neighbours peek in on either side, smaller and dimmer, both
// following each one's distance from the middle, so the strip reads as one
// continuous track. ← → and the pager slide it on a spring; dragging moves it
// under the pointer (with resistance past the ends) and on release it snaps
// to the nearest picture, carried on by a flick; clicking a neighbour brings
// it to the middle. A horizontal trackpad swipe scrolls it the same way.
//
// Opening and closing are a shared-element move: the picture flies from
// the thumbnail that was clicked to the center and back. A clipped frame
// animates between the two rectangles with the image covering it, so a
// square thumbnail grows into the full picture without distorting; the
// thumbnail hides while its picture is away.

/** Where image i sits on the page (to fly from and back to), if it is on screen. */
export type SourceOf = (i: number) => HTMLElement | null;

type Viewing = { images: string[]; index: number; label: string; sourceOf?: SourceOf; id: number };

const ViewerContext = createContext<(images: string[], index: number, label: string, sourceOf?: SourceOf) => void>(() => {});

/** Opens the viewer on `images` at `index`; `label` names where they came from; `sourceOf` lets the picture fly from its thumbnail. */
export const useOpenViewer = () => useContext(ViewerContext);

/** Finds each image's element (tagged `data-cc-image`) inside the block it was opened from. */
export const sourcesIn =
  (root: HTMLElement | null, images: string[]): SourceOf =>
  (i) =>
    root?.querySelector<HTMLElement>(`[data-cc-image="${CSS.escape(images[i])}"]`) ?? null;

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewing, setViewing] = useState<Viewing | null>(null);
  // each opening is its own viewer, so opening again while the last one fades out starts fresh
  const opened = useRef(0);
  const open = useCallback(
    (images: string[], index: number, label: string, sourceOf?: SourceOf) => setViewing({ images, index, label, sourceOf, id: ++opened.current }),
    [],
  );
  return (
    <ViewerContext.Provider value={open}>
      {children}
      <AnimatePresence>{viewing && <Lightbox key={viewing.id} viewing={viewing} onClose={() => setViewing(null)} />}</AnimatePresence>
    </ViewerContext.Provider>
  );
}

type Box = { x: number; y: number; w: number; h: number; r: number };

const FLY = { type: "spring", stiffness: 380, damping: 36, mass: 0.9, restDelta: 0.5, restSpeed: 10 } as const;
/** the picture's largest size, as a share of the window: a single picture, and one in a carousel (smaller, so its neighbours show) */
const MAX_W = 0.72;
const MAX_H = 0.78;
const GROUP_MAX_W = 0.56;
const GROUP_MAX_H = 0.7;
/** Carousel geometry: centre-to-centre distance (share of the window's width), and how much a neighbour shrinks and fades */
const SLOT = 0.56;
const NEIGHBOUR_SCALE = 0.84;
const NEIGHBOUR_OPACITY = 0.45;
/** sliding to a picture (keys, pager, release) */
const SNAP = { type: "spring", stiffness: 320, damping: 34, mass: 0.9 } as const;
/** past the first or last picture, the strip moves this fraction of the drag */
const RUBBER = 0.28;
/** a trackpad swipe (or shift + wheel) snaps to the nearest picture once it has been still this long (ms) */
const WHEEL_SETTLE_MS = 140;
/** a release projects the flick this far ahead (ms) to pick the picture to snap to */
const FLICK_MS = 160;
const THUMB_RADIUS = 6;

// Scrims: the dimmed window darkens further toward its top and bottom edges,
// so the close button, the source label and the pager read cleanly over
// whatever is behind. Each is one eased ramp (black at most 80%), not a
// linear one: a linear fade shows a hard edge where it starts and stops.
const SCRIM_TOP = 110;
const SCRIM_BOTTOM = 170;
const SCRIM_ALPHA = 0.8;

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/** A black-to-transparent gradient whose alpha follows an ease-in-out curve: dense near the edge, then gently gone. */
function easedScrim(to: "top" | "bottom", alpha: number, steps = 14) {
  const stops = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return `rgb(0 0 0 / ${(alpha * (1 - easeInOutSine(t))).toFixed(3)}) ${(t * 100).toFixed(1)}%`;
  });
  return `linear-gradient(to ${to}, ${stops.join(", ")})`;
}

const SCRIMS = { top: easedScrim("bottom", SCRIM_ALPHA), bottom: easedScrim("top", SCRIM_ALPHA) };

/** A rectangle in the overlay's own (unscaled) coordinates; the screen may be drawn scaled. */
function boxIn(overlay: HTMLElement, el: HTMLElement): Box {
  const o = overlay.getBoundingClientRect();
  const s = o.width / overlay.offsetWidth || 1;
  const r = el.getBoundingClientRect();
  return {
    x: (r.left - o.left) / s,
    y: (r.top - o.top) / s,
    w: r.width / s,
    h: r.height / s,
    r: parseFloat(getComputedStyle(el).borderTopLeftRadius) || THUMB_RADIUS,
  };
}

/** A picture's box in the middle of a W × H overlay, as large as fits. */
function centered(W: number, H: number, aspect: number, group: boolean): Box {
  const [mw, mh] = group ? [GROUP_MAX_W, GROUP_MAX_H] : [MAX_W, MAX_H];
  let w = W * mw;
  let h = w / aspect;
  if (h > H * mh) {
    h = H * mh;
    w = h * aspect;
  }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h, r: 8 };
}

function loadAspect(src: string) {
  return new Promise<number>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
    img.onerror = () => resolve(16 / 10);
    img.src = src;
  });
}

type Stage = { W: number; H: number; aspects: number[] };

/** One picture in the strip: placed by its distance from the strip's position (`pos`, in pictures). */
function Slide({
  src,
  i,
  pos,
  stage,
  group,
  appear,
  hiddenNow,
}: {
  src: string;
  i: number;
  pos: MotionValue<number>;
  stage: Stage;
  group: boolean;
  appear: MotionValue<number>;
  /** the picture on show while it flies (the flying frame stands in for it) */
  hiddenNow: boolean;
}) {
  const box = centered(stage.W, stage.H, stage.aspects[i], group);
  const slot = stage.W * SLOT;
  const x = useTransform(pos, (p) => (i - p) * slot);
  const near = useTransform(pos, (p) => Math.min(1, Math.abs(i - p)));
  const scale = useTransform(near, (n) => 1 - (1 - NEIGHBOUR_SCALE) * n);
  const fade = useTransform([near, appear], ([n, a]: number[]) => (1 - (1 - NEIGHBOUR_OPACITY) * n) * (i === Math.round(pos.get()) ? 1 : a));
  return (
    <motion.div
      data-slide={i}
      className="absolute overflow-hidden"
      style={{
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        borderRadius: box.r,
        x,
        scale,
        opacity: fade,
        visibility: hiddenNow ? "hidden" : "visible",
        boxShadow: "0 20px 50px rgb(0 0 0 / 0.35)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" src={src} className="pointer-events-none size-full max-w-none object-cover" draggable={false} />
    </motion.div>
  );
}

function Lightbox({ viewing, onClose }: { viewing: Viewing; onClose: () => void }) {
  const { images, label, sourceOf } = viewing;
  const group = images.length > 1;
  const overlay = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(viewing.index);
  const [stage, setStage] = useState<Stage | null>(null);
  const [closing, setClosing] = useState(false);
  /** the flying frame (open and close) is up; once it lands, the strip's own slide takes over */
  const [flying, setFlying] = useState(true);
  // the strip's position, in pictures (fractional while it moves)
  const pos = useMotionValue(viewing.index);
  // neighbours fade in after the flight and out as it closes
  const appear = useMotionValue(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const w = useMotionValue(0);
  const h = useMotionValue(0);
  const radius = useMotionValue(8);
  const hidden = useRef<HTMLElement | null>(null);

  const reveal = () => {
    if (hidden.current) hidden.current.style.visibility = "";
    hidden.current = null;
  };

  const flyTo = useCallback(
    (b: Box, instant?: boolean) => {
      const values = [
        [x, b.x],
        [y, b.y],
        [w, b.w],
        [h, b.h],
        [radius, b.r],
      ] as const;
      // jump() lands at once and stops anything in flight, so the flight that follows starts from here
      if (instant) return Promise.resolve(values.forEach(([v, to]) => v.jump(to)));
      return Promise.all(values.map(([v, to]) => animate(v, to, FLY)));
    },
    [x, y, w, h, radius],
  );

  // Open: measure the window, then fly the clicked picture in from its thumbnail at once.
  // Proportions come from any copy of each picture already on the page (the clicked one
  // always is); the others fill in as they load.
  useLayoutEffect(() => {
    const el = overlay.current;
    if (!el) return;
    let cancelled = false;
    const known = images.map((src) => {
      const img = [...document.querySelectorAll<HTMLImageElement>("img")].find((i) => i.getAttribute("src") === src && i.naturalWidth);
      return img ? img.naturalWidth / img.naturalHeight : 16 / 10;
    });
    const next = { W: el.offsetWidth, H: el.offsetHeight, aspects: known };
    setStage(next);
    const target = centered(next.W, next.H, known[viewing.index], group);
    const src = sourceOf?.(viewing.index) ?? null;
    const from = src ? boxIn(el, src) : { ...target, x: target.x + target.w * 0.02, y: target.y + target.h * 0.02, w: target.w * 0.96, h: target.h * 0.96 };
    flyTo(from, true);
    flyTo(target).then(() => {
      if (cancelled) return;
      setFlying(false);
      animate(appear, 1, { duration: 0.22, ease: "easeOut" });
    });
    images.forEach((src, i) =>
      loadAspect(src).then((aspect) => {
        if (!cancelled && Math.abs(aspect - known[i]) > 0.001) setStage((s) => s && { ...s, aspects: s.aspects.map((a, j) => (j === i ? aspect : a)) });
      }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening
  }, []);

  // the thumbnail of the picture on show is the one that's away
  useEffect(() => {
    reveal();
    const src = sourceOf?.(index) ?? null;
    if (src) {
      src.style.visibility = "hidden";
      hidden.current = src;
    }
  }, [index, sourceOf]);
  useEffect(() => () => reveal(), []);

  /** slide the strip to picture i (clamped to the group) */
  const slideTo = useCallback(
    (i: number, velocity = 0) => {
      const to = Math.max(0, Math.min(images.length - 1, i));
      setIndex(to);
      animate(pos, to, { ...SNAP, velocity });
    },
    [images.length, pos],
  );
  const go = useCallback((d: number) => slideTo(index + d), [index, slideTo]);

  // Closing flies the picture on show back to wherever its thumbnail is now.
  const close = useCallback(() => {
    if (closing || !stage) return;
    setClosing(true);
    const el = overlay.current;
    animate(appear, 0, { duration: 0.15 });
    pos.stop();
    pos.jump(index);
    const src = sourceOf?.(index) ?? null;
    const back = el && src ? boxIn(el, src) : null;
    const done = () => {
      reveal();
      onClose();
    };
    if (!back) return done();
    flyTo(centered(stage.W, stage.H, stage.aspects[index], group), true);
    setFlying(true);
    flyTo(back).then(done);
  }, [closing, stage, appear, pos, index, sourceOf, flyTo, group, onClose]);

  // The window dims by darkening its own content (see .cc-window[data-viewing] in styles.css)
  // rather than under a black overlay: an overlay clipped to the window's rounded corners
  // leaves the content's light edge showing through its anti-aliased rim. Closing undims.
  useEffect(() => {
    const win = overlay.current?.closest<HTMLElement>(".cc-window");
    if (closing) win?.removeAttribute("data-viewing");
    else win?.setAttribute("data-viewing", "");
    return () => win?.removeAttribute("data-viewing");
  }, [closing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, close]);

  // Drag: the strip follows the pointer; a short press without movement is a click
  // (a neighbour comes to the middle, the backdrop closes, the picture on show stays).
  const drag = useRef<{ x0: number; p0: number; t0: number; lastX: number; lastT: number; v: number; moved: boolean; slide: number } | null>(null);

  // Trackpad: a horizontal swipe (or shift + wheel) moves the strip with the fingers, with the
  // same resistance past the ends, and snaps to the nearest picture once the swipe (and the
  // momentum after it) settles. A native listener, so it can keep the page from scrolling.
  useEffect(() => {
    const el = overlay.current;
    if (!el || !stage || !group) return;
    let settle: ReturnType<typeof setTimeout> | undefined;
    let raw = pos.get();
    const onWheel = (e: WheelEvent) => {
      const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      if (!dx || Math.abs(dx) < Math.abs(e.deltaY) * (e.shiftKey ? 0 : 1)) return;
      e.preventDefault();
      if (closing || flying || drag.current) return;
      if (!settle) {
        pos.stop();
        raw = pos.get();
      }
      const max = images.length - 1;
      raw = Math.max(-0.5, Math.min(max + 0.5, raw + dx / (stage.W * SLOT)));
      pos.set(raw < 0 ? raw * RUBBER : raw > max ? max + (raw - max) * RUBBER : raw);
      setIndex(Math.max(0, Math.min(max, Math.round(raw))));
      clearTimeout(settle);
      settle = setTimeout(() => {
        settle = undefined;
        slideTo(Math.round(Math.max(0, Math.min(max, raw))));
      }, WHEEL_SETTLE_MS);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      clearTimeout(settle);
      el.removeEventListener("wheel", onWheel);
    };
  }, [stage, group, closing, flying, images.length, pos, slideTo]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || closing || flying || !stage) return;
    pos.stop();
    drag.current = {
      x0: e.clientX,
      p0: pos.get(),
      t0: e.timeStamp,
      lastX: e.clientX,
      lastT: e.timeStamp,
      v: 0,
      moved: false,
      slide: Number((e.target as HTMLElement).closest<HTMLElement>("[data-slide]")?.dataset.slide ?? -1),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !stage) return;
    const scale = (overlay.current?.getBoundingClientRect().width ?? stage.W) / stage.W || 1;
    const dx = (e.clientX - d.x0) / scale;
    if (Math.abs(dx) > 4) d.moved = true;
    if (!d.moved || !group) return;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (0.7 * ((e.clientX - d.lastX) / scale)) / dt + 0.3 * d.v;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    let p = d.p0 - dx / (stage.W * SLOT);
    const max = images.length - 1;
    if (p < 0) p *= RUBBER;
    else if (p > max) p = max + (p - max) * RUBBER;
    pos.set(p);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !stage) return;
    if (!d.moved) {
      // the press's own target (pointer capture retargets the release to the overlay)
      const i = d.slide;
      if (i < 0) close();
      else if (i !== index) slideTo(i);
      return;
    }
    if (!group) return;
    const slot = stage.W * SLOT;
    const projected = pos.get() - (d.v * FLICK_MS) / slot;
    slideTo(Math.round(projected), (-d.v * 1000) / slot);
  };

  return (
    <motion.div
      ref={overlay}
      data-no-drag
      className="absolute inset-0 z-[900] text-[13px] select-none"
      // the viewer is dark in both appearances, so its controls are always light
      style={{ color: "#ebeae6", cursor: group && !flying ? "grab" : undefined, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: 0.22 }}
      >
        <div className="absolute inset-x-0 top-0" style={{ height: SCRIM_TOP, background: SCRIMS.top }} />
        <div className="absolute inset-x-0 bottom-0" style={{ height: SCRIM_BOTTOM, background: SCRIMS.bottom }} />
      </motion.div>

      {stage &&
        images.map((src, i) => <Slide key={src + i} src={src} i={i} pos={pos} stage={stage} group={group} appear={appear} hiddenNow={flying && i === index} />)}

      {/* the flying frame: from the thumbnail to the middle and back */}
      <motion.div
        className="pointer-events-none absolute overflow-hidden"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: radius,
          visibility: stage && flying ? "visible" : "hidden",
          // as in the app: no rim, just the picture on the dimmed window (a soft shadow keeps it lifted)
          boxShadow: "0 20px 50px rgb(0 0 0 / 0.35)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={images[index]} className="size-full max-w-none object-cover" draggable={false} />
      </motion.div>
      <motion.div className="contents" initial={{ opacity: 0 }} animate={{ opacity: closing ? 0 : 1 }} transition={{ duration: 0.18 }}>
        <motion.button
          type="button"
          aria-label="Close"
          className="absolute flex size-[28px] cursor-default items-center justify-center rounded-[6px] hover:bg-white/10"
          style={{ top: 12, right: 14 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 1 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={close}
        >
          <Icon name="close" size={16} />
        </motion.button>
        <motion.span className="pointer-events-none absolute" style={{ left: 20, bottom: 18 }} initial={{ opacity: 0 }} animate={{ opacity: closing ? 0 : 1 }}>
          {label}
        </motion.span>
        {group && (
          <motion.div
            className="absolute left-1/2 flex -translate-x-1/2 cursor-default items-center gap-[14px]"
            style={{ bottom: 12 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: closing ? 0 : 1 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Previous image"
              disabled={index === 0}
              className="flex size-[28px] items-center justify-center rounded-[6px] enabled:hover:bg-white/10 disabled:opacity-35"
              onClick={() => go(-1)}
            >
              <Icon name="chevronLeft" size={14} />
            </button>
            <span className="tabular-nums">
              {index + 1} of {images.length}
            </span>
            <button
              type="button"
              aria-label="Next image"
              disabled={index === images.length - 1}
              className="flex size-[28px] items-center justify-center rounded-[6px] enabled:hover:bg-white/10 disabled:opacity-35"
              onClick={() => go(1)}
            >
              <Icon name="chevronRight" size={14} />
            </button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
