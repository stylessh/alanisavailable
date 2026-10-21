"use client";

import { AnimatePresence, motion, useMotionTemplate, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DRAG_REGION, useMacWindow } from "@/os/macos";
import { EyeIcon, HostIcon, PlusIcon, ServerIcon, SidebarIcon } from "./icons";
import { activePaneOf, activityOf, type Device, leaves, SIDEBAR_W, type Space, type State, titles } from "./model";
import { useTile } from "./tween";
import { ChipStack } from "./tab-chip";
import { LIGHTS_SPACE } from "./title-bar";

// Rex's sidebar, the alternate view of the tabs, after almonk's Activity Mode
// demo (Oct 2026): host, then sessions, then each session's windows with
// their program's icon. Activity Mode narrows it to windows running
// something and adds a status line. Rex's own sidebar is dark there; this
// one keeps the light Liquid Glass of the rest of the replica.
//
// Spaces are ours, not Rex's: a space shows a set of devices (this Mac,
// servers Rex reaches over SSH), each with its sessions under it, and the
// page dots at the bottom switch between spaces like pages on macOS.

const SPRING = { type: "spring", stiffness: 500, damping: 42 } as const;
const FADE = { duration: 0.16 };
/** Spaces slide past each other on the same curve as the header's toggle. */
const PAGE = { duration: 0.32, ease: [0.2, 0.85, 0.25, 1] } as const;
/** List geometry (pt): the host row, each session's heading, and a row (taller with Activity Mode's status line). */
const HOST_H = 26;
/** space above every device but the first, and the line a device without sessions shows */
const DEVICE_GAP = 10;
const EMPTY_H = 24;
/** The footer: dots 6pt across on a 12pt pitch, centered 20.5pt above the
    window's bottom edge (the reference crop, at 2x). */
const FOOTER_H = 41;
const DOT = 6;
const DOT_PITCH = 12;
/** How long the space's name stays up after switching (ms). */
const LABEL_MS = 1000;
/** A sideways trackpad swipe this long (px of wheel delta) turns the page. */
const SWIPE = 40;
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

type Row = { tab: State["tabs"][number]; pane: State["panes"][string]; activity: ReturnType<typeof activityOf> };

