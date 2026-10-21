"use client";

import { useCallback, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { DockItem } from "./data";
import { Dock } from "./dock";
import { MenuBar } from "./menu-bar";
import { Banners, type SeedNotice } from "./notifications";
import { appearanceStyle, type AppearancePref, initialOS, type Menu, type Notice, OSContext, osReducer, type Screen } from "./window-manager";

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
  notices: initialNotices = [],
  children,
}: {
  dock: DockItem[];
  wallpaper?: { src: string; srcSet?: string };
  appearance?: AppearancePref;
  /** notifications already in Notification Center when the page opens */
  notices?: SeedNotice[];
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
  // the source of each app's menus, kept outside React state: they're read when a menu opens
  const menuSources = useRef<Record<string, () => Menu[]>>({});
  const registerMenus = useCallback((app: string, menus: () => Menu[]) => {
    menuSources.current[app] = menus;
    return () => {
      if (menuSources.current[app] === menus) delete menuSources.current[app];
    };
  }, []);
  const menusFor = useCallback((app: string) => menuSources.current[app]?.() ?? null, []);
  const [notices, setNotices] = useState<Notice[]>(() =>
    initialNotices.map(({ ago, ...n }, i) => ({ ...n, id: `seed${i}`, at: Date.now() - ago * 60_000 })),
  );
  const [banners, setBanners] = useState<Notice[]>([]);
  const [brightness, setBrightness] = useState(1);
  const notify = (n: Omit<Notice, "id" | "at">, options: { banner?: boolean } = {}) => {
    const notice = { ...n, id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: Date.now() };
    setNotices((all) => [notice, ...all]);
    if (options.banner !== false) setBanners((b) => [notice, ...b].slice(0, 3));
  };
  const dismissNotice = (id: string) => {
    setNotices((all) => all.filter((n) => n.id !== id));
    setBanners((b) => b.filter((n) => n.id !== id));
  };
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
    <OSContext.Provider
      value={{
        state,
        dispatch,
        screen,
        screenRef,
        appearance,
        appearancePref,
        setAppearance,
        registerMenus,
        menusFor,
        notify,
        notices,
        dismissNotice,
        clearNotices: () => setNotices([]),
        brightness,
        setBrightness,
      }}
    >
      <div className="mac-desktop fixed inset-0 overflow-hidden bg-black">
        <div
          ref={screenRef}
          className="mac-screen absolute top-0 left-0 origin-top-left"
          data-appearance={appearance}
          // set before the first paint by the script below; React keeps it when it takes over
          suppressHydrationWarning
          style={{
            // Following the system, the page root's own switches already track
            // it, from the first paint (the server can't know the system
            // setting, so setting them here would flash light on a dark Mac).
            // A chosen appearance sets them here.
            ...(appearancePref === "auto" ? { colorScheme: "light dark" } : appearanceStyle(appearancePref)),
            width: screen ? screen.w : "100vw",
            height: screen ? screen.h : "100dvh",
            transform: screen && screen.scale < 1 ? `scale(${screen.scale})` : undefined,
          }}
        >
          {appearancePref === "auto" && (
            // Following the system, the server renders "light" (it can't know the setting),
            // so a dark Mac would paint light colors until the page loads. This runs while
            // the HTML is parsed, before anything inside the screen paints, and puts the
            // system's appearance on the screen; the store then agrees once React is up.
            <script
              dangerouslySetInnerHTML={{
                __html: `document.currentScript.parentElement.dataset.appearance=matchMedia(${JSON.stringify(DARK_QUERY)}).matches?"dark":"light"`,
              }}
            />
          )}
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
          <Banners banners={banners} onDone={(id) => setBanners((b) => b.filter((n) => n.id !== id))} />
          <MenuBar hidden={fullscreen} />
          <Dock items={dock} hidden={fullscreen} />
          {/* Display brightness: the whole screen dims under the slider */}
          <div aria-hidden className="pointer-events-none absolute inset-0 z-[3000] bg-black transition-opacity duration-150" style={{ opacity: 1 - brightness }} />
        </div>
      </div>
    </OSContext.Provider>
  );
}
