"use client";

import { animate, AnimatePresence, motion, useMotionValue } from "motion/react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icon";

// The image viewer (from the recording): the whole window dims to black at
// 82% and the image sits centered; the tool that produced it ("Read") is
// named bottom-left, a "1 of 3" pager with arrows sits bottom-center and a
// close button top-right. ← → page, Escape closes.
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
      <AnimatePresence>{viewing && <Lightbox key={viewing.id} viewing={viewing} onChange={setViewing} onClose={() => setViewing(null)} />}</AnimatePresence>
    </ViewerContext.Provider>
  );
}

type Box = { x: number; y: number; w: number; h: number; r: number };

const FLY = { type: "spring", stiffness: 380, damping: 36, mass: 0.9, restDelta: 0.5, restSpeed: 10 } as const;
/** the picture's largest size, as a share of the window */
const MAX_W = 0.72;
const MAX_H = 0.78;
const THUMB_RADIUS = 6;

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

function centered(overlay: HTMLElement, aspect: number): Box {
  const W = overlay.offsetWidth;
  const H = overlay.offsetHeight;
  let w = W * MAX_W;
  let h = w / aspect;
  if (h > H * MAX_H) {
    h = H * MAX_H;
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

function Lightbox({ viewing, onChange, onClose }: { viewing: Viewing; onChange: (v: Viewing) => void; onClose: () => void }) {
  const { images, index, label, sourceOf } = viewing;
  const overlay = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const w = useMotionValue(0);
  const h = useMotionValue(0);
  const radius = useMotionValue(8);
  const [ready, setReady] = useState(false);
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

  // Open, and page: start at the thumbnail (or just short of the center when
  // it has none on screen), then settle in the middle.
  useLayoutEffect(() => {
    const el = overlay.current;
    if (!el) return;
    let cancelled = false;
    const src = sourceOf?.(index) ?? null;
    loadAspect(images[index]).then((aspect) => {
      if (cancelled) return;
      const target = centered(el, aspect);
      const first = !ready;
      if (first) {
        const from = src ? boxIn(el, src) : { ...target, x: target.x + target.w * 0.02, y: target.y + target.h * 0.02, w: target.w * 0.96, h: target.h * 0.96 };
        flyTo(from, true);
        setReady(true);
      }
      // the thumbnail of the picture on show is the one that's away
      reveal();
      if (src) {
        src.style.visibility = "hidden";
        hidden.current = src;
      }
      flyTo(target);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per image only
  }, [index]);

  // Closing flies the picture back to wherever its thumbnail is now.
  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    const el = overlay.current;
    const src = sourceOf?.(index) ?? null;
    const back = el && src ? boxIn(el, src) : null;
    const done = () => {
      reveal();
      onClose();
    };
    if (back) flyTo(back).then(done);
    else done();
  }, [closing, sourceOf, index, flyTo, onClose]);

  useEffect(() => () => reveal(), []);

  const go = useCallback(
    (d: number) => onChange({ ...viewing, index: (index + d + images.length) % images.length }),
    [viewing, index, images.length, onChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, close]);

  return (
    <motion.div
      ref={overlay}
      data-no-drag
      className="absolute inset-0 z-[900] text-[13px]"
      style={{ color: "var(--cc-text-strong)" }}
      onClick={close}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "rgb(0 0 0 / 0.82)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: 0.22 }}
      />
      <motion.div
        className="absolute overflow-hidden"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: radius,
          visibility: ready ? "visible" : "hidden",
          // as in the app: no rim, just the picture on the dimmed window (a soft shadow keeps it lifted)
          boxShadow: "0 20px 50px rgb(0 0 0 / 0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={images[index]} className="size-full max-w-none object-cover" draggable={false} />
      </motion.div>
      <motion.div className="contents" initial={{ opacity: 0 }} animate={{ opacity: closing ? 0 : 1 }} transition={{ duration: 0.18 }}>
        <motion.button
          type="button"
          aria-label="Close"
          className="absolute flex size-[28px] items-center justify-center rounded-[6px] hover:bg-white/10"
          style={{ top: 12, right: 14 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 1 }}
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
        >
          <Icon name="close" size={16} />
        </motion.button>
        <motion.span className="absolute" style={{ left: 20, bottom: 18 }} initial={{ opacity: 0 }} animate={{ opacity: closing ? 0 : 1 }}>
          {label}
        </motion.span>
        {images.length > 1 && (
          <motion.div
            className="absolute left-1/2 flex -translate-x-1/2 items-center gap-[14px]"
            style={{ bottom: 12 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: closing ? 0 : 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Previous image"
              className="flex size-[28px] items-center justify-center rounded-[6px] hover:bg-white/10"
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
              className="flex size-[28px] items-center justify-center rounded-[6px] hover:bg-white/10"
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
