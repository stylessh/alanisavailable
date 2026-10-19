"use client";

import { useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { DockItem } from "./data";
import { Dock } from "./dock";
import { MenuBar } from "./menu-bar";
import { type AppearancePref, initialOS, OSContext, osReducer, type Screen } from "./window-manager";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const subscribeScheme = (onChange: () => void) => {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

// Below this size the whole screen is drawn smaller rather than squeezing
// its windows: it reads as a Mac screen at a glance, and window dragging
// stays in real screen points.
const MIN_W = 1100;
const MIN_H = 760;

const WALLPAPER = {
  // "Mono Dark Distortion 2" from raycast.com/wallpapers
  src: "/os/macos/wallpaper/mono-dark-distortion-2-1920.webp",
  srcSet: "/os/macos/wallpaper/mono-dark-distortion-2-1920.webp 1920w, /os/macos/wallpaper/mono-dark-distortion-2-3840.webp 3840w",
};

/**
 * A macOS screen: wallpaper, menu bar, Dock and a window manager. Products
 * put their app windows (MacWindow) inside as children; the menu bar
 * follows whichever window is focused, and the Dock shows which apps are
 * running and brings their windows back.
 *
 * Appearance follows the system unless set (Control Center in the menu bar
 * toggles it). The screen carries `color-scheme`, so apps style both modes
 * with CSS light-dark(), plus `data-appearance` for anything that isn't a
 * color.
 */
export function MacOS({
  dock,
  wallpaper = WALLPAPER,
  appearance: initialAppearance = "auto",
  children,
}: {
  dock: DockItem[];
  wallpaper?: { src: string; srcSet?: string };
  appearance?: AppearancePref;
  children?: React.ReactNode;
}) {
  const [appearancePref, setAppearance] = useState<AppearancePref>(initialAppearance);
  const systemDark = useSyncExternalStore(
    subscribeScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  const appearance = appearancePref === "auto" ? (systemDark ? "dark" : "light") : appearancePref;
  const [state, dispatch] = useReducer(osReducer, initialOS);
  const [screen, setScreen] = useState<Screen | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const scale = Math.min(1, window.innerWidth / MIN_W, window.innerHeight / MIN_H);
      setScreen({ w: window.innerWidth / scale, h: window.innerHeight / scale, scale });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const front = state.focused ? state.windows[state.focused] : null;
  const fullscreen = front?.status === "open" && front.mode === "fullscreen";

  return (
    <OSContext.Provider value={{ state, dispatch, screen, screenRef, appearance, appearancePref, setAppearance }}>
      <div className="mac-desktop fixed inset-0 overflow-hidden bg-black">
        <div
          ref={screenRef}
          className="mac-screen absolute top-0 left-0 origin-top-left"
          data-appearance={appearance}
          style={{
            colorScheme: appearancePref === "auto" ? "light dark" : appearancePref,
            width: screen ? screen.w : "100vw",
            height: screen ? screen.h : "100dvh",
            transform: screen && screen.scale < 1 ? `scale(${screen.scale})` : undefined,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wallpaper.src}
            srcSet={wallpaper.srcSet}
            sizes="100vw"
            alt=""
            fetchPriority="high"
            draggable={false}
            // Clicking the desktop hands focus to Finder.
            onPointerDown={() => dispatch({ type: "focus", id: null })}
            className="mac-wallpaper absolute inset-0 size-full object-cover select-none"
          />
          {children}
          <MenuBar hidden={fullscreen} />
          <Dock items={dock} hidden={fullscreen} />
        </div>
      </div>
    </OSContext.Provider>
  );
}
