"use client";

import { animate, AnimatePresence, motion, useMotionValue, useMotionValueEvent } from "motion/react";
import { useEffect, useRef } from "react";
import { DRAG_REGION } from "@/os/macos";
import { ACCOUNT, ACTIVE_SESSION, GROUPS, PINNED, type Session } from "./content";
import { Icon, type IconName } from "./icon";
import { AccountMenu, NavMoreMenu } from "./menus";
import { Popover } from "./popover";
import { useSidebar, WindowControls } from "./sidebar-state";

// Sidebar geometry (window-relative pt, from the reference): 284.5pt wide
// plus a 1-device-px divider. A session row's highlight runs 8..276.5pt
// (as wide as "Relaunch to update"); icons sit in a 15pt square 8.5pt into
// the row, labels start at 42pt, session titles at 18pt.
export const SIDEBAR_W = 285;
/** Floating over the session (the sidebar hidden, the pointer on its toggle) it is narrower and lighter, flush to the window's left edge. */
const FLOATING_W = 263;
const SLIDE = { type: "spring", stiffness: 520, damping: 46 } as const;
const NAV_ROW = 26.75;
const SESSION_ROW = 30;
const ROW_INSET = 8;

const DOT: Record<NonNullable<Session["dot"]>, string> = {
  working: "var(--cc-dot-working)",
  waiting: "var(--cc-dot-waiting)",
  done: "var(--cc-dot-done)",
};

