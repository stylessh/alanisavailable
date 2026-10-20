"use client";

import { DRAG_REGION } from "@/os/macos";
import { ACTIVE_SESSION, GROUPS } from "./content";
import { Icon, type IconName } from "./icon";
import { MoreMenu, SessionMenu } from "./menus";
import { Popover } from "./popover";
import { useControlsInset, useSidebar } from "./sidebar-state";
import type { PanelKind } from "./side-panel";

// The header floats over the transcript, which fades out under it: solid
// to 42pt, transparent by 60pt (pt, from the reference).
export const HEADER_H = 42;
const FADE_H = 18;

const activeTitle = GROUPS.flatMap((g) => g.sessions).find((s) => s.id === ACTIVE_SESSION)?.title ?? "";

/** A header icon button. A panel's button turns blue while its panel is open; others get a gray chip. */
function HeaderButton({
  label,
  icon,
  size = 18,
  active,
  tone = "gray",
  onClick,
}: {
  label: string;
  icon: IconName;
  size?: number;
  active?: boolean;
  tone?: "gray" | "blue";
  onClick?: () => void;
}) {
  const blue = active && tone === "blue";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className="flex size-[30px] items-center justify-center rounded-md hover:bg-(--cc-button-hover)"
      style={{ background: active ? (blue ? "var(--cc-active-bg)" : "var(--cc-chip-hover)") : undefined }}
    >
      <Icon name={icon} size={size} style={{ color: blue ? "var(--cc-active)" : active ? "var(--cc-text-strong)" : "var(--cc-icon)" }} />
    </button>
  );
}

/** The header's icons span this much (five 30pt buttons, the rule and the ⋮). */
const ICONS_W = 185;

export type PanelId = "details" | PanelKind;

/** The open session's title (its chevron opens the session menu) and the buttons that open its side panels. */
export function Header({
  panel,
  onToggle,
  iconsRight = "11px",
}: {
  panel: PanelId | null;
  onToggle: (panel: PanelId) => void;
  /** where the icons end: 11pt from the window's edge, or just left of an open side panel */
  iconsRight?: string;
}) {
  // with the sidebar hidden, the title clears the window controls (full screen: 100pt, else 174)
  const { shown } = useSidebar();
  const { end } = useControlsInset();
  const titleLeft = shown ? 16.5 : end + 18;
  return (
    <div {...DRAG_REGION} className="absolute inset-x-0 top-0 z-10" style={{ height: HEADER_H + FADE_H }}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, var(--cc-main) ${HEADER_H}px, transparent)`,
        }}
      />
      {/* the title gives way (truncates) before it reaches the icons */}
      <div
        className="absolute flex items-center gap-[5px] text-[13px] transition-[left] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          left: titleLeft,
          right: `calc(${iconsRight} + ${ICONS_W + 8}px)`,
          top: 15,
          height: 20,
          color: "var(--cc-text-strong)",
        }}
      >
        <span className="min-w-0 truncate">{activeTitle}</span>
        <Popover
          placement="bottom-start"
          offset={9}
          align={-4}
          trigger={({ open, toggle }) => (
            <button
              type="button"
              aria-label="Session options"
              aria-expanded={open}
              onClick={toggle}
              className="flex size-[20px] items-center justify-center rounded-[5px] hover:bg-(--cc-button-hover)"
              style={{ background: open ? "var(--cc-chip-hover)" : undefined }}
            >
              <Icon name="chevronDown" size={14} style={{ color: "var(--cc-text)" }} />
            </button>
          )}
        >
          <SessionMenu />
        </Popover>
      </div>
      <div className="absolute flex items-center" style={{ right: iconsRight, top: 10 }}>
        <HeaderButton label="Session details" icon="tasks" active={panel === "details"} onClick={() => onToggle("details")} />
        <span aria-hidden className="mr-[3px] ml-[1px] h-[16.5px] w-px" style={{ background: "var(--cc-card-border)" }} />
        <HeaderButton label="Terminal" icon="terminal" tone="blue" active={panel === "terminal"} onClick={() => onToggle("terminal")} />
        <HeaderButton label="Diff" icon="diff" size={19} tone="blue" active={panel === "diff"} onClick={() => onToggle("diff")} />
        <HeaderButton label="Browser" icon="globe" size={19} tone="blue" active={panel === "browser"} onClick={() => onToggle("browser")} />
        <HeaderButton label="Files" icon="folder" tone="blue" active={panel === "files"} onClick={() => onToggle("files")} />
        <Popover
          placement="bottom-end"
          offset={5.75}
          trigger={({ open, toggle }) => <HeaderButton label="More" icon="moreVertical" active={open} onClick={toggle} />}
        >
          <MoreMenu />
        </Popover>
      </div>
    </div>
  );
}
