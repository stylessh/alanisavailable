"use client";

import { motion } from "motion/react";
import { CloseIcon, MaximizeIcon, SplitDownIcon, SplitRightIcon } from "./icons";
import type { Rect } from "./model";
import { useTile } from "./tween";

export type PaneShortcut = { label: string; aria: string };

/**
 * A header control: the glyph stays at its measured spot, the button pads
 * around it. Hovering shows a tooltip with its name and shortcut; `active`
 * marks a control whose mode is on (zoom).
 */
function Control({
  label,
  shortcut,
  active = false,
  onClick,
  style,
  children,
}: {
  label: string;
  shortcut?: PaneShortcut;
  active?: boolean;
  onClick: () => void;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-keyshortcuts={shortcut?.aria}
      aria-pressed={active || undefined}
      tabIndex={-1}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className="group/control absolute grid cursor-default place-items-center rounded-[5px] p-[4px] transition-colors hover:bg-[var(--rex-hover)] hover:text-[var(--rex-pane-control-hover)]"
      style={{
        ...style,
        ...(active && { background: "var(--rex-pressed)", color: "var(--rex-pane-title)" }),
      }}
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-[calc(100%+5px)] right-0 z-10 flex items-center gap-[7px] rounded-[6px] px-[7px] py-[3px] text-[11px] leading-[14px] font-medium whitespace-nowrap opacity-0 transition-opacity duration-100 group-hover/control:opacity-100 group-hover/control:delay-500"
        style={{
          background: "var(--rex-pane-beam), var(--rex-popover-bg)",
          boxShadow: "var(--rex-popover-shadow)",
          backdropFilter: "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: "blur(20px) saturate(1.8)",
          color: "var(--rex-ink)",
        }}
      >
        {label}
        {shortcut && <kbd className="font-sans tracking-[0.06em] text-[var(--rex-ink-muted)]">{shortcut.label}</kbd>}
      </span>
    </button>
  );
}

/**
 * A Rex pane: a rounded card with a header (program glyph + title) and, on
 * the focused pane, split/zoom/close controls. Positions are window-relative.
 */
export function Pane({
  id,
  rect,
  flat,
  leaving = false,
  vanishing = false,
  focused,
  zoomed,
  shortcuts,
  icon,
  title,
  onFocus,
  onSplit,
  onZoom,
  onClose,
  children,
}: {
  id: string;
  /** where the layout puts it (its box comes from the shared tween) */
  rect: Rect;
  /** pushed flat by a zoomed sibling */
  flat: boolean;
  /** closed, collapsing into its edge */
  leaving?: boolean;
  /** closed and interrupted by a newer change: gone at once, before anything can cross it */
  vanishing?: boolean;
  focused: boolean;
  /** this pane is the zoomed one: its zoom control shows as on */
  zoomed: boolean;
  /** shortcuts shown in the controls' tooltips */
  shortcuts: { splitRight?: PaneShortcut; splitDown?: PaneShortcut; zoom?: PaneShortcut; close?: PaneShortcut };
  icon: { node: React.ReactNode; x: number; y: number };
  title: string;
  onFocus: () => void;
  onSplit: (dir: "right" | "down") => void;
  onZoom: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { left, top, width, height, opacity } = useTile(id, rect);
  return (
    <motion.section
      onPointerDown={leaving ? undefined : onFocus}
      aria-label={title}
      aria-hidden={flat || undefined}
      className="group/pane rex-ui absolute overflow-hidden"
      style={{
        borderRadius: "var(--rex-pane-radius)",
        // The focused pane is solid; the others are translucent, so the
        // window's glass (and the wallpaper behind it) reads through.
        background: `var(--rex-pane-beam), ${focused ? "var(--rex-pane-active)" : "var(--rex-pane-inactive)"}`,
        transition: "background-color 160ms ease",
        // explicit: the layer the panes sit in passes events through
        pointerEvents: flat || leaving ? "none" : "auto",
        left,
        top,
        width,
        height,
        opacity,
        ...(vanishing && { visibility: "hidden" as const }),
        boxShadow: "var(--rex-pane-shadow)",
      }}
    >
      <span className="absolute" style={{ left: icon.x, top: icon.y }}>
        {icon.node}
      </span>
      <h3
        className="absolute top-[9.5px] left-[28px] overflow-hidden text-[11px] leading-[14px] font-semibold text-ellipsis whitespace-nowrap [-webkit-text-stroke:0.12px_currentColor]"
        style={{
          color: focused ? "var(--rex-pane-title)" : "var(--rex-pane-title-muted)",
          // room for the controls, which any pane shows on hover
          maxWidth: rect.w - 28 - 100,
        }}
      >
        {title}
      </h3>
      {/* Each control anchored to the pane's right edge where the reference
          has it (glyph positions measured by extraction). The focused pane
          always shows them; any other pane shows them on hover, and they act
          on that pane without focusing it first. */}
      <div
        className={
          focused
            ? undefined
            : "pointer-events-none opacity-0 transition-opacity duration-150 group-hover/pane:pointer-events-auto group-hover/pane:opacity-100"
        }
        style={{ color: "var(--rex-pane-control)" }}
      >
        <Control label="Split Right" shortcut={shortcuts.splitRight} onClick={() => onSplit("right")} style={{ top: 8.5, right: 75 }}>
          <SplitRightIcon />
        </Control>
        <Control label="Split Down" shortcut={shortcuts.splitDown} onClick={() => onSplit("down")} style={{ top: 8.5, right: 52.5 }}>
          <SplitDownIcon />
        </Control>
        <Control
          label={zoomed ? "Exit Zoom" : "Zoom Pane"}
          shortcut={shortcuts.zoom}
          active={zoomed}
          onClick={onZoom}
          style={{ top: 8, right: 30.5 }}
        >
          <MaximizeIcon />
        </Control>
        <Control label="Close Pane" shortcut={shortcuts.close} onClick={onClose} style={{ top: 9, right: 9 }}>
          <CloseIcon />
        </Control>
      </div>
      {/* Rex dims unfocused panes */}
      <div className="transition-opacity duration-150" style={{ opacity: focused ? 1 : "var(--rex-dim)" }}>
        {children}
      </div>
    </motion.section>
  );
}
