// Rex's workspace as a pure state machine, following Rex's own taxonomy: a
// session holds tabs (Rex calls them windows), each tab is a tiling tree of
// panes (blocks), and each pane runs a program. Titles, header icons and tab
// chips are all derived from what a pane is running.
import { AGENT, GIT } from "./content";
import { INITIAL_SNAKE, newSnake, type Point, type SnakeState, snakeRows, steer, tickSnake } from "./snake";
import { cursor, type Row, s } from "./terminal";

/** Coding agents Rex recognizes: each runs full screen with its own prompt and status. */
export type AgentKind = "codex" | "claude" | "cursor" | "gemini" | "opencode";
/** What a pane runs: a shell, an agent, a REPL, or one of the demo's programs. */
export type ProgramKind = AgentKind | "shell" | "lazygit" | "snake" | "bun" | "node" | "python";
export type Dir = "right" | "down";
export type SplitDir = Dir | "left" | "up";
export type Node =
  | { kind: "pane"; id: string }
  | { kind: "split"; id: string; dir: Dir; ratio: number; a: Node; b: Node };
export type Rect = { x: number; y: number; w: number; h: number };

/** Why a pane wants you: its program finished, or an agent stopped to ask you something. */
export type AttentionKind = "done" | "input";
/** A pane calling for you. It's set when the pane's work ends while you're
    looking elsewhere, and cleared once you focus the pane. How a tile shows
    it is up to the tile (pane.tsx), by kind. */
export type Attention = { kind: AttentionKind; at: number };

export type Pane = {
  id: string;
  /** the hostname of the device it runs on, for the shell prompt */
  host: string;
  cwd: string;
  program: ProgramKind;
  /** an agent's task, named after its first prompt (shown as the title) */
  task?: string;
  /** shell scrollback; full-screen programs draw over it and leave it intact */
  shell: Row[];
  /** a full-screen program's own screen (agents) */
  screen: Row[];
  input: string;
  history: string[];
  recall: number | null;
  /** keep the newest rows in view. Off until someone interacts, so the
      opening frame matches the reference (which shows the top of each pane) */
  follow: boolean;
  /** non-zero while the program is working; each bump restarts its timer */
  busy: number;
  /** when the program last did something (ms), for Activity Mode */
  activeAt: number;
  attention?: Attention;
  snake?: SnakeState;
};

export type Tab = {
  id: string;
  /** the machine the tab's session runs on */
  device: string;
  session: string;
  root: Node;
  focus: string;
  zoom: boolean;
};

/** A machine Rex is connected to: this Mac, or a server it reaches over SSH. */
export type Device = {
  id: string;
  name: string;
  /** its hostname, as a shell prompt shows it */
  host: string;
  /** "This Mac", or where Rex reaches it */
  address: string;
  remote: boolean;
};

/** A space groups devices; a device can sit in any number of spaces. */
export type Space = {
  id: string;
  name: string;
  devices: string[];
  /** the color the window's glass and everything on it takes on; none keeps Rex's neutral gray */
  tint?: string;
};
export type State = {
  /** the window's size; the OS window manager can zoom or full-screen it */
  size: { w: number; h: number };
  /** Rex shows tabs either as a strip in the title bar or in a sidebar */
  view: "tabs" | "sidebar";
  /** Activity Mode: the sidebar lists only running programs, with their status */
  activity: boolean;
  devices: Record<string, Device>;
  spaces: Space[];
  /** the space the sidebar and tab bar show */
  space: string;
  /** each space's last selected tab, so switching back returns to it */
  spaceTabs: Record<string, string>;
  tabs: Tab[];
  active: string;
  panes: Record<string, Pane>;
  palette: boolean;
  seq: number;
};

export type Key = { code: string; key: string; ctrl: boolean; alt: boolean; meta: boolean; shift: boolean };

export type Action =
  | { type: "focus"; pane: string }
  | { type: "select-tab"; tab: string }
  | { type: "goto-tab"; index: number }
  | { type: "new-tab"; command?: string }
  | { type: "close-tab"; tab: string }
  /** pane defaults to the focused one; the header controls pass their own */
  | { type: "split"; dir: SplitDir; command?: string; pane?: string }
  | { type: "close-pane"; pane?: string }
  | { type: "zoom"; pane?: string }
  | { type: "move-focus"; dir: "left" | "right" | "up" | "down" }
  | { type: "resize"; split: string; ratio: number }
  | { type: "key"; key: Key }
  | { type: "paste"; text: string }
  | { type: "clear" }
  | { type: "launch"; command: string; cwd?: string }
  | { type: "done"; pane: string }
  /** go to the pane calling for you (attentionTarget) */
  | { type: "focus-attention" }
  | { type: "tick"; pane: string }
  | { type: "palette"; open: boolean }
  | { type: "toggle-sidebar" }
  | { type: "window-size"; w: number; h: number }
  | { type: "toggle-activity" }
  /** a space by id, or the next/previous one */
  | { type: "space"; space: string }
  | { type: "step-space"; by: 1 | -1 }
  /** the next or previous tab in the space, wrapping around */
  | { type: "step-tab"; by: 1 | -1 };

// ─── Geometry (window-relative px, measured from the reference) ────────────

/** The window in the reference screenshot. */
export const WINDOW = { w: 1000, h: 604.5 };
export const SIDEBAR_W = 248;

/** The area panes tile into: 8pt from the left, 7.5pt from the right and bottom, below the 44pt title bar. */
const tabsArea = (w: number, h: number): Rect => ({ x: 8, y: 44, w: w - 15.5, h: h - 51.5 });
/** With the sidebar, panes start right of it and run up to 8pt from the top. */
const sidebarArea = (w: number, h: number): Rect => ({ x: SIDEBAR_W, y: 8, w: w - 7.5 - SIDEBAR_W, h: h - 15.5 });

/** The pane area at the reference size: 984.5 × 553 at (8, 44). */
export const AREA = tabsArea(WINDOW.w, WINDOW.h);
export const areaOf = (st: Pick<State, "view" | "size">) =>
  (st.view === "sidebar" ? sidebarArea : tabsArea)(st.size.w, st.size.h);
export const GAP = { x: 8, y: 7.5 };
/** First terminal row is centered 43pt below the pane top; column 0 sits 9pt in. */
export const TERM = { top: 43 - 15.15 / 2 + 0.75, left: 9, line: 15.15, cell: 7.1 };
const MIN = { w: 170, h: 90 };

export const gridSize = (r: Rect) => ({
  cols: Math.floor((r.w - TERM.left * 2) / TERM.cell),
  rows: Math.floor((r.h - TERM.top - 4) / TERM.line),
});

export type Divider = { split: string; dir: Dir; rect: Rect; parent: Rect };

type SplitNode = Extract<Node, { kind: "split" }>;

/** A split's two halves, with the gap between them. */
function halves(n: SplitNode, r: Rect): [Rect, Rect] {
  if (n.dir === "right") {
    const avail = r.w - GAP.x;
    const aw = avail * n.ratio;
    return [{ ...r, w: aw }, { x: r.x + aw + GAP.x, y: r.y, w: avail - aw, h: r.h }];
  }
  const avail = r.h - GAP.y;
  const ah = avail * n.ratio;
  return [{ ...r, h: ah }, { x: r.x, y: r.y + ah + GAP.y, w: r.w, h: avail - ah }];
}

export function layout(
  node: Node,
  r: Rect = AREA,
  out: { panes: Record<string, Rect>; dividers: Divider[] } = { panes: {}, dividers: [] },
) {
  if (node.kind === "pane") {
    out.panes[node.id] = r;
    return out;
  }
  const [ra, rb] = halves(node, r);
  layout(node.a, ra, out);
  layout(node.b, rb, out);
  out.dividers.push(
    node.dir === "right"
      ? { split: node.id, dir: "right", rect: { x: ra.x + ra.w, y: r.y, w: GAP.x, h: r.h }, parent: r }
      : { split: node.id, dir: "down", rect: { x: r.x, y: ra.y + ra.h, w: r.w, h: GAP.y }, parent: r },
  );
  return out;
}

// Panes animate without ever overlapping: a pane that appears or goes away
// grows out of / collapses into the outer edge of its half of the split, and
// zoom collapses everything but the zoomed pane into the window's edges. All
// panes ride the same critically damped spring, so two edges that share a
// gap move in step and the gap never closes.

/** `r` collapsed to nothing against its left/top (start) or right/bottom (end) edge. */
export const collapse = (r: Rect, dir: Dir, toEnd: boolean): Rect =>
  dir === "right"
    ? { x: toEnd ? r.x + r.w : r.x, y: r.y, w: 0, h: r.h }
    : { x: r.x, y: toEnd ? r.y + r.h : r.y, w: r.w, h: 0 };

/** Where pane `id` grows from, or collapses to: the outer edge of its half of its parent split. */
export function collapsedRect(root: Node, area: Rect, id: string): Rect | null {
  const walk = (n: Node, r: Rect): Rect | null => {
    if (n.kind === "pane") return null;
    const [ra, rb] = halves(n, r);
    if (n.a.kind === "pane" && n.a.id === id) return collapse(ra, n.dir, false);
    if (n.b.kind === "pane" && n.b.id === id) return collapse(rb, n.dir, true);
    return walk(n.a, ra) ?? walk(n.b, rb);
  };
  return walk(root, area);
}

