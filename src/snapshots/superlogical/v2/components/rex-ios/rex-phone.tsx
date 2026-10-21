"use client";

import { animate, motion, type MotionValue, useMotionValue, useTransform } from "motion/react";
import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { appearanceStyle } from "../../os/macos";
import { AREA, gridSize, layout, leaves, neighborOf, type Pane, paneRows, type Rect, type SplitDir, type Tab, TERM, titles } from "../rex/model";
import { PROGRAMS } from "../rex/programs";
import { useRex } from "../rex/store";
import { TabChip } from "../rex/tab-chip";
import { Terminal } from "../rex/terminal";

// Rex for iPhone, portrait: "focus and peek". One pane fills the screen and
// the panes around it in the tab's real layout peek in from the side they
// sit on, so the desktop's tiles keep their places on the phone:
//
// - swipe the pane sideways to move to the pane on that side;
// - drag (or tap) the strip peeking above or below to move up or down
//   (a vertical swipe on the terminal itself is left for scrolling);
// - swipe the tab bar at the bottom to change tabs, as in Arc Search: the
//   whole page rides along and the next tab's bar slides in.
//
// It drives the same Rex as the Mac window, so both move together.
// Everything is in iOS points. Mirrored on the Mac it's drawn on a 402×874
// iPhone 18 Pro screen; standalone (a real phone's browser) it measures the
// screen it's on and keeps clear of the safe areas.

const SCREEN = { w: 402, h: 874 };
/** where panes live in the mirrored phone: below the status bar, above the tab bar */
const CONTENT = { y: 60, h: 718 };
/** the content box's size, which every card is laid out from */
type Geo = { w: number; h: number };
const GeoContext = createContext<Geo>({ w: SCREEN.w, h: CONTENT.h });
const MARGIN = 10;
/** how much of a neighbouring pane shows: a sliver at the sides, its header above and below */
const PEEK = { x: 12, y: 34 };
const GAP = 8;
/** the tab bar */
const BAR = { y: 790, h: 46, w: 300 };
/** tab pages sit this far apart, so a little dark shows between them mid-swipe */
const PAGE_GAP = 16;

