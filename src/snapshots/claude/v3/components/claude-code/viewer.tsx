"use client";

import { animate, AnimatePresence, motion, type MotionValue, useMotionValue, useTransform, type Variants } from "motion/react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAttachments } from "./attachments";
import { Icon } from "./icon";
import { bakeScratch, EMPTY_SCRATCH, type ImageMark, type ImageScratch, type OpenNote, ScratchLayer, type ScratchTool, scratchId } from "./scratchpad";

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
// it to the middle. A horizontal trackpad swipe steps one picture per swipe.
//
// Opening and closing are a shared-element move: the picture flies from
// the thumbnail that was clicked to the center and back. A clipped frame
// animates between the two rectangles with the image covering it, so a
// square thumbnail grows into the full picture without distorting; the
// thumbnail hides while its picture is away.
//
// Scratch (bottom-right) turns the picture on show into a scratchpad, for
// drawing and writing on it before passing it along: the neighbours slide
// away and fade, the picture grows to take their room, and the label, pager
// and close button give way to a tool bar at the bottom center. Write pins
// numbered notes to spots on the picture, Draw draws freehand and Box drags
// out rectangles (see scratchpad.tsx); ⌘Z takes back the last one. The
// window behind dims further while it's up. Done keeps it all on the image
// and, if there's anything on it, bakes it into a new image and attaches that
// to the composer with its notes, then closes; Cancel (or Escape) drops what
// changed and brings the viewer back as it was.

/** Where image i sits on the page (to fly from and back to), if it is on screen. */
export type SourceOf = (i: number) => HTMLElement | null;

type Viewing = { images: string[]; index: number; label: string; sourceOf?: SourceOf; id: number };

const ViewerContext = createContext<(images: string[], index: number, label: string, sourceOf?: SourceOf) => void>(() => {});

/** What the scratchpad put on each image (notes and marks), by image: it travels with the image wherever it goes next. */
type Scratches = Readonly<Record<string, ImageScratch>>;
const ScratchContext = createContext<Scratches>({});

