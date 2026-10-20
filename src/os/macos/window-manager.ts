"use client";

import { createContext, useContext } from "react";
import type { AppInfo } from "./data";

// The OS keeps every window's frame and status. Apps never move their own
// windows; they ask the window manager, which also decides focus and
// stacking order, like a real one.

export type WindowMode = "normal" | "zoomed" | "fullscreen";
export type WindowStatus = "open" | "minimized" | "closed";

export type WindowState = {
  id: string;
  app: AppInfo;
  w: number;
  h: number;
  /** top-left in screen points; null until moved, which keeps it centered */
  x: number | null;
  y: number | null;
  status: WindowStatus;
  mode: WindowMode;
  /** minimized: a picture of the window for its Dock tile, and when it went there (tiles sit in that order) */
  thumb?: string;
  minimizedAt?: number;
  /** the minimize animation has landed in the Dock, so its tile shows the picture */
  docked?: boolean;
};

export type OSState = {
  windows: Record<string, WindowState>;
  /** back to front */
  order: string[];
  /** null means the desktop (Finder) has focus */
  focused: string | null;
};

export type OSAction =
  | { type: "register"; window: WindowState }
  | { type: "focus"; id: string | null }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "set-mode"; id: string; mode: WindowMode }
  | { type: "close"; id: string }
  | { type: "minimize"; id: string; thumb?: string }
  | { type: "docked"; id: string }
  | { type: "restore"; id: string }
  | { type: "activate-app"; app: string };

export const initialOS: OSState = { windows: {}, order: [], focused: null };

const toFront = (order: string[], id: string) => [...order.filter((w) => w !== id), id];

/** The frontmost open window other than `except`, which takes focus when a window goes away. */
const nextFocus = (st: OSState, except: string) =>
  [...st.order].reverse().find((id) => id !== except && st.windows[id].status === "open") ?? null;

const patch = (st: OSState, id: string, p: Partial<WindowState>): OSState => ({
  ...st,
  windows: { ...st.windows, [id]: { ...st.windows[id], ...p } },
});

export function osReducer(st: OSState, a: OSAction): OSState {
  switch (a.type) {
    case "register":
      if (st.windows[a.window.id]) return st;
      return {
        windows: { ...st.windows, [a.window.id]: a.window },
        order: [...st.order, a.window.id],
        focused: a.window.status === "open" ? a.window.id : st.focused,
      };
    case "focus":
      if (a.id === null) return st.focused === null ? st : { ...st, focused: null };
      if (st.focused === a.id && st.order.at(-1) === a.id) return st;
      return { ...st, order: toFront(st.order, a.id), focused: a.id };
    case "move":
      return patch(st, a.id, { x: a.x, y: a.y });
    case "set-mode":
      return patch(st, a.id, { mode: a.mode });
    case "close":
    case "minimize": {
      const next =
        a.type === "close"
          ? patch(st, a.id, { status: "closed" })
          : patch(st, a.id, { status: "minimized", thumb: a.thumb, minimizedAt: Date.now(), docked: !a.thumb });
      return { ...next, focused: st.focused === a.id ? nextFocus(st, a.id) : st.focused };
    }
    case "docked":
      return patch(st, a.id, { docked: true });
    case "restore":
      return { ...patch(st, a.id, { status: "open", docked: false }), order: toFront(st.order, a.id), focused: a.id };
    case "activate-app": {
      const id = [...st.order].reverse().find((w) => st.windows[w].app.id === a.app);
      return id ? osReducer(st, { type: "restore", id }) : st;
    }
  }
}

export type Screen = { w: number; h: number; scale: number };

/** "auto" follows the system's light/dark setting. */
export type AppearancePref = "auto" | "light" | "dark";
export type Appearance = "light" | "dark";

export type OSContextValue = {
  state: OSState;
  dispatch: (a: OSAction) => void;
  /** logical screen size and the scale it's drawn at; null before the first measure */
  screen: Screen | null;
  /** the screen element, for turning client coordinates into screen points */
  screenRef: React.RefObject<HTMLDivElement | null>;
  /** the resolved appearance, and the setting it comes from */
  appearance: Appearance;
  appearancePref: AppearancePref;
  setAppearance: (pref: AppearancePref) => void;
};

export const OSContext = createContext<OSContextValue | null>(null);

export function useOS() {
  const os = useContext(OSContext);
  if (!os) throw new Error("macOS components must be inside <MacOS>");
  return os;
}

/** Light or dark, for apps that need it in code (CSS can use light-dark()). Null outside <MacOS>. */
export function useMacAppearance() {
  const os = useContext(OSContext);
  if (!os) return null;
  const { appearance, appearancePref, setAppearance } = os;
  return {
    appearance,
    appearancePref,
    setAppearance,
    toggle: () => setAppearance(appearance === "dark" ? "light" : "dark"),
  };
}

/**
 * Styles that put an element in an appearance, for its whole subtree.
 * Besides color-scheme, it sets the switches Tailwind's CSS build (Lightning
 * CSS) compiles every light-dark() into: left alone, those only follow the
 * system setting at the page root, so a screen set to dark would keep light
 * colors.
 */
export const appearanceStyle = (appearance: Appearance, colorScheme: string = appearance): React.CSSProperties =>
  ({
    colorScheme,
    "--lightningcss-light": appearance === "light" ? "initial" : " ",
    "--lightningcss-dark": appearance === "dark" ? "initial" : " ",
  }) as React.CSSProperties;

/** Client coordinates to screen points (the screen may be drawn scaled). */
export function toScreen(os: OSContextValue, clientX: number, clientY: number) {
  const box = os.screenRef.current?.getBoundingClientRect();
  const scale = os.screen?.scale ?? 1;
  return { x: (clientX - (box?.left ?? 0)) / scale, y: (clientY - (box?.top ?? 0)) / scale };
}
