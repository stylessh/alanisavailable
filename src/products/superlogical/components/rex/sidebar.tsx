"use client";

import { AnimatePresence, motion, useMotionTemplate, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { DRAG_REGION, useMacWindow } from "@/os/macos";
import { CommandIcon, EyeIcon, HostIcon, PlusIcon, SidebarIcon } from "./icons";
import { activePaneOf, activityOf, type ProgramKind, SIDEBAR_W, type State, titles } from "./model";
import { PROGRAMS } from "./programs";
import { useTile } from "./tween";
import { LIGHTS_SPACE } from "./title-bar";

// Rex's sidebar, the alternate view of the tabs, after almonk's Activity Mode
// demo (Oct 2026): host, then sessions, then each session's windows with
// their program's icon. Activity Mode narrows it to windows running
// something and adds a status line. Rex's own sidebar is dark there; this
// one keeps the light Liquid Glass of the rest of the replica.

const SPRING = { type: "spring", stiffness: 500, damping: 42 } as const;
const FADE = { duration: 0.16 };
/** List geometry (pt): the host row, each session's heading, and a row (taller with Activity Mode's status line). */
const HOST_H = 26;
const SECTION_H = 30.5;
const ROW_H = { plain: 28, activity: 40 };

/** "now", "4m", "2h", "3d" */
function ago(ms: number, now: number) {
  const m = Math.floor((now - ms) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

function useNow(every = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

/** A program's app icon: its chip's front card on its own, upright. */
export function ProgramIcon({ kind }: { kind: ProgramKind }) {
  return (
    <span
      aria-hidden
      className="grid size-[18px] shrink-0 place-items-center overflow-hidden rounded-[5px]"
      style={{
        background: PROGRAMS[kind].front,
        boxShadow: "var(--rex-icon-ring)",
      }}
    >
      {PROGRAMS[kind].logo}
    </span>
  );
}

/** Rex's working indicator: three dots pulsing in turn. */
function Working() {
  return (
    <span aria-label="Working" className="flex gap-[2.5px]">
      {[0, 1, 2].map((i) => (
        <span key={i} className="rex-working-dot size-[3.5px] rounded-full bg-[var(--rex-working)]" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}

function HeaderButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={-1}
      onClick={onClick}
      className="grid size-[24px] cursor-default place-items-center rounded-[7px] text-[var(--rex-chrome-ink)] transition-colors hover:bg-[var(--rex-hover)]"
      style={active ? { background: "var(--rex-pressed)", color: "var(--rex-ink)" } : undefined}
    >
      {children}
    </button>
  );
}

export function Sidebar({
  state,
  leaving = false,
  onSelect,
  onToggleSidebar,
  onToggleActivity,
  onPalette,
  onNewTab,
}: {
  state: State;
  /** sliding out */
  leaving?: boolean;
  onSelect: (tab: string) => void;
  onToggleSidebar: () => void;
  onToggleActivity: () => void;
  onPalette: () => void;
  onNewTab: () => void;
}) {
  const now = useNow();
  // Revealed in place on the panes' shared tween (tile "__sidebar"): its
  // visible width grows with the panes' left edge, so it never covers them,
  // while it fades in. The content itself doesn't move.
  const tile = useTile("__sidebar", { x: 0, y: 0, w: SIDEBAR_W, h: 0 });
  const hiddenWidth = useTransform(tile.width, (w) => Math.max(0, SIDEBAR_W - w));
  const clipPath = useMotionTemplate`inset(0 ${hiddenWidth}px 0 0)`;
  // In full screen the traffic lights leave, and the toggle takes their place.
  const inset = useMacWindow()?.mode === "fullscreen" ? LIGHTS_SPACE : 0;
  const sessions = [...new Set(state.tabs.map((t) => t.session))];
  const groups = sessions
    .map((session) => ({
      session,
      rows: state.tabs
        .filter((t) => t.session === session)
        .map((tab) => {
          const pane = state.activity ? activePaneOf(state, tab) : state.panes[tab.focus];
          return pane && { tab, pane, activity: activityOf(pane) };
        })
        .filter((r) => r !== null),
    }))
    .filter((g) => g.rows.length);

  // One selection highlight for the whole list, placed from the layout the
  // rows are springing to (not from the DOM, where a new row is still zero
  // tall). It slides from wherever it is to the selected row on the rows'
  // own spring, including to a row that's still opening.
  const rowH = state.activity ? ROW_H.activity : ROW_H.plain;
  let selectedY: number | null = null;
  let y = HOST_H;
  for (const g of groups) {
    y += SECTION_H;
    for (const r of g.rows) {
      if (r.tab.id === state.active) selectedY = y;
      y += rowH;
    }
  }

  return (
    <motion.aside
      aria-label="Sessions"
      className="rex-ui absolute top-0 bottom-0"
      style={{ width: SIDEBAR_W, left: 0, clipPath, opacity: tile.opacity, pointerEvents: leaving ? "none" : undefined }}
    >
      {/* Header: traffic lights are the title bar's; these sit beside them.
          Like the title bar it replaces, the strip drags the window. */}
      <div {...DRAG_REGION} className="absolute inset-x-0 top-0 h-[44px]" />
      <div
        className="absolute top-[9px]"
        style={{ left: 84 - inset, transition: "left 320ms cubic-bezier(0.2, 0.85, 0.25, 1)" }}
      >
        <HeaderButton label="Show tab bar (⌃⌘S)" onClick={onToggleSidebar}>
          <SidebarIcon />
        </HeaderButton>
      </div>
      <div className="absolute top-[9px] right-[6px] flex gap-[2px]">
        <HeaderButton label={state.activity ? "Hide Activity (⌘.)" : "Show Activity (⌘.)"} onClick={onToggleActivity} active={state.activity}>
          <EyeIcon />
        </HeaderButton>
        <HeaderButton label="Command palette (⇧⌘P)" onClick={onPalette}>
          <CommandIcon />
        </HeaderButton>
        <HeaderButton label="New tab (⌥⌘T)" onClick={onNewTab}>
          <PlusIcon />
        </HeaderButton>
      </div>

      <div className="absolute inset-x-0 top-[46px] bottom-0 overflow-y-auto px-[8px] pb-[12px]">
        {/* the same Liquid Glass pill as the tab bar's active tab; its rims sit
            on a plain child (motion rewrites an animated element's box-shadow) */}
        <motion.span
          aria-hidden
          className="absolute inset-x-[8px] top-0 rounded-[8px]"
          initial={false}
          animate={{ y: selectedY ?? y, height: rowH, opacity: selectedY === null ? 0 : 1 }}
          transition={{ ...SPRING, opacity: FADE }}
          style={{ background: "var(--rex-tab-active)" }}
        >
          <span className="absolute inset-0 rounded-[8px]" style={{ boxShadow: "var(--rex-tab-shadow)" }} />
        </motion.span>
        <div className="flex h-[26px] items-center gap-[8px] px-[8px] text-[12.5px] font-semibold text-[var(--rex-ink-2)]">
          <HostIcon style={{ color: "var(--rex-chrome-ink)" }} />
          Mac Studio
        </div>

        <AnimatePresence initial={false}>
          {groups.map(({ session, rows }) => {
            return (
              <motion.section
                key={session}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={SPRING}
                aria-label={session}
              >
                <h4 className="h-[30.5px] px-[8px] pt-[10px] pb-[4px] text-[11px] font-semibold text-[var(--rex-ink-muted)]">{session}</h4>
                <AnimatePresence initial={false}>
                  {rows.map(({ tab, pane, activity }) => {
                    const title = state.activity ? titles(pane).tab : titles(state.panes[tab.focus]).tab;
                    const [, name, path] = title.match(/^(.*?) (~\/.*)$/) ?? [, title, ""];
                    const selected = tab.id === state.active;
                    const detailed = state.activity && !!activity;
                    return (
                      <motion.button
                        key={tab.id}
                        type="button"
                        tabIndex={-1}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: rowH }}
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.14 } }}
                        transition={SPRING}
                        onPointerDown={() => onSelect(tab.id)}
                        aria-current={selected}
                        className="relative block w-full cursor-default rounded-[8px] text-left"
                      >
                        {/* the row's content clips here (rows collapse to zero height) */}
                        <span className="relative flex size-full items-center gap-[9px] overflow-hidden px-[8px]">
                        {/* a row that switches program (Activity Mode shows the
                            pane that's running something) crossfades */}
                        <motion.span key={pane.program} className="shrink-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={FADE}>
                          <ProgramIcon kind={pane.program} />
                        </motion.span>
                        <span className="min-w-0 flex-1">
                          <motion.span
                            key={title}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={FADE}
                            className="block truncate text-[12.5px] leading-[16px] font-medium text-[var(--rex-ink)]"
                          >
                            {name}
                            {path && <span className="font-normal text-[var(--rex-ink-muted)]"> {path}</span>}
                          </motion.span>
                          {/* the status line opens with the row, on the same spring,
                              so the title glides up instead of jumping */}
                          <motion.span
                            initial={false}
                            animate={{ height: detailed ? 14 : 0, opacity: detailed ? 1 : 0 }}
                            transition={SPRING}
                            className="block truncate text-[11px] leading-[14px] text-[var(--rex-ink-muted)]"
                          >
                            {activity?.label}
                          </motion.span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-[3px] self-stretch justify-center">
                          {activity?.working && <Working />}
                          <motion.span
                            initial={false}
                            animate={{ height: detailed ? 14 : 0, opacity: detailed ? 1 : 0 }}
                            transition={SPRING}
                            className="overflow-hidden text-[11px] leading-[14px] text-[var(--rex-ink-faint)] tabular-nums"
                          >
                            {activity && (activity.working ? "now" : ago(activity.at, now))}
                          </motion.span>
                        </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </motion.section>
            );
          })}
        </AnimatePresence>

        {state.activity && !state.tabs.some((t) => activePaneOf(state, t)) && (
          <p className="px-[8px] pt-[12px] text-[11.5px] text-[var(--rex-ink-muted)]">Nothing is running.</p>
        )}
      </div>
    </motion.aside>
  );
}