/** the app's background, and the solid base under each pane */
const BASE = "#0c0c0e";
const SPRING = { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const;
const DIRS: SplitDir[] = ["left", "right", "up", "down"];

type Neighbors = Partial<Record<SplitDir, string>>;

const OPPOSITE: Record<SplitDir, SplitDir> = { left: "right", right: "left", up: "down", down: "up" };
/** The pane a swipe just came from: swiping back returns there, not to whichever pane is nearest. */
type Back = { at: string; dir: SplitDir; pane: string };

const onSide = (f: Rect, r: Rect, dir: SplitDir) =>
  dir === "left" ? r.x + r.w <= f.x + 1 : dir === "right" ? r.x >= f.x + f.w - 1 : dir === "up" ? r.y + r.h <= f.y + 1 : r.y >= f.y + f.h - 1;

function neighborsOf(tab: Tab, pane: string, back?: Back | null): Neighbors {
  if (leaves(tab.root).length < 2) return {};
  const rects = layout(tab.root, AREA).panes;
  const n = Object.fromEntries(DIRS.map((d) => [d, neighborOf(rects, pane, d)]).filter(([, id]) => id)) as Neighbors;
  if (back?.at === pane && rects[back.pane] && onSide(rects[pane], rects[back.pane], back.dir)) n[back.dir] = back.pane;
  return n;
}

/** A pane's card when it's the one in focus: the content box less room for whatever peeks around it. */
function cardRect(tab: Tab, pane: string, geo: Geo): Rect {
  const n = neighborsOf(tab, pane);
  const left = MARGIN + (n.left ? PEEK.x + GAP : 0);
  const right = MARGIN + (n.right ? PEEK.x + GAP : 0);
  const top = n.up ? PEEK.y + GAP : 0;
  const bottom = n.down ? PEEK.y + GAP : 0;
  return { x: left, y: top, w: geo.w - left - right, h: geo.h - top - bottom };
}

/** Where a neighbour's card sits while the focused card is at `card`, and the offset that brings it home. */
function approach(dir: SplitDir, card: Rect, home: Rect) {
  const at =
    dir === "right" ? { x: card.x + card.w + GAP, y: home.y } :
    dir === "left" ? { x: card.x - GAP - home.w, y: home.y } :
    dir === "down" ? { x: home.x, y: card.y + card.h + GAP } :
    { x: home.x, y: card.y - GAP - home.h };
  return { at, offset: { x: home.x - at.x, y: home.y - at.y } };
}

/** Pointer travel in iOS points, whatever size the phone is drawn at. */
function usePoints() {
  const root = useRef<HTMLDivElement>(null);
  // the screen's drawn size over its layout size (the Mac draws the phone smaller)
  const unit = () => (root.current ? root.current.getBoundingClientRect().width / root.current.offsetWidth : 1);
  return { root, unit };
}

type Swipe = { axis: "x" | "y" | null; x0: number; y0: number; t: number; px: number; py: number; vx: number; vy: number };

/**
 * Pointer handling for a swipe: locks to the first axis that moves 6pt,
 * reports travel and release velocity (points per second).
 */
function swipe(
  e: React.PointerEvent,
  unit: number,
  { allow, move, end }: { allow: (axis: "x" | "y") => boolean; move: (d: number, axis: "x" | "y") => void; end: (d: number, v: number, axis: "x" | "y" | null) => void },
) {
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  const s: Swipe = { axis: null, x0: e.clientX, y0: e.clientY, t: performance.now(), px: 0, py: 0, vx: 0, vy: 0 };
  const onMove = (ev: PointerEvent) => {
    const dx = (ev.clientX - s.x0) / unit;
    const dy = (ev.clientY - s.y0) / unit;
    const now = performance.now();
    const dt = Math.max(1, now - s.t);
    s.vx = ((dx - s.px) / dt) * 1000;
    s.vy = ((dy - s.py) / dt) * 1000;
    s.px = dx;
    s.py = dy;
    s.t = now;
    if (!s.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      const axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (!allow(axis)) return finish();
      s.axis = axis;
    }
    move(s.axis === "x" ? dx : dy, s.axis);
  };
  const finish = () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
  };
  const onUp = () => {
    finish();
    end(s.axis === "x" ? s.px : s.py, s.axis === "x" ? s.vx : s.vy, s.axis);
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
}

/** Past a third of the way, or flicked, the swipe goes through. */
const commits = (d: number, v: number, size: number) => Math.abs(d) > size / 3 || Math.abs(v) > 500;
/** Rubber band where there's nothing to go to. */
const resist = (d: number) => d * 0.25;

/**
 * `standalone`: filling a real phone's browser rather than the mirrored
 * screen, so the system draws the status bar and home indicator, and the
 * layout keeps to the safe areas.
 */
export function RexPhone({ standalone = false }: { standalone?: boolean }) {
  const { state, dispatch } = useRex();
  const { root, unit } = usePoints();
  const index = state.tabs.findIndex((t) => t.id === state.active);

  // The content box is placed by CSS (safe areas included) and measured.
  const content = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo>({ w: SCREEN.w, h: CONTENT.h });
  useLayoutEffect(() => {
    const el = content.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setGeo((g) => (g.w === el.offsetWidth && g.h === el.offsetHeight ? g : { w: el.offsetWidth, h: el.offsetHeight })));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const PAGE = geo.w + PAGE_GAP;
  const barW = Math.min(BAR.w, geo.w - 100);
  const pitch = barW + 12;

  // Tab swipes move the pages and the bar together (the bar a little slower).
  const tx = useMotionValue(0);
  useLayoutEffect(() => tx.set(0), [state.active, tx]);
  const ratio = useMotionValue(pitch / PAGE);
  useLayoutEffect(() => ratio.set(pitch / PAGE), [ratio, pitch, PAGE]);
  const barX = useTransform([tx, ratio], ([t, r]: number[]) => t * r);

  const goTab = (step: -1 | 1, velocity = 0) => {
    const to = state.tabs[index + step];
    if (!to) return animate(tx, 0, { ...SPRING, velocity });
    animate(tx, -step * PAGE, { ...SPRING, velocity }).then(() => dispatch({ type: "select-tab", tab: to.id }));
  };
  const onBarDown = (e: React.PointerEvent) => {
    // a tap on a neighbouring capsule goes to that tab (the bar holds the pointer, so it can't be a click)
    const tapped = Number((e.target as Element).closest("[data-step]")?.getAttribute("data-step") ?? 0);
    swipe(e, unit(), {
      allow: (axis) => axis === "x",
      move: (d) => {
        const edge = (d > 0 && index === 0) || (d < 0 && index === state.tabs.length - 1);
        tx.set(edge ? resist(d) : d);
      },
      end: (d, v, axis) => {
        if (!axis) return tapped && goTab(tapped as -1 | 1);
        if (commits(d, v, PAGE)) goTab(d < 0 ? 1 : -1, v);
        else animate(tx, 0, { ...SPRING, velocity: v });
      },
    });
  };

  const nearby = [-1, 0, 1].map((i) => state.tabs[index + i]).filter(Boolean) as Tab[];

  return (
    <GeoContext.Provider value={geo}>
    <div
      ref={root}
      className="rex-ui absolute inset-0 overflow-hidden select-none [-webkit-touch-callout:none]"
      data-appearance="dark"
      style={{ ...appearanceStyle("dark"), background: BASE }}
    >
      <div
        ref={content}
        className="absolute inset-x-0 overflow-hidden"
        style={
          standalone
            ? { top: "calc(env(safe-area-inset-top) + 8px)", bottom: `calc(env(safe-area-inset-bottom) + ${BAR.h + 20}px)` }
            : { top: CONTENT.y, height: CONTENT.h }
        }
      >
        {nearby.map((tab) => {
          const i = state.tabs.indexOf(tab) - index;
          return <TabPage key={tab.id} tab={tab} live={i === 0} shift={i * PAGE} tx={tx} unit={unit} />;
        })}
      </div>

      {/* the tab bar: the active tab's capsule, its neighbours peeking either side */}
      <div
        className="absolute inset-x-0 touch-none"
        style={{ height: BAR.h + 16, ...(standalone ? { bottom: "calc(env(safe-area-inset-bottom) + 2px)" } : { top: BAR.y - 8 }) }}
        onPointerDown={onBarDown}
      >
        {nearby.map((tab) => {
          const i = state.tabs.indexOf(tab) - index;
          return <TabCapsule key={tab.id} tab={tab} step={i} x={barX} shift={i * pitch} width={barW} />;
        })}
      </div>

      {/* home indicator (a real phone draws its own) */}
      {!standalone && <div className="absolute left-1/2 h-[5px] w-[140px] -translate-x-1/2 rounded-full bg-white/80" style={{ top: SCREEN.h - 13 }} />}
    </div>
    </GeoContext.Provider>
  );
}

function TabPage({ tab, live, shift, tx, unit }: { tab: Tab; live: boolean; shift: number; tx: MotionValue<number>; unit: () => number }) {
  const { state, dispatch } = useRex();
  const geo = useContext(GeoContext);
  const focus = tab.focus;
  const [back, setBack] = useState<Back | null>(null);
  const card = cardRect(tab, focus, geo);
  const n = neighborsOf(tab, focus, back);

  // Pane swipes move the focused card and everything peeking around it.
  const ox = useMotionValue(0);
  const oy = useMotionValue(0);
  useLayoutEffect(() => {
    ox.set(0);
    oy.set(0);
  }, [focus, ox, oy]);
  // (the tab's slot is a plain style; only the live offsets are motion values)
  const pageX = useTransform([tx, ox], ([t, o]: number[]) => t + o);

  const go = (dir: SplitDir, velocity = 0) => {
    const to = n[dir];
    const horizontal = dir === "left" || dir === "right";
    const mv = horizontal ? ox : oy;
    if (!to) return animate(mv, 0, { ...SPRING, velocity });
    const { offset } = approach(dir, card, cardRect(tab, to, geo));
    animate(mv, horizontal ? offset.x : offset.y, { ...SPRING, velocity }).then(() => {
      setBack({ at: to, dir: OPPOSITE[dir], pane: focus });
      dispatch({ type: "focus", pane: to });
    });
  };

  // `from` is the peeking strip the gesture started on, if any: a tap there goes to it
  const onPageDown = (from: SplitDir | null) => (e: React.PointerEvent) => {
    if (!live) return;
    e.stopPropagation();
    swipe(e, unit(), {
      // sideways anywhere; up and down only from the strips that peek there
      allow: (axis) => axis === "x" || from === "up" || from === "down",
      move: (d, axis) => {
        const dir: SplitDir = axis === "x" ? (d < 0 ? "right" : "left") : d < 0 ? "down" : "up";
        (axis === "x" ? ox : oy).set(n[dir] ? d : resist(d));
      },
      end: (d, v, axis) => {
        if (!axis) return from && go(from);
        const dir: SplitDir = axis === "x" ? (d < 0 ? "right" : "left") : d < 0 ? "down" : "up";
        const size = axis === "x" ? card.w : card.h;
        if (commits(d, v, size) && n[dir]) go(dir, v);
        else animate(axis === "x" ? ox : oy, 0, { ...SPRING, velocity: v });
      },
    });
  };

  return (
    // each tab's page is clipped to the screen, so its peeking panes never reach into the next tab's
    <motion.div className="absolute inset-y-0 overflow-hidden touch-pan-y" style={{ left: shift, width: geo.w, x: pageX }} onPointerDown={onPageDown(null)}>
      <motion.div className="absolute inset-0" style={{ y: oy }}>
      {DIRS.map((dir) => {
        const id = n[dir];
        if (!id) return null;
        const home = cardRect(tab, id, geo);
        const { at } = approach(dir, card, home);
        const vertical = dir === "up" || dir === "down";
        return (
          <PhonePane
            key={`${dir}-${id}`}
            tab={tab}
            pane={state.panes[id]}
            rect={{ ...home, x: at.x, y: at.y }}
            focused={false}
            grab={vertical}
            onPointerDown={onPageDown(dir)}
          />
        );
      })}
      <PhonePane key={focus} tab={tab} pane={state.panes[focus]} rect={card} focused />
      </motion.div>
    </motion.div>
  );
}

function PhonePane({
  tab,
  pane,
  rect,
  focused,
  grab = false,
  onPointerDown,
}: {
  tab: Tab;
  pane: Pane;
  rect: Rect;
  focused: boolean;
  /** strips above and below take vertical drags themselves */
  grab?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const { cols, rows } = gridSize(rect);
  const fullScreen = pane.program === "lazygit" || pane.program === "snake";
  let lines = paneRows(pane, cols);
  if (pane.follow && !fullScreen && lines.length > rows) lines = lines.slice(-rows);
  const icon = PROGRAMS[pane.program].icon;
  const fill = focused ? "var(--rex-pane-active)" : "var(--rex-pane-inactive)";
  return (
    <motion.div
      className="absolute overflow-hidden rounded-[18px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onPointerDown={onPointerDown}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        // the desktop's pane glass, over a solid base: nothing shows through on the phone
        // (a color can only be the last layer, so the pane's own color rides in a flat gradient)
        background: `var(--rex-pane-beam), linear-gradient(${fill}, ${fill}), ${BASE}`,
        boxShadow: "var(--rex-pane-shadow)",
        touchAction: grab ? "none" : undefined,
      }}
    >
      <div className="absolute" style={{ left: icon.x, top: icon.y }}>
        {icon.node}
      </div>
      <div
        className="absolute top-[9px] right-[44px] left-[34px] truncate text-[12.5px] leading-[17px] font-semibold [-webkit-text-stroke:0.1px_currentColor]"
        style={{ color: focused ? "var(--rex-ink)" : "var(--rex-ink-muted)" }}
      >
        {titles(pane).pane}
      </div>
      {focused && <MiniMap tab={tab} focus={pane.id} />}
      <div style={{ opacity: focused ? 1 : "var(--rex-dim)" }}>
        <Terminal rows={lines} top={TERM.top} left={TERM.left} focused={focused} />
      </div>
    </motion.div>
  );
}

/** The tab's tiles in miniature, the focused one lit: where you are, and where a swipe goes. */
function MiniMap({ tab, focus }: { tab: Tab; focus: string }) {
  const rects = layout(tab.root, AREA).panes;
  if (Object.keys(rects).length < 2) return null;
  const W = 24;
  const H = 16;
  return (
    <div className="absolute top-[10px] right-[12px]" style={{ width: W, height: H }} aria-hidden>
      {Object.entries(rects).map(([id, r]) => (
        <div
          key={id}
          className="absolute rounded-[2px] transition-colors duration-200"
          style={{
            left: ((r.x - AREA.x) / AREA.w) * W,
            top: ((r.y - AREA.y) / AREA.h) * H,
            width: (r.w / AREA.w) * W - 0.75,
            height: (r.h / AREA.h) * H - 0.75,
            background: id === focus ? "rgb(255 255 255 / 0.85)" : "rgb(255 255 255 / 0.2)",
          }}
        />
      ))}
    </div>
  );
}

function TabCapsule({ tab, step, x, shift, width }: { tab: Tab; step: number; x: MotionValue<number>; shift: number; width: number }) {
  const active = step === 0;
  const { state } = useRex();
  const focused = state.panes[tab.focus];
  const others = leaves(tab.root).filter((id) => id !== tab.focus);
  return (
    <motion.div
      data-step={step}
      className="absolute top-[8px] overflow-hidden rounded-full"
      style={{
        left: `calc(50% - ${width / 2}px + ${shift}px)`,
        x,
        width,
        height: BAR.h,
        opacity: active ? 1 : 0.55,
        background: "linear-gradient(to bottom, rgb(255 255 255 / 0.07), transparent 4px), rgb(255 255 255 / 0.08)",
        boxShadow: "inset 0 0.75px 0 rgb(255 255 255 / 0.22), inset 0 0 0 0.75px rgb(255 255 255 / 0.08), 0 8px 24px rgb(0 0 0 / 0.35)",
        backdropFilter: "blur(20px) saturate(1.6)",
      }}
    >
      <TabChip left={12} top={9} front={focused.program} back={others.map((id) => state.panes[id].program)} />
      <div className="absolute top-[7px] right-[18px] left-[60px] truncate text-[14px] leading-[18px] font-semibold text-white">{titles(focused).tab}</div>
      <div className="absolute top-[25px] right-[18px] left-[60px] truncate text-[11.5px] leading-[14px] text-white/50">
        {tab.session} · {others.length + 1} {others.length ? "panes" : "pane"}
      </div>
    </motion.div>
  );
}
