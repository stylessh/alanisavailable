"use client";

import { motion } from "motion/react";
import { CloseIcon, MaximizeIcon, SplitDownIcon, SplitRightIcon } from "./icons";
import type { Rect } from "./model";

const SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.9 } as const;

/** A header control: the glyph stays at its measured spot, the button pads around it. */
function Control({
  label,
  onClick,
  style,
  children,
}: {
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={-1}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className="absolute grid cursor-default place-items-center rounded-[5px] p-[4px] transition-colors hover:bg-[rgb(0_0_0/0.06)] hover:text-[#6e6f71]"
      style={style}
    >
      {children}
    </button>
  );
}

/**
 * A Rex pane: a rounded card with a header (program glyph + title) and, on
 * the focused pane, split/zoom/close controls. Positions are window-relative.
 */
export function Pane({
  rect,
  focused,
  zoomed,
  instant,
  icon,
  title,
  onFocus,
  onSplit,
  onZoom,
  onClose,
  children,
}: {
  rect: Rect;
  focused: boolean;
  zoomed: boolean;
  /** skip the spring (while a divider is being dragged) */
  instant: boolean;
  icon: { node: React.ReactNode; x: number; y: number };
  title: string;
  onFocus: () => void;
  onSplit: (dir: "right" | "down") => void;
  onZoom: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97, left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      animate={{ opacity: 1, scale: 1, left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.14 } }}
      transition={instant ? { duration: 0 } : SPRING}
      onPointerDown={onFocus}
      aria-label={title}
      className="rex-ui absolute overflow-hidden"
      style={{
        borderRadius: "var(--rex-pane-radius)",
        // The focused pane is solid; the others are translucent, so the
        // window's glass (and the wallpaper behind it) reads through.
        background: focused ? "var(--rex-pane-active)" : "var(--rex-pane-inactive)",
        transition: "background-color 160ms ease",
        boxShadow:
          "0 0 0 0.5px rgb(0 0 0 / 0.08), inset 0 0.5px 0 rgb(255 255 255 / 0.9), 0 1px 2px rgb(0 0 0 / 0.04)",
      }}
    >
      <span className="absolute" style={{ left: icon.x, top: icon.y }}>
        {icon.node}
      </span>
      <h3
        className="absolute top-[9.5px] left-[28px] overflow-hidden text-[11px] leading-[14px] font-semibold text-ellipsis whitespace-nowrap [-webkit-text-stroke:0.12px_currentColor]"
        style={{
          color: focused ? "var(--rex-pane-title)" : "var(--rex-pane-title-muted)",
          maxWidth: rect.w - 28 - (focused ? 100 : 12),
        }}
      >
        {title}
      </h3>
      {focused && (
        // Each control anchored to the pane's right edge where the
        // reference has it (glyph positions measured by extraction).
        <div style={{ color: "var(--rex-pane-control)" }}>
          <Control label="Split right" onClick={() => onSplit("right")} style={{ top: 8.5, right: 75 }}>
            <SplitRightIcon />
          </Control>
          <Control label="Split down" onClick={() => onSplit("down")} style={{ top: 8.5, right: 52.5 }}>
            <SplitDownIcon />
          </Control>
          <Control label={zoomed ? "Unzoom" : "Zoom"} onClick={onZoom} style={{ top: 8, right: 30.5 }}>
            <MaximizeIcon />
          </Control>
          <Control label="Close pane" onClick={onClose} style={{ top: 9, right: 9 }}>
            <CloseIcon />
          </Control>
        </div>
      )}
      {/* Rex dims unfocused panes */}
      <div className="transition-opacity duration-150" style={{ opacity: focused ? 1 : "var(--rex-dim)" }}>
        {children}
      </div>
    </motion.section>
  );
}
