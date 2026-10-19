"use client";

import { motion, useMotionValue, useTransform } from "motion/react";
import { useRef, useState, useSyncExternalStore } from "react";
import type { AppInfo } from "./data";
import { TrafficLights } from "./traffic-lights";
import { DRAG_REGION, MacWindow } from "./window";

// macOS iPhone Mirroring: the window IS the phone. At rest there is no
// window at all, just the iPhone's screen with a lit glass rim (a 1pt ring
// of ~9% white inside a 0.5pt dark outline, the same on every side).
// Pointing at the top of it grows a Liquid Glass window out around the
// screen, which stays put, with a title bar (traffic lights, Home Screen,
// App Switcher). Measured from 2x captures of macOS 27 mirroring an iPhone.
//
// The screen is laid out in iOS points (iPhone 18 Pro: 402×874pt, the
// 2622×1206 panel at 3x) and drawn at the size macOS mirrors it.

export const IPHONE_MIRRORING_APP: AppInfo = {
  id: "iphone-mirroring",
  name: "iPhone Mirroring",
  menus: ["Edit", "View", "Window", "Help"],
};

/** iPhone 18 Pro screen, in iOS points */
export const IPHONE_SCREEN = { w: 402, h: 874 };
/** Mac points per iOS point (the mirrored screen is 302pt wide) */
const SCALE = 302 / IPHONE_SCREEN.w;

const SW = IPHONE_SCREEN.w * SCALE;
const SH = IPHONE_SCREEN.h * SCALE;
/** The screen's corner, fitted to the capture's outline (within 0.7px): a
    superellipse(1.4) at 56pt. A rounder curve needs far less radius, which is
    what made the corners look off. */
const SR = 56;
const CORNER = "[corner-shape:superellipse(1.4)]";
/** as a window: title bar height, padding around the screen, top corner radius */
const TITLE = 40;
const PAD = 11;
const TOP_RADIUS = 24;

const W = SW + 2 * PAD;
const H = TITLE + SH + PAD;

/** Liquid Glass, as on macOS windows: fill, beam under the top rim, rims (the shadow is the shell's) */
const GLASS = {
  background: [
    "linear-gradient(to bottom, light-dark(rgb(255 255 255 / 0.22), rgb(255 255 255 / 0.07)) 0, light-dark(rgb(255 255 255 / 0.09), rgb(255 255 255 / 0.03)) 2px, transparent 4.5px)",
    "light-dark(rgb(250 250 252 / 0.72), rgb(30 30 32 / 0.72))",
  ].join(", "),
  backdropFilter: "blur(36px) saturate(1.8) brightness(1.08)",
  WebkitBackdropFilter: "blur(36px) saturate(1.8) brightness(1.08)",
  boxShadow: [
    "inset 0 1px 0 light-dark(rgb(255 255 255 / 0.85), rgb(255 255 255 / 0.16))",
    "inset 0 0 0 1px light-dark(rgb(255 255 255 / 0.35), rgb(255 255 255 / 0.08))",
  ].join(", "),
};

const SPRING = { type: "spring", stiffness: 380, damping: 30, mass: 0.9 } as const;

/** The default wallpaper: brushed graphite, lit from the top left. */
const WALLPAPER = [
  "radial-gradient(120% 60% at 30% 30%, rgb(255 255 255 / 0.28), transparent 60%)",
  "radial-gradient(80% 40% at 70% 75%, rgb(255 255 255 / 0.16), transparent 70%)",
  "linear-gradient(170deg, #4a4a4e 0%, #2b2b2e 45%, #48484c 70%, #1f1f21 100%)",
].join(", ");

/**
 * An iPhone Mirroring window. Children are the phone's screen, laid out in
 * iOS points (IPHONE_SCREEN); the status bar and Dynamic Island are drawn
 * over them.
 */
