"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WindowContext, type MacWindowContext } from "./window";
import { type Appearance, appearanceStyle } from "./window-manager";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const subscribeScheme = (onChange: () => void) => {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/**
 * An app's window on its own, filling the page: for embedding one app in
 * another site's window (trypane.app puts them on its canvas in iframes).
 * No desktop, menu bar or Dock. The app gets the same MacWindowContext it
 * has in a MacWindow: the page's size, focus, a normal (not full screen)
 * mode so its title bar keeps the traffic lights, and controls that do
 * nothing, since the host owns the window. Appearance follows the system.
 *
 * While framed, the host's own shortcuts and gestures are forwarded to it:
 * keys held with ⌃⌥, and scrolls held with ⌃⌥, go to the parent as
 * messages, so the visitor can leave the window the way they entered it.
 */
export function EmbeddedWindow({
  id,
  className = "",
  style,
  children,
}: {
  id: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [chrome, setChrome] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [focused, setFocused] = useState(true);
  const systemDark = useSyncExternalStore(
    subscribeScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  const appearance: Appearance = systemDark ? "dark" : "light";

  useEffect(() => {
    if (!root) return;
    const measure = () => setSize({ w: root.clientWidth, h: root.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [root]);

  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    const host = window.parent;
    const held = (e: { ctrlKey: boolean; altKey: boolean; metaKey: boolean }) => e.ctrlKey && e.altKey && !e.metaKey;
    const onKey = (e: KeyboardEvent) => {
      if (!held(e)) return;
      e.preventDefault();
      host.postMessage({ type: "pane:key", code: e.code, key: e.key, ctrlKey: true, altKey: true, metaKey: false, shiftKey: e.shiftKey }, "*");
    };
    const onWheel = (e: WheelEvent) => {
      if (!held(e)) return;
      e.preventDefault();
      host.postMessage({ type: "pane:wheel", deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, clientX: e.clientX, clientY: e.clientY, ctrlKey: true, altKey: true, metaKey: false }, "*");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  const noop = () => {};
  const controls: MacWindowContext = {
    chrome,
    id,
    focused,
    size,
    mode: "normal",
    status: "open",
    fixedSize: true,
    close: noop,
    minimize: noop,
    prepareMinimize: noop,
    toggleZoom: noop,
    toggleFullscreen: noop,
    bringToFront: noop,
  };

  return (
    <WindowContext.Provider value={controls}>
      <div data-appearance={appearance} style={appearanceStyle(appearance)} className="fixed inset-0">
        <div
          ref={setRoot}
          role="dialog"
          data-focused={focused}
          className={`mac-window absolute inset-0 overflow-hidden ${className}`}
          style={style}
        >
          {children}
          {/* the top layer: above anything the app draws (see MacWindowContext.chrome) */}
          <div ref={setChrome} className="pointer-events-none absolute inset-0 z-[3000]" />
        </div>
      </div>
    </WindowContext.Provider>
  );
}
