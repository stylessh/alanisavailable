"use client";

import { AnimatePresence, MotionConfig, motion, useMotionTemplate, useTransform } from "motion/react";
import { useMacAppearance, useMacWindow } from "@/os/macos";
import { useEffect, useReducer, useRef, useState } from "react";
import { type Command, CommandPalette } from "./command-palette";
import {
  type Action,
  activeTab,
  AREA,
  areaOf,
  bounds,
  collapse,
  collapsedRect,
  type Divider,
  gridSize,
  type Key,
  initialState,
  layout,
  leaves,
  type Pane as PaneState,
  paneRows,
  ratioAt,
  type Rect,
  SIDEBAR_W,
  splitOf,
  reducer,
  TERM,
  titles,
  zoomLayout,
} from "./model";
import { Pane } from "./pane";
import { Sidebar } from "./sidebar";
import { PROGRAMS } from "./programs";
import { Terminal } from "./terminal";
import { TweenProvider, useTile, useTween } from "./tween";
import { type TabView, TitleBar } from "./title-bar";

// Shortcuts, matched on physical keys. Rex's defaults that a browser keeps
// for itself (⌘T, ⌘W, ⌘1…) move to ⌥⌘T, ⌥⌘W and ⌃1… here.
type Shortcut = { code: string; meta?: boolean; shift?: boolean; alt?: boolean; ctrl?: boolean; action: Action; label: string };
const SHORTCUTS: Shortcut[] = [
  { code: "KeyP", meta: true, shift: true, action: { type: "palette", open: true }, label: "⇧⌘P" },
  { code: "KeyD", meta: true, action: { type: "split", dir: "right" }, label: "⌘D" },
  { code: "KeyD", meta: true, shift: true, action: { type: "split", dir: "down" }, label: "⇧⌘D" },
  { code: "KeyE", meta: true, action: { type: "zoom" }, label: "⌘E" },
  { code: "KeyF", meta: true, alt: true, action: { type: "zoom" }, label: "⌥⌘F" },
  { code: "KeyW", meta: true, alt: true, action: { type: "close-pane" }, label: "⌥⌘W" },
  { code: "KeyT", meta: true, alt: true, action: { type: "new-tab" }, label: "⌥⌘T" },
  { code: "KeyK", meta: true, action: { type: "clear" }, label: "⌘K" },
  { code: "KeyS", meta: true, ctrl: true, action: { type: "toggle-sidebar" }, label: "⌃⌘S" },
  { code: "Period", meta: true, action: { type: "toggle-activity" }, label: "⌘." },
  { code: "ArrowLeft", meta: true, alt: true, action: { type: "move-focus", dir: "left" }, label: "⌥⌘←" },
  { code: "ArrowRight", meta: true, alt: true, action: { type: "move-focus", dir: "right" }, label: "⌥⌘→" },
  { code: "ArrowUp", meta: true, alt: true, action: { type: "move-focus", dir: "up" }, label: "⌥⌘↑" },
  { code: "ArrowDown", meta: true, alt: true, action: { type: "move-focus", dir: "down" }, label: "⌥⌘↓" },
  ...Array.from({ length: 9 }, (_, i): Shortcut => ({
    code: `Digit${i + 1}`,
    ctrl: true,
    action: { type: "goto-tab", index: i },
    label: `⌃${i + 1}`,
  })),
];
/** Every binding for an action (zoom has two), as the palette shows them: "⌘E ⌥⌘F". */
const label = (type: Action["type"], extra?: (a: Action) => boolean) =>
  SHORTCUTS.filter((s) => s.action.type === type && (!extra || extra(s.action)))
    .map((s) => s.label)
    .join(" ") || undefined;