export function IPhoneMirroring({
  id = "iphone-mirroring",
  at,
  wallpaper = WALLPAPER,
  onHome,
  onAppSwitcher,
  children,
}: {
  id?: string;
  at?: (screen: { w: number; h: number }) => { x?: number; y?: number };
  /** a CSS background for the screen */
  wallpaper?: string;
  onHome?: () => void;
  onAppSwitcher?: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Hovering the top of the phone opens the title bar; it closes once the
  // pointer leaves or heads well down into the screen. While a button is
  // held (dragging the window) it stays open, and decides on release.
  const shellRef = useRef<HTMLDivElement>(null);
  const holding = useRef(false);
  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holding.current) return;
    const box = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - box.top) / (box.height / H);
    if (y < TITLE + 64) setOpen(true);
    else if (y > TITLE + 120) setOpen(false);
  };
  const hold = () => {
    holding.current = true;
    window.addEventListener(
      "pointerup",
      (e) => {
        holding.current = false;
        const box = shellRef.current?.getBoundingClientRect();
        const inside = box && e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
        if (!inside) setOpen(false);
      },
      { once: true },
    );
  };

  // The screen never moves: the glass grows and shrinks around it, and the
  // screen is offset by exactly as much as the glass's corner moves.
  const shellLeft = useMotionValue(PAD);
  const shellTop = useMotionValue(TITLE);
  const screenLeft = useTransform(shellLeft, (l) => PAD - l);
  const screenTop = useTransform(shellTop, (t) => TITLE - t);
  const shell = open
    ? { left: 0, top: 0, width: W, height: H }
    : { left: PAD, top: TITLE, width: SW, height: SH };
  const radius = open
    ? { top: TOP_RADIUS, bottom: SR + PAD }
    : { top: SR, bottom: SR };

  return (
    <MacWindow
      id={id}
      app={IPHONE_MIRRORING_APP}
      width={W}
      height={H}
      radius={0}
      at={at}
      fixedSize
      className="overflow-visible! select-none"
      // the window's box is the open window; at rest only the phone takes the pointer
      style={{ pointerEvents: "none" }}
    >
      {/* Hover is tracked over the phone plus the strip above it where the
          title bar appears, so moving up toward the bar doesn't fall off the
          phone before the glass has grown under the pointer. */}
      <div
        className="absolute inset-0"
        onPointerMove={track}
        onPointerDown={hold}
        onPointerLeave={() => !holding.current && setOpen(false)}
      >
      <div className="absolute" style={{ left: PAD, top: 0, width: SW, height: TITLE, pointerEvents: "auto" }} />
      <motion.div
        ref={shellRef}
        className={`absolute ${CORNER}`}
        initial={false}
        animate={{
          ...shell,
          borderTopLeftRadius: radius.top,
          borderTopRightRadius: radius.top,
          borderBottomLeftRadius: radius.bottom,
          borderBottomRightRadius: radius.bottom,
        }}
        transition={SPRING}
        style={{
          left: shellLeft,
          top: shellTop,
          pointerEvents: "auto",
          boxShadow: "0 0 0 0.5px rgb(0 0 0 / 0.85), 0 24px 70px rgb(0 0 0 / 0.45), 0 8px 20px rgb(0 0 0 / 0.25)",
        }}
      >
        {/* the window's glass only exists while it's open: it fades in as it grows */}
        <motion.div
          aria-hidden
          className={`absolute inset-0 [border-radius:inherit] ${CORNER}`}
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: open ? 0.16 : 0.22 }}
          style={GLASS}
        />
        {/* title bar */}
        <motion.div
          {...DRAG_REGION}
          className="absolute inset-x-0 top-0"
          style={{ height: TITLE, pointerEvents: open ? "auto" : "none" }}
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: open ? 0.2 : 0.12, delay: open ? 0.06 : 0 }}
        >
          <TrafficLights left={14} top={(TITLE - 13) / 2 + 1} />
          <div className="absolute right-[10px] flex gap-[6px]" style={{ top: (TITLE - 26) / 2 + 1 }}>
            <TitleButton label="Home Screen" onClick={onHome}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                {[2, 7, 12].flatMap((y) => [2, 7, 12].map((x) => <rect key={`${x}${y}`} x={x - 1.5} y={y - 1.5} width="3" height="3" rx="0.8" />))}
              </svg>
            </TitleButton>
            <TitleButton label="App Switcher" onClick={onAppSwitcher}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="5.5" y="1.5" width="9" height="13" rx="2" />
                <path d="M3.25 3.5v9M1 5v6" strokeLinecap="round" />
              </svg>
            </TitleButton>
          </div>
        </motion.div>

        {/* the screen: it stays where it is on screen while the glass moves around it */}
        <motion.div
          className={`absolute overflow-hidden bg-black ${CORNER}`}
          style={{ left: screenLeft, top: screenTop, width: SW, height: SH, borderRadius: SR }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: IPHONE_SCREEN.w, height: IPHONE_SCREEN.h, transform: `scale(${SCALE})`, background: wallpaper }}
          >
            {children}
            <StatusBar />
          </div>
          {/* the lit rim, over the content */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${CORNER}`}
            style={{ borderRadius: SR, boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.09), inset 0 0 0 1.5px rgb(255 255 255 / 0.02)" }}
          />
        </motion.div>
      </motion.div>
      </div>
    </MacWindow>
  );
}

function TitleButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={-1}
      onClick={onClick}
      className="grid size-[26px] cursor-default place-items-center rounded-[7px] text-[#a1a1a6] transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

// ─── Status bar (iOS points) ────────────────────────────────────────────────

const subscribeMinute = (onChange: () => void) => {
  const t = window.setInterval(onChange, 1000);
  return () => window.clearInterval(t);
};
const minuteNow = () => Math.floor(Date.now() / 60_000);

/** iOS's clock: "9:41" or "21:41", as the device's locale has it */
function useClock() {
  const minute = useSyncExternalStore(subscribeMinute, minuteNow, () => null);
  if (minute === null) return "9:41";
  return new Date(minute * 60_000)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .replace(/\s?[AP]\.?M\.?$/i, "");
}

// Drawn like the Mac's own menu bar, since that's what sits right above it:
// the clock in the menu bar clock's type (13pt regular with a 0.3pt stroke,
// here in iOS points so it lands at the same size on screen), and the menu
// bar's own Wi-Fi and battery glyphs. Both ears are centered on the Dynamic
// Island, vertically and within their own side.

/** the Dynamic Island, iOS points */
const ISLAND = { w: 125, h: 37, top: 11 };
const ISLAND_MID = ISLAND.top + ISLAND.h / 2;
const EAR_W = (IPHONE_SCREEN.w - ISLAND.w) / 2;
/** the menu bar's type and glyphs, converted to iOS points */
const MAC = 1 / SCALE;
/** Status icons are drawn at iOS's own size: the menu bar's glyphs, one iOS point per Mac point (so ¾ of their size in the menu bar). */
const ICON = 1;
const MENU_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif";

/** A menu bar glyph strip (33pt tall, 2x), with its ink's vertical center in the strip. */
function MenuGlyph({ id, width, inkMid }: { id: string; width: number; inkMid: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/os/macos/menubar/${id}.png`}
      alt=""
      width={width}
      height={33}
      className="block max-w-none"
      style={{ width: width * ICON, height: 33 * ICON, marginTop: (33 / 2 - inkMid) * 2 * ICON }}
    />
  );
}