/** The split pane `id` sits in: its direction, whether it's the second (right/bottom) half, and its sibling. */
export function splitOf(root: Node, id: string): { dir: Dir; end: boolean; sibling: Node } | null {
  if (root.kind === "pane") return null;
  if (root.a.kind === "pane" && root.a.id === id) return { dir: root.dir, end: false, sibling: root.b };
  if (root.b.kind === "pane" && root.b.id === id) return { dir: root.dir, end: true, sibling: root.a };
  return splitOf(root.a, id) ?? splitOf(root.b, id);
}

/** The smallest rect around `rects`. */
export function bounds(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return {
    x,
    y,
    w: Math.max(...rects.map((r) => r.x + r.w)) - x,
    h: Math.max(...rects.map((r) => r.y + r.h)) - y,
  };
}

/**
 * Zoomed layout: the focused pane gets the whole area and the rest make way,
 * sliding out past the area's edge a full gap away, keeping their size and
 * fading (alpha 0). Past the right and bottom (and the left without the
 * sidebar) that's beyond the window's padding, so the window frame crops
 * them; the pane layer crops them softly at the title bar and the sidebar.
 * Their gap to the growing zoomed pane stays the same the whole way.
 */
export function zoomLayout(
  node: Node,
  r: Rect,
  focus: string,
  /** the unzoomed layout: panes make way from where they actually are */
  tiled: Record<string, Rect>,
  out: Record<string, Rect & { a?: number }> = {},
) {
  if (node.kind === "pane") {
    out[node.id] = r;
    return out;
  }
  const inA = leaves(node.a).includes(focus);
  const makeWay = (child: Node, toEnd: boolean) => {
    const ids = leaves(child);
    const group = bounds(ids.map((id) => tiled[id]));
    if (!group) return;
    const across = node.dir === "right";
    const dx = !across ? 0 : toEnd ? r.x + r.w + GAP.x - group.x : r.x - GAP.x - (group.x + group.w);
    const dy = across ? 0 : toEnd ? r.y + r.h + GAP.y - group.y : r.y - GAP.y - (group.y + group.h);
    for (const id of ids) out[id] = { ...tiled[id], x: tiled[id].x + dx, y: tiled[id].y + dy, a: 0 };
  };
  if (inA) {
    zoomLayout(node.a, r, focus, tiled, out);
    makeWay(node.b, true);
  } else {
    makeWay(node.a, false);
    zoomLayout(node.b, r, focus, tiled, out);
  }
  return out;
}

/** Ratio for a divider dragged to `pos` (x or y), keeping both sides usable. */
export function ratioAt(d: Divider, pos: number) {
  const horizontal = d.dir === "right";
  const gap = horizontal ? GAP.x : GAP.y;
  const start = horizontal ? d.parent.x : d.parent.y;
  const size = (horizontal ? d.parent.w : d.parent.h) - gap;
  const min = Math.min(0.45, (horizontal ? MIN.w : MIN.h) / size);
  return Math.min(1 - min, Math.max(min, (pos - start - gap / 2) / size));
}

// ─── Tree helpers ───────────────────────────────────────────────────────────

export const leaves = (n: Node): string[] => (n.kind === "pane" ? [n.id] : [...leaves(n.a), ...leaves(n.b)]);

function replaceLeaf(n: Node, id: string, f: (leaf: Node) => Node): Node {
  if (n.kind === "pane") return n.id === id ? f(n) : n;
  return { ...n, a: replaceLeaf(n.a, id, f), b: replaceLeaf(n.b, id, f) };
}

function removeLeaf(n: Node, id: string): Node | null {
  if (n.kind === "pane") return n.id === id ? null : n;
  const a = removeLeaf(n.a, id);
  const b = removeLeaf(n.b, id);
  if (!a) return b;
  if (!b) return a;
  return { ...n, a, b };
}

function setRatio(n: Node, split: string, ratio: number): Node {
  if (n.kind === "pane") return n;
  if (n.id === split) return { ...n, ratio };
  return { ...n, a: setRatio(n.a, split, ratio), b: setRatio(n.b, split, ratio) };
}

/** The pane next to `from` in a direction: the nearest one wholly on that side, preferring ones in line with it. */
export function neighborOf(rects: Record<string, Rect>, from: string, dir: SplitDir): string | null {
  const f = rects[from];
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  let best: [string, number] | null = null;
  for (const [id, r] of Object.entries(rects)) {
    if (id === from) continue;
    const ok =
      dir === "left" ? r.x + r.w <= f.x + 1 :
      dir === "right" ? r.x >= f.x + f.w - 1 :
      dir === "up" ? r.y + r.h <= f.y + 1 :
      r.y >= f.y + f.h - 1;
    if (!ok) continue;
    const dx = r.x + r.w / 2 - cx;
    const dy = r.y + r.h / 2 - cy;
    const score = dir === "left" || dir === "right" ? Math.abs(dx) + Math.abs(dy) * 2 : Math.abs(dy) + Math.abs(dx) * 2;
    if (!best || score < best[1]) best = [id, score];
  }
  return best?.[0] ?? null;
}

export const activeTab = (st: State) => st.tabs.find((t) => t.id === st.active)!;
export const tabOf = (st: State, pane: string) => st.tabs.find((t) => leaves(t.root).includes(pane))!;

/** The active space. */
export const spaceOf = (st: State) => st.spaces.find((sp) => sp.id === st.space)!;
/** The tabs a space shows: every tab on one of its devices, in the order the sidebar lists them. */
export const tabsIn = (st: State, space = spaceOf(st)) => space.devices.flatMap((d) => st.tabs.filter((t) => t.device === d));

export function paneRect(st: State, pane: string): Rect {
  const tab = tabOf(st, pane);
  const area = areaOf(st);
  return tab.zoom && tab.focus === pane ? area : (layout(tab.root, area).panes[pane] ?? area);
}

// ─── Programs: titles and screens ───────────────────────────────────────────

const basename = (cwd: string) => cwd.split("/").pop() || cwd;

/** What Rex shows for a pane: its header title and its tab's title. */
export function titles(p: Pane): { pane: string; tab: string } {
  const both = (t: string) => ({ pane: t, tab: t });
  switch (p.program) {
    case "codex":
    case "claude":
    case "cursor":
    case "gemini":
    case "opencode": {
      if (p.task) return { pane: `${p.task} | ${basename(p.cwd)}`, tab: p.task };
      return both(`${AGENTS[p.program].name} ${p.cwd}`);
    }
    case "node":
      return both(`Node ${p.cwd}`);
    case "python":
      return both(`Python ${p.cwd}`);
    case "lazygit":
      return both(`Git Changes ${p.cwd}`);
    case "snake":
      return both(`Node ${p.cwd}`);
    case "bun":
      return both(`Bun ${p.cwd}`);
    default:
      return both(`fish ${p.cwd}`);
  }
}

const b = { b: true };
const width = (row: Row) => row.reduce((n, seg) => n + seg.t.length, 0);

/** fish abbreviates every directory but the last: ~/S/rex-snake */
const shortCwd = (cwd: string) =>
  cwd
    .split("/")
    .map((part, i, all) => (i === 0 || i === all.length - 1 ? part : part[0]))
    .join("/");

const prompt = (cwd: string, text?: string, host = "Mac-Studio"): Row => [
  s("alan", "--t-green"),
  s(`@${host} `, "--t-fg"),
  s(shortCwd(cwd), "--t-green"),
  s("> ", "--t-fg"),
  ...(text ? [s(text, "--t-fg")] : []),
];

const FISH_WELCOME: Row[] = [
  [s("Welcome to fish, the friendly interactive shell", "--t-fg")],
  [s("Type ", "--t-fg"), s("help", "--t-green"), s(" for instructions on how to use fish", "--t-fg")],
];

/** A rounded box around rows, padded to `w` columns. */
function box(rows: Row[], w: number, c = "--t-dim"): Row[] {
  return [
    [s("╭" + "─".repeat(w - 2) + "╮", c)],
    ...rows.map((r) => [s("│ ", c), ...r, s(" ".repeat(Math.max(0, w - 4 - width(r))) + " │", c)]),
    [s("╰" + "─".repeat(w - 2) + "╯", c)],
  ];
}

const codexWelcome = (cwd: string): Row[] => [
  ...box(
    [
      [s(">_ ", "--t-dim"), s("OpenAI Codex", "--t-strong", b), s(" (v0.46.0)", "--t-dim")],
      [],
      [s("model:     ", "--t-dim"), s("gpt-5-codex high", "--t-fg"), s("   /model to change", "--t-blue")],
      [s("directory: ", "--t-dim"), s(cwd, "--t-fg")],
    ],
    48,
  ),
  [],
  [s("  To get started, describe a task or try one of these commands:", "--t-dim")],
  [],
  [s("  /init", "--t-fg"), s(" - create an AGENTS.md file with instructions for Codex", "--t-dim")],
  [s("  /status", "--t-fg"), s(" - show current session configuration", "--t-dim")],
];

