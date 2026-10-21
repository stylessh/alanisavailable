"use client";

import { AnimatePresence, animate, motion, type MotionValue, useMotionTemplate, useMotionValue, useTransform } from "motion/react";
import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { appearanceStyle } from "@/os/macos";
import { AREA, gridSize, layout, leaves, type Pane, paneRows, type Rect, type Tab, tabAttention, TERM, titles } from "../rex/model";
import { ATTENTION_EFFECTS } from "../rex/pane";
import { PROGRAMS } from "../rex/programs";
import { useRex } from "../rex/store";
import { TabChip } from "../rex/tab-chip";
import { SWAP, TabDevice } from "../rex/title-bar";
import { Terminal } from "../rex/terminal";

// Rex for iPhone, portrait: each tab is a deck of cards, a pile of its panes
// ordered by use: the focused one fills the screen and the rest wait behind
// it in the order you last had them, peeking out above. Only the few cards
// around the top of the deck are drawn, so a tab with any number of panes
// stays light.
//
// - swipe the front card away (either way) to send it to the back of the
//   pile and bring up the next one
//   (a vertical swipe on the terminal itself is left for scrolling);
// - the stack button fans the deck out, as Mail does with its drafts: every
//   card tilted back and spread down the screen, its top showing, the front
//   one at the bottom; tap one to bring it to the front;
// - swipe the tab bar at the bottom to change tabs, as in Arc Search: the
//   whole page rides along and the next tab's bar slides in.
//
// The tab bar and the status bar float: cards run on under them to the
// screen's edges, while the layout (and the text in it) stays clear of both.
//
// It drives the same Rex as the Mac window, so both move together.
// Everything is in iOS points. Mirrored on the Mac it's drawn on a 402×874
// iPhone 18 Pro screen; standalone (a real phone's browser) it measures the
// screen it's on and keeps clear of the safe areas.

const SCREEN = { w: 402, h: 874 };
/** where panes are laid out in the mirrored phone: below the status bar, above the tab bar */
const CONTENT = { y: 60, h: 718 };
/**
 * The layout box's size, which every card is laid out from, how far below
 * the screen's top it starts (the status bar's room, which pages scroll up
 * into), and how far the screen goes on below it, under the floating tab
 * bar: cards that reach the bottom of the box carry on down through it.
 */
type Geo = { w: number; h: number; above: number; under: number };
const GeoContext = createContext<Geo>({ w: SCREEN.w, h: CONTENT.h, above: CONTENT.y, under: SCREEN.h - CONTENT.y - CONTENT.h });
const MARGIN = 10;
/** the cards waiting behind the top one: how many show, and how far each steps in and up */
const DECK = { shown: 2, step: 9 };
/** a card dealt off the deck goes this far past the screen's edge */
const DEAL_GAP = 16;
/** the deck fanned out: where the first card's top is, how far apart cards are (at most and least), and how far back they lean */
const FAN = { top: 4, most: 210, least: 64, tilt: 24, perspective: 700 };
/** the tab bar */
const BAR = { y: 790, h: 46, w: 300 };
/** tab pages sit this far apart, so a little dark shows between them mid-swipe */
const PAGE_GAP = 16;

