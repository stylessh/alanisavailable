"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, type CSSProperties, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icon";

// Claude's menus and popovers (pt, from the screen recording at 2x): a
// #1d1d1d surface with a 1pt #2f2f2f rim and r 10 corners, 3pt of padding
// inside the rim (3.5 top and bottom), 13px text on a 24pt row pitch. The
// pointer's row turns #2b2b2b. Submenus open 2pt off their parent's edge,
// lined up with the row that opened them.
export const ROW_H = 24;
const PAD_X = 3;
const PAD_Y = 3.5;
const RIM = 1;
/** a submenu's first row lines up with the row that opened it: this is the padding plus the rim */
const SUB_OFFSET = PAD_Y + RIM;

export type Placement = "top-start" | "top-end" | "bottom-start" | "bottom-end" | "right-start" | "right-end";

const PopoverContext = createContext<{ close: () => void } | null>(null);
/** Closes the popover the caller is in (a menu item that ran its action). */
export const useClosePopover = () => useContext(PopoverContext)?.close ?? (() => {});

function placementStyle(placement: Placement, offset: number, align: number): CSSProperties {
  const [side, edge] = placement.split("-") as ["top" | "bottom" | "right", "start" | "end"];
  if (side === "right")
    return {
      left: `calc(100% + ${offset}px)`,
      ...(edge === "start" ? { top: align } : { bottom: align }),
    };
  return {
    ...(side === "top" ? { bottom: `calc(100% + ${offset}px)` } : { top: `calc(100% + ${offset}px)` }),
    ...(edge === "start" ? { left: align } : { right: align }),
  };
}

const ORIGIN: Record<Placement, string> = {
  "top-start": "bottom left",
  "top-end": "bottom right",
  "bottom-start": "top left",
  "bottom-end": "top right",
  "right-start": "top left",
  "right-end": "bottom left",
};

/**
 * A button that opens a floating surface next to itself. The trigger gets
 * `open` and `toggle`; the surface closes on Escape, on a press outside, or
 * when an item calls `useClosePopover()`. `offset` is the gap to the trigger
 * and `align` shifts the surface along it (both pt, measured per popover).
 */
export function Popover({
  trigger,
  children,
  placement,
  offset = 8,
  align = 0,
  className = "",
  style,
}: {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  placement: Placement;
  offset?: number;
  align?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <PopoverContext.Provider value={{ close: () => setOpen(false) }}>
      {/* the root anchors the surface; a caller that positions it absolutely keeps that */}
      <div ref={root} data-no-drag className={`${/\babsolute\b/.test(className) ? "" : "relative "}${className}`} style={style}>
        {trigger({ open, toggle: () => setOpen((o) => !o) })}
        <AnimatePresence>
          {open && (
            <motion.div
              className="absolute z-50"
              style={{
                ...placementStyle(placement, offset, align),
                transformOrigin: ORIGIN[placement],
              }}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.08 } }}
              transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PopoverContext.Provider>
  );
}

/** The floating surface itself: menus, the context usage card. */
export function Surface({
  width,
  fit,
  children,
  className = "",
  style,
}: {
  width: number;
  /** `width` is a minimum and the surface grows to its longest row (menus do; the usage card doesn't) */
  fit?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      role="menu"
      className={`cc-surface rounded-[10px] text-[13px] tracking-[-0.004em] ${className}`}
      style={{ ...(fit ? { minWidth: width, width: "max-content" } : { width }), padding: `${PAD_Y}px ${PAD_X}px`, ...style }}
    >
      {children}
    </div>
  );
}

const SubmenuContext = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
}>({ openId: null, setOpenId: () => {} });

/** A menu: a surface whose rows can open submenus on hover. */
export function Menu({ width, children, className, style }: { width: number; children: ReactNode; className?: string; style?: CSSProperties }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <SubmenuContext.Provider value={{ openId, setOpenId }}>
      <Surface width={width} fit className={className} style={style}>
        {children}
      </Surface>
    </SubmenuContext.Provider>
  );
}

export type Submenu = {
  content: ReactNode;
  /** which side of the parent it opens on, and whether its top or its bottom lines up with this row */
  side?: "right" | "left";
  align?: "start" | "end";
  /** gap between the two surfaces (pt) */
  gap?: number;
};

let ids = 0;
const useStableId = () => {
  const [id] = useState(() => `sub-${ids++}`);
  return id;
};

/**
 * One row. Icon at 9.5pt in, label at 30.5pt (or 9.5pt without an icon
 * column), and on the right a hint (a shortcut, a value, a number), a
 * check, a toggle, an external-link mark or a submenu chevron.
 */
