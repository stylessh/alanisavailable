"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { type AppInfo, DOCK_H, MENU_BAR_H } from "./data";
import { type Box, Genie, snapshot, thumbnail } from "./genie";
import { TrafficLights } from "./traffic-lights";
import { toScreen, useOS, type WindowMode, type WindowState, type WindowStatus } from "./window-manager";

/**
 * Drag regions are opt-in: an app marks its title bar (or any chrome) with
 * `data-window-drag`. Controls inside a drag region still work; these never
 * start a drag.
 */
export const DRAG_REGION = { "data-window-drag": "" } as const;
const INTERACTIVE =
  "button, a, input, textarea, select, [role=tab], [role=separator], [role=button], [role=option], [data-no-drag]";

/** Keep at least this much of a window on screen when it's dragged. */
const GRIP = 80;
/** A dragged window's top edge stops this far above the Dock row, so its title bar can't slip under it. */
const TITLE_GRIP = 44;
/** Mode changes (zoom, full screen) animate the frame for this long. */
const MODE_MS = 420;
/** In full screen, the strip along the top edge that reveals the floating title row. */
const REVEAL_EDGE = 6;
const FLOATING_ROW_H = 38;

export type MacWindowContext = {
  id: string;
  focused: boolean;
  /** the content's current size, in points */
  size: { w: number; h: number };
  mode: WindowMode;
  status: WindowStatus;
  /** start capturing the window for the genie (the minimize light calls it on hover, so the effect starts without a wait) */
  prepareMinimize: () => void;
  /** a window that can't zoom or go full screen (its third light is gray) */
  fixedSize: boolean;
  close: () => void;
  minimize: () => void;
  toggleZoom: () => void;
  toggleFullscreen: () => void;
};

const WindowContext = createContext<MacWindowContext | null>(null);

/** The window an app is drawn in: its size, focus and controls. Null outside a MacWindow. */
export const useMacWindow = () => useContext(WindowContext);

type Frame = { left: number; top: number; width: number; height: number };

/**
 * A macOS window. Draggable by its app's drag regions; the traffic lights
 * (or the context's controls) close it, minimize it into its Dock icon,
 * and take it full screen. Double-clicking a drag region zooms it to fill
 * the space between the menu bar and the Dock. Closing and minimizing keep
 * the app mounted, so it comes back as it was.
 */