/** Signal bars, in the same ink weight as the menu bar's Wi-Fi glyph (iOS points). */
function Signal() {
  return (
    <svg width={17 * ICON} height={12 * ICON} viewBox="0 0 17 12" fill="#fff">
      <rect x="0" y="7.75" width="3" height="4.25" rx="0.9" />
      <rect x="4.6" y="5.25" width="3" height="6.75" rx="0.9" />
      <rect x="9.2" y="2.5" width="3" height="9.5" rx="0.9" />
      <rect x="13.8" y="0" width="3" height="12" rx="0.9" opacity="0.35" />
    </svg>
  );
}

/** Time, Dynamic Island, signal, Wi-Fi and battery, white on the wallpaper. */
export function StatusBar() {
  const time = useClock();
  const ear = "absolute flex items-center justify-center";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 text-white" style={{ height: ISLAND.top * 2 + ISLAND.h }}>
      <div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black" style={{ top: ISLAND.top, width: ISLAND.w, height: ISLAND.h }} />
      {/* each ear is centered on the island's middle line, with the screen's corner curve allowed for */}
      <div className={ear} style={{ left: 8, width: EAR_W - 8, top: ISLAND_MID - 15, height: 30 }}>
        <span
          className="tabular-nums antialiased"
          style={{
            fontFamily: MENU_FONT,
            fontSize: 13 * MAC,
            lineHeight: 1,
            WebkitTextStroke: `${0.3 * MAC}px currentColor`,
          }}
        >
          {time}
        </span>
      </div>
      <div className={`${ear} gap-[5px]`} style={{ right: 8, width: EAR_W - 8, top: ISLAND_MID - 15, height: 30 }}>
        <Signal />
        <MenuGlyph id="wifi" width={19} inkMid={(19 + 43) / 4} />
        <MenuGlyph id="battery" width={28} inkMid={(19 + 47) / 4} />
      </div>
    </div>
  );
}