const claudeWelcome = (cwd: string): Row[] => [
  ...box(
    [
      [s("✻ ", "--t-claude"), s("Welcome to ", "--t-fg"), s("Claude Code", "--t-strong", b), s("!", "--t-fg")],
      [],
      [s("  /help for help, /status for your current setup", "--t-dim")],
      [],
      [s(`  cwd: ${cwd.replace("~", "/Users/alan")}`, "--t-dim")],
    ],
    54,
    "--t-claude",
  ),
  [],
  [s(" Tips for getting started:", "--t-dim")],
  [],
  [s(" 1. Ask Claude to create a new app or clone a repository", "--t-dim")],
  [s(" 2. Use Claude to help with file analysis, editing, bash commands and git", "--t-dim")],
];

// No model sits behind these panes. The replies say so, and point at what
// does work in the demo.
const REPLY = [
  "This is a Rex demo, so there's no model behind this pane.",
  "Everything around it is wired up, though: split this pane with",
  "Cmd+D, zoom it with Cmd+E, or open the command palette with",
  "Cmd+K and start lazygit or snake next to me.",
];

const cursorWelcome = (cwd: string): Row[] => [
  ...box(
    [
      [s("⬢ ", "--t-fg"), s("Cursor Agent", "--t-strong", b), s(" v2025.10.16", "--t-dim")],
      [],
      [s(cwd, "--t-dim")],
    ],
    44,
  ),
  [],
  [s("  Plan, search, build anything. ", "--t-dim"), s("/model", "--t-fg"), s(" to switch models", "--t-dim")],
];

const geminiWelcome = (cwd: string): Row[] => [
  [s(" ✦ ", "--t-blue"), s("Gemini CLI", "--t-strong", b), s(" v0.9.0", "--t-dim")],
  [],
  [s("Tips for getting started:", "--t-fg")],
  [s("1. Ask questions, edit files, or run commands.", "--t-dim")],
  [s("2. Be specific for the best results.", "--t-dim")],
  [s("3. ", "--t-dim"), s("/help", "--t-blue"), s(" for more information.", "--t-dim")],
  [],
  [s(`Using: ${cwd}`, "--t-dim")],
];

const opencodeWelcome = (cwd: string): Row[] => [
  [s("  █▀▀█ █▀▀█ █▀▀ █▀▀▄ ", "--t-dim"), s("█▀▀ █▀▀█ █▀▀▄ █▀▀", "--t-strong", b)],
  [s("  █░░█ █░░█ █▀▀ █░░█ ", "--t-dim"), s("█░░ █░░█ █░░█ █▀▀", "--t-strong", b)],
  [s("  ▀▀▀▀ █▀▀▀ ▀▀▀ ▀  ▀ ", "--t-dim"), s("▀▀▀ ▀▀▀▀ ▀▀▀  ▀▀▀", "--t-strong", b)],
  [],
  [s("  /new", "--t-fg"), s("      new session      ", "--t-dim"), s("ctrl+x n", "--t-dim")],
  [s("  /models", "--t-fg"), s("   list models      ", "--t-dim"), s("ctrl+x m", "--t-dim")],
  [],
  [s(`  ${cwd}`, "--t-dim")],
];

type Agent = {
  /** its name in titles */
  name: string;
  /** commands that start it */
  commands: string[];
  welcome: (cwd: string) => Row[];
  /** the status line while it works */
  working: Row;
  /** how a prompt shows once sent */
  said: (text: string) => Row;
  /** its prompt, at the bottom of the screen */
  input: (p: Pane, cols: number) => Row[];
  reply: () => Row[];
  /** shown after its reply when it stops to ask you something (a permission prompt) instead of finishing */
  ask?: () => Row[];
};

/** A boxed prompt field, as Claude Code, Gemini and opencode draw theirs. */
const field = (p: Pane, cols: number, lead: Row, hint: string, c = "--t-dim") => {
  const w = Math.max(20, Math.min(cols, 80));
  const typed = p.input ? [s(p.input, "--t-fg"), cursor()] : [cursor(), s(hint, "--t-dim")];
  return box([[...lead, ...typed]], w, c);
};

const bulletReply = (bullet: Row[number], tool: Row): Row[] => [
  tool,
  [],
  ...REPLY.map((line, i): Row => [i === 0 ? bullet : s("  ", "--t-fg"), s(line, "--t-fg")]),
];

export const AGENTS: Record<AgentKind, Agent> = {
  codex: {
    name: "Codex",
    commands: ["codex"],
    welcome: (cwd) => codexWelcome(cwd),
    working: [s("• ", "--t-bullet"), s("Working", "--t-strong", b), s(" (esc to interrupt)", "--t-dim")],
    said: (text) => [s("› ", "--t-dim"), s(text, "--t-fg")],
    input: (p) => [[s("› ", "--t-strong", b), s(p.input, "--t-fg"), cursor(), ...(p.input ? [] : [s("Ask Codex to do anything", "--t-dim")])]],
    reply: () => [
      [s("• ", "--t-bullet-dim"), s("Explored", "--t-strong", b)],
      [s("  └ List ", "--t-dim"), s("ls", "--t-blue")],
      [],
      ...REPLY.map((line, i): Row => [s(i === 0 ? "• " : "  ", "--t-bullet"), s(line, "--t-fg")]),
    ],
  },
  claude: {
    name: "Claude Code",
    commands: ["claude"],
    welcome: (cwd) => claudeWelcome(cwd),
    working: [s("✻ ", "--t-claude"), s("Thinking…", "--t-claude"), s(" (esc to interrupt)", "--t-dim")],
    said: (text) => [s("> ", "--t-dim"), s(text, "--t-dim")],
    input: (p, cols) => {
      const w = Math.max(20, Math.min(cols, 80));
      return [...box([[s("> ", "--t-fg"), s(p.input, "--t-fg"), cursor()]], w, "--t-dim"), [s("  ? for shortcuts", "--t-dim")]];
    },
    reply: () => [
      [s("● ", "--t-green"), s("Bash", "--t-strong", b), s("(ls)", "--t-fg")],
      [s("  └  ", "--t-dim"), s("README.md  Package.swift  Sources  Tests", "--t-dim")],
      [],
      ...REPLY.map((line, i): Row => [s(i === 0 ? "● " : "  ", "--t-fg"), s(line, "--t-fg")]),
    ],
    ask: () => [
      [],
      [s("● ", "--t-claude"), s("Update", "--t-strong", b), s("(Sources/App.swift)", "--t-fg")],
      [],
      [s(" Do you want to make this edit to ", "--t-fg"), s("App.swift", "--t-strong", b), s("?", "--t-fg")],
      [s(" ❯ 1. Yes", "--t-claude")],
      [s("   2. Yes, allow all edits during this session", "--t-fg")],
      [s("   3. No, and tell Claude what to do differently ", "--t-fg"), s("(esc)", "--t-dim")],
    ],
  },
  cursor: {
    name: "Cursor",
    commands: ["cursor-agent", "cursor"],
    welcome: cursorWelcome,
    working: [s("⬢ ", "--t-fg"), s("Generating…", "--t-strong"), s("  ctrl+c to stop", "--t-dim")],
    said: (text) => [s("→ ", "--t-dim"), s(text, "--t-fg")],
    input: (p, cols) => [...field(p, cols, [s("→ ", "--t-fg")], "Plan, search, build anything"), [s("  Auto · /model to change", "--t-dim")]],
    reply: () => bulletReply(s("⬢ ", "--t-fg"), [s("⬢ ", "--t-dim"), s("Listed ", "--t-strong", b), s("~/", "--t-dim")]),
  },
  gemini: {
    name: "Gemini",
    commands: ["gemini"],
    welcome: geminiWelcome,
    working: [s("⠋ ", "--t-blue"), s("Thinking…", "--t-blue"), s(" (esc to cancel)", "--t-dim")],
    said: (text) => [s("> ", "--t-blue"), s(text, "--t-fg")],
    input: (p, cols) => [...field(p, cols, [s(">   ", "--t-blue")], "Type your message or @path/to/file", "--t-blue"), [s(" gemini-2.5-pro (100% context left)", "--t-dim")]],
    reply: () => bulletReply(s("✦ ", "--t-blue"), [s(" ✔ ", "--t-green"), s("ReadFolder", "--t-strong", b), s(" .", "--t-dim")]),
  },
  opencode: {
    name: "opencode",
    commands: ["opencode"],
    welcome: opencodeWelcome,
    working: [s("⣾ ", "--t-fg"), s("Working…", "--t-strong"), s("  esc interrupt", "--t-dim")],
    said: (text) => [s("┃ ", "--t-dim"), s(text, "--t-fg")],
    input: (p, cols) => [...field(p, cols, [s("> ", "--t-fg")], "Ask anything…"), [s("  build · claude-sonnet-4.5", "--t-dim")]],
    reply: () => bulletReply(s("┃ ", "--t-fg"), [s("┃ ", "--t-dim"), s("List", "--t-strong", b), s(" .", "--t-dim")]),
  },
};

export const isAgent = (k: ProgramKind): k is AgentKind => k in AGENTS;
const AGENT_COMMANDS = Object.fromEntries(
  (Object.entries(AGENTS) as [AgentKind, Agent][]).flatMap(([k, a]) => a.commands.map((c) => [c, k])),
) as Record<string, AgentKind>;