/** One space's page: its devices, each with its sessions and their tabs. */
function SpacePage({ state, space, onSelect, now }: { state: State; space: Space; onSelect: (tab: string) => void; now: number }) {
  const devices = space.devices.map((id) => {
    const device = state.devices[id];
    const tabs = state.tabs.filter((t) => t.device === id);
    const groups = [...new Set(tabs.map((t) => t.session))]
      .map((session) => ({
        session,
        rows: tabs
          .filter((t) => t.session === session)
          .map((tab): Row | null => {
            const pane = state.activity ? activePaneOf(state, tab) : state.panes[tab.focus];
            return pane && { tab, pane, activity: activityOf(pane) };
          })
          .filter((r) => r !== null),
      }))
      .filter((g) => g.rows.length);
    return { device, groups };
  });

  // One selection highlight for the whole list, placed from the layout the
  // rows are springing to (not from the DOM, where a new row is still zero
  // tall). It slides from wherever it is to the selected row on the rows'
  // own spring, including to a row that's still opening.
  const rowH = state.activity ? ROW_H.activity : ROW_H.plain;
  // Rows glide only when the list itself changes (rows added, removed or
  // reordered, Activity Mode). Without this, moving the window counts as a
  // layout change too, and the rows trail behind it.
  const listKey = `${state.activity}|${devices
    .map((d) => `${d.device.id}>${d.groups.map((g) => `${g.session}:${g.rows.map((r) => r.tab.id).join(",")}`).join("|")}`)
    .join("/")}`;
  let selectedY: number | null = null;
  let y = 0;
  devices.forEach((d, i) => {
    y += (i ? DEVICE_GAP : 0) + HOST_H;
    if (!d.groups.length) y += EMPTY_H;
    for (const g of d.groups) {
      y += SECTION_H;
      for (const r of g.rows) {
        if (r.tab.id === state.active) selectedY = y;
        y += rowH;
      }
    }
  });

  return (
    <>
      {/* the same Liquid Glass pill as the tab bar's active tab; its rims sit
          on a plain child (motion rewrites an animated element's box-shadow) */}
      <motion.span
        aria-hidden
        className="absolute inset-x-0 top-0 rounded-[8px]"
        initial={false}
        animate={{ y: selectedY ?? y, height: rowH, opacity: selectedY === null ? 0 : 1 }}
        transition={{ ...SPRING, opacity: FADE }}
        style={{ background: "var(--rex-tab-active)" }}
      >
        <span className="absolute inset-0 rounded-[8px]" style={{ boxShadow: "var(--rex-tab-shadow)" }} />
      </motion.span>

      {devices.map(({ device, groups }, i) => (
        <section key={device.id} aria-label={device.name}>
          <DeviceRow device={device} first={i === 0} listKey={listKey} />
          {!groups.length && (
            <motion.p
              layout="position"
              layoutDependency={listKey}
              transition={SPRING}
              className="flex h-[24px] items-center px-[8px] text-[11.5px] text-[var(--rex-ink-faint)]"
            >
              {state.activity ? "Nothing running" : "No sessions"}
            </motion.p>
          )}
          <AnimatePresence initial={false}>
            {groups.map(({ session, rows }) => (
              <motion.section
                key={session}
                layout="position"
                layoutDependency={listKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={SPRING}
                aria-label={session}
              >
                <h4 className="h-[30.5px] px-[8px] pt-[10px] pb-[4px] text-[11px] font-semibold text-[var(--rex-ink-muted)]">{session}</h4>
                <AnimatePresence initial={false}>
                  {rows.map((row) => (
                    <TabRow key={row.tab.id} row={row} state={state} rowH={rowH} listKey={listKey} now={now} onSelect={onSelect} />
                  ))}
                </AnimatePresence>
              </motion.section>
            ))}
          </AnimatePresence>
        </section>
      ))}
    </>
  );
}

/** A device's heading: its icon and name, and where Rex reaches it. */
function DeviceRow({ device, first, listKey }: { device: Device; first: boolean; listKey: string }) {
  const Icon = device.remote ? ServerIcon : HostIcon;
  return (
    <motion.div
      layout="position"
      layoutDependency={listKey}
      transition={SPRING}
      className="flex h-[26px] items-center gap-[8px] px-[8px] text-[12.5px] font-semibold text-[var(--rex-ink-2)]"
      style={{ marginTop: first ? 0 : DEVICE_GAP }}
    >
      <Icon className="shrink-0" style={{ color: "var(--rex-chrome-ink)" }} />
      <span className="min-w-0 truncate">{device.name}</span>
      <span className="ml-auto shrink-0 text-[11px] font-normal text-[var(--rex-ink-faint)]">{device.address}</span>
    </motion.div>
  );
}

function TabRow({
  row: { tab, pane, activity },
  state,
  rowH,
  listKey,
  now,
  onSelect,
}: {
  row: Row;
  state: State;
  rowH: number;
  listKey: string;
  now: number;
  onSelect: (tab: string) => void;
}) {
  const title = state.activity ? titles(pane).tab : titles(state.panes[tab.focus]).tab;
  const [, name, path] = title.match(/^(.*?) (~(?:\/.*)?)$/) ?? [, title, ""];
  const selected = tab.id === state.active;
  const detailed = state.activity && !!activity;
  const back = leaves(tab.root).filter((id) => id !== pane.id).map((id) => state.panes[id].program);
  return (
    <motion.button
      type="button"
      tabIndex={-1}
      layout
      layoutDependency={listKey}
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
      {/* the row's pane in front, the tab's other tiles stacked behind it, as in the tab bar */}
      <motion.span key={`${pane.id}:${back.join()}`} className="shrink-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={FADE}>
        <ChipStack front={pane.program} back={back} />
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
}

export function Sidebar({
  state,
  leaving = false,
  onSelect,
  onSpace,
  onStepSpace,
  onToggleSidebar,
  onToggleActivity,
  onNewTab,
}: {
  state: State;
  /** sliding out */
  leaving?: boolean;
  onSelect: (tab: string) => void;
  onSpace: (space: string) => void;
  onStepSpace: (by: 1 | -1) => void;
  onToggleSidebar: () => void;
  onToggleActivity: () => void;
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

  // The page slides in from the side of the dot it came from.
  const index = state.spaces.findIndex((sp) => sp.id === state.space);
  // Each change also flashes the space's name above the dots for a second.
  const [shown, setShown] = useState({ index, dir: 1, flash: 0 });
  if (shown.index !== index) setShown({ index, dir: index > shown.index ? 1 : -1, flash: shown.flash + 1 });
  const [faded, setFaded] = useState(0);
  useEffect(() => {
    if (!shown.flash) return;
    const t = setTimeout(() => setFaded(shown.flash), LABEL_MS);
    return () => clearTimeout(t);
  }, [shown.flash]);
  const space = state.spaces[index];

  // A sideways two-finger swipe turns one page per gesture: the wheel goes
  // quiet for a moment between gestures, and momentum doesn't turn another.
  const swipe = useRef({ dx: 0, done: false, quiet: 0 });
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const g = swipe.current;
    clearTimeout(g.quiet);
    g.quiet = window.setTimeout(() => (swipe.current = { dx: 0, done: false, quiet: 0 }), 180);
    if (g.done) return;
    g.dx += e.deltaX;
    if (Math.abs(g.dx) < SWIPE) return;
    g.done = true;
    onStepSpace(g.dx > 0 ? 1 : -1);
  };

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
        <HeaderButton label="New tab (⌥⌘T)" onClick={onNewTab}>
          <PlusIcon />
        </HeaderButton>
      </div>

      <div className="absolute inset-x-0 top-[46px] overflow-hidden" style={{ bottom: FOOTER_H }} onWheel={onWheel}>
        <AnimatePresence initial={false} custom={shown.dir}>
          <motion.div
            key={space.id}
            custom={shown.dir}
            variants={{
              enter: (dir: number) => ({ x: dir * SIDEBAR_W }),
              center: { x: 0 },
              exit: (dir: number) => ({ x: -dir * SIDEBAR_W }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={PAGE}
            aria-label={space.name}
            className="absolute inset-0 overflow-y-auto px-[8px] pb-[12px]"
          >
            <div className="relative">
              <SpacePage state={state} space={space} onSelect={onSelect} now={now} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer: the page dots, one per space */}
      <div className="absolute inset-x-0 bottom-0" style={{ height: FOOTER_H }}>
        <AnimatePresence>
          {shown.flash > faded && (
            <motion.div
              key="label"
              aria-live="polite"
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 2, scale: 0.98, transition: { duration: 0.24, ease: PAGE.ease } }}
              transition={{ duration: 0.18, ease: PAGE.ease }}
              // plain text, centered 13pt above the dots
              className="pointer-events-none absolute left-1/2 -ml-[60px] w-[120px] truncate text-center text-[11.5px] leading-[20px] font-semibold text-[var(--rex-ink-2)]"
              style={{ bottom: 20.5 + 13 }}
            >
              {space.name}
            </motion.div>
          )}
        </AnimatePresence>
        <div role="tablist" aria-label="Spaces" className="absolute left-1/2 flex -translate-x-1/2" style={{ bottom: 20.5 - 10 }}>
          {state.spaces.map((sp) => {
            const active = sp.id === state.space;
            return (
              <button
                key={sp.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={sp.name}
                title={`${sp.name} (⇧⌥← ⇧⌥→)`}
                tabIndex={-1}
                onClick={() => onSpace(sp.id)}
                // the hit area is the dot's whole pitch, 20pt tall
                className="group grid h-[20px] cursor-default place-items-center"
                style={{ width: DOT_PITCH }}
              >
                <span
                  className={`rounded-full transition-colors duration-200 ${active ? "bg-[var(--rex-dot-active)]" : "bg-[var(--rex-dot)] group-hover:bg-[var(--rex-dot-hover)]"}`}
                  style={{ width: DOT, height: DOT }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
}
