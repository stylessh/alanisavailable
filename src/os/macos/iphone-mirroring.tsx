"use client";

import { motion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import type { AppInfo } from "./data";
import { TrafficLights } from "./traffic-lights";
import { DRAG_REGION, MacWindow } from "./window";

// macOS iPhone Mirroring: the window IS the phone. At rest it's the iPhone's
// screen in a thin glass bezel, shaped like the device. Pointing at the top
// of it morphs the bezel into a window: it grows outward into a title bar
// (traffic lights, Home Screen, App Switcher) and the screen drops into it.
// Measured from captures of macOS 27 mirroring an iPhone.
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
/** display corner radius, iOS points */
const SCREEN_RADIUS = 62;
/** Mac points per iOS point (the mirrored screen is 295pt wide) */
const SCALE = 295 / IPHONE_SCREEN.w;

const SW = IPHONE_SCREEN.w * SCALE;
const SH = IPHONE_SCREEN.h * SCALE;
const SR = SCREEN_RADIUS * SCALE;
/** the glass bezel around the screen at rest */
const BEZEL = 3.5;
/** as a window: title bar height, padding around the screen, top corner radius */
const TITLE = 40;
const PAD = 11;
const TOP_RADIUS = 24;
/** how far the screen drops when the title bar opens (the rest is the window growing up) */
const DROP = 22;

const W = SW + 2 * PAD;
const H = TITLE + SH + PAD;
const REST_TOP = TITLE - DROP;

const SPRING = { type: "spring", stiffness: 380, damping: 30, mass: 0.9 } as const;
const FADE = { duration: 0.18 };

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
  // pointer leaves or heads well down into the screen.
  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const scale = box.height / H;
    const y = (e.clientY - box.top) / scale;
    if (y < REST_TOP + 64) setOpen(true);
    else if (y > TITLE + 120) setOpen(false);
  };

  const shell = open
    ? { left: 0, top: 0, width: W, height: H }
    : { left: PAD - BEZEL, top: REST_TOP - BEZEL, width: SW + 2 * BEZEL, height: SH + 2 * BEZEL };
  const radius = open
    ? { top: TOP_RADIUS, bottom: SR + PAD }
    : { top: SR + BEZEL, bottom: SR + BEZEL };

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
      <motion.div
        className="absolute [corner-shape:superellipse(1.6)]"
        initial={false}
        animate={{
          ...shell,
          borderTopLeftRadius: radius.top,
          borderTopRightRadius: radius.top,
          borderBottomLeftRadius: radius.bottom,
          borderBottomRightRadius: radius.bottom,
        }}
        transition={SPRING}
        onPointerMove={track}
        onPointerLeave={() => setOpen(false)}
        style={{
          pointerEvents: "auto",
          boxShadow: "0 0 0 0.5px rgb(0 0 0 / 0.7), 0 24px 60px rgb(0 0 0 / 0.45), 0 4px 14px rgb(0 0 0 / 0.25)",
        }}
      >
        {/* the phone's glass bezel, which fades into the window's material */}
        <motion.div
          aria-hidden
          className="absolute inset-0 [border-radius:inherit] [corner-shape:inherit]"
          initial={false}
          animate={{ opacity: open ? 0 : 1 }}
          transition={FADE}
          style={{
            background: "linear-gradient(155deg, #9a9a9f 0%, #4a4a4e 22%, #2a2a2d 55%, #5c5c60 85%, #8d8d92 100%)",
            boxShadow: "inset 0 0.75px 0 rgb(255 255 255 / 0.45), inset 0 0 0 0.75px rgb(255 255 255 / 0.12)",
          }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-0 [border-radius:inherit] [corner-shape:inherit]"
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={FADE}
          style={{
            background: "linear-gradient(to bottom, rgb(255 255 255 / 0.07), transparent 4px), rgb(44 44 47 / 0.92)",
            backdropFilter: "blur(30px) saturate(1.6)",
            WebkitBackdropFilter: "blur(30px) saturate(1.6)",
            boxShadow: "inset 0 0.75px 0 rgb(255 255 255 / 0.22), inset 0 0 0 0.75px rgb(255 255 255 / 0.08)",
          }}
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

        {/* the screen: fixed in size, it rides down into the window */}
        <motion.div
          className="absolute overflow-hidden bg-black [corner-shape:superellipse(1.6)]"
          initial={false}
          animate={open ? { left: PAD, top: TITLE } : { left: BEZEL, top: BEZEL }}
          transition={SPRING}
          style={{ width: SW, height: SH, borderRadius: SR, boxShadow: "0 0 0 0.75px rgb(0 0 0 / 0.85)" }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: IPHONE_SCREEN.w, height: IPHONE_SCREEN.h, transform: `scale(${SCALE})`, background: wallpaper }}
          >
            {children}
            <StatusBar />
          </div>
        </motion.div>
      </motion.div>
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

/** Time, Dynamic Island, signal, Wi-Fi and battery, white on the wallpaper. */
export function StatusBar({ battery = 82 }: { battery?: number }) {
  const time = useClock();
  const low = battery <= 20;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[54px] text-white">
      {/* the Dynamic Island */}
      <div className="absolute top-[11px] left-1/2 h-[37px] w-[125px] -translate-x-1/2 rounded-full bg-black" />
      <div
        className="absolute top-[14px] left-[30px] w-[60px] text-center text-[17px] leading-[22px] font-semibold tracking-[-0.4px] tabular-nums"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif" }}
      >
        {time}
      </div>
      <div className="absolute top-[19px] right-[28px] flex items-center gap-[6px]">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.9" />
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.9" />
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.9" />
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.9" opacity="0.35" />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <path d="M8.5 2.2c2.5 0 4.8 1 6.5 2.6l1.3-1.4A11 11 0 0 0 8.5.3 11 11 0 0 0 .7 3.4L2 4.8a9.2 9.2 0 0 1 6.5-2.6Z" />
          <path d="M8.5 5.8c1.5 0 2.9.6 4 1.6l1.3-1.4A7.7 7.7 0 0 0 8.5 3.9 7.7 7.7 0 0 0 3.2 6l1.3 1.4c1-1 2.5-1.6 4-1.6Z" />
          <path d="M8.5 9.4c.6 0 1.1.2 1.5.6L8.5 11.6 7 10c.4-.4.9-.6 1.5-.6Z" />
        </svg>
        <div className="relative flex items-center">
          <div
            className="grid h-[13px] w-[25px] place-items-center rounded-[4.3px] text-[10.5px] leading-none font-bold tabular-nums"
            style={{
              background: low ? "#ff3b30" : `linear-gradient(to right, #fff ${battery}%, rgb(255 255 255 / 0.35) ${battery}%)`,
              color: low ? "#fff" : "#000",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif",
            }}
          >
            {battery}
          </div>
          <div className="ml-[1px] h-[4.5px] w-[1.5px] rounded-r-[1px] bg-white/40" />
        </div>
      </div>
    </div>
  );
}
