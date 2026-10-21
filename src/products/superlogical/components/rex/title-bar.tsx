"use client";

import { AnimatePresence, animate, type AnimationPlaybackControls, motion, useMotionTemplate, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { DRAG_REGION, TrafficLights, useMacWindow } from "@/os/macos";
import { CloseIcon, CommandIcon, HostIcon, PlusIcon, ServerIcon, SidebarIcon } from "./icons";
import type { ProgramKind } from "./model";
import { TabChip, TITLE_OFFSET } from "./tab-chip";

/** A tab as the strip shows it; `device` is the machine it runs on, shown small under the title. */
export type TabView = { id: string; title: string; device: { name: string; remote: boolean }; front: ProgramKind; back: ProgramKind[] };

// Tab strip geometry (window-relative px, from the reference): each tab takes
// a 210pt slot and the active tab is a pill 2pt inside its slot. The
// reference's track starts at 190, after a session chip; ours has the sidebar
// toggle there instead (in the spot the sidebar's own header uses, so it
// stays put when the view changes) and the track starts 8pt after it. The track grows with its tabs
// until it reaches the ⌘ and + buttons, which hang off the right edge, and
// scrolls from there.
/** The sidebar toggle: a 24pt button at (84, 9), as in the sidebar's header */
const TOGGLE = { left: 84, top: 9, size: 24 };
const TRACK_LEFT = TOGGLE.left + TOGGLE.size + 8;
const SLOT = 210;
/** The ⌘ and + buttons: 21.5pt boxes, glyph centers 26pt apart, + centered 22pt from the right edge */
const ACTION = { box: 21.5, plus: 22, pitch: 26 };
const COMMAND_LEFT = ACTION.plus + ACTION.pitch + ACTION.box / 2;
/** The track stops this far short of the window's right edge (8pt before the ⌘ button). */
const ACTIONS_INSET = COMMAND_LEFT + 8;
/** Where the strip scrolls, its edges fade out over this much, on an ease so the last tab dissolves rather than being cut */
const FADE = 52;
/** A tab scrolled into view stops this far from the edge, clear of most of the fade */
const EDGE = 34;
/** The traffic lights' share of the bar: in full screen they leave it and
    everything after them moves in by this much (the sidebar toggle takes
    the lights' place). */
export const LIGHTS_SPACE = 71.5;
const GLIDE = "320ms cubic-bezier(0.2, 0.85, 0.25, 1)";
const SPRING = { type: "spring", stiffness: 520, damping: 42 } as const;
/** A tab's badge and title changing over: quick, no overshoot to speak of */
const SWAP = { type: "spring", stiffness: 560, damping: 38, mass: 0.7 } as const;

/** The machine a tab runs on, under its title: a small host or server glyph and its name. */
function TabDevice({ device }: { device: TabView["device"] }) {
  const Icon = device.remote ? ServerIcon : HostIcon;
  return (
    <span className="flex items-center gap-[3.5px] text-[9.5px] leading-[11px] font-medium text-[var(--rex-ink-faint)] [-webkit-text-stroke:0]">
      {/* the 14pt glyphs at 10pt */}
      <Icon className="shrink-0" style={{ width: 10, height: device.remote ? 7 : 6 }} />
      <span className="truncate">{device.name}</span>
    </span>
  );
}

/** Traffic lights, sidebar toggle, tab strip and window actions (window-relative px). */
export function TitleBar({
  width,
  tabs,
  active,
  sidebar,
  onToggleSidebar,
  onSelect,
  onClose,
  onNew,
  onPalette,
}: {
  /** the window's width */
  width: number;
  tabs: TabView[];
  active: string;
  /** with the sidebar showing, the strip and its neighbours step aside */
  sidebar: boolean;
  onToggleSidebar: () => void;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onPalette: () => void;
}) {
  const inset = useMacWindow()?.mode === "fullscreen" ? LIGHTS_SPACE : 0;
  const content = tabs.length * SLOT;
  const room = Math.max(SLOT, width - ACTIONS_INSET - (TRACK_LEFT - inset));
  const track = { left: TRACK_LEFT - inset, w: Math.min(content, room) };
  const pitch = SLOT;
  const activeIndex = tabs.findIndex((t) => t.id === active);

  // Adding or closing a tab moves the strip's width, its scroll and the
  // active pill. All three ride the same spring, from where they are now to
  // where they'll end up, so they move as one. (A CSS glide for the width
  // plus the browser's smooth scroll, aimed at the strip's old width,
  // overshot and bounced back while the pill was still on its way.)
  const scroller = useRef<HTMLDivElement>(null);
  const trackW = useMotionValue(track.w);
  const lastContent = useRef(content);
  useEffect(() => {
    // more tabs: the pill's spring; a window resize: the window's glide
    const grew = lastContent.current !== content;
    lastContent.current = content;
    const run = animate(trackW, track.w, grew ? SPRING : { duration: 0.32, ease: [0.2, 0.85, 0.25, 1] });
    return () => run.stop();
  }, [trackW, track.w, content]);

  // Scrolling once the strip is full: an ordinary mouse wheel scrolls it
  // sideways, the active tab is kept in view, and the edges fade in with
  // how much is hidden past them (so they never pop).
  const fadeStart = useMotionValue(0);
  const fadeEnd = useMotionValue(0);
  // stops along an ease-in curve from the edge's alpha up to opaque
  const up = (k: number) => (a: number) => a + (1 - a) * k;
  const s1 = useTransform(fadeStart, up(0.06));
  const s2 = useTransform(fadeStart, up(0.3));
  const s3 = useTransform(fadeStart, up(0.72));
  const e1 = useTransform(fadeEnd, up(0.06));
  const e2 = useTransform(fadeEnd, up(0.3));
  const e3 = useTransform(fadeEnd, up(0.72));
  const fadeMask = useMotionTemplate`linear-gradient(to right, rgb(0 0 0 / ${fadeStart}) 0, rgb(0 0 0 / ${s1}) ${FADE * 0.25}px, rgb(0 0 0 / ${s2}) ${FADE * 0.5}px, rgb(0 0 0 / ${s3}) ${FADE * 0.75}px, #000 ${FADE}px, #000 calc(100% - ${FADE}px), rgb(0 0 0 / ${e3}) calc(100% - ${FADE * 0.75}px), rgb(0 0 0 / ${e2}) calc(100% - ${FADE * 0.5}px), rgb(0 0 0 / ${e1}) calc(100% - ${FADE * 0.25}px), rgb(0 0 0 / ${fadeEnd}) 100%)`;
  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    const hidden = (px: number) => 1 - Math.min(1, Math.max(0, px / FADE));
    fadeStart.set(hidden(el.scrollLeft));
    fadeEnd.set(hidden(content - trackW.get() - el.scrollLeft));
  };
  useEffect(() => {
    measure();
    return trackW.on("change", measure);
  });
  const scrolling = useRef<AnimationPlaybackControls | null>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      scrolling.current?.stop();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  useEffect(() => {
    const el = scroller.current;
    if (!el || activeIndex < 0) return;
    // aimed at the strip's final width, not the one it has mid-animation
    const max = Math.max(0, content - track.w);
    const start = activeIndex * pitch;
    const end = start + pitch;
    const from = el.scrollLeft;
    let to = from;
    if (start < from + EDGE) to = start - EDGE;
    else if (end > from + track.w - EDGE) to = end - track.w + EDGE;
    to = Math.min(max, Math.max(0, to));
    if (Math.abs(to - from) < 0.5) return;
    scrolling.current = animate(from, to, { ...SPRING, onUpdate: (v) => (el.scrollLeft = v) });
    return () => scrolling.current?.stop();
  }, [activeIndex, pitch, track.w, content]);

  return (
    // The whole bar drags the window; tabs and buttons keep their clicks.
    <div {...DRAG_REGION} className="rex-ui absolute inset-x-0 top-0 h-[44px]">
      <TrafficLights left={14.5} top={14.75} />

      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: sidebar ? 0 : 1 }}
        transition={{ duration: 0.16 }}
        style={{ pointerEvents: sidebar ? "none" : "auto" }}
      >
        {/* The sidebar toggle, where the sidebar's header has its own */}
        <button
          type="button"
          aria-label="Show sidebar (⌃⌘S)"
          title="Show sidebar (⌃⌘S)"
          tabIndex={-1}
          onClick={onToggleSidebar}
          className="absolute grid cursor-default place-items-center rounded-[7px] text-[var(--rex-chrome-ink)] transition-colors hover:bg-[var(--rex-hover)]"
          style={{ left: TOGGLE.left - inset, top: TOGGLE.top, width: TOGGLE.size, height: TOGGLE.size, transition: `left ${GLIDE}, background-color 150ms` }}
        >
          <SidebarIcon />
        </button>

        <motion.div
          className="absolute top-[5.5px] h-[32.5px] rounded-full"
          style={{ left: track.left, width: trackW, background: "var(--rex-track)", transition: `left ${GLIDE}` }}
        >
        <motion.div
          ref={scroller}
          onScroll={measure}
          className="absolute inset-0 overflow-x-auto overflow-y-hidden rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}
        >
        <div className="relative h-full" style={{ width: content }}>
        <motion.div
          className="absolute top-[2.25px] h-[28.25px] rounded-full"
          initial={false}
          animate={{ left: 2 + activeIndex * pitch, width: pitch - 2 }}
          transition={SPRING}
          style={{
            background: "var(--rex-tab-active)",
            boxShadow: "var(--rex-tab-shadow)",
          }}
        />

        <div role="tablist" aria-label="Tabs">
          {/* a new tab fades in where it lands; the pill slides over to it */}
          <AnimatePresence initial={false}>
          {tabs.map((tab, i) => {
            const isActive = tab.id === active;
            const left = 2 + i * pitch;
            const textLeft = TITLE_OFFSET[Math.min(tab.back.length, 2)];
            const right = pitch - 2; // tab width
            return (
              <motion.div
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.title}
                onPointerDown={() => onSelect(tab.id)}
                className="group absolute top-[2.25px] h-[28.25px]"
                initial={{ opacity: 0, left }}
                animate={{ opacity: 1, left }}
                transition={{ left: SPRING, opacity: { duration: 0.2 } }}
                style={{ width: right }}
              >
                {/* When the tab's program changes, its badge dips out and the new
                    one springs in, and the title crossfades in place; both subtle. */}
                <AnimatePresence initial={false} mode="wait">
                  <motion.span
                    key={`${tab.front}|${tab.back.join()}`}
                    className="absolute"
                    style={{ left: 6.5, top: -0.75, width: 37, height: 28, transformOrigin: "14px 15px" }}
                    initial={{ scale: 0.86, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.86, opacity: 0, transition: { duration: 0.09, ease: "easeIn" } }}
                    transition={SWAP}
                  >
                    <TabChip left={0} top={0} front={tab.front} back={tab.back} />
                  </motion.span>
                </AnimatePresence>
                <motion.div
                  className={`absolute top-[2px] overflow-hidden text-[12px] leading-[14px] font-medium whitespace-nowrap [-webkit-text-stroke:0.1px_currentColor] ${
                    // Titles fade out at their tail (the reference fades the
                    // active title's last letter where its divider was). On hover the
                    // fade starts earlier, so nothing visible sits under the ×.
                    isActive
                      ? "[mask-image:linear-gradient(to_right,#000_calc(100%-16px),transparent)] group-hover:[mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent_calc(100%-7px))]"
                      : "[mask-image:linear-gradient(to_right,#000_calc(100%-22px),transparent)] group-hover:[mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent_calc(100%-9px))]"
                  }`}
                  initial={false}
                  // 14pt (active) or 12pt short of the tab's end;
                  // it moves over as the badge stack grows or shrinks
                  animate={{ left: textLeft, width: right - textLeft - (isActive ? 14 : 12) }}
                  transition={SWAP}
                  style={{
                    transition: "color 150ms",
                    color: isActive ? "var(--rex-tab-text)" : "var(--rex-tab-text-muted)",
                  }}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={tab.title}
                      className="block"
                      // crossfades in place
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                    >
                      {tab.title}
                    </motion.span>
                  </AnimatePresence>
                  {/* two lines in the 28pt tab: the title, then where it runs */}
                  <TabDevice device={tab.device} />
                </motion.div>
                {/* the close button, on hover */}
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  tabIndex={-1}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onClose(tab.id)}
                  className="absolute top-[5.75px] grid size-[14px] cursor-default place-items-center rounded-full text-[var(--rex-ink-muted)] opacity-0 transition-[opacity,background-color] duration-100 group-hover:opacity-100 hover:bg-[var(--rex-hover)] hover:text-[var(--rex-ink)]"
                  // centred at (right − 13.5, 12.75)
                  style={{ left: right - 20.5 }}
                >
                  <CloseIcon style={{ transform: "scale(0.75)" }} />
                </button>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
        </div>
        </motion.div>
        </motion.div>

        <button
          type="button"
          aria-label="Command palette"
          title="Command palette (⌘K)"
          tabIndex={-1}
          onClick={onPalette}
          className="absolute grid cursor-default place-items-center rounded-[6px] p-[5px] transition-colors hover:bg-[var(--rex-hover)]"
          style={{ left: width - COMMAND_LEFT, top: 11 }}
        >
          <CommandIcon style={{ color: "var(--rex-command-ink)" }} />
        </button>
        <button
          type="button"
          aria-label="New tab"
          title="New tab (⌥⌘T)"
          tabIndex={-1}
          onClick={onNew}
          className="absolute grid cursor-default place-items-center rounded-[6px] p-[5px] transition-colors hover:bg-[var(--rex-hover)]"
          style={{ left: width - ACTION.plus - ACTION.box / 2, top: 11 }}
        >
          <PlusIcon style={{ color: "var(--rex-command-ink)" }} />
        </button>
      </motion.div>
    </div>
  );
}