/** Every image's notes and marks, by its `src`. */
export const useImageScratches = () => useContext(ScratchContext);

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
  const [scratches, setScratches] = useState<Scratches>({});
  const save = useCallback((src: string, next: ImageScratch) => setScratches((all) => ({ ...all, [src]: next })), []);
  return (
    <ViewerContext.Provider value={open}>
      <ScratchContext.Provider value={scratches}>
        {children}
        <AnimatePresence>
          {viewing && <Lightbox key={viewing.id} viewing={viewing} scratches={scratches} onSave={save} onClose={() => setViewing(null)} />}
        </AnimatePresence>
      </ScratchContext.Provider>
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
/** Carousel geometry: the gap between neighbouring pictures (pt, edge to edge as they sit beside the one on show), and how much a neighbour shrinks. Neighbours stay opaque: a faded one lets what's behind it show through. */
const GAP = 120;
const NEIGHBOUR_SCALE = 0.78;
/** sliding to a picture (keys, pager, release) */
const SNAP = { type: "spring", stiffness: 320, damping: 34, mass: 0.9 } as const;
/** past the first or last picture, the strip moves this fraction of the drag */
const RUBBER = 0.28;
/** a trackpad swipe steps one picture once it has travelled this far (pt) */
const SWIPE_STEP = 36;
/** before it steps, the strip leans this fraction of the way with the fingers */
const SWIPE_LEAN = 0.35;
/** a swipe (and its momentum) counts as over once the wheel has been quiet this long (ms) */
const WHEEL_QUIET_MS = 180;
/** a release projects the flick this far ahead (ms) to pick the picture to snap to */
const FLICK_MS = 160;
const THUMB_RADIUS = 6;
/** Scratchpad: the picture's largest size, as a share of the window, and how far the neighbours slide away (pt) as it grows */
const SCRATCH_MAX_W = 0.8;
const SCRATCH_MAX_H = 0.74;
const SCRATCH_PUSH = 160;
const SCRATCH = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;
const TOOLS: { id: ScratchTool; label: string; icon: "pen" | "text" | "square" }[] = [
  { id: "text", label: "Write", icon: "text" },
  { id: "pen", label: "Draw", icon: "pen" },
  { id: "square", label: "Box", icon: "square" },
];
/** ink colors, picked to read on any screenshot: clay first, the app's own accent, then red for what's wrong */
const INKS = ["#e87e5c", "#f0605a", "#ebeae6", "#4c8ff0", "#4ade80"];

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

/** The scratchpad's picture size: wider than the carousel's, with room left below for the tool bar. */
function scratchWidth(W: number, H: number, aspect: number) {
  return Math.min(W * SCRATCH_MAX_W, H * SCRATCH_MAX_H * aspect);
}

/** The picture's box in the scratchpad: the carousel's, grown about its middle. */
function scratchBox(W: number, H: number, aspect: number): Box {
  const w = scratchWidth(W, H, aspect);
  const h = w / aspect;
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

const scaleAt = (distance: number) => 1 - (1 - NEIGHBOUR_SCALE) * Math.min(1, distance);

/**
 * Each picture's offset from the middle (pt) with the strip at fractional
 * position p. Pictures differ in width, so they're laid out edge to edge at
 * their current size, one GAP apart, and the strip's view point slides
 * between their centres: at rest every gap is exactly GAP, and moving the
 * strip changes the layout continuously.
 */
function offsetsAt(widths: number[], p: number) {
  const c = [0];
  for (let i = 1; i < widths.length; i++)
    c.push(c[i - 1] + (scaleAt(Math.abs(i - 1 - p)) * widths[i - 1]) / 2 + GAP + (scaleAt(Math.abs(i - p)) * widths[i]) / 2);
  const view =
    c.length < 2
      ? 0
      : (() => {
          const k = Math.max(0, Math.min(c.length - 2, Math.floor(p)));
          return c[k] + (p - k) * (c[k + 1] - c[k]);
        })();
  return c.map((x) => x - view);
}

/** The strip's spacing at position p: how far it travels from one picture to the next there. */
function spacingAt(widths: number[], p: number) {
  if (widths.length < 2) return 1;
  const k = Math.max(0, Math.min(widths.length - 2, Math.floor(p)));
  const o = offsetsAt(widths, k);
  return o[k + 1] - o[k];
}

/** One picture in the strip: placed by its distance from the strip's position (`pos`, in pictures). */
function Slide({
  src,
  i,
  pos,
  stage,
  group,
  appear,
  focus,
  current,
  hiddenNow,
  widths,
  overlay,
}: {
  widths: number[];
  /** drawn over the picture, moving and scaling with it (`scale` is its scale on screen) */
  overlay?: (scale: MotionValue<number>, size: { w: number; h: number }) => ReactNode;
  src: string;
  i: number;
  pos: MotionValue<number>;
  stage: Stage;
  group: boolean;
  appear: MotionValue<number>;
  /** 0 in the viewer, 1 in the scratchpad (fractional on the way) */
  focus: MotionValue<number>;
  /** the picture on show, which the scratchpad grows; the rest make way */
  current: boolean;
  /** the picture on show while it flies (the flying frame stands in for it) */
  hiddenNow: boolean;
}) {
  const box = centered(stage.W, stage.H, stage.aspects[i], group);
  // the scratchpad grows the picture on show by transform, so the strip's layout never changes under it
  const grow = current ? scratchWidth(stage.W, stage.H, stage.aspects[i]) / box.w : 1;
  const x = useTransform([pos, focus], ([p, f]: number[]) => offsetsAt(widths, p)[i] + Math.sign(i - p) * SCRATCH_PUSH * f);
  const near = useTransform(pos, (p) => Math.min(1, Math.abs(i - p)));
  const scale = useTransform([near, focus], ([n, f]: number[]) => scaleAt(n) * (1 + (grow - 1) * f));
  // corners keep their size on screen as the picture grows
  const borderRadius = useTransform(focus, (f) => box.r / (1 + (grow - 1) * f));
  const fade = useTransform([pos, appear, focus], ([p, a, f]: number[]) => (i === Math.round(p) ? 1 : a * (1 - f)));
  return (
    <motion.div
      data-slide={i}
      className="absolute"
      style={{
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        borderRadius,
        x,
        scale,
        opacity: fade,
        visibility: hiddenNow ? "hidden" : "visible",
        boxShadow: "0 20px 50px rgb(0 0 0 / 0.35)",
      }}
    >
      {/* the picture clips to its corners; what's drawn over it (notes) may run past them */}
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={src} className="pointer-events-none size-full max-w-none object-cover" draggable={false} />
      </div>
      {overlay?.(scale, { w: box.w, h: box.h })}
    </motion.div>
  );
}

function Lightbox({
  viewing,
  scratches,
  onSave,
  onClose,
}: {
  viewing: Viewing;
  scratches: Scratches;
  onSave: (src: string, scratch: ImageScratch) => void;
  onClose: () => void;
}) {
  const { images, label, sourceOf } = viewing;
  const group = images.length > 1;
  const overlay = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(viewing.index);
  const [stage, setStage] = useState<Stage | null>(null);
  const [closing, setClosing] = useState(false);
  const [scratching, setScratching] = useState(false);
  const [tool, setTool] = useState<ScratchTool>("text");
  const [ink, setInk] = useState(INKS[0]);
  // the scratchpad works on a copy of the picture's notes and marks, kept on Done
  const [draft, setDraft] = useState<ImageScratch>(EMPTY_SCRATCH);
  const [openNote, setOpenNote] = useState<OpenNote>(null);
  // Done is drawing the scratches into a new image
  const [baking, setBaking] = useState(false);
  const { attach, originOf } = useAttachments();
  const [selected, setSelected] = useState<string | null>(null);
  // ⌘Z: how the picture's notes and marks were before each change, newest last
  const history = useRef<ImageScratch[]>([]);
  const record = () => history.current.push(draft);
  const editNotes = (f: (notes: ImageScratch["notes"]) => ImageScratch["notes"]) => setDraft((d) => ({ ...d, notes: f(d.notes) }));
  // 0 in the viewer, 1 in the scratchpad
  const focus = useMotionValue(0);
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
  const widths = useMemo(() => (stage ? stage.aspects.map((a) => centered(stage.W, stage.H, a, group).w) : [0]), [stage, group]);

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

  // Into the scratchpad: the strip settles on the picture on show, then it grows as the rest make way.
  const scratch = useCallback(
    (on: boolean) => {
      if (closing || flying) return;
      setScratching(on);
      setOpenNote(null);
      if (on) {
        setDraft(scratches[originOf(images[index])] ?? EMPTY_SCRATCH);
        history.current = [];
        setSelected(null);
        animate(pos, index, SNAP);
      }
      animate(focus, on ? 1 : 0, SCRATCH);
    },
    [closing, flying, pos, index, focus, scratches, images, originOf],
  );
  // Done: the picture keeps its marks and notes (the ones with something written)
  // and, with anything on it, it goes to the composer as a new image with its notes, and the viewer closes
  // (a baked image is scratched as its original, so Done replaces its attachment rather than adding one)
  const done = async () => {
    const src = originOf(images[index]);
    const kept = { ...draft, notes: draft.notes.filter((n) => n.text.trim()) };
    onSave(src, kept);
    if ((!kept.marks.length && !kept.notes.length) || !stage) return scratch(false);
    setOpenNote(null);
    setBaking(true);
    const aspect = stage.aspects[index];
    try {
      const baked = await bakeScratch(src, kept, centered(stage.W, stage.H, aspect, group).w, scratchWidth(stage.W, stage.H, aspect));
      attach({ ...baked, from: src });
      close();
    } catch {
      // couldn't draw it: the scratches are still kept on the picture
      scratch(false);
    } finally {
      setBaking(false);
    }
  };
  const mark = (m: ImageMark) => {
    record();
    setDraft((d) => ({ ...d, marks: [...d.marks, m] }));
  };
  const editMark = (m: ImageMark) => setDraft((d) => ({ ...d, marks: d.marks.map((x) => (x.id === m.id ? m : x)) }));
  // ⌘Z: back to how things were before the last change (a note added, a mark drawn, moved, resized or deleted)
  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    setOpenNote(null);
    setSelected(null);
    setDraft(prev);
  }, []);
  // Backspace or Delete: the selected mark goes, or the note open to read
  const remove = useCallback(() => {
    if (selected) {
      history.current.push(draft);
      setDraft((d) => ({ ...d, marks: d.marks.filter((m) => m.id !== selected) }));
      setSelected(null);
    } else if (openNote && !openNote.edit) {
      history.current.push(draft);
      setDraft((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== openNote.id) }));
      setOpenNote(null);
    }
  }, [selected, openNote, draft]);

  // Opening a note closes the one that was open; a note closed with nothing in it is no note.
  const showNote = useCallback(
    (next: OpenNote) => {
      const was = openNote?.id;
      if (was && was !== next?.id) editNotes((ns) => ns.filter((n) => n.id !== was || n.text.trim()));
      if (next) setSelected(null);
      setOpenNote(next);
    },
    [openNote],
  );
  // Clicking the picture: a new note while none is open; with one open, it closes, except a
  // new one still empty, which moves to the click instead of leaving an empty dot behind.
  const place = (x: number, y: number) => {
    const current = openNote && draft.notes.find((n) => n.id === openNote.id);
    if (current && openNote.edit && !current.text.trim()) {
      editNotes((ns) => ns.map((n) => (n.id === current.id ? { ...n, x, y } : n)));
      return;
    }
    if (openNote) return showNote(null);
    const id = scratchId("note");
    record();
    editNotes((ns) => [...ns, { id, x, y, text: "", ink }]);
    setOpenNote({ id, edit: true });
  };
  const pickInk = (c: string) => {
    setInk(c);
    // picking an ink with a note open, or a mark selected, recolors it
    if (openNote) editNotes((ns) => ns.map((n) => (n.id === openNote.id ? { ...n, ink: c } : n)));
    const m = selected && draft.marks.find((x) => x.id === selected);
    if (m && m.ink !== c) {
      record();
      editMark({ ...m, ink: c });
    }
  };

  // Closing flies the picture on show back to wherever its thumbnail is now.
  // From the scratchpad, the picture flies back from where it is there, its neighbours already gone.
  const close = useCallback(() => {
    if (closing || !stage) return;
    setClosing(true);
    const el = overlay.current;
    const fromScratch = focus.get() > 0;
    if (fromScratch) {
      setScratching(false);
      appear.jump(0);
      focus.jump(0);
    } else animate(appear, 0, { duration: 0.15 });
    pos.stop();
    pos.jump(index);
    const src = sourceOf?.(index) ?? null;
    const back = el && src ? boxIn(el, src) : null;
    const done = () => {
      reveal();
      onClose();
    };
    if (!back) return done();
    const aspect = stage.aspects[index];
    flyTo(fromScratch ? scratchBox(stage.W, stage.H, aspect) : centered(stage.W, stage.H, aspect, group), true);
    setFlying(true);
    flyTo(back).then(done);
  }, [closing, stage, appear, focus, pos, index, sourceOf, flyTo, group, onClose]);

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
    const win = overlay.current?.closest<HTMLElement>(".cc-window");
    win?.toggleAttribute("data-scratching", scratching);
    return () => win?.removeAttribute("data-scratching");
  }, [scratching]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape folds an open note first, then lets go of the selection, then leaves the scratchpad, then closes
      if (e.key === "Escape") return openNote ? showNote(null) : selected ? setSelected(null) : scratching ? scratch(false) : close();
      if (scratching) {
        // a note being written keeps ⌘Z and Backspace for its own text
        if (e.target instanceof HTMLTextAreaElement) return;
        if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          remove();
        }
        return;
      }
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, close, scratch, scratching, openNote, showNote, undo, remove, selected]);

  // Drag: the strip follows the pointer; a short press without movement is a click
  // (a neighbour comes to the middle, the backdrop closes, the picture on show stays).
  const drag = useRef<{ x0: number; p0: number; t0: number; lastX: number; lastT: number; v: number; moved: boolean; slide: number } | null>(null);

  // Trackpad: a horizontal swipe (or shift + wheel) steps one picture at a time. The strip
  // leans a little with the start of the swipe; once it passes SWIPE_STEP it snaps to the
  // next or previous picture at once, and the rest of that swipe (its momentum included) is
  // ignored until the fingers have been still for a moment, so one swipe is one step. A swipe
  // that never gets that far springs back. A native listener, so it can keep the page still.
  // the swipe in progress outlives the effect (stepping changes `index`, which re-runs it)
  const swipe = useRef<{ acc: number; locked: boolean; quiet?: ReturnType<typeof setTimeout> }>({ acc: 0, locked: false });
  useEffect(() => () => clearTimeout(swipe.current.quiet), []);
  useEffect(() => {
    const el = overlay.current;
    if (!el || !stage || !group) return;
    const sw = swipe.current;
    const slot = spacingAt(widths, index);
    const onWheel = (e: WheelEvent) => {
      const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      if (!dx || (!e.shiftKey && Math.abs(dx) < Math.abs(e.deltaY))) return;
      e.preventDefault();
      if (closing || flying || scratching || drag.current) return;
      clearTimeout(sw.quiet);
      sw.quiet = setTimeout(() => {
        // the swipe is over: unlock, and spring back if it never stepped
        if (!sw.locked && sw.acc) slideTo(index);
        sw.acc = 0;
        sw.locked = false;
      }, WHEEL_QUIET_MS);
      if (sw.locked) return;
      sw.acc += dx;
      if (Math.abs(sw.acc) >= SWIPE_STEP) {
        sw.locked = true;
        slideTo(index + Math.sign(sw.acc));
        return;
      }
      pos.stop();
      pos.set(index + (sw.acc / slot) * SWIPE_LEAN);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [stage, group, closing, flying, scratching, index, pos, slideTo, widths]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || closing || flying || scratching || !stage) return;
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
    let p = d.p0 - dx / spacingAt(widths, d.p0);
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
    const slot = spacingAt(widths, pos.get());
    const projected = pos.get() - (d.v * FLICK_MS) / slot;
    slideTo(Math.round(projected), (-d.v * 1000) / slot);
  };

  return (
    <motion.div
      ref={overlay}
      data-no-drag
      className="absolute inset-0 z-[900] text-[13px] select-none"
      // the viewer is dark in both appearances, so its controls are always light
      style={{ color: "#ebeae6", cursor: group && !flying && !scratching ? "grab" : undefined, touchAction: "none" }}
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
        images.map((src, i) => (
          <Slide
            key={src + i}
            // a baked image is scratched as its original, under its marks as they were
            src={scratching && i === index ? originOf(src) : src}
            i={i}
            pos={pos}
            stage={stage}
            group={group}
            appear={appear}
            focus={focus}
            current={i === index}
            hiddenNow={flying && i === index}
            widths={widths}
            overlay={(scale, size) => {
              const here = scratching && i === index;
              const shown = here ? draft : scratches[src];
              if (!here && !shown?.notes.length && !shown?.marks.length) return null;
              return (
                <ScratchLayer
                  scratch={shown ?? EMPTY_SCRATCH}
                  size={size}
                  scale={scale}
                  tool={here ? tool : null}
                  ink={ink}
                  annotating={here}
                  open={here ? openNote : null}
                  onPlace={place}
                  onOpen={showNote}
                  onChange={(id, text) => editNotes((ns) => ns.map((n) => (n.id === id ? { ...n, text } : n)))}
                  onMark={mark}
                  selected={here ? selected : null}
                  onSelect={setSelected}
                  onBeginEdit={record}
                  onEditMark={editMark}
                  onMoveNote={(id, x, y) => editNotes((ns) => ns.map((n) => (n.id === id ? { ...n, x, y } : n)))}
                />
              );
            }}
          />
        ))}

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
          style={{ top: 12, right: 14, pointerEvents: scratching ? "none" : undefined }}
          initial={{ opacity: 0 }}
          animate={{ opacity: closing || scratching ? 0 : 1 }}
          tabIndex={scratching ? -1 : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={close}
        >
          <Icon name="close" size={16} />
        </motion.button>
        <motion.span className="pointer-events-none absolute" style={{ left: 20, bottom: 18 }} initial={{ opacity: 0 }} animate={{ opacity: closing || scratching ? 0 : 1 }}>
          {label}
        </motion.span>
        {group && (
          <motion.div
            className="absolute left-1/2 flex -translate-x-1/2 cursor-default items-center gap-[14px]"
            style={{ bottom: 12, pointerEvents: scratching ? "none" : undefined }}
            initial={{ opacity: 0 }}
            animate={{ opacity: closing || scratching ? 0 : 1 }}
            inert={scratching}
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

        {/* bottom-right: Scratch in the viewer; Cancel and Done in the scratchpad. It comes and goes with
            the other controls (each fades itself: their wrapper is display: contents, which can't fade) */}
        <motion.div
          className="absolute flex items-center gap-[6px]"
          style={{ right: 14, bottom: 12 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 1 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* the leaving button stays pinned to the right edge while the arriving ones take its place */}
          <AnimatePresence mode="popLayout" anchorX="right" initial={false}>
            {scratching ? (
              <motion.div key="finish" className="flex items-center gap-[6px]" initial="out" animate="in" exit="out">
                <motion.button type="button" className={BUTTON} onClick={() => scratch(false)} variants={SWAP} custom={0}>
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  className="h-[30px] cursor-default rounded-[8px] bg-[#ebeae6] px-[12px] font-medium text-[#151515] hover:bg-white disabled:opacity-60"
                  disabled={baking}
                  onClick={done}
                  variants={SWAP}
                  custom={1}
                >
                  Done
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="scratch"
                type="button"
                className={`${BUTTON} flex items-center gap-[6px] pl-[10px]`}
                onClick={() => scratch(true)}
                variants={SWAP}
                initial="out"
                animate="in"
                exit="out"
              >
                <Icon name="pen" size={14} />
                Scratch
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* the scratchpad's tool bar, where the pager was */}
      <AnimatePresence>
        {scratching && (
          <motion.div
            role="toolbar"
            aria-label="Scratchpad tools"
            className="absolute left-1/2 flex cursor-default items-center gap-[2px] rounded-[10px] bg-[#1d1d1d]/90 p-[4px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_8px_24px_rgb(0_0_0/0.35)] backdrop-blur-md"
            style={{ bottom: 12, x: "-50%" }}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { ...SCRATCH, delay: 0.06 } }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.12 } }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label={t.label}
                aria-pressed={tool === t.id}
                title={t.label}
                className={`flex size-[28px] items-center justify-center rounded-[6px] ${tool === t.id ? "bg-white/[0.14]" : "hover:bg-white/[0.08]"}`}
                onClick={() => setTool(t.id)}
              >
                <Icon name={t.icon} size={15} />
              </button>
            ))}
            <span aria-hidden className="mx-[6px] h-[16px] w-px bg-white/[0.12]" />
            {INKS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Ink ${c}`}
                aria-pressed={ink === c}
                className="flex size-[28px] items-center justify-center rounded-[6px] hover:bg-white/[0.08]"
                // keep a note being written open while its ink changes
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickInk(c)}
              >
                <span
                  className="size-[14px] rounded-full transition-shadow duration-150"
                  style={{ background: c, boxShadow: ink === c ? `0 0 0 2px #1d1d1d, 0 0 0 3.5px ${c}` : "inset 0 0 0 1px rgb(0 0 0 / 0.2)" }}
                />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** a regular button, as in the app: a solid fill with no rim (the viewer is always dark) */
const BUTTON = "h-[30px] cursor-default rounded-[8px] bg-[#313130] px-[12px] text-[#f0efec] hover:bg-[#3a3a39]";

/**
 * The bottom-right buttons trade places: the leaving one blurs out quickly
 * and the arriving ones come into focus on a soft spring, just behind it and
 * one after the other from the right (`custom` is a button's place in line).
 */
const SWAP: Variants = {
  out: { opacity: 0, scale: 0.94, filter: "blur(4px)", transition: { duration: 0.12, ease: "easeIn" } },
  in: (order = 0) => ({
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 0.32, bounce: 0, delay: 0.06 + order * 0.04 },
  }),
};