export type Activity = { label: string; working: boolean; at: number };

/** What Activity Mode reports for a pane (Rex gets this from OSC 7501); null for an idle shell. */
export function activityOf(p: Pane): Activity | null {
  const at = p.activeAt;
  switch (p.program) {
    case "codex":
    case "claude":
    case "cursor":
    case "gemini":
    case "opencode":
      if (p.busy) return { label: "Working", working: true, at };
      return { label: p.task ? "Done" : "Waiting for a prompt", working: false, at };
    case "node":
    case "python":
      return { label: p.program === "node" ? "Node REPL" : "Python REPL", working: false, at };
    case "bun":
      return p.busy
        ? { label: "Starting…", working: true, at }
        : { label: "Ready on localhost:3000", working: false, at };
    case "snake": {
      const g = p.snake!;
      const state = g.status === "running" ? "Playing" : g.status === "paused" ? "Paused" : "Game over";
      return { label: `${state} · score ${g.score}`, working: g.status === "running", at };
    }
    case "lazygit":
      return { label: "Idle", working: false, at };
    default:
      return null;
  }
}

/** A tab's call for you, from its panes: one waiting on you outranks one that's only finished. */
export function tabAttention(st: State, tab: Tab): AttentionKind | null {
  const kinds = leaves(tab.root).map((id) => st.panes[id].attention?.kind);
  return kinds.includes("input") ? "input" : kinds.includes("done") ? "done" : null;
}

/** The pane calling for you that you'd want first: one waiting on you before one that's only finished, then the latest. */
export function attentionTarget(st: State): string | null {
  const rank = (p: Pane) => (p.attention?.kind === "input" ? 1 : 0);
  const calling = Object.values(st.panes).filter((p) => p.attention && tabOf(st, p.id));
  calling.sort((a, b) => rank(b) - rank(a) || b.attention!.at - a.attention!.at);
  return calling[0]?.id ?? null;
}

/** The pane a tab is represented by in Activity Mode: its focused pane if it's running something. */
export function activePaneOf(st: State, tab: Tab): Pane | null {
  const order = [tab.focus, ...leaves(tab.root).filter((id) => id !== tab.focus)];
  for (const id of order) if (activityOf(st.panes[id])) return st.panes[id];
  return null;
}

/** Everything a pane shows, top to bottom, at `cols` columns. */
export function paneRows(p: Pane, cols: number): Row[] {
  switch (p.program) {
    case "shell":
      return [...p.shell, [...prompt(p.cwd, undefined, p.host), s(p.input, "--t-fg"), cursor()]];
    case "bun":
      return [...p.shell, [cursor()]];
    case "codex":
    case "claude":
    case "cursor":
    case "gemini":
    case "opencode":
      return [...p.screen, [], ...AGENTS[p.program].input(p, cols)];
    case "node":
    case "python":
      return [...p.shell, [s(REPL[p.program].prompt, "--t-fg"), s(p.input, "--t-fg"), cursor()]];
    case "lazygit":
      return GIT;
    case "snake":
      return snakeRows(p.snake!);
  }
}

// ─── REPLs ──────────────────────────────────────────────────────────────────

