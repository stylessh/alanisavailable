"use client";

import { useMacWindow } from "../../os/macos";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ACTIVE_SESSION } from "./content";
import { Icon, type IconName } from "./icon";

// The sidebar's state: shown (docked, pushing the session over) or hidden.
// While it's hidden, its toggle, back and forward buttons move into the
// session's header at the same spot, and pointing at the toggle slides the
// sidebar in as a floating panel over the session, without moving
// anything; it slides away once the pointer leaves both. ⌘B toggles.
//
// The window controls row (pt, from the reference and the full-screen
// capture): traffic lights at 17, then the toggle, back and forward on a
// 24pt pitch starting at 84. Full screen has no traffic lights, so the
// buttons move 74pt left, to 10.

const CONTROLS_X = 84;
const CONTROLS_X_FULLSCREEN = 10;
const CONTROLS_W = 72;
/** how long the floating sidebar waits after the pointer leaves before it slides away */
const PEEK_LINGER_MS = 260;

type SidebarState = {
  shown: boolean;
  toggle: () => void;
  /** the floating sidebar (only while hidden) */
  peeking: boolean;
  /** the pointer entered or left the toggle or the floating sidebar */
  hover: (inside: boolean) => void;
  /**
   * The floating sidebar is becoming the docked one (the toggle was pressed
   * while it was open): it stays on screen and settles into the docked
   * sidebar's width and colors while the session slides over, then gives
   * way to the docked sidebar, which by then looks the same.
   */
  docking: boolean;
  /** the docked sidebar has finished opening */
  docked: () => void;
  /** the session that's open */
  active: string;
  openSession: (id: string) => void;
};

const Ctx = createContext<SidebarState | null>(null);

export function useSidebar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSidebar needs a SidebarProvider");
  return ctx;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(true);
  const [peeking, setPeeking] = useState(false);
  const [docking, setDocking] = useState(false);
  const [active, openSession] = useState(ACTIVE_SESSION);
  const leave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toggle = useCallback(() => {
    clearTimeout(leave.current);
    // opening while it floats: the floating sidebar anchors in place
    setDocking(!shown && peeking);
    setPeeking(false);
    setShown((s) => !s);
  }, [shown, peeking]);
  const docked = useCallback(() => setDocking(false), []);

  const hover = useCallback(
    (inside: boolean) => {
      clearTimeout(leave.current);
      if (shown) return;
      if (inside) setPeeking(true);
      else leave.current = setTimeout(() => setPeeking(false), PEEK_LINGER_MS);
    },
    [shown],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);
  useEffect(() => () => clearTimeout(leave.current), []);

  const value = useMemo(
    () => ({ shown, toggle, peeking: peeking && !shown, hover, docking, docked, active, openSession }),
    [shown, toggle, peeking, hover, docking, docked, active],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Where the window controls start, and where content after them may begin. */
export function useControlsInset() {
  const fullscreen = useMacWindow()?.mode === "fullscreen";
  const x = fullscreen ? CONTROLS_X_FULLSCREEN : CONTROLS_X;
  return { fullscreen, x, end: x + CONTROLS_W };
}

function ControlButton({
  label,
  icon,
  dim,
  shortcut,
  onClick,
  onHover,
}: {
  label: string;
  icon: IconName;
  dim?: boolean;
  shortcut?: string;
  onClick?: () => void;
  onHover?: (inside: boolean) => void;
}) {
  const [tip, setTip] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <span className="relative">
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          setTip(false);
          onClick?.();
        }}
        onPointerEnter={() => {
          onHover?.(true);
          timer.current = setTimeout(() => setTip(true), 550);
        }}
        onPointerLeave={() => {
          onHover?.(false);
          clearTimeout(timer.current);
          setTip(false);
        }}
        className="flex size-6 items-center justify-center rounded-md hover:bg-(--cc-button-hover)"
        style={{ color: dim ? "var(--cc-text-muted)" : "var(--cc-text)" }}
      >
        <Icon name={icon} size={16} />
      </button>
      {tip && shortcut !== undefined && (
        // the tooltip: label and shortcut, just under the button
        <span
          role="tooltip"
          className="cc-surface pointer-events-none absolute top-[calc(100%+6px)] left-[-4px] z-50 flex items-center gap-[8px] rounded-[6px] px-[7px] py-[3px] text-[12px] whitespace-nowrap"
          style={{ color: "var(--cc-text-strong)" }}
        >
          {label}
          <span style={{ color: "var(--cc-text-muted)" }}>{shortcut}</span>
        </span>
      )}
    </span>
  );
}

/**
 * The sidebar toggle, back and forward, at the window's top-left. The
 * traffic lights beside them are drawn once by the window (ClaudeWindow),
 * on the OS's top layer, whichever sidebar state is showing.
 */
export function WindowControls() {
  const { shown, toggle, hover } = useSidebar();
  const { x } = useControlsInset();
  return (
    <>
      <div className="absolute flex" style={{ left: x, top: 12 }}>
        <ControlButton label={shown ? "Hide sidebar" : "Show sidebar"} shortcut="⌘B" icon="sidebar" onClick={toggle} onHover={hover} />
        <ControlButton label="Back" icon="arrowLeft" />
        <ControlButton label="Forward" icon="arrowRight" dim />
      </div>
    </>
  );
}