export function MacWindow({
  id,
  app,
  width,
  height,
  radius = 21,
  at,
  closed = false,
  fixedSize = false,
  className = "",
  style,
  fullscreenStyle,
  children,
}: {
  id: string;
  app: AppInfo;
  width: number;
  height: number;
  /** corner radius; corners are continuous (a superellipse), like macOS */
  radius?: number;
  /** where the window first opens, given the screen; centered when left out */
  at?: (screen: { w: number; h: number }) => { x?: number; y?: number };
  /** start closed: the window opens from its Dock icon */
  closed?: boolean;
  /** no zoom or full screen, like iPhone Mirroring */
  fixedSize?: boolean;
  className?: string;
  /** the window's surface: background, material, shadow */
  style?: React.CSSProperties;
  /** the surface in full screen, where there's no desktop behind it: a solid fill, no glass */
  fullscreenStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const os = useOS();
  const { state, dispatch, screen } = os;
  const ref = useRef<HTMLDivElement>(null);

  const fallback: WindowState = { id, app, w: width, h: height, x: null, y: null, status: closed ? "closed" : "open", mode: "normal" };
  useLayoutEffect(() => {
    dispatch({ type: "register", window: fallback });
    // registering once is enough; the manager owns the window from here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const win = state.windows[id] ?? fallback;
  const focused = state.focused === id;
  const z = 10 + Math.max(0, state.order.indexOf(id));

  // Where the frame goes. Before the screen is measured (server render),
  // CSS centers it between the menu bar and the Dock.
  let frame: Frame | null = null;
  if (screen) {
    if (win.mode === "fullscreen") frame = { left: 0, top: 0, width: screen.w, height: screen.h };
    else if (win.mode === "zoomed") {
      frame = { left: 0, top: MENU_BAR_H, width: screen.w, height: screen.h - MENU_BAR_H - DOCK_H };
    } else {
      const start = at?.(screen);
      frame = {
        left: win.x ?? start?.x ?? (screen.w - win.w) / 2,
        top: win.y ?? start?.y ?? MENU_BAR_H + (screen.h - MENU_BAR_H - DOCK_H - win.h) / 2,
        width: win.w,
        height: win.h,
      };
    }
  }
  const size = frame ? { w: frame.width, h: frame.height } : { w: win.w, h: win.h };

  // Zoom and full screen glide the frame; dragging must not.
  const [gliding, setGliding] = useState(false);
  const glide = () => {
    setGliding(true);
    setTimeout(() => setGliding(false), MODE_MS);
  };
  const setMode = (mode: WindowMode) => {
    glide();
    dispatch({ type: "set-mode", id, mode });
  };

  // Minimizing pours the window into its Dock icon (the genie), from a
  // snapshot of it; restoring plays that backwards. The snapshot is taken
  // as the pointer reaches the minimize light, so the effect starts at once.
  const pixelRatio = () => (typeof window === "undefined" ? 1 : window.devicePixelRatio) * (screen?.scale ?? 1);
  const prepared = useRef<{ at: number; shot: Promise<HTMLCanvasElement> } | null>(null);
  const prepareMinimize = () => {
    const el = ref.current;
    if (!el || win.mode === "fullscreen") return;
    if (prepared.current && performance.now() - prepared.current.at < 1500) return;
    prepared.current = { at: performance.now(), shot: snapshot(el, pixelRatio()) };
  };
  /** a box on the page, in screen points */
  const toPoints = (r: DOMRect): Box | null => {
    const origin = os.screenRef.current?.getBoundingClientRect();
    if (!origin) return null;
    const s = screen?.scale ?? 1;
    return { x: (r.left - origin.left) / s, y: (r.top - origin.top) / s, w: r.width / s, h: r.height / s };
  };
  /** where the picture sits in the window's Dock tile: fitted inside it, as the tile shows it */
  const tileTarget = (aspect: number) => (): Box | null => {
    const tile = document.querySelector(`[data-dock-window="${id}"]`)?.getBoundingClientRect();
    const box = tile && toPoints(tile);
    if (!box) return null;
    const room = { w: box.w * 0.86, h: box.h * 0.86 };
    const w = Math.min(room.w, room.h * aspect);
    const h = w / aspect;
    return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
  };
  const [genie, setGenie] = useState<{ dir: "out" | "in"; source: HTMLCanvasElement; from: Box } | null>(null);
  // kept for the restore: the last snapshot and where the window was
  const [shelved, setShelved] = useState<{ source: HTMLCanvasElement; from: Box } | null>(null);
  const minimize = async () => {
    const box = ref.current && toPoints(ref.current.getBoundingClientRect());
    const el = ref.current;
    if (!box || !el || win.mode === "fullscreen") return dispatch({ type: "minimize", id });
    const fresh = prepared.current && performance.now() - prepared.current.at < 1500 ? prepared.current.shot : null;
    prepared.current = null;
    const source = await (fresh ?? snapshot(el, pixelRatio())).catch(() => null);
    if (!source) return dispatch({ type: "minimize", id });
    setGenie({ dir: "out", source, from: box });
    setShelved({ source, from: box });
    dispatch({ type: "minimize", id, thumb: thumbnail(source) });
  };
  // Back from the Dock: the genie runs in reverse, then the window appears.
  const [seenStatus, setSeenStatus] = useState(win.status);
  // the genie ends exactly where the window is, so it appears at once
  const [reveal, setReveal] = useState(false);
  if (seenStatus !== win.status) {
    setSeenStatus(win.status);
    if (seenStatus === "minimized" && win.status === "open" && shelved) setGenie({ dir: "in", ...shelved });
  }

  const controls: MacWindowContext = {
    id,
    focused,
    size,
    mode: win.mode,
    status: win.status,
    fixedSize,
    close: () => dispatch({ type: "close", id }),
    minimize: () => void minimize(),
    prepareMinimize,
    toggleZoom: () => !fixedSize && setMode(win.mode === "zoomed" ? "normal" : "zoomed"),
    toggleFullscreen: () => !fixedSize && setMode(win.mode === "fullscreen" ? "normal" : "fullscreen"),
  };

  // ⌃⌘F toggles full screen for the focused window, as in macOS.
  const toggleRef = useRef(controls.toggleFullscreen);
  useEffect(() => {
    toggleRef.current = controls.toggleFullscreen;
  });
  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF" && e.metaKey && e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        toggleRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!focused) dispatch({ type: "focus", id });
    const target = e.target as Element;
    if (e.button !== 0 || !frame || win.mode === "fullscreen") return;
    if (!target.closest("[data-window-drag]") || target.closest(INTERACTIVE)) return;

    const el = e.currentTarget as HTMLElement;
    const startPointer = toScreen(os, e.clientX, e.clientY);
    let start = { x: frame.left, y: frame.top };
    // Dragging a zoomed window restores its size under the cursor, as macOS does.
    if (win.mode === "zoomed") {
      const along = (startPointer.x - frame.left) / frame.width;
      start = { x: startPointer.x - along * win.w, y: frame.top };
      dispatch({ type: "set-mode", id, mode: "normal" });
    }
    let moved = false;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const p = toScreen(os, ev.clientX, ev.clientY);
      const dx = p.x - startPointer.x;
      const dy = p.y - startPointer.y;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      const sw = screen?.w ?? window.innerWidth;
      const sh = screen?.h ?? window.innerHeight;
      dispatch({
        type: "move",
        id,
        x: Math.min(sw - GRIP, Math.max(GRIP - win.w, start.x + dx)),
        y: Math.min(sh - DOCK_H - TITLE_GRIP, Math.max(MENU_BAR_H, start.y + dy)),
      });
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as Element;
    if (win.mode === "fullscreen" || !target.closest("[data-window-drag]") || target.closest(INTERACTIVE)) return;
    controls.toggleZoom();
  };

  // In full screen the window's own traffic lights hide; pointing at the
  // top edge slides down a floating row that holds them, as in macOS.
  const [revealed, setRevealed] = useState(false);
  const fullscreen = win.mode === "fullscreen";
  if (!fullscreen && revealed) setRevealed(false);
  // Tracked by height rather than enter/leave: the row appears under a
  // pointer that hasn't moved, which browsers don't report as entering it.
  const onPointerMove = (e: React.PointerEvent) => {
    if (!fullscreen) return;
    const y = toScreen(os, e.clientX, e.clientY).y;
    if (y <= REVEAL_EDGE) setRevealed(true);
    else if (y > FLOATING_ROW_H + 8) setRevealed(false);
  };

  // Closed and minimized windows stay mounted (the app keeps its state) but
  // are hidden once their exit animation ends.
  const [hidden, setHidden] = useState(closed);
  const away = win.status !== "open";
  // While the genie plays (and once minimized) the real window is hidden;
  // the genie draws it. Without a snapshot, it shrinks into the Dock.
  const animate =
    genie || win.status === "minimized"
      ? { x: 0, y: genie || shelved ? 0 : 300, scale: genie || shelved ? 1 : 0.06, opacity: 0 }
      : win.status === "closed"
        ? { x: 0, y: 0, scale: 0.96, opacity: 0 }
        : { x: 0, y: 0, scale: 1, opacity: 1 };
  const transition =
    genie || reveal || win.status === "minimized"
      ? { duration: genie || reveal || shelved ? 0 : 0.42, ease: [0.55, 0, 0.75, 0.1] as const }
      : win.status === "closed"
        ? { duration: 0.16, ease: "easeOut" as const }
        : { type: "spring" as const, stiffness: 420, damping: 34 };

  return (
    <WindowContext.Provider value={controls}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-label={app.name}
        data-focused={focused}
        className={`mac-window absolute overflow-hidden [corner-shape:superellipse(1.6)] ${className}`}
        initial={false}
        animate={animate}
        transition={transition}
        onAnimationStart={() => !away && setHidden(false)}
        onAnimationComplete={() => {
          setHidden(away);
          setReveal(false);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onDoubleClick={onDoubleClick}
        style={{
          ...style,
          zIndex: z,
          borderRadius: win.mode === "fullscreen" ? 0 : radius,
          // Full screen has no window edges: no rims, highlights or shadow,
          // and nothing behind it to see through.
          ...(win.mode === "fullscreen" && { boxShadow: "none", backdropFilter: "none", WebkitBackdropFilter: "none", ...fullscreenStyle }),
          visibility: hidden && away ? "hidden" : undefined,
          pointerEvents: away ? "none" : style?.pointerEvents,
          ...(frame ?? {
            left: `calc(50% - ${win.w / 2}px)`,
            top: `calc(${MENU_BAR_H}px + (100% - ${MENU_BAR_H + DOCK_H + win.h}px) / 2)`,
            width: win.w,
            height: win.h,
          }),
          transition: gliding
            ? `left ${MODE_MS}ms var(--mac-glide), top ${MODE_MS}ms var(--mac-glide), width ${MODE_MS}ms var(--mac-glide), height ${MODE_MS}ms var(--mac-glide), border-radius ${MODE_MS}ms var(--mac-glide), box-shadow ${MODE_MS}ms var(--mac-glide)`
            : undefined,
          ["--mac-glide" as string]: "cubic-bezier(0.2, 0.85, 0.25, 1)",
        }}
      >
        {children}

        {fullscreen && (
          // keeps the top edge reachable over whatever the app draws there
          <div aria-hidden className="absolute inset-x-0 top-0 z-[1001]" style={{ height: REVEAL_EDGE }} />
        )}
        <AnimatePresence>
          {fullscreen && revealed && (
            <motion.div
              key="floating-row"
              initial={{ y: -FLOATING_ROW_H }}
              animate={{ y: 0 }}
              exit={{ y: -FLOATING_ROW_H, transition: { duration: 0.16, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 520, damping: 42 }}
              className="absolute inset-x-0 top-0 z-[1002]"
              style={{
                height: FLOATING_ROW_H,
                background: "light-dark(rgb(246 246 248 / 0.82), rgb(40 40 42 / 0.82))",
                backdropFilter: "blur(24px) saturate(1.8)",
                WebkitBackdropFilter: "blur(24px) saturate(1.8)",
                boxShadow: "0 0.5px 0 light-dark(rgb(0 0 0 / 0.12), rgb(255 255 255 / 0.1)), 0 6px 18px rgb(0 0 0 / 0.12)",
              }}
            >
              <TrafficLights left={14.5} top={(FLOATING_ROW_H - 13) / 2} floating />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {genie && screen && (
        <Genie
          source={genie.source}
          from={genie.from}
          dir={genie.dir}
          target={tileTarget(genie.from.w / genie.from.h)}
          screen={screen}
          pixelRatio={pixelRatio()}
          onDone={() => {
            if (genie.dir === "in") setReveal(true);
            else dispatch({ type: "docked", id });
            setGenie(null);
          }}
        />
      )}
    </WindowContext.Provider>
  );
}