/** A shortcut as a tooltip shows it (⇧⌘D) and as assistive tech announces it (Shift+Meta+D). */
function shortcutFor(type: Action["type"], extra?: (a: Action) => boolean) {
  const all = SHORTCUTS.filter((s) => s.action.type === type && (!extra || extra(s.action)));
  if (!all.length) return undefined;
  const aria = all
    .map((s) => [s.ctrl && "Control", s.alt && "Alt", s.shift && "Shift", s.meta && "Meta", s.code.replace(/^(Key|Digit)/, "")].filter(Boolean).join("+"))
    .join(" ");
  return { label: all.map((s) => s.label).join(" "), aria };
}

/** The pane header controls' shortcuts, from the same table the keyboard uses. */
const PANE_SHORTCUTS = {
  splitRight: shortcutFor("split", (a) => a.type === "split" && a.dir === "right"),
  splitDown: shortcutFor("split", (a) => a.type === "split" && a.dir === "down"),
  zoom: shortcutFor("zoom"),
  close: shortcutFor("close-pane"),
};

function match(e: KeyboardEvent) {
  return SHORTCUTS.find(
    (s) =>
      s.code === e.code &&
      !!s.meta === e.metaKey &&
      !!s.shift === e.shiftKey &&
      !!s.alt === e.altKey &&
      !!s.ctrl === e.ctrlKey,
  );
}

/** Keys a terminal consumes; everything else (⌘C, ⌘R…) stays with the browser. */
const consumes = (e: KeyboardEvent) =>
  !e.metaKey && (e.key.length === 1 || ["Enter", "Backspace", "Tab", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key));

/** Typed text arrives through the hidden field; replay it as key presses. */
const charKey = (ch: string): Key => ({
  key: ch,
  code: /[a-z]/i.test(ch) ? `Key${ch.toUpperCase()}` : ch === " " ? "Space" : "",
  ctrl: false,
  alt: false,
  meta: false,
  shift: false,
});

/**
 * The layer the panes sit in. It's cropped where something else owns the
 * window edge, with a short fade: under the title bar, and at the sidebar.
 * Both crop lines ride the shared tween (the sidebar tile), so they move in
 * step with the panes and never cut into a pane that's moving, only into
 * ones zoom pushes out. The window frame crops everything else.
 */
function PaneLayer({ children }: { children: React.ReactNode }) {
  const sidebar = useTile("__sidebar", { x: 0, y: 0, w: 0, h: 0, a: 0 });
  const FADE = 10;
  // the title bar's crop eases away as the sidebar (and its own header) comes in
  const top = useTransform(sidebar.alpha, (a) => AREA.y * (1 - a));
  const topFade = useTransform(top, (t) => t - FADE);
  const leftFade = useTransform(sidebar.width, (w) => w - FADE);
  const mask = useMotionTemplate`linear-gradient(to bottom, transparent ${topFade}px, #000 ${top}px), linear-gradient(to right, transparent ${leftFade}px, #000 ${sidebar.width}px)`;
  return (
    <motion.div
      // spans the window, so it must not take the title bar's clicks
      className="pointer-events-none absolute inset-0"
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      {children}
    </motion.div>
  );
}

/** Drives timers for a pane: agents and dev servers finish their work, snake ticks. */
function PaneClock({ pane, visible, dispatch }: { pane: PaneState; visible: boolean; dispatch: (a: Action) => void }) {
  useEffect(() => {
    if (!pane.busy) return;
    const t = setTimeout(() => dispatch({ type: "done", pane: pane.id }), pane.program === "bun" ? 1200 : 3200);
    return () => clearTimeout(t);
  }, [pane.busy, pane.id, pane.program, dispatch]);

  const running = visible && pane.snake?.status === "running";
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => dispatch({ type: "tick", pane: pane.id }), 125); // the game's 125 ms step
    return () => clearInterval(t);
  }, [running, pane.id, dispatch]);
  return null;
}

