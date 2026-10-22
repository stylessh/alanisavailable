"use client";

import { DRAG_REGION } from "../../os/macos";
import { EVERY_SESSION } from "./content";
import { Icon, type IconName } from "./icon";
import type { PrStatus } from "./pr-panel";
import { MoreMenu, SessionMenu } from "./menus";
import { Popover } from "./popover";
import { useControlsInset, useSidebar } from "./sidebar-state";
import type { PanelKind } from "./side-panel";

// The header floats over the transcript, which fades out under it: solid
// to 42pt, transparent by 60pt (pt, from the reference).
export const HEADER_H = 42;
const FADE_H = 18;

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

/** a pull request's state as a color: purple merged, red with a failed check, amber while checks run, green passing */
const toneOf = (pr: PrStatus) =>
  pr.state === "merged" ? "var(--cc-merged)" : pr.checks === "failure" ? "var(--cc-danger)" : pr.checks === "success" ? "var(--cc-merge)" : "var(--cc-warning)";

/** the count's size, its ring's line and the gap between two pull requests' dashes (pt); the ring is the disc's edge */
const COUNT = 14;
const RING_W = 1.5;
const RING_R = COUNT / 2 - RING_W / 2;
const DASH_GAP = 1.1;

/**
 * How many pull requests the session has, on the button's corner: the number
 * on a light disc, just off the header's own color, ringed by one dash per pull request in its state's color
 * (round-capped, a little apart), so the ring says how they're all going.
 */
function PrCount({ prs }: { prs: readonly PrStatus[] }) {
  const c = 2 * Math.PI * RING_R;
  const slot = c / prs.length;
  // a round cap adds half the line at each end: the dash is drawn that much shorter
  const dash = Math.max(0.01, slot - DASH_GAP - RING_W);
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-[2px] -right-[2px] flex items-center justify-center rounded-full"
      style={{ width: COUNT, height: COUNT, background: "var(--cc-panel)" }}
    >
      <svg viewBox={`0 0 ${COUNT} ${COUNT}`} className="absolute inset-0 size-full -rotate-90">
        {prs.map((pr, i) => (
          <circle
            key={i}
            cx={COUNT / 2}
            cy={COUNT / 2}
            r={RING_R}
            fill="none"
            stroke={toneOf(pr)}
            strokeWidth={RING_W}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            // each dash starts half a gap (and half a cap) into its slot, so the gaps sit evenly around
            strokeDashoffset={-(i * slot + (DASH_GAP + RING_W) / 2)}
          />
        ))}
      </svg>
      <span className="relative text-[8px] leading-none font-semibold tabular-nums" style={{ color: "var(--cc-text-strong)" }}>
        {prs.length}
      </span>
    </span>
  );
}

/** The header's icons span this much (five 30pt buttons, the rule and the ⋮), and one more button when the session has a pull request. */
const ICONS_W = 185;
const BUTTON_W = 30;

export type PanelId = "details" | PanelKind;

/** The open session's title (its chevron opens the session menu) and the buttons that open its side panels. */
export function Header({
  open,
  onToggle,
  iconsRight = "11px",
  prs = [],
}: {
  /** what's open: the details card, or the side panels in the stack */
  open: readonly PanelId[];
  /** where each pull request the session opened stands: with any, their panel gets a button, and with more than one, a count ringed by their states */
  prs?: readonly PrStatus[];
  onToggle: (panel: PanelId) => void;
  /** where the icons end: 11pt from the window's edge, or just left of the open side panels */
  iconsRight?: string;
}) {
  // with the sidebar hidden, the title clears the window controls (full screen: 100pt, else 174)
  const { shown, active } = useSidebar();
  const activeTitle = EVERY_SESSION.find((e) => e.session.id === active)?.session.title ?? "";
  const { end } = useControlsInset();
  // it stays clear of the window controls while the sidebar opens or closes: in the
  // window it sits at max(sidebar + 16.5, controls + 18), so it rides along with the sidebar's width
  const titleLeft = `max(16.5px, ${end + 18}px - var(--cc-dock-w, ${shown ? 285 : 0}px))`;
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
        className="absolute flex items-center gap-[5px] text-[13px]"
        style={{
          left: titleLeft,
          right: `calc(${iconsRight} + ${ICONS_W + (prs.length ? BUTTON_W : 0) + 8}px)`,
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
        <HeaderButton label="Session details" icon="tasks" active={open.includes("details")} onClick={() => onToggle("details")} />
        <span aria-hidden className="mr-[3px] ml-[1px] h-[16.5px] w-px" style={{ background: "var(--cc-card-border)" }} />
        <HeaderButton label="Terminal" icon="terminal" tone="blue" active={open.includes("terminal")} onClick={() => onToggle("terminal")} />
        <HeaderButton label="Diff" icon="diff" size={19} tone="blue" active={open.includes("diff")} onClick={() => onToggle("diff")} />
        <HeaderButton label="Browser" icon="globe" size={19} tone="blue" active={open.includes("browser")} onClick={() => onToggle("browser")} />
        <HeaderButton label="Files" icon="folder" tone="blue" active={open.includes("files")} onClick={() => onToggle("files")} />
        {prs.length > 0 && (
          // with more than one, a count sits on the button's corner
          <span className="relative flex">
            <HeaderButton
              label={prs.length > 1 ? `${prs.length} pull requests` : "Pull request"}
              icon="pullRequest"
              size={16}
              tone="blue"
              active={open.includes("pr")}
              onClick={() => onToggle("pr")}
            />
            {prs.length > 1 && <PrCount prs={prs} />}
          </span>
        )}
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
