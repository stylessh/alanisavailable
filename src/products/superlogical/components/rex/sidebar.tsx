"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { CommandIcon, EyeIcon, HostIcon, PlusIcon, SidebarIcon } from "./icons";
import { activePaneOf, activityOf, type ProgramKind, SIDEBAR_W, type State, titles } from "./model";
import { PROGRAMS } from "./programs";

// Rex's sidebar, the alternate view of the tabs, after almonk's Activity Mode
// demo (Oct 2026): host, then sessions, then each session's windows with
// their program's icon. Activity Mode narrows it to windows running
// something and adds a status line. Rex's own sidebar is dark there; this
// one keeps the light Liquid Glass of the rest of the replica.

const SPRING = { type: "spring", stiffness: 500, damping: 42 } as const;

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
        boxShadow: "0 0 0 0.5px rgb(0 0 0 / 0.12), 0 1px 1.5px rgb(0 0 0 / 0.1)",
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
        <span key={i} className="rex-working-dot size-[3.5px] rounded-full bg-[#7c7c80]" style={{ animationDelay: `${i * 160}ms` }} />
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
      className="grid size-[24px] cursor-default place-items-center rounded-[7px] text-[#616164] transition-colors hover:bg-[rgb(0_0_0/0.06)]"
      style={active ? { background: "rgb(0 0 0 / 0.08)", color: "#29292c" } : undefined}
    >
      {children}
    </button>
  );
}

export function Sidebar({
  state,
  onSelect,
  onToggleSidebar,
  onToggleActivity,
  onPalette,
  onNewTab,
}: {
  state: State;
  onSelect: (tab: string) => void;
  onToggleSidebar: () => void;
  onToggleActivity: () => void;
  onPalette: () => void;
  onNewTab: () => void;
}) {
  const now = useNow();
  const sessions = [...new Set(state.tabs.map((t) => t.session))];

  return (
    <motion.aside
      aria-label="Sessions"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14, transition: { duration: 0.12 } }}
      transition={SPRING}
      className="rex-ui absolute top-0 bottom-0 left-0"
      style={{ width: SIDEBAR_W }}
    >
      {/* Header: traffic lights are the title bar's; these sit beside them */}
      <div className="absolute top-[9px] left-[84px]">
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
        <div className="flex h-[26px] items-center gap-[8px] px-[8px] text-[12.5px] font-semibold text-[#3a3a3d]">
          <HostIcon style={{ color: "#616164" }} />
          Mac Studio
        </div>

        <AnimatePresence initial={false}>
          {sessions.map((session) => {
            const rows = state.tabs
              .filter((t) => t.session === session)
              .map((tab) => {
                const pane = state.activity ? activePaneOf(state, tab) : state.panes[tab.focus];
                return pane && { tab, pane, activity: activityOf(pane) };
              })
              .filter((r) => r !== null);
            if (!rows.length) return null;
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
                <h4 className="px-[8px] pt-[10px] pb-[4px] text-[11px] font-semibold text-[#8e8e92]">{session}</h4>
                <AnimatePresence initial={false}>
                  {rows.map(({ tab, pane, activity }) => {
                    const title = state.activity ? titles(pane).tab : titles(state.panes[tab.focus]).tab;
                    const [, name, path] = title.match(/^(.*?) (~\/.*)$/) ?? [, title, ""];
                    const selected = tab.id === state.active;
                    return (
                      <motion.button
                        key={tab.id}
                        type="button"
                        tabIndex={-1}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: state.activity ? 40 : 28 }}
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.14 } }}
                        transition={SPRING}
                        onPointerDown={() => onSelect(tab.id)}
                        aria-current={selected}
                        className="relative flex w-full cursor-default items-center gap-[9px] overflow-hidden rounded-[8px] px-[8px] text-left"
                        style={{ background: selected ? "rgb(0 0 0 / 0.065)" : undefined }}
                      >
                        <ProgramIcon kind={pane.program} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] leading-[16px] font-medium text-[#29292c]">
                            {name}
                            {path && <span className="font-normal text-[#8e8e92]"> {path}</span>}
                          </span>
                          {state.activity && activity && (
                            <span className="block truncate text-[11px] leading-[14px] text-[#8e8e92]">{activity.label}</span>
                          )}
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-[3px] self-stretch justify-center">
                          {activity?.working && <Working />}
                          {state.activity && activity && (
                            <span className="text-[11px] leading-[14px] text-[#9a9a9e] tabular-nums">
                              {activity.working ? "now" : ago(activity.at, now)}
                            </span>
                          )}
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
          <p className="px-[8px] pt-[12px] text-[11.5px] text-[#8e8e92]">Nothing is running.</p>
        )}
      </div>
    </motion.aside>
  );
}