export function MenuItem({
  icon,
  iconColor,
  label,
  description,
  badge,
  hint,
  checked,
  toggle,
  external,
  danger,
  inset = true,
  submenu,
  labelStyle,
  onSelect,
}: {
  icon?: IconName;
  iconColor?: string;
  label: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  hint?: ReactNode;
  checked?: boolean;
  toggle?: { on: boolean; onChange: (on: boolean) => void };
  external?: boolean;
  danger?: boolean;
  /** leave room for an icon even when the row has none (rows in a menu where others have icons) */
  inset?: boolean;
  submenu?: Submenu;
  labelStyle?: CSSProperties;
  onSelect?: () => void;
}) {
  const id = useStableId();
  const { openId, setOpenId } = useContext(SubmenuContext);
  const close = useClosePopover();
  const subOpen = !!submenu && openId === id;
  const hasIconColumn = !!icon || inset;

  return (
    <div
      role="menuitem"
      tabIndex={-1}
      aria-haspopup={submenu ? "menu" : undefined}
      aria-expanded={submenu ? subOpen : undefined}
      className="cc-menu-row relative flex cursor-default items-center rounded-[6px] outline-none"
      data-open={subOpen || undefined}
      style={{
        minHeight: ROW_H,
        paddingLeft: hasIconColumn ? 30.5 : 9.5,
        paddingRight: 9.5,
        paddingBlock: description ? 3.5 : 0,
        color: danger ? "var(--cc-danger)" : "var(--cc-menu-text)",
      }}
      onPointerEnter={() => setOpenId(submenu ? id : null)}
      onClick={() => {
        if (submenu) return setOpenId(id);
        if (toggle) return toggle.onChange(!toggle.on);
        onSelect?.();
        close();
      }}
    >
      {icon && (
        <Icon
          name={icon}
          size={15}
          className="absolute"
          style={{
            left: 9.5 - 1,
            top: description ? 5 : (ROW_H - 15) / 2,
            color: iconColor,
          }}
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-[7px] leading-[18px]" style={labelStyle}>
          <span className="whitespace-nowrap">{label}</span>
          {badge}
        </span>
        {description && (
          <span className="text-[12px] leading-[16px] whitespace-nowrap" style={{ color: "var(--cc-text-muted)" }}>
            {description}
          </span>
        )}
      </span>
      {(checked || hint !== undefined || external || toggle || submenu) && (
        // a value or a tag sits level with the label; a toggle or a tag beside two lines centers on both
        <span
          className={`ml-[12px] flex flex-none items-center gap-[10px] ${description && (toggle || typeof hint === "object") ? "self-center" : "self-start"}`}
          style={{ height: description && !(toggle || typeof hint === "object") ? 18 : ROW_H, color: "var(--cc-text-muted)" }}
        >
          {checked && <Icon name="check" size={14} style={{ color: "var(--cc-check)" }} />}
          {hint !== undefined && <span className="text-[12.5px]">{hint}</span>}
          {external && <Icon name="external" size={14} style={{ color: "var(--cc-menu-text)" }} />}
          {toggle && <Toggle on={toggle.on} />}
          {submenu && <Icon name="chevronRight" size={12} />}
        </span>
      )}
      {submenu && subOpen && (
        <div
          className="absolute z-10"
          style={{
            ...(submenu.side === "left"
              ? { right: `calc(100% + ${PAD_X + RIM + (submenu.gap ?? 2)}px)` }
              : { left: `calc(100% + ${PAD_X + RIM + (submenu.gap ?? 2)}px)` }),
            ...(submenu.align === "end" ? { bottom: -SUB_OFFSET } : { top: -SUB_OFFSET }),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {submenu.content}
        </div>
      )}
    </div>
  );
}

/** A 1pt rule between groups, 8pt in from the surface's edges with 4pt above and below. */
export function MenuSeparator() {
  return <div aria-hidden className="my-[4px] h-px" style={{ marginInline: 8, background: "var(--cc-menu-rule)" }} />;
}

/** A group's muted heading ("Mode", "Open in", "Fast mode", the account's email). */
export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-center text-[12.5px]"
      style={{
        height: ROW_H,
        paddingInline: 9.5,
        color: "var(--cc-text-muted)",
      }}
    >
      {children}
    </div>
  );
}

/** A short muted paragraph at the top of a menu (Effort's explanation). */
export function MenuNote({ children }: { children: ReactNode }) {
  return (
    // w-0 min-w-full: the note wraps to the menu's width instead of widening it
    <p className="w-0 min-w-full text-[12px] leading-[16px]" style={{ padding: "4px 9.5px 6px", color: "var(--cc-text-muted)" }}>
      {children}
    </p>
  );
}

/** macOS-style switch: 26 × 15pt, blue when on. */
export function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className="relative inline-block h-[15px] w-[26px] flex-none rounded-full transition-colors duration-150"
      style={{
        background: on ? "var(--cc-toggle-on)" : "var(--cc-toggle-off)",
      }}
    >
      <span
        className="absolute top-[2px] size-[11px] rounded-full bg-white transition-transform duration-150"
        style={{
          left: 2,
          transform: on ? "translateX(11px)" : undefined,
          boxShadow: "0 0.5px 1.5px rgb(0 0 0 / 0.3)",
        }}
      />
    </span>
  );
}

/** A small rounded tag after a label ("Recommended", "Beta"). */
export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warning" | "accent" }) {
  const tones = {
    neutral: { background: "var(--cc-tag)", color: "var(--cc-text-muted)" },
    warning: { background: "var(--cc-warning-bg)", color: "var(--cc-warning)" },
    accent: { background: "var(--cc-accent-bg)", color: "var(--cc-accent)" },
  };
  return (
    <span className="flex-none rounded-[4px] px-[5px] text-[11px] leading-[16px]" style={tones[tone]}>
      {children}
    </span>
  );
}
