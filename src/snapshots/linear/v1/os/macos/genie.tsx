"use client";

import { animate } from "motion/react";
import { domToCanvas } from "modern-screenshot";
import { useLayoutEffect, useRef } from "react";

// macOS's genie effect. CSS can't bend an element, so the window is drawn
// into a canvas from a snapshot, one row at a time: each row gets its own
// width and position along a funnel that runs down to the window's Dock
// tile. Two phases overlap, as on macOS: the bottom pinches toward the
// tile, then the whole window slides down into it. The tile opens up while
// this happens, so the funnel follows it frame by frame.

export type Box = { x: number; y: number; w: number; h: number };

/** Minimizing takes this long; restoring plays it backwards. */
const DURATION = 0.55;

/**
 * A window as an image, for the genie, corners and rims included. It's
 * taken out of its place on the screen for the capture, or the picture
 * would hold it offset and cropped.
 *
 * Glass can't be captured (nothing renders backdrop-filter into an image),
 * so it's baked in: the wallpaper under the window is drawn with the
 * window's own backdrop filter, and the window's translucent picture goes
 * on top. The first frame of the genie then looks just like the window.
 */
export async function snapshot(el: HTMLElement, pixelRatio: number) {
  const shot = await domToCanvas(el, {
    scale: pixelRatio,
    style: {
      position: "relative",
      left: "0px",
      top: "0px",
      right: "auto",
      bottom: "auto",
      margin: "0px",
      translate: "none",
      scale: "none",
      transform: "none",
      transition: "none",
      backdropFilter: "none",
      cornerShape: getComputedStyle(el).getPropertyValue("corner-top-left-shape"),
    } as Partial<CSSStyleDeclaration>,
  });
  return finish(shot, el);
}

/**
 * The window's outline as a canvas path: a rounded rectangle whose corners
 * follow its corner-shape. Chrome draws superellipse(K) as |x|^n + |y|^n = 1
 * with n = 2K (fitted on a rendered corner to within 0.2px); round is K = 1.
 */
function windowPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: number, shape: string) {
  const k = shape === "squircle" ? 2 : Number(shape.match(/superellipse\(([\d.]+)\)/)?.[1] ?? 1);
  const n = 2 * k;
  const steps = 24;
  // one quarter, from the end of the top edge round to the start of the side
  const corner = (cx: number, cy: number, sx: number, sy: number, from: number) => {
    for (let i = 0; i <= steps; i++) {
      const t = ((from + i / steps) * Math.PI) / 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const x = Math.sign(c) * Math.abs(c) ** (2 / n);
      const y = Math.sign(s) * Math.abs(s) ** (2 / n);
      ctx.lineTo(cx + sx * Math.abs(x) * r, cy + sy * Math.abs(y) * r);
    }
  };
  ctx.beginPath();
  ctx.moveTo(r, 0);
  corner(w - r, r, 1, -1, 1); // top right: from up round to right
  corner(w - r, h - r, 1, 1, 0); // bottom right
  corner(r, h - r, -1, 1, 1); // bottom left
  corner(r, r, -1, -1, 0); // top left
  ctx.closePath();
}

/** The first plain outline ring in a box-shadow list (no offset or blur, not inset), if any. */
function outlineOf(boxShadow: string) {
  const shadows = boxShadow.split(/,(?![^(]*\))/).map((x) => x.trim());
  for (const sh of shadows) {
    const m = sh.match(/^(rgba?\([^)]*\)) 0px 0px 0px ([\d.]+)px$/);
    if (m) return { color: m[1], width: parseFloat(m[2]) };
  }
  return null;
}

/**
 * Gives the snapshot the window's exact edge: clipped to its corner shape
 * (the capture rounds corners as plain circles), its outline ring drawn
 * just inside (it sits outside the box, where a capture can't reach), and
 * its glass baked in.
 */
async function finish(shot: HTMLCanvasElement, el: HTMLElement) {
  const style = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  const k = shot.width / box.width; // canvas pixels per page pixel
  const pagePerCss = box.width / el.offsetWidth;
  const out = document.createElement("canvas");
  out.width = shot.width;
  out.height = shot.height;
  const ctx = out.getContext("2d")!;
  const r = parseFloat(style.borderTopLeftRadius) * pagePerCss * k;
  windowPath(ctx, out.width, out.height, r, style.getPropertyValue("corner-top-left-shape") || "round");
  ctx.save();
  ctx.clip();
  await drawGlass(ctx, el, style, box, k, pagePerCss);
  ctx.drawImage(shot, 0, 0);
  const ring = outlineOf(style.boxShadow);
  if (ring) {
    // stroked on the path and clipped, so only its inner half shows
    ctx.lineWidth = ring.width * 2 * pagePerCss * k;
    ctx.strokeStyle = ring.color;
    ctx.stroke();
  }
  ctx.restore();
  return out;
}