/** A string literal or simple arithmetic the demo REPLs can answer; null for anything else. */
function literal(expr: string): { value: number | string } | null {
  const str = expr.match(/^(["'])(.*)\1$/);
  if (str) return { value: str[2] };
  if (!/^[\d\s+\-*/%().]+$/.test(expr) || !/\d/.test(expr)) return null;
  try {
    // digits and operators only, so this can't reach anything else
    const v = Function(`"use strict"; return (${expr});`)() as unknown;
    return typeof v === "number" && Number.isFinite(v) ? { value: v } : null;
  } catch {
    return null;
  }
}

const REPL: Record<"node" | "python", { prompt: string; banner: Row[]; exits: string[]; evaluate: (line: string) => Row[] }> = {
  node: {
    prompt: "> ",
    banner: [[s("Welcome to Node.js v24.11.0.", "--t-fg")], [s('Type ".help" for more information.', "--t-fg")]],
    exits: [".exit"],
    evaluate: (line) => {
      if (!line) return [];
      const log = line.match(/^console\.log\((.*)\)$/);
      const out = literal(log ? log[1].trim() : line);
      if (out) {
        if (log) return [[s(String(out.value), "--t-fg")], [s("undefined", "--t-dim")]];
        return [[typeof out.value === "number" ? s(String(out.value), "--t-gold") : s(`'${out.value}'`, "--t-green")]];
      }
      const name = line.match(/^[A-Za-z_$][\w$]*/)?.[0] ?? line;
      return [[s(`Uncaught ReferenceError: ${name} is not defined`, "--t-red")]];
    },
  },
  python: {
    prompt: ">>> ",
    banner: [
      [s("Python 3.14.0 (main, Oct  7 2025, 09:34:52) [Clang 17.0.0 (clang-1700.3.19.1)] on darwin", "--t-fg")],
      [s('Type "help", "copyright", "credits" or "license" for more information.', "--t-fg")],
    ],
    exits: ["exit()", "quit()", "exit", "quit"],
    evaluate: (line) => {
      if (!line) return [];
      const call = line.match(/^print\((.*)\)$/);
      const out = literal(call ? call[1].trim() : line);
      if (out) return [[s(call || typeof out.value === "number" ? String(out.value) : `'${out.value}'`, "--t-fg")]];
      const name = line.match(/^[A-Za-z_]\w*/)?.[0] ?? line;
      return [
        [s("Traceback (most recent call last):", "--t-fg")],
        [s('  File "<python-input-0>", line 1, in <module>', "--t-fg")],
        [s(`NameError: name '${name}' is not defined`, "--t-red")],
      ];
    },
  },
};

// ─── A small fake filesystem for the shell ──────────────────────────────────

const FS: Record<string, string[]> = {
  "~": ["Desktop/", "Documents/", "Downloads/", "Sites/"],
  "~/sites": ["announcements/", "macos-client-ui/", "rex-snake/"],
  "~/sites/rex-snake": ["AGENTS.md", "README.md", "demo/", "package.json"],
  "~/sites/rex-snake/demo": ["snake.mjs"],
  "~/sites/announcements": ["app/", "bun.lock", "next.config.ts", "package.json", "public/"],
  "~/sites/announcements/app": ["layout.tsx", "page.tsx"],
  "~/sites/announcements/public": ["og.png"],
  "~/sites/macos-client-ui": ["Package.swift", "README.md", "Sources/", "Tests/"],
  "~/sites/macos-client-ui/sources": ["App.swift", "Sidebar.swift", "Window.swift"],
  "~/sites/macos-client-ui/tests": ["WindowTests.swift"],
  "~/srv": ["api/", "caddy/"],
  "~/srv/api": ["Dockerfile", "go.mod", "main.go", "ratelimit.go"],
  "~/srv/caddy": ["Caddyfile"],
  "~/runner": ["config.toml", "e2e/", "run.sh"],
  "~/runner/e2e": ["macos.yml"],
  "~/release": ["CHANGELOG.md", "release.sh"],
  "~/gateway": ["Dockerfile", "deploy.yaml", "nginx.conf"],
  "~/migrations": ["0042_split_orders.py", "env.py"],
  "~/zigbee": ["configuration.yaml", "devices.yaml"],
  "~/backups": ["excludes.txt", "restic.env"],
  "~/media": ["Movies/", "Music/", "Photos/"],
  "~/desktop": [],
  "~/documents": [],
  "~/downloads": [],
};
const REPOS = ["~/sites/rex-snake", "~/sites/announcements", "~/sites/macos-client-ui"];

function resolve(cwd: string, arg = "~"): string {
  const raw = arg.startsWith("/Users/alan") ? "~" + arg.slice(11) : arg;
  const parts = raw.startsWith("~") ? raw.split("/") : [...cwd.split("/"), ...raw.split("/")];
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (out.length > 1) out.pop();
    } else out.push(part);
  }
  return out.join("/") || "~";
}
const isDir = (path: string) => path.toLowerCase() in FS;
const fileIn = (path: string) => {
  const dir = path.split("/").slice(0, -1).join("/").toLowerCase();
  return (FS[dir] ?? []).includes(path.split("/").pop()!);
};
const repoOf = (cwd: string) => REPOS.find((r) => (cwd.toLowerCase() + "/").startsWith(r + "/"));

const tokenize = (line: string) =>
  (line.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((t) => t.replace(/^["']|["']$/g, ""));

const HELP: Row[] = [
  [s("This is a pretend fish shell inside Rex. Things to try:", "--t-fg")],
  [s("  codex, claude, cursor-agent, gemini, opencode", "--t-green"), s("  start an agent", "--t-dim")],
  [s("  node, python", "--t-green"), s("         start a REPL", "--t-dim")],
  [s("  lazygit", "--t-green"), s("              browse the changes (in rex-snake)", "--t-dim")],
  [s("  node demo/snake.mjs", "--t-green"), s("  play snake (in ~/Sites/rex-snake)", "--t-dim")],
  [s("  bun dev", "--t-green"), s("              start a dev server (in announcements)", "--t-dim")],
  [s("  rex split", "--t-green"), s(" [--split below] [-- cmd]  split this pane", "--t-dim")],
  [s("  rex run", "--t-green"), s(" [-- cmd]  open a tab    ", "--t-dim"), s("rex ls", "--t-green"), s("  list tabs", "--t-dim")],
  [s("  ls, cd, pwd, git status, clear, exit", "--t-green")],
  [s("Cmd+D split · Shift+Cmd+D split down · Cmd+E zoom · Ctrl+C stop", "--t-dim")],
  [s("Cmd+K opens the command palette", "--t-dim")],
];

// ─── Reducer helpers ────────────────────────────────────────────────────────

const put = (st: State, id: string, f: (p: Pane) => Partial<Pane>): State => ({
  ...st,
  panes: { ...st.panes, [id]: { ...st.panes[id], ...f(st.panes[id]) } },
});
const print = (st: State, id: string, rows: Row[]) => put(st, id, (p) => ({ shell: [...p.shell, ...rows] }));
const putTab = (st: State, id: string, f: (t: Tab) => Partial<Tab>): State => ({
  ...st,
  tabs: st.tabs.map((t) => (t.id === id ? { ...t, ...f(t) } : t)),
});

function makePane(id: string, cwd: string, extra: Partial<Pane> = {}): Pane {
  return {
    id,
    host: "Mac-Studio",
    cwd,
    program: "shell",
    shell: FISH_WELCOME,
    screen: [],
    input: "",
    history: [],
    recall: null,
    follow: true,
    busy: 0,
    activeAt: Date.now(),
    ...extra,
  };
}

const nextId = (st: State, prefix: string): [string, State] => [`${prefix}${st.seq}`, { ...st, seq: st.seq + 1 }];

/** A new tab beside the active one: on its device and in its session if it's in this space, else on the space's first device. */
function newTab(st: State, cwd: string, command?: string): State {
  let tabId: string, paneId: string;
  [tabId, st] = nextId(st, "t");
  [paneId, st] = nextId(st, "p");
  const space = spaceOf(st);
  const from = activeTab(st);
  const here = from && space.devices.includes(from.device) ? from : undefined;
  const device = here?.device ?? space.devices[0];
  const session = here?.session ?? st.tabs.find((t) => t.device === device)?.session ?? "home";
  if (!here) cwd = "~";
  st = {
    ...st,
    tabs: [...st.tabs, { id: tabId, device, session, root: { kind: "pane", id: paneId }, focus: paneId, zoom: false }],
    active: tabId,
    panes: { ...st.panes, [paneId]: makePane(paneId, cwd, { host: st.devices[device].host }) },
  };
  return command ? runCommand(st, paneId, command) : st;
}

/** Split `pane`, open a shell in the new half and focus it. null if too small. */
function splitPane(st: State, pane: string, dir: SplitDir, command?: string): State | null {
  const tab = tabOf(st, pane);
  const r = paneRect(st, pane);
  const horizontal = dir === "right" || dir === "left";
  if (horizontal ? (r.w - GAP.x) / 2 < MIN.w : (r.h - GAP.y) / 2 < MIN.h) return null;
  let paneId: string, splitId: string;
  [paneId, st] = nextId(st, "p");
  [splitId, st] = nextId(st, "s");
  const fresh: Node = { kind: "pane", id: paneId };
  const before = dir === "left" || dir === "up";
  const root = replaceLeaf(tab.root, pane, (leaf) => ({
    kind: "split",
    id: splitId,
    dir: horizontal ? "right" : "down",
    ratio: 0.5,
    a: before ? fresh : leaf,
    b: before ? leaf : fresh,
  }));
  st = putTab(st, tab.id, () => ({ root, focus: paneId, zoom: false }));
  st = { ...st, panes: { ...st.panes, [paneId]: makePane(paneId, st.panes[pane].cwd, { host: st.panes[pane].host, shell: [] }) } };
  return command ? runCommand(st, paneId, command) : st;
}

function closeTab(st: State, tabId: string): State {
  const index = st.tabs.findIndex((t) => t.id === tabId);
  const gone = new Set(leaves(st.tabs[index].root));
  const tabs = st.tabs.filter((t) => t.id !== tabId);
  const panes = Object.fromEntries(Object.entries(st.panes).filter(([id]) => !gone.has(id)));
  st = { ...st, tabs, panes };
  if (st.active !== tabId) return st;
  // the next tab in this space takes its place, or a fresh one when it was the space's last
  const left = tabsIn(st);
  if (!left.length) return newTab(st, "~");
  const after = left.find((t) => st.tabs.indexOf(t) >= index) ?? left.at(-1)!;
  return { ...st, active: after.id };
}

function closePane(st: State, pane: string): State {
  const tab = tabOf(st, pane);
  const root = removeLeaf(tab.root, pane);
  if (!root) return closeTab(st, tab.id);
  const order = leaves(tab.root);
  const left = leaves(root);
  const focus = tab.focus === pane ? left[Math.max(0, order.indexOf(pane) - 1)] : tab.focus;
  const panes = { ...st.panes };
  delete panes[pane];
  return putTab({ ...st, panes }, tab.id, () => ({ root, focus, zoom: false }));
}

function startProgram(st: State, id: string, program: ProgramKind, extra: Partial<Pane> = {}): State {
  return put(st, id, () => ({ program, input: "", busy: 0, follow: true, activeAt: Date.now(), ...extra }));
}

function exitProgram(st: State, id: string, rows: Row[] = []): State {
  st = put(st, id, () => ({ program: "shell", screen: [], task: undefined, snake: undefined, busy: 0, input: "" }));
  return print(st, id, rows);
}

const taskTitle = (text: string) => {
  const t = text.trim().replace(/\s+/g, " ");
  const cap = t[0].toUpperCase() + t.slice(1);
  return cap.length > 34 ? cap.slice(0, 33).trimEnd() + "…" : cap;
};

function submitToAgent(st: State, id: string, text: string): State {
  const p = st.panes[id];
  const agent = AGENTS[p.program as AgentKind];
  return put(st, id, () => ({
    screen: [...p.screen, [], agent.said(text), [], agent.working],
    input: "",
    task: p.task ?? taskTitle(text),
    busy: p.busy + 1,
    activeAt: Date.now(),
  }));
}

// ─── The shell ──────────────────────────────────────────────────────────────

function runCommand(st: State, id: string, line: string): State {
  const p = st.panes[id];
  const text = line.trim();
  const history = text && p.history.at(-1) !== text ? [...p.history, text] : p.history;
  st = put(st, id, (q) => ({ shell: [...q.shell, prompt(q.cwd, line, q.host)], input: "", recall: null, history, follow: true }));
  if (!text) return st;

  const [cmd, ...args] = tokenize(text);
  const cwd = p.cwd;
  const out = (...rows: Row[]) => print(st, id, rows);
  const plain = (t: string, c = "--t-fg"): Row => [s(t, c)];

  switch (cmd) {
    case "help":
      return out(...HELP);
    case "clear":
      return put(st, id, () => ({ shell: [] }));
    case "pwd":
      return out(plain(cwd.replace("~", "/Users/alan")));
    case "whoami":
      return out(plain("alan"));
    case "echo":
      return out(plain(args.join(" ")));
    case "date":
      return out(plain(new Date().toString().split(" (")[0]));
    case "exit":
      return closePane(st, id);
    case "ls": {
      const path = resolve(cwd, args.find((a) => !a.startsWith("-")) ?? ".");
      if (!isDir(path)) return out(plain(`ls: ${args[0]}: No such file or directory`));
      const items = FS[path.toLowerCase()];
      return out(items.map((it, i) => s(it + (i < items.length - 1 ? "  " : ""), it.endsWith("/") ? "--t-blue" : "--t-fg")));
    }
    case "cd": {
      const path = resolve(cwd, args[0]);
      if (!isDir(path)) return out(plain(`cd: The directory '${args[0]}' does not exist`, "--t-red"));
      return put(st, id, () => ({ cwd: path }));
    }
    case "git": {
      const repo = repoOf(cwd);
      if (!repo) return out(plain("fatal: not a git repository (or any of the parent directories): .git", "--t-red"));
      if (args[0] === "status") {
        if (repo !== "~/sites/rex-snake") return out(plain("On branch main"), plain("nothing to commit, working tree clean"));
        return out(
          plain("On branch main"),
          plain("Changes not staged for commit:"),
          [s("        modified:   demo/snake.mjs", "--t-red")],
          [],
          plain('no changes added to commit (use "git add" and/or "git commit -a")'),
        );
      }
      if (args[0] === "log") return out([s("8f3c2a1 ", "--t-gold"), s("Initial commit", "--t-fg")]);
      return out(plain(`git: '${args[0] ?? ""}' isn't part of this demo. Try git status or lazygit.`));
    }
    case "lazygit": {
      if (repoOf(cwd) !== "~/sites/rex-snake") {
        return out(plain("lazygit: this demo only has changes in ~/Sites/rex-snake", "--t-dim"));
      }
      return startProgram(st, id, "lazygit");
    }
    case "python":
    case "python3":
      if (args.length) return out(plain(`${cmd}: only the REPL runs in this demo (type ${cmd})`, "--t-dim"));
      return startProgram(print(st, id, REPL.python.banner), id, "python");
    case "node": {
      const file = args[0];
      if (!file) return startProgram(print(st, id, REPL.node.banner), id, "node");
      const path = resolve(cwd, file);
      if (!fileIn(path)) return out(plain(`Error: Cannot find module '${path.replace("~", "/Users/alan")}'`, "--t-red"));
      if (!path.endsWith("snake.mjs")) return out(plain(`node: only demo/snake.mjs runs in this demo`, "--t-dim"));
      const { cols, rows } = gridSize(paneRect(st, id));
      return startProgram(st, id, "snake", { snake: newSnake(cols, rows, st.seq * 7 + 3) });
    }
    case "bun":
    case "npm":
    case "pnpm": {
      const script = args[0] === "run" ? args[1] : args[0];
      if (script !== "dev") return out(plain(`${cmd}: try '${cmd} dev' in ~/sites/announcements`, "--t-dim"));
      if (repoOf(cwd) !== "~/sites/announcements") return out(plain(`error: Script not found "dev"`, "--t-red"));
      st = print(st, id, [
        [s("$ ", "--t-dim"), s("next dev --turbopack", "--t-fg")],
        [s("   ▲ Next.js 16.4.2", "--t-strong", b), s(" (Turbopack)", "--t-dim")],
        [s("   - Local:        ", "--t-fg"), s("http://localhost:3000", "--t-blue")],
        [],
        [s(" ✓ ", "--t-green"), s("Starting...", "--t-fg")],
      ]);
      return startProgram(st, id, "bun", { busy: p.busy + 1 });
    }
    case "codex":
    case "claude":
    case "cursor":
    case "cursor-agent":
    case "gemini":
    case "opencode": {
      const kind = AGENT_COMMANDS[cmd];
      st = startProgram(st, id, kind, { screen: AGENTS[kind].welcome(cwd) });
      const promptText = args.join(" ");
      return promptText ? submitToAgent(st, id, promptText) : st;
    }
    case "rex":
      return rexCli(st, id, args);
    case "vim":
    case "nvim":
    case "htop":
    case "top":
    case "ssh":
      return out(plain(`${cmd} isn't part of this demo. Type help to see what is.`, "--t-dim"));
    default:
      return out(plain(`fish: Unknown command: ${cmd}`, "--t-red"));
  }
}

/** A slice of Rex's real CLI: rex split / run / zoom / ls. */
function rexCli(st: State, id: string, args: string[]): State {
  const dash = args.indexOf("--");
  const command = dash >= 0 ? args.slice(dash + 1).join(" ") : undefined;
  const flags = dash >= 0 ? args.slice(0, dash) : args;
  const sub = flags[0];
  const out = (...rows: Row[]) => print(st, id, rows);

  if (sub === "split") {
    const i = flags.findIndex((f) => f === "--split" || f.startsWith("--split="));
    const value = i < 0 ? "right" : flags[i].includes("=") ? flags[i].split("=")[1] : flags[i + 1];
    const dir = ({ right: "right", left: "left", below: "down", above: "up" } as const)[value as "right"];
    if (!dir) return out([s(`rex: --split takes right, left, below or above`, "--t-red")]);
    return splitPane(st, id, dir, command) ?? out([s("rex: not enough room to split this pane", "--t-red")]);
  }
  if (sub === "run") return newTab(st, st.panes[id].cwd, command);
  if (sub === "zoom") {
    const tab = tabOf(st, id);
    return putTab(st, tab.id, (t) => ({ zoom: !t.zoom, focus: id }));
  }
  if (sub === "ls") {
    const rows: Row[] = [];
    for (const session of [...new Set(st.tabs.map((t) => t.session))]) {
      rows.push([s(`SESSION ${session}`, "--t-dim")]);
      st.tabs.forEach((t, i) => {
        if (t.session !== session) return;
        rows.push([s(`  window ${i + 1}  `, "--t-dim"), s(titles(st.panes[t.focus]).tab, "--t-strong", b)]);
        for (const pid of leaves(t.root)) rows.push([s("    block  ", "--t-dim"), s(titles(st.panes[pid]).pane, "--t-fg")]);
      });
    }
    return out(...rows);
  }
  return out(
    [s("Usage: rex <command>", "--t-fg")],
    [s("  split [--split right|left|below|above] [-- cmd]", "--t-dim")],
    [s("  run [-- cmd]      open a new tab", "--t-dim")],
    [s("  zoom              zoom this pane", "--t-dim")],
    [s("  ls                list windows and blocks", "--t-dim")],
  );
}

// ─── Keys ───────────────────────────────────────────────────────────────────

const printable = (k: Key) => k.key.length === 1 && !k.ctrl && !k.meta;
const ctrlC = (k: Key) => k.ctrl && k.code === "KeyC";

function editInput(st: State, id: string, k: Key): State | null {
  if (printable(k)) return put(st, id, (p) => ({ input: p.input + k.key, recall: null }));
  if (k.key === "Backspace") {
    return put(st, id, (p) => ({ input: k.alt ? p.input.replace(/\S+\s*$/, "") : p.input.slice(0, -1) }));
  }
  return null;
}

const ARROWS: Record<string, Point> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0],
  KeyK: [0, -1], KeyJ: [0, 1], KeyH: [-1, 0], KeyL: [1, 0],
};

function onKey(st: State, k: Key): State {
  const id = activeTab(st).focus;
  const p = st.panes[id];
  st = put(st, id, () => ({ follow: true }));

  switch (p.program) {
    case "shell": {
      if (ctrlC(k)) return put(print(st, id, [prompt(p.cwd, p.input, p.host)]), id, () => ({ input: "" }));
      if (k.ctrl && k.code === "KeyL") return put(st, id, () => ({ shell: [] }));
      if (k.key === "Enter") return runCommand(st, id, p.input);
      if (k.key === "ArrowUp" || k.key === "ArrowDown") {
        if (!p.history.length) return st;
        const last = p.history.length - 1;
        const at = p.recall ?? p.history.length;
        const next = k.key === "ArrowUp" ? Math.max(0, at - 1) : at + 1;
        if (next > last) return put(st, id, () => ({ recall: null, input: "" }));
        return put(st, id, () => ({ recall: next, input: p.history[next] }));
      }
      return editInput(st, id, k) ?? st;
    }
    case "bun":
      if (ctrlC(k)) return exitProgram(st, id, [[s("^C", "--t-dim")]]);
      return st;
    case "node":
    case "python": {
      const repl = REPL[p.program];
      const quit = ctrlC(k) || (k.ctrl && k.code === "KeyD");
      if (quit) return exitProgram(st, id, [[s(repl.prompt, "--t-fg"), s(p.input, "--t-fg")]]);
      if (k.key !== "Enter") return editInput(st, id, k) ?? st;
      const line = p.input;
      st = put(print(st, id, [[s(repl.prompt, "--t-fg"), s(line, "--t-fg")]]), id, () => ({ input: "", activeAt: Date.now() }));
      if (repl.exits.includes(line.trim())) return exitProgram(st, id);
      return print(st, id, repl.evaluate(line.trim()));
    }
    case "codex":
    case "claude":
    case "cursor":
    case "gemini":
    case "opencode": {
      if (ctrlC(k)) return exitProgram(st, id);
      if (k.key === "Escape" && p.busy) {
        return put(st, id, (q) => ({
          busy: 0,
          screen: [...q.screen.slice(0, -1), [s("■ Conversation interrupted", "--t-red")]],
        }));
      }
      if (k.key === "Enter") return p.input.trim() && !p.busy ? submitToAgent(st, id, p.input) : st;
      return editInput(st, id, k) ?? st;
    }
    case "lazygit":
      if (ctrlC(k) || k.key === "q" || k.key === "Escape") return exitProgram(st, id);
      return st;
    case "snake": {
      const game = p.snake!;
      if (ctrlC(k) || k.key === "q") return exitProgram(st, id);
      if (k.key === "r" || k.key === "R") {
        const { cols, rows } = gridSize(paneRect(st, id));
        return put(st, id, () => ({ snake: newSnake(cols, rows, game.seed) }));
      }
      if (k.key === " ") {
        if (game.status === "over") return st;
        return put(st, id, () => ({ snake: { ...game, status: game.status === "running" ? "paused" : "running" } }));
      }
      const d = !k.ctrl && !k.meta ? ARROWS[k.code] : undefined;
      if (d && game.status !== "over") return put(st, id, () => ({ snake: steer(game, d) }));
      return st;
    }
  }
}

// ─── Reducer ────────────────────────────────────────────────────────────────

/** Every change goes through here: the pane you end up looking at has been seen, so it stops calling for you. */
export function reducer(st: State, a: Action): State {
  const next = reduce(st, a);
  const id = activeTab(next).focus;
  return next.panes[id]?.attention ? put(next, id, () => ({ attention: undefined })) : next;
}

function reduce(st: State, a: Action): State {
  switch (a.type) {
    case "focus-attention": {
      const id = attentionTarget(st);
      if (!id) return st;
      return reduce(reduce(st, { type: "select-tab", tab: tabOf(st, id)!.id }), { type: "focus", pane: id });
    }
    case "focus": {
      const tab = tabOf(st, a.pane);
      if (!tab || tab.focus === a.pane) return st;
      return putTab(st, tab.id, () => ({ focus: a.pane }));
    }
    case "select-tab": {
      // a tab from another space (a notification, the phone) brings its space along if this one can't show it
      const tab = st.tabs.find((t) => t.id === a.tab);
      if (!tab) return st;
      const space = spaceOf(st).devices.includes(tab.device) ? st.space : st.spaces.find((sp) => sp.devices.includes(tab.device))!.id;
      return { ...st, active: a.tab, space, spaceTabs: { ...st.spaceTabs, [space]: a.tab } };
    }
    case "step-tab": {
      const shown = tabsIn(st);
      const i = shown.findIndex((t) => t.id === st.active);
      if (!shown.length) return st;
      return { ...st, active: shown[(i + a.by + shown.length) % shown.length].id };
    }
    case "space":
    case "step-space": {
      const i = st.spaces.findIndex((sp) => sp.id === st.space);
      const to = a.type === "space" ? st.spaces.find((sp) => sp.id === a.space) : st.spaces[i + a.by];
      if (!to || to.id === st.space) return st;
      // back to the tab it last showed, if that's still there, else its first
      const shown = tabsIn(st, to);
      const remembered = shown.find((t) => t.id === st.spaceTabs[to.id]);
      const keep = shown.find((t) => t.id === st.active);
      st = { ...st, space: to.id, spaceTabs: { ...st.spaceTabs, [st.space]: st.active } };
      const tab = remembered ?? keep ?? shown[0];
      return tab ? { ...st, active: tab.id } : newTab(st, "~");
    }
    case "goto-tab": {
      const tab = tabsIn(st)[a.index];
      return tab ? { ...st, active: tab.id } : st;
    }
    case "new-tab":
      return newTab({ ...st, palette: false }, st.panes[activeTab(st).focus]?.cwd ?? "~/Sites/rex-snake", a.command);
    case "close-tab":
      return closeTab(st, a.tab);
    case "split":
      return splitPane(st, a.pane ?? activeTab(st).focus, a.dir, a.command) ?? st;
    case "close-pane":
      return closePane(st, a.pane ?? activeTab(st).focus);
    case "zoom": {
      // Zooming a pane (from its own header) also focuses it: the zoomed pane is the focused one.
      const tab = activeTab(st);
      if (leaves(tab.root).length < 2) return st;
      return putTab(st, tab.id, (t) => ({ zoom: !t.zoom, focus: a.pane ?? t.focus }));
    }
    case "move-focus": {
      const tab = activeTab(st);
      if (tab.zoom) return st;
      const next = neighborOf(layout(tab.root, areaOf(st)).panes, tab.focus, a.dir);
      return next ? putTab(st, tab.id, () => ({ focus: next })) : st;
    }
    case "resize": {
      const tab = activeTab(st);
      return putTab(st, tab.id, (t) => ({ root: setRatio(t.root, a.split, a.ratio) }));
    }
    case "key":
      return onKey(st, a.key);
    case "paste": {
      const id = activeTab(st).focus;
      const p = st.panes[id];
      if (!(p.program === "shell" || p.program === "node" || p.program === "python" || isAgent(p.program))) return st;
      return put(st, id, () => ({ input: p.input + a.text.split("\n")[0], follow: true }));
    }
    case "clear": {
      const id = activeTab(st).focus;
      return put(st, id, (p) => (p.program === "shell" || p.program === "bun" || p.program === "node" || p.program === "python" ? { shell: [] } : isAgent(p.program) ? { screen: [] } : {}));
    }
    case "launch": {
      // Run in the focused pane if it's an idle shell, else beside it (or in
      // a new tab when there's no room), cd-ing into the project first.
      st = { ...st, palette: false };
      const id = activeTab(st).focus;
      const p = st.panes[id];
      if (!(p.program === "shell" && !p.input)) {
        st = splitPane(st, id, "right") ?? splitPane(st, id, "down") ?? newTab(st, p.cwd);
      }
      const target = activeTab(st).focus;
      if (a.cwd && st.panes[target].cwd.toLowerCase() !== a.cwd.toLowerCase()) {
        st = runCommand(st, target, `cd ${a.cwd}`);
      }
      return runCommand(st, target, a.command);
    }
    case "done": {
      const p = st.panes[a.pane];
      if (!p?.busy) return st;
      const now = Date.now();
      if (p.program === "bun") {
        return put(print(st, a.pane, [[s(" ✓ ", "--t-green"), s("Ready in 812ms", "--t-fg")]]), a.pane, () => ({
          busy: 0,
          activeAt: now,
          attention: { kind: "done", at: now },
        }));
      }
      if (isAgent(p.program)) {
        const agent = AGENTS[p.program];
        return put(st, a.pane, (q) => ({
          busy: 0,
          activeAt: now,
          screen: [...q.screen.slice(0, -1), ...agent.reply(), ...(agent.ask?.() ?? [])],
          attention: { kind: agent.ask ? "input" : "done", at: now },
        }));
      }
      return put(st, a.pane, () => ({ busy: 0, activeAt: now, attention: { kind: "done", at: now } }));
    }
    case "tick": {
      const p = st.panes[a.pane];
      return p?.snake ? put(st, a.pane, () => ({ snake: tickSnake(p.snake!) })) : st;
    }
    case "palette":
      return { ...st, palette: a.open };
    case "window-size":
      return st.size.w === a.w && st.size.h === a.h ? st : { ...st, size: { w: a.w, h: a.h } };
    case "toggle-sidebar":
      return { ...st, view: st.view === "sidebar" ? "tabs" : "sidebar" };
    case "toggle-activity":
      // Activity lives in the sidebar, so turning it on shows the sidebar.
      return st.activity ? { ...st, activity: false } : { ...st, activity: true, view: "sidebar" };
  }
}

// ─── The opening frame: the reference screenshot ────────────────────────────

const BUN_LOG: Row[] = [
  prompt("~/sites/announcements", "bun dev"),
  [s("$ ", "--t-dim"), s("next dev --turbopack", "--t-fg")],
  [s("   ▲ Next.js 16.4.2", "--t-strong", b), s(" (Turbopack)", "--t-dim")],
  [s("   - Local:        ", "--t-fg"), s("http://localhost:3000", "--t-blue")],
  [],
  [s(" ✓ ", "--t-green"), s("Starting...", "--t-fg")],
  [s(" ✓ ", "--t-green"), s("Ready in 812ms", "--t-fg")],
  [s(" GET ", "--t-fg"), s("/", "--t-fg"), s(" 200", "--t-green"), s(" in 412ms", "--t-dim")],
];

// Devices and spaces aren't in the reference: Rex connects to more than this
// Mac, so these seed a few servers and spaces that mix them.
const DEVICES: Record<string, Device> = {
  mac: { id: "mac", name: "Mac Studio", host: "Mac-Studio", address: "This Mac", remote: false },
  devbox: { id: "devbox", name: "devbox", host: "devbox", address: "Hetzner", remote: true },
  staging: { id: "staging", name: "staging-eu", host: "staging-eu", address: "AWS eu-west-1", remote: true },
  build: { id: "build", name: "build-01", host: "build-01", address: "Tailscale", remote: true },
  pi: { id: "pi", name: "Raspberry Pi", host: "raspberrypi", address: "raspberrypi.local", remote: true },
  nas: { id: "nas", name: "nas", host: "nas", address: "nas.local", remote: true },
};
// devbox sits in two spaces: a device belongs to as many as you like
const SPACES: Space[] = [
  { id: "personal", name: "Personal", devices: ["mac", "devbox"] },
  { id: "work", name: "Work", devices: ["staging", "build"], tint: "#ff8a00" },
  { id: "homelab", name: "Homelab", devices: ["pi", "nas", "devbox"], tint: "#2fbf5b" },
];

const API_LOG: Row[] = [
  prompt("~/srv/api", "journalctl -fu api", "devbox"),
  [s("Oct 21 09:14:02 devbox api[812]: ", "--t-dim"), s("listening on :8080", "--t-fg")],
  [s("Oct 21 09:14:09 devbox api[812]: ", "--t-dim"), s("POST /v1/runs ", "--t-fg"), s("201", "--t-green"), s(" 38ms", "--t-dim")],
  [s("Oct 21 09:14:11 devbox api[812]: ", "--t-dim"), s("GET /v1/runs/482 ", "--t-fg"), s("200", "--t-green"), s(" 4ms", "--t-dim")],
  [s("Oct 21 09:15:47 devbox api[812]: ", "--t-dim"), s("POST /v1/runs ", "--t-fg"), s("429", "--t-gold"), s(" 1ms", "--t-dim")],
];

const DOCKER_PS: Row[] = [
  prompt("~", "docker ps --format '{{.Names}}  {{.Status}}'", "raspberrypi"),
  [s("homeassistant  ", "--t-fg"), s("Up 12 days", "--t-green")],
  [s("zigbee2mqtt    ", "--t-fg"), s("Up 12 days", "--t-green")],
  [s("mosquitto      ", "--t-fg"), s("Up 12 days", "--t-green")],
];

const PODS: Row[] = [
  prompt("~/gateway", "kubectl get pods -l app=gateway", "staging-eu"),
  [s("NAME                       READY   STATUS             RESTARTS", "--t-dim")],
  [s("gateway-7d9f8c6b5d-2xkqp   1/1     ", "--t-fg"), s("Running", "--t-green"), s("            0", "--t-fg")],
  [s("gateway-7d9f8c6b5d-8hj4m   0/1     ", "--t-fg"), s("CrashLoopBackOff", "--t-red"), s("   14", "--t-fg")],
  [s("gateway-7d9f8c6b5d-qw9tn   1/1     ", "--t-fg"), s("Running", "--t-green"), s("            0", "--t-fg")],
];

const MIGRATION_REPL: Row[] = [
  prompt("~/migrations", "python3", "staging-eu"),
  ...REPL.python.banner,
  [s(">>> ", "--t-fg"), s("rows_before - rows_after", "--t-fg")],
  [s("0", "--t-fg")],
];

const RELEASE: Row[] = [
  prompt("~/release", "./release.sh v2.14.0 --dry-run", "build-01"),
  [s("→ ", "--t-blue"), s("tagging v2.14.0 (dry run)", "--t-fg")],
  [s("→ ", "--t-blue"), s("building darwin-arm64, linux-amd64, linux-arm64", "--t-fg")],
  [s(" ✓ ", "--t-green"), s("3 artifacts, 41.2 MB", "--t-fg")],
  [s(" ✓ ", "--t-green"), s("changelog: 12 entries since v2.13.2", "--t-fg")],
];

const SNAPSHOTS: Row[] = [
  prompt("~/backups", "restic snapshots --latest 3", "nas"),
  [s("ID        Time                 Host         Paths", "--t-dim")],
  [s("4f1c2a9e  ", "--t-gold"), s("2026-10-19 03:00:12  Mac-Studio   /Users/alan", "--t-fg")],
  [s("b83d07f1  ", "--t-gold"), s("2026-10-20 03:00:09  Mac-Studio   /Users/alan", "--t-fg")],
  [s("e2a6c514  ", "--t-gold"), s("2026-10-21 03:00:11  Mac-Studio   /Users/alan", "--t-fg")],
];

const DISKS: Row[] = [
  prompt("~/media", "df -h /volume1", "nas"),
  [s("Filesystem      Size  Used Avail Use% Mounted on", "--t-dim")],
  [s("/dev/md2         11T  7.9T  3.1T  ", "--t-fg"), s("72%", "--t-gold"), s(" /volume1", "--t-fg")],
];

export function initialState(): State {
  const snakeCwd = "~/Sites/rex-snake";
  const ago = (minutes: number) => Date.now() - minutes * 60_000;
  const panes: Record<string, Pane> = {
    p1: makePane("p1", snakeCwd, {
      program: "codex",
      task: "Stress-test Snake demo",
      screen: AGENT,
      shell: [prompt(snakeCwd, "codex")],
      follow: false,
      activeAt: ago(4),
    }),
    p2: makePane("p2", snakeCwd, { program: "lazygit", shell: [prompt(snakeCwd, "lazygit")], follow: false, activeAt: ago(9) }),
    p3: makePane("p3", snakeCwd, {
      program: "snake",
      snake: INITIAL_SNAKE,
      shell: [prompt(snakeCwd, "node demo/snake.mjs")],
      follow: false,
      activeAt: ago(2),
    }),
    p4: makePane("p4", "~/sites/announcements", { program: "bun", shell: BUN_LOG, activeAt: ago(12) }),
    p5: makePane("p5", "~/sites/announcements"),
    p6: makePane("p6", "~/sites/macos-client-ui"),
    p7: makePane("p7", "~/sites/macos-client-ui", {
      program: "claude",
      screen: claudeWelcome("~/sites/macos-client-ui"),
      shell: [prompt("~/sites/macos-client-ui", "claude")],
      activeAt: ago(26),
    }),
    // devbox
    p8: makePane("p8", "~/srv/api", {
      host: "devbox",
      program: "claude",
      task: "Rate-limit POST /v1/runs",
      screen: [...claudeWelcome("~/srv/api"), [], AGENTS.claude.said("rate-limit POST /v1/runs per API key"), [], ...AGENTS.claude.reply()],
      shell: [prompt("~/srv/api", "claude", "devbox")],
      follow: false,
      activeAt: ago(7),
    }),
    p9: makePane("p9", "~/srv/api", { host: "devbox", shell: API_LOG, activeAt: ago(1) }),
    p10: makePane("p10", "~/srv/caddy", { host: "devbox", activeAt: ago(180) }),
    // build-01
    p11: makePane("p11", "~/runner", {
      host: "build-01",
      program: "codex",
      task: "Fix flaky macOS e2e job",
      screen: [...codexWelcome("~/runner"), [], AGENTS.codex.said("fix the flaky macOS e2e job"), [], ...AGENTS.codex.reply()],
      shell: [prompt("~/runner", "codex", "build-01")],
      follow: false,
      activeAt: ago(31),
    }),
    p12: makePane("p12", "~/runner", { host: "build-01", activeAt: ago(55) }),
    p14: makePane("p14", "~/release", { host: "build-01", shell: RELEASE, activeAt: ago(18) }),
    // staging-eu
    p15: makePane("p15", "~/gateway", {
      host: "staging-eu",
      program: "gemini",
      task: "Trace the 502s",
      screen: [...geminiWelcome("~/gateway"), [], AGENTS.gemini.said("find the source of the 502s on /checkout"), [], ...AGENTS.gemini.reply()],
      shell: [prompt("~/gateway", "gemini", "staging-eu")],
      follow: false,
      activeAt: ago(3),
    }),
    p16: makePane("p16", "~/gateway", { host: "staging-eu", shell: PODS, activeAt: ago(3) }),
    p17: makePane("p17", "~/migrations", { host: "staging-eu", program: "python", shell: MIGRATION_REPL, activeAt: ago(22) }),
    // Raspberry Pi
    p13: makePane("p13", "~", { host: "raspberrypi", shell: DOCKER_PS, activeAt: ago(300) }),
    p18: makePane("p18", "~/zigbee", {
      host: "raspberrypi",
      program: "opencode",
      task: "Pair hallway sensor",
      screen: [...opencodeWelcome("~/zigbee"), [], AGENTS.opencode.said("pair the hallway motion sensor"), [], ...AGENTS.opencode.reply()],
      shell: [prompt("~/zigbee", "opencode", "raspberrypi")],
      follow: false,
      activeAt: ago(48),
    }),
    // nas
    p19: makePane("p19", "~/backups", { host: "nas", shell: SNAPSHOTS, activeAt: ago(95) }),
    p20: makePane("p20", "~/media", { host: "nas", shell: DISKS, activeAt: ago(240) }),
  };
  const leaf = (id: string): Node => ({ kind: "pane", id });
  return {
    tabs: [
      {
        id: "t1",
        // Ratios reproduce the reference: a 533.5pt left column whose top pane is 236pt.
        root: {
          kind: "split", id: "s1", dir: "right", ratio: 533.5 / (AREA.w - GAP.x),
          a: { kind: "split", id: "s2", dir: "down", ratio: 236 / (AREA.h - GAP.y), a: leaf("p1"), b: leaf("p2") },
          b: leaf("p3"),
        },
        device: "mac",
        session: "rex-snake",
        focus: "p1",
        zoom: false,
      },
      { id: "t2", device: "mac", session: "announcements", root: { kind: "split", id: "s3", dir: "right", ratio: 0.58, a: leaf("p4"), b: leaf("p5") }, focus: "p4", zoom: false },
      { id: "t3", device: "mac", session: "macos-client-ui", root: { kind: "split", id: "s4", dir: "right", ratio: 0.5, a: leaf("p6"), b: leaf("p7") }, focus: "p6", zoom: false },
      { id: "t4", device: "devbox", session: "api", root: { kind: "split", id: "s5", dir: "right", ratio: 0.55, a: leaf("p8"), b: leaf("p9") }, focus: "p8", zoom: false },
      { id: "t5", device: "devbox", session: "caddy", root: leaf("p10"), focus: "p10", zoom: false },
      { id: "t6", device: "build", session: "runner", root: { kind: "split", id: "s6", dir: "right", ratio: 0.55, a: leaf("p11"), b: leaf("p12") }, focus: "p11", zoom: false },
      { id: "t8", device: "build", session: "release", root: leaf("p14"), focus: "p14", zoom: false },
      { id: "t9", device: "staging", session: "gateway", root: { kind: "split", id: "s7", dir: "right", ratio: 0.55, a: leaf("p15"), b: leaf("p16") }, focus: "p15", zoom: false },
      { id: "t10", device: "staging", session: "migrations", root: leaf("p17"), focus: "p17", zoom: false },
      { id: "t7", device: "pi", session: "home-assistant", root: leaf("p13"), focus: "p13", zoom: false },
      { id: "t11", device: "pi", session: "zigbee", root: leaf("p18"), focus: "p18", zoom: false },
      { id: "t12", device: "nas", session: "backups", root: leaf("p19"), focus: "p19", zoom: false },
      { id: "t13", device: "nas", session: "media", root: leaf("p20"), focus: "p20", zoom: false },
    ],
    active: "t1",
    devices: DEVICES,
    spaces: SPACES,
    space: "personal",
    spaceTabs: {},
    panes,
    size: WINDOW,
    view: "tabs",
    activity: false,
    palette: false,
    seq: 30,
  };
}
