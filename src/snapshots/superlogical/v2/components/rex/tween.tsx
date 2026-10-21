"use client";

import { animate, type MotionValue, motionValue, useTransform } from "motion/react";
import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { Rect } from "./model";

// Every tile in the window (panes and the sidebar) moves on ONE shared
// progress value. A layout change snapshots where each tile is right now and
// interpolates all of them from there to the new layout together. Each
// frame is then a blend of two layouts that don't overlap, so tiles never
// overlap either, even when a change lands mid-animation. (Independent
// springs per tile drift apart when interrupted, which is what made tiles
// slide over each other.)

// Critically damped: no overshoot past the target layout.
const SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.9 } as const;
/** A tile's box, plus an alpha (default 1) for tiles that fade as they move, like panes pushed out by zoom. */
type Tile = Rect & { a?: number };
type Rects = Record<string, Tile>;
type Tween = { from: Rects; to: Rects; progress: MotionValue<number> };

const TweenContext = createContext<Tween | null>(null);
export const TweenProvider = TweenContext.Provider;

const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const lerp = (a: Tile, b: Tile, p: number): Tile => ({
  x: mix(a.x, b.x, p),
  y: mix(a.y, b.y, p),
  w: mix(a.w, b.w, p),
  h: mix(a.h, b.h, p),
  a: mix(a.a ?? 1, b.a ?? 1, p),
});

const keyOf = (rects: Rects) =>
  Object.entries(rects)
    .map(([id, r]) => `${id}:${r.x.toFixed(1)},${r.y.toFixed(1)},${r.w.toFixed(1)},${r.h.toFixed(1)},${r.a ?? 1}`)
    .join(";");

/**
 * Tweens tiles to `targets`. New tiles start from `enter(id)` (collapsed
 * against the edge they appear from); tiles that leave go to `exit(id)`.
 * Changing `reset` (a tab switch) or `instant` (a divider drag) jumps
 * straight to the targets.
 *
 * Each layout change starts a new generation with its own progress value
 * (created at 0), computed during render from where every tile is right now.
 */
export function useTween<Layout>({
  targets,
  layout,
  reset,
  instant,
  enter,
  exit,
}: {
  targets: Rects;
  /** what the targets were laid out from; exit() gets the previous one */
  layout: Layout;
  reset: string;
  instant: boolean;
  /** gets every tile's current rect, so a new tile can start from where its neighbour is right now */
  enter: (id: string, now: Rects) => Rect | null;
  /** where a tile that left goes: gets the layout it left, where it is now, and the new targets */
  exit: (id: string, previous: Layout, now: Rect, targets: Rects) => Rect | null;
}): Tween & {
  /** tiles on their way out, with the layout they belonged to; render them until they settle */
  ghosts: Record<string, Layout>;
  /** ghosts a newer change interrupted: they disappear rather than get run over */
  vanishing: Record<string, true>;
} {
  const key = `${reset}|${instant}|${keyOf(targets)}`;
  const [gen, setGen] = useState(() => ({
    key,
    reset,
    layout,
    ghosts: {} as Record<string, Layout>,
    vanishing: {} as Record<string, true>,
    run: false,
    from: targets,
    to: targets,
    progress: motionValue(1),
  }));

  if (gen.key !== key) {
    if (gen.reset !== reset || instant) {
      setGen({ key, reset, layout, ghosts: {}, vanishing: {}, run: false, from: targets, to: targets, progress: motionValue(1) });
    } else {
      const p = gen.progress.get();
      const now: Rects = {};
      for (const id of Object.keys(gen.to)) now[id] = lerp(gen.from[id] ?? gen.to[id], gen.to[id], p);
      const from: Rects = {};
      const to: Rects = {};
      const ghosts: Record<string, Layout> = {};
      const vanishing: Record<string, true> = {};
      for (const id of new Set([...Object.keys(now), ...Object.keys(targets)])) {
        if (targets[id]) {
          from[id] = now[id] ?? enter(id, now) ?? targets[id];
          to[id] = targets[id];
        } else if (gen.ghosts[id]) {
          // already leaving, and interrupted: stay put and disappear
          ghosts[id] = gen.ghosts[id];
          vanishing[id] = true;
          from[id] = to[id] = now[id];
        } else if (id in gen.vanishing || !now[id]) {
          continue;
        } else {
          ghosts[id] = gen.layout;
          from[id] = now[id];
          to[id] = exit(id, gen.layout, now[id], targets) ?? now[id];
        }
      }
      setGen({ key, reset, layout, ghosts, vanishing, run: true, from, to, progress: motionValue(0) });
    }
  }

  useLayoutEffect(() => {
    if (!gen.run) return;
    const run = animate(gen.progress, 1, SPRING);
    // once settled, tiles that left are gone for good
    run.then(() =>
      setGen((g) =>
        g.key === gen.key ? { ...g, ghosts: {}, vanishing: {}, from: pick(g.from, targets), to: pick(g.to, targets) } : g,
      ),
    );
    return () => run.stop();
    // one run per generation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen.key]);

  return { from: gen.from, to: gen.to, progress: gen.progress, ghosts: gen.ghosts, vanishing: gen.vanishing };
}

const pick = (rects: Rects, keep: Rects) =>
  Object.fromEntries(Object.entries(rects).filter(([id]) => id in keep));

/**
 * A tile's live box as motion values, plus an opacity that fades it out as
 * it nears zero size (so a collapsing tile never leaves a hairline).
 */
export function useTile(id: string, fallback: Tile) {
  const tween = useContext(TweenContext)!;
  const from = tween.from[id] ?? fallback;
  const to = tween.to[id] ?? fallback;
  const left = useTransform(tween.progress, (p) => from.x + (to.x - from.x) * p);
  const top = useTransform(tween.progress, (p) => from.y + (to.y - from.y) * p);
  const width = useTransform(tween.progress, (p) => from.w + (to.w - from.w) * p);
  const height = useTransform(tween.progress, (p) => from.h + (to.h - from.h) * p);
  const alpha = useTransform(tween.progress, (p) => mix(from.a ?? 1, to.a ?? 1, p));
  const opacity = useTransform(
    () => alpha.get() * Math.min(1, Math.max(0, Math.min(width.get(), height.get()) - 2) / 24),
  );
  return { left, top, width, height, opacity, alpha };
}