/** the app's background, and the solid base under each pane */
const BASE = "#0c0c0e";
const SPRING = { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const;

/** The top card's box in the layout: full width less margins, with room above for the cards peeking out behind it. */
const deckBox = (geo: Geo): Rect => {
  const top = DECK.shown * DECK.step;
  return { x: MARGIN, y: top, w: geo.w - 2 * MARGIN, h: geo.h - top };
};

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

  // The layout box is placed by CSS (safe areas included) and measured, as
  // is the screen below it that panes run on into.
  const content = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo>({ w: SCREEN.w, h: CONTENT.h, above: CONTENT.y, under: SCREEN.h - CONTENT.y - CONTENT.h });
  useLayoutEffect(() => {
    const el = content.current;
    const screen = root.current;
    if (!el || !screen) return;
    const measure = () => {
      const next = { w: el.offsetWidth, h: el.offsetHeight, above: el.offsetTop, under: screen.offsetHeight - el.offsetTop - el.offsetHeight };
      setGeo((g) => (g.w === next.w && g.h === next.h && g.above === next.above && g.under === next.under ? g : next));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(screen);
    return () => ro.disconnect();
  }, [root]);
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

  // The deck fanned out (or on its way): `fan` springs from 0 (the deck) to 1
  // (fanned), and every card blends between its two places by it, so the
  // move is one continuous, interruptible motion. While it's open, or still
  // closing, every card of the tab is drawn, not only the top few.
  const fan = useMotionValue(0);
  const [fanned, setFanned] = useState(false);
  const [spread, setSpread] = useState(false);
  // Each tab's pile: its panes front to back, in the order they were last
  // used on the phone. Picking a card puts it in front and the cards that
  // were before it move back a place; panes added or closed on the Mac join
  // at the back or drop out, and a pane focused there comes to the front.
  const [piles, setPiles] = useState<Record<string, string[]>>({});
  const pileOf = (tab: Tab) => {
    const panes = leaves(tab.root);
    const kept = (piles[tab.id] ?? panes).filter((id) => panes.includes(id));
    const all = [...kept, ...panes.filter((id) => !kept.includes(id))];
    return all[0] === tab.focus ? all : [tab.focus, ...all.filter((id) => id !== tab.focus)];
  };
  const setPile = (tab: string, pile: string[]) => setPiles((p) => ({ ...p, [tab]: pile }));
  // each tab's pile when the fan opened: the fan keeps that order until it has
  // closed, so picking a card (which reorders the pile) never reshuffles it
  const [fanPiles, setFanPiles] = useState<Record<string, string[]>>({});
  // the card tapped in the fan, on its way to the front of the deck
  const [opening, setOpening] = useState<string | null>(null);
  // the cards that were in front of it, pushed off the bottom, then fading back
  // in at their places in the deck once it's there
  const [fading, setFading] = useState<string[]>([]);
  const enter = useMotionValue(1);
  const setFan = (open: boolean) => {
    setFanned(open);
    if (open) {
      setFanPiles(Object.fromEntries(state.tabs.map((t) => [t.id, pileOf(t)])));
      setSpread(true);
    }
    return animate(fan, open ? 1 : 0, SPRING).then(() => {
      if (open) return;
      setSpread(false);
      setFanPiles({});
    });
  };
  const fadeIn = (ids: string[]) => {
    setFading(ids);
    enter.set(0);
    animate(enter, 1, { duration: 0.3, ease: "easeOut" }).then(() => setFading([]));
  };
  /**
   * A card tapped in the fan goes straight to the front of the deck, over
   * everything. The cards above it are behind it already and simply move back
   * to their places in the deck. The ones below it (in front of it) would have
   * to pass through it to get behind, so instead they slide off the bottom of
   * the screen, fading, and appear in the deck once it has landed.
   */
  const openCard = (tab: Tab, pane: string) => {
    const pile = pileOf(tab);
    const inFront = pile.slice(0, pile.indexOf(pane));
    setPile(tab.id, [pane, ...pile.filter((id) => id !== pane)]);
    setOpening(pane);
    setFading(inFront);
    dispatch({ type: "focus", pane });
    setFan(false).then(() => {
      setOpening(null);
      fadeIn(inFront);
    });
  };
  /** A swipe that went through: the front card goes to the back of the pile, fading in there. */
  const rotate = (tab: Tab) => {
    const pile = pileOf(tab);
    setPile(tab.id, [...pile.slice(1), pile[0]]);
    dispatch({ type: "focus", pane: pile[1] });
    fadeIn([pile[0]]);
  };

  return (
    <GeoContext.Provider value={geo}>
    <div
      ref={root}
      // clip, not hidden: a hidden overflow can still be scrolled (tilted cards are wider than the screen, and focus would scroll them in)
      className="rex-ui absolute inset-0 overflow-clip select-none [-webkit-touch-callout:none]"
      data-appearance="dark"
      style={{ ...appearanceStyle("dark"), background: BASE }}
    >
      {/* the layout box: measured only, it holds nothing */}
      <div
        ref={content}
        aria-hidden
        className="pointer-events-none invisible absolute inset-x-0"
        style={
          standalone
            ? { top: "calc(env(safe-area-inset-top) + 8px)", bottom: `calc(env(safe-area-inset-bottom) + ${BAR.h + 20}px)` }
            : { top: CONTENT.y, height: CONTENT.h }
        }
      />
      {/* the pages: the whole screen, under the status bar and the tab bar */}
      {/* its own stacking context (z-0), so the deck's card order stays under the bar */}
      <div className="absolute inset-0 z-0 overflow-clip">
        {nearby.map((tab) => {
          const i = state.tabs.indexOf(tab) - index;
          return (
            <TabPage
              key={tab.id}
              tab={tab}
              live={i === 0}
              shift={i * PAGE}
              tx={tx}
              unit={unit}
              fan={fan}
              spread={spread}
              fanned={fanned}
              pile={pileOf(tab)}
              fanPile={fanPiles[tab.id]}
              opening={opening}
              fading={fading}
              enter={enter}
              onOpen={(pane) => openCard(tab, pane)}
              onRotate={() => rotate(tab)}
            />
          );
        })}
      </div>
      {/* Under the tab bar the cards fade into the background rather than running
          square into the screen's rounded edge. A plain gradient, not a mask: an
          effect on the cards would hide them from the capsules' glass. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: geo.under + 24, background: `linear-gradient(to bottom, transparent, color-mix(in oklab, ${BASE} 80%, transparent) 55%, ${BASE})` }}
      />

      {/* the tab bar: the active tab's capsule, its neighbours peeking either side */}
      <div
        className="absolute inset-x-0 touch-none"
        style={{ height: BAR.h + 16, ...(standalone ? { bottom: "calc(env(safe-area-inset-bottom) + 2px)" } : { top: BAR.y - 8 }) }}
        onPointerDown={onBarDown}
      >
        {nearby.map((tab) => {
          const i = state.tabs.indexOf(tab) - index;
          return <TabCapsule key={tab.id} tab={tab} step={i} x={barX} shift={i * pitch} pitch={pitch} width={barW} />;
        })}
      </div>

      {/* the stack button: fans the deck out, and back */}
      <button
        type="button"
        aria-label={fanned ? "Close the stack" : "See the whole stack"}
        aria-pressed={fanned}
        onClick={() => setFan(!fanned)}
        className="absolute right-[16px] grid size-[44px] place-items-center rounded-full text-white transition-colors"
        style={{
          ...(standalone ? { bottom: `calc(env(safe-area-inset-bottom) + ${BAR.h + 28}px)` } : { top: BAR.y - 8 - 52 }),
          background: fanned ? "rgb(255 255 255 / 0.9)" : "linear-gradient(to bottom, rgb(255 255 255 / 0.07), transparent 4px), rgb(255 255 255 / 0.1)",
          color: fanned ? BASE : "white",
          boxShadow: "inset 0 0.75px 0 rgb(255 255 255 / 0.22), inset 0 0 0 0.75px rgb(255 255 255 / 0.08), 0 8px 24px rgb(0 0 0 / 0.35)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        }}
      >
        <StackIcon />
      </button>

      {/* home indicator (a real phone draws its own) */}
      {!standalone && <div className="absolute left-1/2 h-[5px] w-[140px] -translate-x-1/2 rounded-full bg-white/80" style={{ top: SCREEN.h - 13 }} />}
    </div>
    </GeoContext.Provider>
  );
}

function TabPage({
  tab,
  live,
  shift,
  tx,
  unit,
  fan,
  spread,
  fanned,
  pile,
  fanPile,
  opening,
  fading,
  enter,
  onOpen,
  onRotate,
}: {
  tab: Tab;
  live: boolean;
  shift: number;
  tx: MotionValue<number>;
  unit: () => number;
  /** 0: the deck, 1: fanned out */
  fan: MotionValue<number>;
  /** fanned out or on the way: every card is drawn */
  spread: boolean;
  /** fanned out (or opening): cards are tapped, not swiped */
  fanned: boolean;
  /** the tab's panes, front to back */
  pile: string[];
  /** the pile as it was when the fan opened, which the fan keeps until it's closed */
  fanPile?: string[];
  /** a card tapped in the fan, on its way to the front */
  opening: string | null;
  /** cards that were in front of a tapped card (or sent back behind a single other): they fade into the deck */
  fading: string[];
  enter: MotionValue<number>;
  onOpen: (pane: string) => void;
  /** a swipe went through: the front card goes to the back of the pile */
  onRotate: () => void;
}) {
  const { state } = useRex();
  const geo = useContext(GeoContext);
  const n = pile.length;
  const box = deckBox(geo);
  /** how far the top card travels to leave the screen */
  const deal = box.x + box.w + DEAL_GAP;
  // The swipe: dragging the front card either way takes it off that side and
  // brings the next one up; when it's gone, it goes to the back of the pile
  // (and fades in there). With one card there's nothing to swap it for.
  const dx = useMotionValue(0);
  const front = pile[0];
  useLayoutEffect(() => dx.set(0), [front, dx]);

  const go = (d: number, velocity = 0) => animate(dx, Math.sign(d) * deal, { ...SPRING, velocity }).then(onRotate);

  const onPageDown = (e: React.PointerEvent) => {
    if (!live || fanned) return;
    e.stopPropagation();
    swipe(e, unit(), {
      allow: (axis) => axis === "x",
      move: (d) => dx.set(n > 1 ? d : resist(d)),
      end: (d, v, axis) => {
        if (!axis) return;
        if (commits(d, v, box.w) && n > 1) go(d, v);
        else animate(dx, 0, { ...SPRING, velocity: v });
      },
    });
  };

  // Everything here moves by left and top, never a transform: content under
  // a transform drops out of the tab bar's glass (the browser stops sampling
  // it for the blur), so the capsules would go flat mid-swipe.
  const pageLeft = useTransform(tx, (t) => shift + t);

  // The front card and the ones behind it, plus one more that comes into view
  // as the deck moves up; fanned out, all of them.
  const cards = (spread ? pile : pile.slice(0, DECK.shown + 2)).map((id, rel) => ({ id, rel }));

  // Fanned out, cards are this far apart: as far as the screen allows, within
  // FAN's bounds. The front card stays in front, at the bottom, and the rest
  // rise up the screen in pile order, so as the deck opens they come up from
  // behind it rather than passing through it.
  const fanOrder = spread && fanPile ? fanPile : pile;
  const fanStep = n > 1 ? Math.min(FAN.most, Math.max(FAN.least, (geo.h - 160) / (n - 1))) : 0;
  /** a card's slot from the top of the fan (the front card's is the last) */
  const slotOf = (id: string) => fanOrder.length - 1 - fanOrder.indexOf(id);
  const target = opening && fanOrder.includes(opening) ? slotOf(opening) : null;

  return (
    // Each tab's page is clipped to the screen, so its cards never reach into the next tab's.
    <motion.div className="absolute inset-y-0 overflow-clip touch-pan-y" style={{ left: pageLeft, width: geo.w }} onPointerDown={onPageDown}>
      {/* cards are laid out in the layout box, which starts below the status bar */}
      <div className="absolute inset-x-0 bottom-0" style={{ top: geo.above }}>
        {/* keyed by pane, so a card stays the same card as the pile turns */}
        {cards.map(({ id, rel }) => (
          <DeckCard
            key={id}
            tab={tab}
            pane={state.panes[id]}
            rel={rel}
            dx={dx}
            box={box}
            deal={deal}
            fan={fan}
            fanTop={FAN.top + slotOf(id) * fanStep}
            fanZ={slotOf(id)}
            tilted={spread}
            leading={id === opening}
            // in front of the tapped card in the fan: off the bottom, out of its way
            pushed={target !== null && slotOf(id) > target}
            fadingIn={!spread && fading.includes(id)}
            enter={enter}
            onOpen={fanned ? () => onOpen(id) : undefined}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * A pane's card in the deck, `rel` places from the front. Its depth sets how far it steps in and up and
 * how much it darkens; the swipe moves every card by its share of the way.
 */
function DeckCard({
  tab,
  pane,
  rel,
  dx,
  box,
  deal,
  fan,
  fanTop,
  fanZ,
  tilted,
  leading = false,
  pushed = false,
  fadingIn = false,
  enter,
  onOpen,
}: {
  tab: Tab;
  pane: Pane;
  rel: number;
  /** the swipe: negative deals the top card off, positive brings the previous one back */
  dx: MotionValue<number>;
  box: Rect;
  deal: number;
  /** 0: in the deck, 1: fanned out; every place and color below blends between the two */
  fan: MotionValue<number>;
  /** fanned out: its top, and its place in the pile (lower cards lie over higher ones) */
  fanTop: number;
  fanZ: number;
  /** leaning back: only while fanned or on the way (a transform would hide the card from the tab bar's glass) */
  tilted: boolean;
  /** the card tapped in the fan: it stays over everything on its way to the front */
  leading?: boolean;
  /** in front of a tapped card in the fan: sliding off the bottom of the screen, fading as it goes */
  pushed?: boolean;
  /** back in the deck after being pushed: fading in by `enter` */
  fadingIn?: boolean;
  enter: MotionValue<number>;
  onOpen?: () => void;
}) {
  const { under } = useContext(GeoContext);
  /** how far the front card has gone, 0 to 1, whichever way it's swiped */
  const along = (v: number) => Math.min(1, Math.abs(v) / deal);
  // how deep in the deck: the cards behind move up a place as the front one goes
  const depth = useTransform(dx, (v) => Math.max(0, rel - along(v)));
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  // a card pushed out of a tapped card's way leaves from its place in the
  // fan, off the screen, rather than heading back to the deck
  const push = box.h + under;
  const left = useTransform([dx, depth, fan], ([v, d, f]: number[]) => {
    if (pushed) return box.x;
    // the front card follows the finger
    return mix(box.x + (rel === 0 ? v : 0) + d * DECK.step, box.x, f);
  });
  const top = useTransform([depth, fan], ([d, f]: number[]) =>
    pushed ? fanTop + (1 - f) * push : mix(box.y - Math.min(d, DECK.shown + 1) * DECK.step, fanTop, f),
  );
  const width = useTransform([depth, fan], ([d, f]: number[]) => (pushed ? box.w : mix(box.w - 2 * d * DECK.step, box.w, f)));
  // the card that rises into view fades in; the ones behind darken (fanned out, none do);
  // pushed cards fade as they go, and the deck behind a tapped card fades back in
  const opacity = useTransform([depth, fan, enter], ([d, f, e]: number[]) =>
    pushed ? f : mix(Math.min(1, Math.max(0, DECK.shown + 1 - d)), 1, f) * (fadingIn ? e : 1),
  );
  const shade = useTransform([depth, fan], ([d, f]: number[]) => (pushed ? 0 : Math.min(d, DECK.shown) * 0.2 * (1 - f)));
  // How focused it looks, 0 to 1, with the swipe rather than when it lands:
  // the front card fades out of it as it goes, the one coming up into it.
  // Fanned out, every card is shown in full.
  const focus = useTransform([dx, depth, fan], ([v, d, f]: number[]) =>
    pushed ? 1 : mix(rel === 0 ? 1 - along(v) : 1 - Math.min(1, d), 1, f),
  );
  // halfway open, the pile turns over: lower cards lie over higher ones, as in Mail
  const zIndex = useTransform(fan, (f) => (leading ? 100 : pushed || f > 0.5 ? 10 + fanZ : 40 - rel));
  const rotateX = useTransform(fan, (f) => -FAN.tilt * f);
  const pct = useTransform(focus, (f) => f * 100);
  // Darkening and focus are in the card's own colors, not layers over it: a
  // layer spanning the card (even an invisible one) stops the tab bar's glass
  // from seeing the card, so it goes flat.
  const background = useMotionTemplate`linear-gradient(rgb(0 0 0 / ${shade}), rgb(0 0 0 / ${shade})), var(--rex-pane-beam), linear-gradient(color-mix(in oklab, var(--rex-pane-inactive), var(--rex-pane-active) ${pct}%), color-mix(in oklab, var(--rex-pane-inactive), var(--rex-pane-active) ${pct}%)), ${BASE}`;
  const titleColor = useMotionTemplate`color-mix(in oklab, var(--rex-ink-muted), var(--rex-ink) ${pct}%)`;
  const textOpacity = useMotionTemplate`calc(var(--rex-dim) + (1 - var(--rex-dim)) * ${focus})`;

  const focused = rel === 0;
  const { cols, rows } = gridSize(box);
  const fullScreen = pane.program === "lazygit" || pane.program === "snake";
  let lines = paneRows(pane, cols);
  if (pane.follow && !fullScreen && lines.length > rows) lines = lines.slice(-rows);
  const icon = PROGRAMS[pane.program].icon;
  return (
    <motion.div
      className="absolute overflow-hidden rounded-[18px]"
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      aria-label={onOpen ? `Open ${titles(pane).pane}` : undefined}
      style={{
        left,
        top,
        width,
        // the top card runs on under the tab bar to the screen's edge; its rows stop above it
        height: box.h + under,
        opacity,
        zIndex,
        ...(tilted && { rotateX, transformPerspective: FAN.perspective, originY: 0 }),
        // the desktop's pane glass, over a solid base: nothing shows through on the phone
        // (a color can only be the last layer, so the pane's own color rides in a flat gradient)
        background,
        boxShadow: "var(--rex-pane-shadow), 0 -2px 12px rgb(0 0 0 / 0.35)",
      }}
    >
      <div className="absolute" style={{ left: icon.x, top: icon.y }}>
        {icon.node}
      </div>
      <motion.div
        className="absolute top-[9px] right-[44px] left-[34px] truncate text-[12.5px] leading-[17px] font-semibold [-webkit-text-stroke:0.1px_currentColor]"
        style={{ color: titleColor }}
      >
        {titles(pane).pane}
      </motion.div>
      <motion.div style={{ opacity: focus }}>
        <MiniMap tab={tab} focus={pane.id} />
      </motion.div>
      <motion.div style={{ opacity: textOpacity }}>
        <Terminal rows={lines} top={TERM.top} left={TERM.left} focused={focused} />
      </motion.div>
    </motion.div>
  );
}

/** The stack button's glyph: three cards, fanned. */
function StackIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M5 4.5h10" strokeLinecap="round" opacity="0.55" />
      <path d="M3.5 7.5h13" strokeLinecap="round" opacity="0.8" />
      <rect x="2.5" y="10" width="15" height="7" rx="2" />
    </svg>
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

function TabCapsule({
  tab,
  step,
  x,
  shift,
  pitch,
  width,
}: {
  tab: Tab;
  step: number;
  x: MotionValue<number>;
  shift: number;
  /** the distance between capsules */
  pitch: number;
  width: number;
}) {
  const { state } = useRex();
  // brightest in the middle, dimming as it slides a slot away: it lights up
  // and fades with the swipe instead of switching when the tab does
  const opacity = useTransform(x, (v) => 1 - 0.45 * Math.min(1, Math.abs(shift + v) / pitch));
  const focused = state.panes[tab.focus];
  const others = leaves(tab.root).filter((id) => id !== tab.focus);
  const back = others.map((id) => state.panes[id].program);
  const title = titles(focused).tab;
  const calling = tabAttention(state, tab);
  return (
    <motion.div
      data-step={step}
      className="absolute top-[8px] overflow-hidden rounded-full"
      style={{
        left: `calc(50% - ${width / 2}px + ${shift}px)`,
        x,
        width,
        height: BAR.h,
        opacity,
        background: "linear-gradient(to bottom, rgb(255 255 255 / 0.07), transparent 4px), rgb(255 255 255 / 0.08)",
        boxShadow: "inset 0 0.75px 0 rgb(255 255 255 / 0.22), inset 0 0 0 0.75px rgb(255 255 255 / 0.08), 0 8px 24px rgb(0 0 0 / 0.35)",
        backdropFilter: "blur(20px) saturate(1.6)",
      }}
    >
      {/* As on the desktop's tabs: when the session's focused tile changes,
          its badge dips out and the new one springs in, and the title crossfades. */}
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={`${focused.program}|${back.join()}`}
          className="absolute"
          style={{ left: 12, top: 9, width: 44, height: 28, transformOrigin: "14px 14px" }}
          initial={{ scale: 0.86, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.86, opacity: 0, transition: { duration: 0.09, ease: "easeIn" } }}
          transition={SWAP}
        >
          <TabChip left={0} top={0} front={focused.program} back={back} />
        </motion.span>
      </AnimatePresence>
      <div className="absolute top-[7px] left-[60px] text-[14px] leading-[18px] font-semibold text-white" style={{ right: calling ? 30 : 18 }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={title}
            className="block truncate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {title}
          </motion.span>
        </AnimatePresence>
      </div>
      {/* where the session runs, as the desktop's tabs show it */}
      <div className="absolute top-[26px] right-[18px] left-[60px]">
        <TabDevice device={state.devices[tab.device]} size={11.5} />
      </div>
      {/* one of its tiles calling for you: a dot in its tint, as on the desktop */}
      <AnimatePresence initial={false}>
        {calling && (
          <motion.span
            key={calling}
            aria-label={calling === "input" ? "Waiting for you" : "Finished"}
            className="absolute top-[19px] right-[16px] size-[8px] rounded-full"
            style={{ background: ATTENTION_EFFECTS[calling].tint }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={SWAP}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