/** The wallpaper under the window, through the window's backdrop filter. */
async function drawGlass(ctx: CanvasRenderingContext2D, el: HTMLElement, style: CSSStyleDeclaration, box: DOMRect, k: number, pagePerCss: number) {
  const filter = style.backdropFilter;
  const shown = el.closest(".mac-screen")?.querySelector<HTMLImageElement>(".mac-wallpaper");
  if (!filter || filter === "none" || !shown?.currentSrc) return;
  // The wallpaper's own file: with srcset the page reports a size scaled
  // by pixel density, not the bitmap's, which would misplace the crop.
  const wallpaper = new Image();
  wallpaper.src = shown.currentSrc;
  await wallpaper.decode().catch(() => null);
  if (!wallpaper.naturalWidth) return;

  // the wallpaper as the screen shows it (object-fit: cover), under the window
  const wr = shown.getBoundingClientRect();
  const s = Math.max(wr.width / wallpaper.naturalWidth, wr.height / wallpaper.naturalHeight);
  const ox = wr.left + (wr.width - wallpaper.naturalWidth * s) / 2;
  const oy = wr.top + (wr.height - wallpaper.naturalHeight * s) / 2;
  const pad = 60; // page px of margin, so the blur doesn't darken the edges
  ctx.filter = filter.replace(/blur\(([\d.]+)px\)/, (_, px: string) => `blur(${parseFloat(px) * pagePerCss * k}px)`);
  ctx.drawImage(
    wallpaper,
    (box.left - pad - ox) / s,
    (box.top - pad - oy) / s,
    (box.width + 2 * pad) / s,
    (box.height + 2 * pad) / s,
    -pad * k,
    -pad * k,
    (box.width + 2 * pad) * k,
    (box.height + 2 * pad) * k,
  );
  ctx.filter = "none";
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** A small picture of the window for its Dock tile. */
export function thumbnail(src: HTMLCanvasElement, width = 240) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round((src.height / src.width) * width);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

/** Draws the window at progress p (0 = the window, 1 = inside its tile). */
function draw(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, from: Box, to: Box, p: number, k: number) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  // the funnel forms first, then the window pours down into it
  const pinch = easeInOut(clamp(p / 0.5));
  const pour = easeInOut(clamp((p - 0.28) / 0.72));
  const bottom = lerp(from.y + from.h, to.y + to.h, pinch);
  const top = lerp(from.y, to.y, pour);
  if (bottom - top < 0.5) return;
  const drop = Math.max(1, to.y - from.y);
  ctx.globalAlpha = 1 - clamp((p - 0.82) / 0.18);
  // one strip per two device rows: smooth curves, cheap enough for 60fps
  const step = 2 / k;
  for (let y = top; y < bottom; y += step) {
    const v = (y - top) / (bottom - top);
    const bend = smooth(clamp((y - from.y) / drop)) * pinch;
    const left = lerp(from.x, to.x, bend);
    const right = lerp(from.x + from.w, to.x + to.w, bend);
    const sy = v * src.height;
    ctx.drawImage(src, 0, sy, src.width, Math.max(1, (step / (bottom - top)) * src.height), left * k, y * k, (right - left) * k, step * k + 0.5);
  }
  ctx.globalAlpha = 1;
}

/**
 * The genie, over the whole screen: `out` minimizes (window into icon),
 * `in` restores. Coordinates are screen points; `pixelRatio` is device
 * pixels per point.
 */
export function Genie({
  source,
  from,
  target,
  dir,
  screen,
  pixelRatio,
  onDone,
}: {
  source: HTMLCanvasElement;
  from: Box;
  /** where the window goes, read every frame (its Dock tile moves as it opens or closes) */
  target: () => Box | null;
  dir: "out" | "in";
  screen: { w: number; h: number };
  pixelRatio: number;
  onDone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    done.current = onDone;
  });

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    // the tile's last known box, for when it has already gone from the Dock
    let last: Box = target() ?? { x: from.x + from.w / 2, y: screen.h, w: 1, h: 1 };
    const frame = (p: number) => {
      last = target() ?? last;
      draw(ctx, source, from, last, p, pixelRatio);
    };
    // first frame now, so there's no gap between the window and its picture
    frame(dir === "out" ? 0 : 1);
    const run = animate(dir === "out" ? 0 : 1, dir === "out" ? 1 : 0, {
      duration: DURATION,
      ease: "linear",
      onUpdate: frame,
      onComplete: () => done.current(),
    });
    return () => run.stop();
    // one run per genie
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      width={Math.round(screen.w * pixelRatio)}
      height={Math.round(screen.h * pixelRatio)}
      className="pointer-events-none absolute top-0 left-0 z-[999]"
      // the window's drop shadow, which a snapshot can't hold, follows the bent shape
      style={{ width: screen.w, height: screen.h, filter: "drop-shadow(0 12px 22px rgb(0 0 0 / 0.38)) drop-shadow(0 3px 7px rgb(0 0 0 / 0.2))" }}
    />
  );
}