/** The interactive inside of the Rex window: tabs, tiled panes, palette. */
export function Workspace() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [dragging, setDragging] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // Text goes through a hidden, always-focused field so typing works with
  // IMEs, dictation and on-screen keyboards, not just physical keys.
  const field = useRef<HTMLTextAreaElement>(null);
  const refocus = () => field.current?.focus({ preventScroll: true });

  // The OS window: Rex reflows to its size, and only takes keys while it's
  // the focused window.
  const win = useMacWindow();
  const look = useMacAppearance();
  const focusedRef = useRef(true);
  useEffect(() => {
    focusedRef.current = win?.focused ?? true;
    if (win?.focused) refocus();
  }, [win?.focused]);
  useEffect(() => {
    if (win) dispatch({ type: "window-size", w: win.size.w, h: win.size.h });
  }, [win?.size.w, win?.size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!focusedRef.current) return;
      if (e.isComposing || e.target instanceof HTMLInputElement) return; // the palette's own field
      const shortcut = match(e);
      if (shortcut) {
        e.preventDefault();
        dispatch(shortcut.action);
        return;
      }
      if (!consumes(e)) return;
      // Plain characters typed into the hidden field arrive as input events.
      if (e.target === field.current && e.key.length === 1 && !e.ctrlKey && !e.altKey) return;
      e.preventDefault();
      dispatch({
        type: "key",
        key: { code: e.code, key: e.key, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey, shift: e.shiftKey },
      });
    };
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text");
      if (!focusedRef.current || !text || e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      dispatch({ type: "paste", text });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    refocus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  // Back to the terminal once the palette closes.
  useEffect(() => {
    if (!state.palette) refocus();
  }, [state.palette]);

  const tab = activeTab(state);
  const area = areaOf(state);
  const { panes: tiled, dividers } = layout(tab.root, area);
  // Zoom pushes the other panes out of the area rather than covering them,
  // so it animates like any other layout change.
  const rects = tab.zoom ? zoomLayout(tab.root, area, tab.focus, tiled) : tiled;
  const visible = tab.zoom ? [tab.focus] : leaves(tab.root);

  // One tween moves every tile: the panes and the sidebar, whose revealed
  // width tracks the panes' left edge (it fades in place, it doesn't slide).
  const sidebarShown: Rect = { x: 0, y: 0, w: SIDEBAR_W, h: state.size.h };
  // hidden, it's revealed up to the tab-bar layout's left inset, and invisible
  const sidebarHidden: Rect & { a: number } = { ...sidebarShown, w: 8, a: 0 };
  const tween = useTween({
    targets: state.view === "sidebar" ? { ...rects, __sidebar: { ...sidebarShown, a: 1 } } : rects,
    layout: { root: tab.root, area, panes: state.panes },
    reset: tab.id,
    instant: dragging,
    // a new pane grows out of its sibling's far edge, wherever that is right now
    enter: (id, now) => {
      if (id === "__sidebar") return sidebarHidden;
      const at = splitOf(tab.root, id);
      const around = at && bounds(leaves(at.sibling).map((l) => now[l] ?? rects[l]).filter(Boolean));
      return at && around ? collapse(around, at.dir, at.end) : collapsedRect(tab.root, area, id);
    },
    // a closed pane collapses onto the line its sibling is expanding to, so
    // both sides of every gap head for the same place
    exit: (id, previous, now, targets) => {
      if (id === "__sidebar") return sidebarHidden;
      const at = splitOf(previous.root, id);
      const sibling = at && bounds(leaves(at.sibling).map((l) => targets[l]).filter(Boolean));
      if (!at) return null;
      return collapse(sibling ?? now, at.dir, at.end);
    },
  });

  const tabs: TabView[] = state.tabs.map((t) => {
    const focused = state.panes[t.focus];
    return {
      id: t.id,
      title: titles(focused).tab,
      front: focused.program,
      back: leaves(t.root)
        .filter((id) => id !== t.focus)
        .map((id) => state.panes[id].program),
    };
  });

  // Divider drags work in window coordinates, undoing FitWindow's scale.
  const startDrag = (d: Divider) => (e: React.PointerEvent) => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    setDragging(true);
    const move = (ev: PointerEvent) => {
      const box = root.current!.getBoundingClientRect();
      const scale = box.width / root.current!.offsetWidth;
      const pos = d.dir === "right" ? (ev.clientX - box.left) / scale : (ev.clientY - box.top) / scale;
      dispatch({ type: "resize", split: d.split, ratio: ratioAt(d, pos) });
    };
    const up = () => {
      setDragging(false);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  const run = (action: Action) => () => {
    dispatch({ type: "palette", open: false });
    dispatch(action);
  };
  const commands: Command[] = [
    { id: "split-right", group: "Pane", title: "Split Right", shortcut: label("split", (a) => a.type === "split" && a.dir === "right"), run: run({ type: "split", dir: "right" }) },
    { id: "split-down", group: "Pane", title: "Split Down", shortcut: label("split", (a) => a.type === "split" && a.dir === "down"), run: run({ type: "split", dir: "down" }) },
    { id: "zoom", group: "Pane", title: tab.zoom ? "Unzoom Pane" : "Zoom Pane", shortcut: label("zoom"), run: run({ type: "zoom" }) },
    { id: "close-pane", group: "Pane", title: "Close Pane", shortcut: label("close-pane"), run: run({ type: "close-pane" }) },
    { id: "clear", group: "Pane", title: "Clear Screen", shortcut: label("clear"), run: run({ type: "clear" }) },
    { id: "sidebar", group: "View", title: state.view === "sidebar" ? "Show Tab Bar" : "Show Sidebar", shortcut: label("toggle-sidebar"), run: run({ type: "toggle-sidebar" }) },
    { id: "activity", group: "View", title: state.activity ? "Hide Activity" : "Show Activity", shortcut: label("toggle-activity"), run: run({ type: "toggle-activity" }) },
    ...(look
      ? [
          {
            id: "appearance",
            group: "View",
            title: look.appearance === "dark" ? "Switch to Light Appearance" : "Switch to Dark Appearance",
            run: () => {
              dispatch({ type: "palette", open: false });
              look.toggle();
            },
          },
        ]
      : []),
    { id: "new-tab", group: "Tab", title: "New Tab", shortcut: label("new-tab"), run: run({ type: "new-tab" }) },
    { id: "close-tab", group: "Tab", title: "Close Tab", run: run({ type: "close-tab", tab: tab.id }) },
    ...tabs.map((t, i): Command => ({
      id: `goto-${t.id}`,
      group: "Tab",
      title: `Go to Tab ${i + 1}: ${t.title}`,
      shortcut: i < 9 ? `⌃${i + 1}` : undefined,
      run: run({ type: "select-tab", tab: t.id }),
    })),
    { id: "run-codex", group: "Run", title: "Codex", run: run({ type: "launch", command: "codex" }) },
    { id: "run-claude", group: "Run", title: "Claude Code", run: run({ type: "launch", command: "claude" }) },
    { id: "run-lazygit", group: "Run", title: "lazygit", run: run({ type: "launch", command: "lazygit", cwd: "~/Sites/rex-snake" }) },
    { id: "run-snake", group: "Run", title: "Snake (node demo/snake.mjs)", run: run({ type: "launch", command: "node demo/snake.mjs", cwd: "~/Sites/rex-snake" }) },
    { id: "run-bun", group: "Run", title: "Dev server (bun dev)", run: run({ type: "launch", command: "bun dev", cwd: "~/sites/announcements" }) },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div ref={root} className="absolute inset-0" onClick={() => !state.palette && refocus()}>
        <textarea
          ref={field}
          aria-label="Terminal input"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onInput={(e) => {
            const text = e.currentTarget.value;
            e.currentTarget.value = "";
            for (const ch of text.replace(/\n/g, "")) dispatch({ type: "key", key: charKey(ch) });
          }}
          className="pointer-events-none absolute top-0 left-0 size-px resize-none opacity-0"
        />
        <TitleBar
          width={state.size.w}
          tabs={tabs}
          active={state.active}
          session={tab.session}
          sidebar={state.view === "sidebar"}
          onToggleSidebar={() => dispatch({ type: "toggle-sidebar" })}
          onSelect={(id) => dispatch({ type: "select-tab", tab: id })}
          onClose={(id) => dispatch({ type: "close-tab", tab: id })}
          onNew={() => dispatch({ type: "new-tab" })}
          onPalette={() => dispatch({ type: "palette", open: true })}
        />

        <TweenProvider value={tween}>
        {(state.view === "sidebar" || "__sidebar" in tween.ghosts) && (
            <Sidebar
              state={state}
              leaving={state.view !== "sidebar"}
              onSelect={(id) => dispatch({ type: "select-tab", tab: id })}
              onToggleSidebar={() => dispatch({ type: "toggle-sidebar" })}
              onToggleActivity={() => dispatch({ type: "toggle-activity" })}
              onPalette={() => dispatch({ type: "palette", open: true })}
              onNewTab={() => dispatch({ type: "new-tab" })}
            />
          )}

        {/* Switching tabs is instant: the next tab's panes replace these at once
            (the tween also jumps straight to the new layout). */}
          <PaneLayer key={tab.id}>
          {/* live panes, then closed ones still collapsing (drawn from the layout they left) */}
          {[...leaves(tab.root), ...Object.keys(tween.ghosts).filter((id) => id !== "__sidebar")].map((id) => {
            const ghost = tween.ghosts[id];
            const pane = ghost ? ghost.panes[id] : state.panes[id];
            if (!pane) return null;
            const rect = ghost ? layout(ghost.root, ghost.area).panes[id] : rects[id];
            const flat = !ghost && tab.zoom && id !== tab.focus;
            // a flattened pane keeps its tiled content size while it's away
            const { cols, rows } = gridSize(flat ? tiled[id] : rect);
            const fullScreen = pane.program === "lazygit" || pane.program === "snake";
            let lines = paneRows(pane, cols);
            if (pane.follow && !fullScreen && lines.length > rows) lines = lines.slice(-rows);
            const focused = id === tab.focus;
            return (
              <Pane
                key={id}
                id={id}
                rect={rect}
                flat={flat}
                leaving={!!ghost}
                vanishing={id in tween.vanishing}
                focused={focused}
                zoomed={tab.zoom && id === tab.focus}
                shortcuts={PANE_SHORTCUTS}
                icon={PROGRAMS[pane.program].icon}
                title={titles(pane).pane}
                onFocus={() => dispatch({ type: "focus", pane: id })}
                onSplit={(dir) => dispatch({ type: "split", dir, pane: id })}
                onZoom={() => dispatch({ type: "zoom", pane: id })}
                onClose={() => dispatch({ type: "close-pane", pane: id })}
              >
                <Terminal rows={lines} top={TERM.top} left={TERM.left} focused={focused} />
              </Pane>
            );
          })}
          </PaneLayer>
        </TweenProvider>

        {!tab.zoom &&
          dividers.map((d) => (
            <div
              key={d.split}
              role="separator"
              aria-orientation={d.dir === "right" ? "vertical" : "horizontal"}
              onPointerDown={startDrag(d)}
              onDoubleClick={() => dispatch({ type: "resize", split: d.split, ratio: 0.5 })}
              className="absolute touch-none"
              style={{
                left: d.dir === "right" ? d.rect.x - 2 : d.rect.x,
                top: d.dir === "right" ? d.rect.y : d.rect.y - 2,
                width: d.dir === "right" ? d.rect.w + 4 : d.rect.w,
                height: d.dir === "right" ? d.rect.h : d.rect.h + 4,
                cursor: d.dir === "right" ? "col-resize" : "row-resize",
              }}
            />
          ))}

        {Object.values(state.panes).map((p) => (
          <PaneClock key={p.id} pane={p} visible={visible.includes(p.id)} dispatch={dispatch} />
        ))}

        <AnimatePresence>
          {state.palette && <CommandPalette commands={commands} onClose={() => dispatch({ type: "palette", open: false })} />}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
