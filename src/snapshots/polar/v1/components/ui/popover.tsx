"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";

// The floating layer under every select, menu, combobox, date picker and
// tooltip. Polar uses Radix's popper for this; this is the same contract in
// small: the panel is portalled to the .polar root (so it escapes the page
// card's scroll and keeps the theme), fixed to the trigger 4px away, flipped
// above it when there's no room below, and dismissed by Escape or a press
// outside. It opens with pl-pop, growing out of the side that faces the trigger.

export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

type Options = {
  side?: Side;
  align?: Align;
  /** gap between trigger and panel (Radix sideOffset; 4 in Polar) */
  offset?: number;
  /** at least as wide as the trigger, as a select's list is */
  matchWidth?: boolean;
};

export function useFloating<T extends HTMLElement = HTMLElement>(
  open: boolean,
  { side = "bottom", align = "start", offset = 4, matchWidth }: Options = {},
) {
  const triggerRef = useRef<T>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ style: CSSProperties; side: Side }>({
    style: { position: "fixed", top: 0, left: 0, visibility: "hidden" },
    side,
  });

  const update = useCallback(() => {
    const t = triggerRef.current?.getBoundingClientRect();
    const f = floatingRef.current;
    if (!t || !f) return;
    const w = f.offsetWidth;
    const h = f.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let placed = side;
    if (side === "bottom" && t.bottom + offset + h > vh - 8 && t.top - offset - h > 8) placed = "top";
    if (side === "top" && t.top - offset - h < 8 && t.bottom + offset + h < vh - 8) placed = "bottom";

    let top: number;
    let left: number;
    if (placed === "top" || placed === "bottom") {
      top = placed === "bottom" ? t.bottom + offset : t.top - offset - h;
      left = align === "start" ? t.left : align === "end" ? t.right - w : t.left + t.width / 2 - w / 2;
    } else {
      left = placed === "right" ? t.right + offset : t.left - offset - w;
      top = align === "start" ? t.top : align === "end" ? t.bottom - h : t.top + t.height / 2 - h / 2;
    }
    left = Math.max(8, Math.min(left, vw - w - 8));
    top = Math.max(8, Math.min(top, vh - h - 8));
    setState({
      side: placed,
      style: { position: "fixed", top, left, minWidth: matchWidth ? t.width : undefined },
    });
  }, [side, align, offset, matchWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return { triggerRef, floatingRef, style: state.style, side: state.side, update };
}

/** Escape or a press outside both the trigger and the panel closes it */
export function useDismiss(
  open: boolean,
  close: () => void,
  refs: RefObject<HTMLElement | null>[],
  { returnFocus = true }: { returnFocus?: boolean } = {},
) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (refs.some((r) => r.current?.contains(e.target as Node))) return;
      closeRef.current();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeRef.current();
      if (returnFocus) (refs[0].current as HTMLElement | null)?.focus();
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
    };
    // the refs are stable objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, returnFocus]);
}

const ORIGIN: Record<Side, { origin: string; x: string; y: string }> = {
  bottom: { origin: "top", x: "0px", y: "-8px" },
  top: { origin: "bottom", x: "0px", y: "8px" },
  right: { origin: "left", x: "-8px", y: "0px" },
  left: { origin: "right", x: "8px", y: "0px" },
};

/**
 * The portalled panel. Pass the hook's ref, style and side. It only renders
 * while open, which is always after hydration, so the portal target is read
 * straight from the document.
 */
export function Floating({
  floatingRef,
  style,
  side,
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  floatingRef: RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  side: Side;
}) {
  const root = document.querySelector(".polar") ?? document.body;
  const o = ORIGIN[side];
  return createPortal(
    <div
      ref={floatingRef}
      style={{ ...style, transformOrigin: o.origin, "--pl-pop-x": o.x, "--pl-pop-y": o.y, zIndex: 50 } as CSSProperties}
      className={`pl-pop ${className}`}
      {...props}
    >
      {children}
    </div>,
    root,
  );
}

/**
 * Arrow keys, Home and End move a highlight through a list; Enter or Space
 * picks it. Items are matched by their role so separators and labels are skipped.
 */
export function useListNavigation(
  open: boolean,
  listRef: RefObject<HTMLElement | null>,
  role: "option" | "menuitem",
  /** highlighted on opening: a select's chosen row; nothing (-1) for a menu, as Radix does on a click */
  initial: number = -1,
) {
  const [active, setActive] = useState(-1);
  const items = () => [...(listRef.current?.querySelectorAll<HTMLElement>(`[role="${role}"]:not([aria-disabled="true"])`) ?? [])];

  // reset once per opening, during render rather than in an effect
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setActive(open ? initial : -1);
  }

  useEffect(() => {
    if (!open || active < 0) return;
    items()[active]?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = items();
    if (!list.length) return;
    if (e.key === "ArrowDown") setActive((i) => (i + 1) % list.length);
    else if (e.key === "ArrowUp") setActive((i) => (i <= 0 ? list.length - 1 : i - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(list.length - 1);
    else if ((e.key === "Enter" || e.key === " ") && active >= 0) list[active]?.click();
    else return;
    e.preventDefault();
  };

  return { active, setActive, onKeyDown };
}