/** Chat / Code: the Code tab is selected (a raised tile inside the track). It keeps 8pt from the sidebar's right edge (10 floating). */
function ModeSwitch({ right }: { right: number }) {
  return (
    <div
      role="tablist"
      aria-label="Mode"
      className="absolute grid grid-cols-2 rounded-[10px] p-px"
      style={{
        right,
        top: 10,
        width: 69.5,
        height: 28,
        background: "var(--cc-switch-track)",
      }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={false}
        aria-label="Chat"
        className="flex items-center justify-center rounded-[9px]"
        style={{ color: "var(--cc-text-muted)" }}
      >
        <Icon name="chats" size={16} />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected
        aria-label="Code"
        className="flex items-center justify-center rounded-[9px]"
        style={{
          background: "var(--cc-tile)",
          boxShadow: "inset 0 0 0 var(--cc-tile-border-w) var(--cc-tile-border)",
          color: "var(--cc-text-strong)",
        }}
      >
        <Icon name="code" size={16} />
      </button>
    </div>
  );
}

/** A row's hover highlight: the active row's shape, a step lighter than the sidebar. */
function RowHover({ open }: { open?: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute inset-y-px rounded-[8px] transition-opacity duration-100 group-hover:opacity-100 ${open ? "opacity-100" : "opacity-0"}`}
      style={{ insetInline: ROW_INSET, background: "var(--cc-row-hover)" }}
    />
  );
}

function NavRow({
  icon,
  label,
  badge,
  primary,
  iconSize = 15,
  open,
  onClick,
}: {
  icon: IconName;
  label: string;
  badge?: string;
  primary?: boolean;
  iconSize?: number;
  /** the row's menu is open: it keeps its highlight */
  open?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className="group relative flex w-full items-center text-left text-[13px]"
      style={{ height: NAV_ROW }}
    >
      <RowHover open={open} />
      {primary ? (
        // New: the plus in an 18pt disc
        <span className="absolute flex size-[18px] items-center justify-center rounded-full" style={{ left: 17, background: "var(--cc-row-active)" }}>
          <Icon name={icon} size={15} />
        </span>
      ) : (
        <Icon name={icon} size={iconSize} className="absolute" style={{ left: 26 - iconSize / 2, top: (NAV_ROW - iconSize) / 2 }} />
      )}
      <span className="absolute" style={{ left: 42 }}>
        {label}
        {badge && (
          <span
            className="ml-[12.5px] rounded-[5px] px-[5px] py-[2.5px] text-[12px]"
            style={{
              background: "var(--cc-field)",
              color: "var(--cc-text-muted)",
            }}
          >
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}

function SectionLabel({ label, add }: { label: string; add?: boolean }) {
  return (
    <div className="relative flex h-[28.5px] items-center text-[12px]" style={{ color: "var(--cc-text-muted)" }}>
      <span className="absolute" style={{ left: 18 }}>
        {label}
      </span>
      {add && (
        <button
          type="button"
          aria-label={`New session in ${label}`}
          className="absolute flex size-5 items-center justify-center rounded-[5px] hover:bg-(--cc-row-hover)"
          style={{ right: 13 }}
        >
          <Icon name="plus" size={15} />
        </button>
      )}
    </div>
  );
}

/** The tree line starts this far into the first child's row, clear of the parent's highlight. */
const TREE_TOP = 4;

function SessionRow({ session, depth = 0, first, last }: { session: Session; depth?: number; first?: boolean; last?: boolean }) {
  const active = session.id === ACTIVE_SESSION;
  const left = depth ? 38 : 18;
  return (
    <>
      <div
        className={`relative mb-[2px] flex items-center rounded-[8px] text-[13px] ${active ? "" : "hover:bg-(--cc-row-hover)"}`}
        style={{
          marginInline: ROW_INSET,
          height: SESSION_ROW - 2,
          background: active ? "var(--cc-row-active)" : undefined,
          color: active ? "var(--cc-text-strong)" : "var(--cc-text)",
        }}
      >
        {depth > 0 && (
          // the tree line from the parent (x 22pt), ending in a hook to 31.5pt at the last child
          <span
            aria-hidden
            className="absolute border-l"
            style={{
              left: 22 - ROW_INSET,
              top: first ? TREE_TOP : 0,
              height: (last ? SESSION_ROW / 2 - 1 : SESSION_ROW) - (first ? TREE_TOP : 0),
              width: 9.5,
              borderColor: "var(--cc-tree)",
              borderBottomWidth: last ? 1 : 0,
              borderBottomLeftRadius: last ? 4 : 0,
            }}
          />
        )}
        <span
          className="absolute overflow-hidden whitespace-nowrap tracking-[-0.004em]"
          style={{
            left: left - ROW_INSET,
            right: session.branches !== undefined ? 63 : 22.5,
            maskImage: "linear-gradient(to left, transparent, black 16px)",
          }}
        >
          {session.title}
        </span>
        {session.branches !== undefined && (
          <span className="absolute flex items-center gap-[2px] text-[12px]" style={{ right: 29.5, color: "var(--cc-branch)" }}>
            <Icon name="branch" size={13} />
            {session.branches > 0 && <span style={{ color: "var(--cc-text-muted)" }}>{session.branches}</span>}
          </span>
        )}
        {session.dot && <span className="absolute size-[6px] rounded-full" style={{ right: 8.5, background: DOT[session.dot] }} />}
      </div>
      {session.children?.map((child, i, all) => (
        <SessionRow key={child.id} session={child} depth={depth + 1} first={i === 0} last={i === all.length - 1} />
      ))}
    </>
  );
}

/** The Code tab's sidebar: window controls, search, navigation, pinned and grouped sessions, and the account. */
export function Sidebar() {
  const { shown, peeking, hover, docking, docked } = useSidebar();
  // The docked width, live: it animates open and closed, and the window
  // publishes it as --cc-dock-w so the session's title can ride along with it.
  const dock = useRef<HTMLDivElement>(null);
  const width = useMotionValue(shown ? SIDEBAR_W : 0);
  useMotionValueEvent(width, "change", (w) => dock.current?.closest<HTMLElement>(".cc-window")?.style.setProperty("--cc-dock-w", `${w}px`));
  useEffect(() => {
    const a = animate(width, shown ? SIDEBAR_W : 0, SLIDE);
    a.then(() => shown && docked());
    return () => a.stop();
  }, [shown, width, docked]);
  return (
    <>
      {/* docked: shown, it takes its width from the session; hidden, that width animates away */}
      <motion.div ref={dock} className="h-full flex-none overflow-hidden" inert={!shown} style={{ width }}>
        <SidebarBody width={SIDEBAR_W} />
      </motion.div>
      {/* floating: it appears in place over the session (a quick fade, no slide); nothing moves.
          Docked from here, it stays put and settles into the docked width and colors, in step
          with the session sliding over, then leaves at once: the docked sidebar under it matches. */}
      <AnimatePresence>
        {(peeking || docking) && (
          <motion.div
            key="floating"
            className="absolute inset-y-0 left-0 z-30 overflow-hidden transition-shadow duration-300 ease-out"
            style={{ boxShadow: docking ? "none" : "var(--cc-sidebar-floating-shadow)" }}
            initial={{ opacity: 0, width: FLOATING_W }}
            animate={{ opacity: 1, width: docking ? SIDEBAR_W : FLOATING_W }}
            exit={docking ? { opacity: 1, transition: { duration: 0 } } : { opacity: 0 }}
            transition={{ opacity: { duration: 0.12, ease: "easeOut" }, width: SLIDE }}
            onPointerEnter={() => hover(true)}
            onPointerLeave={() => hover(false)}
          >
            <SidebarBody width={SIDEBAR_W} floating={!docking} fill />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Everything in the sidebar, at a fixed width (the docked one clips it while it animates closed). */
function SidebarBody({ width, floating, fill }: { width: number; floating?: boolean; fill?: boolean }) {
  return (
    <aside
      // `fill`: it takes its container's width (the floating one, whose width animates), down to the narrower floating width
      className="relative flex h-full flex-none flex-col tracking-[-0.01em] transition-[background-color,box-shadow] duration-300 ease-out"
      style={{
        width: fill ? "100%" : width,
        // the edge is an inset line, so it stays visible inside a clipping container
        background: floating ? "var(--cc-sidebar-floating)" : "var(--cc-sidebar)",
        boxShadow: floating ? "inset -1px 0 0 var(--cc-sidebar-floating-edge)" : "inset -0.5px 0 0 var(--cc-divider)",
      }}
    >
      <div {...DRAG_REGION} className="relative h-12 flex-none">
        {/* floating, the window's own controls stay on top of it (one set, they don't move); docked, the sidebar carries them */}
        {!floating && <WindowControls />}
        <ModeSwitch right={floating ? 10 : 8} />
      </div>

      <label
        className="relative mx-[10px] mt-[6px] flex h-[26px] flex-none items-center rounded-[8px] text-[13px]"
        style={{
          background: "var(--cc-field)",
          boxShadow: "inset 0 0 0 0.5px var(--cc-field-border)",
          color: "var(--cc-text-muted)",
        }}
      >
        <Icon name="search" size={15} className="absolute" style={{ left: 8.5 }} />
        <span className="absolute" style={{ left: 33 }}>
          Search
        </span>
      </label>

      <nav className="mt-[8.25px] flex-none">
        <NavRow icon="plus" label="New" primary />
        <NavRow icon="projects" label="Projects" badge="Beta" />
        <NavRow icon="artifacts" label="Artifacts" iconSize={16} />
        <NavRow icon="customize" label="Customize" iconSize={16} />
        {/* More opens a small menu just past the row's highlight, its top level with the row */}
        <Popover
          placement="right-start"
          offset={-2.5}
          align={-1}
          trigger={({ open, toggle }) => <NavRow icon="more" label="More" iconSize={16} open={open} onClick={toggle} />}
        >
          <NavMoreMenu />
        </Popover>
      </nav>

      <div className="mt-[17.25px] min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <SectionLabel label="Pinned" />
        {PINNED.map((p) => (
          <button type="button" key={p.id} className="group relative flex w-full items-center text-left text-[13px]" style={{ height: 27 }}>
            <RowHover />
            <Icon
              name={p.icon}
              size={15}
              className="absolute"
              style={{
                left: 18.5,
                color: p.icon === "eye" ? "var(--cc-clay)" : undefined,
              }}
            />
            <span className="absolute" style={{ left: 42 }}>
              {p.title}
            </span>
          </button>
        ))}
        {GROUPS.map((g) => (
          <div key={g.id} className="mt-[9px]">
            <SectionLabel label={g.label} add />
            {g.sessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        ))}
      </div>

      <div className="flex-none" style={{ borderTop: "0.5px solid var(--cc-divider)" }}>
        <button
          type="button"
          className="relative mx-[8px] mt-[9.5px] flex h-[28px] w-[calc(100%-16.5px)] items-center rounded-[8px] text-[13px] font-medium tracking-normal"
          style={{
            background: "var(--cc-raised)",
            color: "var(--cc-text-strong)",
          }}
        >
          <span className="absolute" style={{ left: 9.75 }}>
            Relaunch to update
          </span>
          <Icon name="arrowRight" size={12} className="absolute" style={{ right: 9, color: "var(--cc-text-muted)" }} />
        </button>
        <Popover
          placement="top-start"
          offset={0.75}
          align={7}
          className="h-[42.5px]"
          trigger={({ open, toggle }) => (
            <>
              <button
                type="button"
                aria-label="Account"
                aria-expanded={open}
                onClick={toggle}
                className="absolute rounded-[8px] hover:bg-(--cc-row-hover)"
                style={{
                  left: 8,
                  top: 5,
                  width: 124,
                  height: 30,
                  background: open ? "var(--cc-row-hover)" : undefined,
                }}
              >
                <AccountChip />
              </button>
              <Icon name="bug" size={17} className="absolute" style={{ right: 11.75, top: 12 }} />
            </>
          )}
        >
          <AccountMenu />
        </Popover>
      </div>
    </aside>
  );
}

/** The avatar, name and plan, laid out inside the account button (which starts 8pt in and 5pt down). */
function AccountChip() {
  return (
    <>
      <span
        className="absolute flex size-[20px] items-center justify-center rounded-full text-[9.5px] font-medium"
        style={{
          left: 4,
          top: 5,
          background: "var(--cc-raised)",
          color: "var(--cc-text-strong)",
        }}
      >
        {ACCOUNT.initials}
      </span>
      <span className="absolute flex items-center text-[13px]" style={{ left: 30, top: 6.25, height: 20 }}>
        {ACCOUNT.name}
        <span className="mx-[3.75px] text-[11px]" style={{ color: "var(--cc-text-muted)" }}>
          ·
        </span>
        <span className="text-[11px]" style={{ color: "var(--cc-text-muted)" }}>
          {ACCOUNT.plan}
        </span>
      </span>
      <Icon name="chevronDown" size={11} className="absolute" style={{ left: 106, top: 10.5, color: "var(--cc-text-muted)" }} />
    </>
  );
}
