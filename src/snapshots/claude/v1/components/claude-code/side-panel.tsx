"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icon";

// The side panels the header's Terminal, Diff, Browser and Files buttons open
// (pt, from the screen recording): a card inset 8pt from the window's top,
// right and bottom edges, r 12 corners and a 1pt #262626 rim. Its first row
// is 34pt tall and holds the panel's tabs or title on the left and its
// actions on the right, 26.5pt apart, ending with expand and close. Each
// panel takes a share of the main pane, as in the recording.
export type PanelKind = "terminal" | "diff" | "browser" | "files";

export const PANEL_SHARE: Record<PanelKind, number> = { terminal: 0.374, browser: 0.427, diff: 0.506, files: 0.586 };
export const PANEL_EDGE = 8;
export const PANEL_BAR = 34;

/** A 24pt icon button in a panel's bar (or the Browser's address row). */
export function BarButton({
  icon,
  label,
  size = 15,
  active,
  tone = "blue",
  onClick,
  style,
}: {
  icon: IconName;
  label: string;
  size?: number;
  active?: boolean;
  /** a toggle that's on is blue; a button whose menu is open is gray */
  tone?: "blue" | "gray";
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className="flex size-[24px] flex-none items-center justify-center rounded-[6px] hover:bg-(--cc-button-hover)"
      style={{
        background: active ? (tone === "blue" ? "var(--cc-active-bg)" : "var(--cc-chip-hover)") : undefined,
        color: active && tone === "blue" ? "var(--cc-active)" : "var(--cc-icon)",
        ...style,
      }}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

/** The card and its bar. `actions` sit left of expand and close. */
export function PanelFrame({
  title,
  actions,
  expanded,
  onExpand,
  onClose,
  background = "var(--cc-panel)",
  children,
}: {
  title: ReactNode;
  actions?: ReactNode;
  expanded: boolean;
  onExpand: () => void;
  onClose: () => void;
  background?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex size-full flex-col overflow-hidden rounded-[12px] text-[13px]"
      style={{ background, boxShadow: "inset 0 0 0 1px var(--cc-panel-rim)" }}
    >
      <div className="flex flex-none items-center gap-[2.5px]" style={{ height: PANEL_BAR, paddingLeft: 4, paddingRight: 5 }}>
        <div className="flex min-w-0 flex-1 items-center">{title}</div>
        {actions}
        <BarButton icon="expand" label={expanded ? "Restore panel" : "Expand panel"} active={expanded} onClick={onExpand} />
        <BarButton icon="close" label="Close panel" onClick={onClose} />
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

/** A tab in a panel's bar: a 24pt chip, lit when it's the open one, with its own close mark. */
export function PanelTab({
  active,
  label,
  icon,
  italic,
  onSelect,
  onClose,
}: {
  active: boolean;
  label: string;
  icon?: ReactNode;
  italic?: boolean;
  onSelect: () => void;
  onClose?: () => void;
}) {
  return (
    <div
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className="group flex h-[24px] flex-none cursor-default items-center gap-[6px] rounded-[6px] pr-[5px] pl-[9px] hover:bg-(--cc-button-hover)"
      style={{ background: active ? "var(--cc-tab)" : undefined, color: active ? "var(--cc-text-strong)" : "var(--cc-text-muted)" }}
    >
      {icon}
      <span className={`whitespace-nowrap ${italic ? "italic" : ""}`}>{label}</span>
      {onClose && (
        <button
          type="button"
          aria-label={`Close ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`flex size-[16px] items-center justify-center rounded-[4px] hover:bg-(--cc-button-hover) ${active ? "" : "opacity-60"}`}
        >
          <Icon name="close" size={10} />
        </button>
      )}
    </div>
  );
}

// File-type marks, as the Files and Diff panels draw them: small colored
// glyphs keyed by extension.
const MARKS: { test: RegExp; mark: ReactNode }[] = [
  { test: /\.json$/, mark: <span style={{ color: "#f0a33a" }}>{"{}"}</span> },
  { test: /\.tsx$/, mark: <Icon name="gear" size={12} style={{ color: "#5aa9e6" }} /> },
  { test: /\.(ts|mts)$/, mark: <Badge color="#3178c6">TS</Badge> },
  { test: /\.css$/, mark: <Badge color="#7c4dcc">css</Badge> },
  { test: /\.mdx?$/, mark: <Badge color="#3a8a4a">↓</Badge> },
  { test: /\.(png|jpg|ico|svg)$/, mark: <Icon name="image" size={12} style={{ color: "#e5677a" }} /> },
  { test: /\.(woff2?|ttf)$/, mark: <span style={{ color: "var(--cc-text-muted)", fontSize: 10 }}>Aa</span> },
  { test: /\.ya?ml$/, mark: <Icon name="connector" size={12} style={{ color: "#f0605a" }} /> },
  { test: /\.mjs$/, mark: <span className="size-[10px] rounded-full" style={{ border: "2px solid #8b6cf0" }} /> },
  { test: /^\.gitignore$/, mark: <span className="size-[8px] rotate-45 rounded-[1px]" style={{ background: "#f0603a" }} /> },
];

function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="flex h-[11px] min-w-[11px] items-center justify-center rounded-[2px] px-[1px] text-[6.5px] leading-none font-bold text-white"
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

/** A file's mark in a 14pt box (a plain page when the type has none). */
export function FileMark({ name }: { name: string }) {
  const mark = MARKS.find((m) => m.test.test(name))?.mark ?? <Icon name="file" size={12} style={{ color: "var(--cc-text-muted)" }} />;
  return (
    <span aria-hidden className="flex size-[14px] flex-none items-center justify-center text-[11px] leading-none">
      {mark}
    </span>
  );
}

/** how far scrolled content fades out at an edge it continues past (pt) */
const FADE = 20;

/**
 * Edge fades for something that scrolls: an edge with more beyond it fades
 * out instead of cutting off, and only while there is something past it.
 * Returns the ref for the scroller and the mask to put on it. It keeps up
 * with scrolling, with the scroller resizing, and with its content changing.
 */
export function useEdgeFade<T extends HTMLElement>(axis: "x" | "y", fade = FADE) {
  const ref = useRef<T>(null);
  const [more, setMore] = useState({ start: false, end: false });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const check = () => {
      const at = axis === "x" ? node.scrollLeft : node.scrollTop;
      const view = axis === "x" ? node.clientWidth : node.clientHeight;
      const full = axis === "x" ? node.scrollWidth : node.scrollHeight;
      const start = at > 1;
      const end = at + view < full - 1;
      setMore((m) => (m.start === start && m.end === end ? m : { start, end }));
    };
    const sizes = new ResizeObserver(check);
    const watch = () => {
      sizes.disconnect();
      sizes.observe(node);
      for (const child of node.children) sizes.observe(child);
      check();
    };
    // what's inside changes (a tab, a section folding): watch its new pieces too
    const children = new MutationObserver(watch);
    children.observe(node, { childList: true });
    watch();
    node.addEventListener("scroll", check, { passive: true });
    return () => {
      node.removeEventListener("scroll", check);
      sizes.disconnect();
      children.disconnect();
    };
  }, [axis]);
  const mask = `linear-gradient(to ${axis === "x" ? "right" : "bottom"}, ${more.start ? "transparent" : "#000"}, #000 ${fade}px, #000 calc(100% - ${fade}px), ${more.end ? "transparent" : "#000"})`;
  return [ref, { maskImage: mask, WebkitMaskImage: mask }] as const;
}
