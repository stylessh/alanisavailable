"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { SearchIcon } from "../icons";

// The floating layer under every select, menu, combobox, date picker and
// tooltip. Polar uses Radix's popper for this; this is the same contract in
// small: the panel is portalled to the .polar root (so it escapes the page
// card's scroll and keeps the theme), fixed to the trigger 4px away, flipped
// above it when there's no room below, and dismissed by Escape or a press
// outside. It opens with pl-pop, growing out of the side that faces the
// trigger, unless it opened by moving across its group (PopoverGroup below).

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
    const el = triggerRef.current;
    const f = floatingRef.current;
    if (!el || !f) return;
    const t = el.getBoundingClientRect();
    // On the design-system playground the trigger sits on a zoomed canvas, so
    // it draws larger or smaller than its layout size; the panel follows.
    const z = el.offsetWidth ? t.width / el.offsetWidth : 1;
    const w = f.offsetWidth * z;
    const h = f.offsetHeight * z;
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
    // and it wears the token overrides of the column it opened from
    const vars = scopeVars(el);
    setState({
      side: placed,
      style: {
        position: "fixed",
        top,
        left,
        minWidth: matchWidth ? t.width / z : undefined,
        ...(z !== 1 && { scale: String(z), transformOrigin: "top left" }),
        ...vars,
      },
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

/*
 * Popover groups. Popovers side by side (a header's filters and actions, a
 * toolbar's buttons, a table's row menus) behave as one control, as a
 * menubar does: once one is open, the group is "live", and hovering
 * another trigger in it opens that one in its place, at once and without
 * the pop-in. A press outside, Escape or picking something ends it.
 * Outside a PopoverGroup each popover keeps its own state.
 */
type GroupState = { openId: string | null; instant: boolean };
const PopoverGroupContext = createContext<{
  state: GroupState;
  set: (next: string | null, from: string, instant?: boolean) => void;
} | null>(null);

export function PopoverGroup({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GroupState>({ openId: null, instant: false });
  const set = useCallback(
    (next: string | null, from: string, instant = false) =>
      // closing only clears the group if this popover is still the open one
      setState((s) => (next !== null ? { openId: next, instant } : s.openId === from ? { openId: null, instant: false } : s)),
    [],
  );
  return <PopoverGroupContext value={{ state, set }}>{children}</PopoverGroupContext>;
}

/**
 * A popover's open state, shared with its group when it's in one. Spread
 * onPointerEnter onto the trigger; pass instant to Floating.
 */
export function usePopoverOpen() {
  const group = useContext(PopoverGroupContext);
  const id = useId();
  const [local, setLocal] = useState(false);
  const open = group ? group.state.openId === id : local;
  const setOpen = (next: boolean) => (group ? group.set(next ? id : null, id) : setLocal(next));
  /** another popover in the group is open: this one takes its place, instantly */
  const live = !!group && group.state.openId !== null && group.state.openId !== id;
  const onPointerEnter = (e: React.PointerEvent<HTMLElement>) => {
    if (!live) return;
    group.set(id, id, true);
    // keys follow the pointer to the popover that's open now
    e.currentTarget.focus({ preventScroll: true });
  };
  return { open, setOpen, onPointerEnter, live, instant: open && !!group?.state.instant };
}

/** The token overrides a playground column sets (data-pl-scope), for things drawn outside it */
export function scopeVars(el: Element | null): Record<string, string> {
  const scope = el?.closest<HTMLElement>("[data-pl-scope]");
  const vars: Record<string, string> = {};
  if (scope)
    for (const name of Array.from(scope.style)) if (name.startsWith("--")) vars[name] = scope.style.getPropertyValue(name);
  return vars;
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
  instant,
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  floatingRef: RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  side: Side;
  /** opened by moving across its group: it's simply there, no pop-in */
  instant?: boolean;
}) {
  const root = document.querySelector(".polar") ?? document.body;
  const o = ORIGIN[side];
  // decided once, as it opens; a later change mustn't replay the animation
  const [still] = useState(instant);
  return createPortal(
    // a scope of its own, so its gray roles follow the scale it carries from its column
    <div ref={floatingRef} data-pl-scope="" style={{ ...style, zIndex: 50 }} className={className} {...props}>
      <div
        className={still ? undefined : "pl-pop"}
        style={{ transformOrigin: o.origin, "--pl-pop-x": o.x, "--pl-pop-y": o.y } as CSSProperties}
      >
        {children}
      </div>
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
    // typing in a popover's search: space and Home/End stay with the text
    if (e.target instanceof HTMLInputElement && (e.key === " " || e.key === "Home" || e.key === "End")) return;
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

// ─── The list inside every popover ──────────────────────────────────────────
// One surface and one row for selects, menus, the combobox, quick ranges and
// the org switcher, drawn the way Linear draws its dropdowns: grayscale, no
// accent. White panel, 12px corners, 4px in, the floating shadow (md, its
// hairline outside); rows 32px with 8px corners (12 less the 4px gap), a
// 16px muted glyph leading, the label a step down from full text until the
// row is highlighted on gray-100, a check on the right for what's chosen and
// a shortcut after it. Danger rows stay red, on the same gray highlight.

// Never narrower than --pl-popover-min (200px), however short its rows: a
// list hugging a small trigger crowds its labels against the check, so every
// dropdown, menu and select gets room to breathe. A wider trigger still widens it.
export const POPOVER =
  "min-w-(--pl-popover-min) rounded-(--pl-radius-md) bg-(--pl-popover) p-1 text-(--pl-text) shadow-(--pl-shadow-md)";

const ROW =
  "relative flex h-8 w-full cursor-pointer items-center gap-2 rounded-(--pl-radius-sm) px-2 text-left text-sm leading-5 whitespace-nowrap outline-none select-none aria-disabled:pointer-events-none aria-disabled:opacity-50";

export const rowClass = (highlighted: boolean, danger?: boolean) =>
  `${ROW} ${highlighted ? "bg-(--pl-highlight)" : ""} ${
    danger ? "text-(--pl-destructive)" : highlighted ? "text-(--pl-text)" : "text-(--pl-text-secondary)"
  }`;

/** A row's leading glyph: 16px, muted (danger rows keep their red) */
export function RowIcon({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <span
      data-glyph=""
      className={`flex size-4 shrink-0 items-center justify-center [&_svg]:size-4 ${danger ? "" : "text-(--pl-text-muted)"}`}
    >
      {children}
    </span>
  );
}

/**
 * What sits at a row's right end: anything quiet (a count), the chosen row's
 * check, then its shortcut. A row that can be checked (checked is true or
 * false, not left out) keeps the check's 16px whether it's shown or not, so
 * what's beside it (a filter value's count) stays put as rows are ticked.
 */
export function RowEnd({ checked, shortcut, children }: { checked?: boolean; shortcut?: string; children?: React.ReactNode }) {
  if (checked === undefined && !shortcut && !children) return null;
  return (
    <span className="ml-auto flex shrink-0 items-center gap-2 pl-3">
      {children}
      {checked && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="text-(--pl-text)"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {checked === false && <span aria-hidden className="size-4" />}
      {shortcut && (
        <kbd className="min-w-4 text-center font-sans text-xs leading-4 font-medium text-(--pl-text-muted)">{shortcut}</kbd>
      )}
    </span>
  );
}

/** A small muted heading over a group of rows */
export function PopoverLabel({ children, end }: { children: React.ReactNode; end?: React.ReactNode }) {
  return (
    <div className="flex h-7 items-center justify-between gap-3 px-2 text-xs leading-4 font-medium text-(--pl-text-muted)">
      {children}
      {end}
    </div>
  );
}

/** A hairline across the whole panel, edge to edge */
/**
 * Type to filter: a popover with this many rows or more (a long select, the
 * org switcher, a column's values) opens with a search on top, focused, so
 * you can just start typing; shorter ones stay a plain list.
 */
export const SEARCH_FROM = 5;

/** whether a row's text matches what's typed: any part of it, ignoring case */
export const matches = (text: string, query: string) => text.toLowerCase().includes(query.trim().toLowerCase());

/**
 * The search on top of a popover: a 36px row over a hairline, a muted 16px
 * glyph, then the query, focused as the popover opens. Arrows and Enter still
 * move through and pick from the rows under it (the popover's keys).
 */
export function PopoverSearch({
  value,
  onChange,
  placeholder = "Search…",
  autoFocus = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // a panel is hidden for its first frame while it's placed, and a hidden
  // input can't take focus (autoFocus would miss), so focus it the frame after
  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [autoFocus]);
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b-[0.5px] border-(--pl-border) px-3">
      <SearchIcon className="shrink-0 text-(--pl-text-muted)" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full w-full bg-transparent text-sm leading-5 text-(--pl-text) outline-none placeholder:text-(--pl-text-muted)"
      />
    </div>
  );
}

/** What a filtered popover says when nothing's left */
export function PopoverEmpty({ children = "No results" }: { children?: React.ReactNode }) {
  return <p className="px-2 py-2 text-sm leading-5 text-(--pl-text-muted)">{children}</p>;
}

export function PopoverSeparator() {
  return <div role="separator" className="-mx-1 my-1 border-t-[0.5px] border-(--pl-border)" />;
}
