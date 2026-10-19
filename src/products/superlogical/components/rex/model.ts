// Rex's workspace as a pure state machine, following Rex's own taxonomy: a
// session holds tabs (Rex calls them windows), each tab is a tiling tree of
// panes (blocks), and each pane runs a program. Titles, header icons and tab
// chips are all derived from what a pane is running.
import { AGENT, GIT } from "./content";
import { INITIAL_SNAKE, newSnake, type Point, type SnakeState, snakeRows, steer, tickSnake } from "./snake";
import { cursor, type Row, s } from "./terminal";

export type ProgramKind = "shell" | "codex" | "claude" | "lazygit" | "snake" | "bun";
export type Dir = "right" | "down";
export type SplitDir = Dir | "left" | "up";
export type Node =
  | { kind: "pane"; id: string }
  | { kind: "split"; id: string; dir: Dir; ratio: number; a: Node; b: Node };
export type Rect = { x: number; y: number; w: number; h: number };

export type Pane = {
  id: string;
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
  snake?: SnakeState;
};

export type Tab = { id: string; session: string; root: Node; focus: string; zoom: boolean };
export type State = {
  /** Rex shows tabs either as a strip in the title bar or in a sidebar */
  view: "tabs" | "sidebar";
  /** Activity Mode: the sidebar lists only running programs, with their status */
  activity: boolean;
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
  | { type: "split"; dir: SplitDir; command?: string }
  | { type: "close-pane"; pane?: string }
  | { type: "zoom" }
  | { type: "move-focus"; dir: "left" | "right" | "up" | "down" }
  | { type: "resize"; split: string; ratio: number }
  | { type: "key"; key: Key }
  | { type: "paste"; text: string }
  | { type: "clear" }
  | { type: "launch"; command: string; cwd?: string }
  | { type: "done"; pane: string }
  | { type: "tick"; pane: string }
  | { type: "palette"; open: boolean }
  | { type: "toggle-sidebar" }
  | { type: "toggle-activity" };

// ─── Geometry (window-relative px, measured from the reference) ────────────

/** The area panes tile into: 8pt inset, below the 44pt title bar. */
export const AREA: Rect = { x: 8, y: 44, w: 984.5, h: 553 };
/** With the sidebar, panes start right of it and run up to the top edge. */
export const SIDEBAR_W = 248;
export const SIDEBAR_AREA: Rect = { x: SIDEBAR_W, y: 8, w: AREA.x + AREA.w - SIDEBAR_W, h: AREA.y + AREA.h - 8 };
export const areaOf = (st: Pick<State, "view">) => (st.view === "sidebar" ? SIDEBAR_AREA : AREA);
export const GAP = { x: 8, y: 7.5 };
/** First terminal row is centered 43pt below the pane top; column 0 sits 9pt in. */
export const TERM = { top: 43 - 15.15 / 2 + 0.75, left: 9, line: 15.15, cell: 7.1 };
const MIN = { w: 170, h: 90 };

export const gridSize = (r: Rect) => ({
  cols: Math.floor((r.w - TERM.left * 2) / TERM.cell),
  rows: Math.floor((r.h - TERM.top - 4) / TERM.line),
});

export type Divider = { split: string; dir: Dir; rect: Rect; parent: Rect };

export function layout(
  node: Node,
  r: Rect = AREA,
  out: { panes: Record<string, Rect>; dividers: Divider[] } = { panes: {}, dividers: [] },
) {
  if (node.kind === "pane") {
    out.panes[node.id] = r;
    return out;
  }
  if (node.dir === "right") {
    const avail = r.w - GAP.x;
    const aw = avail * node.ratio;
    layout(node.a, { ...r, w: aw }, out);
    layout(node.b, { x: r.x + aw + GAP.x, y: r.y, w: avail - aw, h: r.h }, out);
    out.dividers.push({ split: node.id, dir: "right", rect: { x: r.x + aw, y: r.y, w: GAP.x, h: r.h }, parent: r });
  } else {
    const avail = r.h - GAP.y;
    const ah = avail * node.ratio;
    layout(node.a, { ...r, h: ah }, out);
    layout(node.b, { x: r.x, y: r.y + ah + GAP.y, w: r.w, h: avail - ah }, out);
    out.dividers.push({ split: node.id, dir: "down", rect: { x: r.x, y: r.y + ah, w: r.w, h: GAP.y }, parent: r });
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

export const activeTab = (st: State) => st.tabs.find((t) => t.id === st.active)!;
const tabOf = (st: State, pane: string) => st.tabs.find((t) => leaves(t.root).includes(pane))!;

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
    case "claude": {
      if (p.task) return { pane: `${p.task} | ${basename(p.cwd)}`, tab: p.task };
      return both(`${p.program === "codex" ? "Codex" : "Claude Code"} ${p.cwd}`);
    }
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

const prompt = (cwd: string, text?: string): Row => [
  s("alan", "--t-green"),
  s("@Mac-Studio ", "--t-fg"),
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

const WORKING: Record<"codex" | "claude", Row> = {
  codex: [s("• ", "--t-bullet"), s("Working", "--t-strong", b), s(" (esc to interrupt)", "--t-dim")],
  claude: [s("✻ ", "--t-claude"), s("Thinking…", "--t-claude"), s(" (esc to interrupt)", "--t-dim")],
};

// No model sits behind these panes. The replies say so, and point at what
// does work in the demo.
const REPLY = [
  "This is a Rex demo, so there's no model behind this pane.",
  "Everything around it is wired up, though: split this pane with",
  "Cmd+D, zoom it with Cmd+E, or open the command palette with",
  "Shift+Cmd+P and start lazygit or snake next to me.",
];

function agentReply(kind: "codex" | "claude"): Row[] {
  if (kind === "codex") {
    return [
      [s("• ", "--t-bullet-dim"), s("Explored", "--t-strong", b)],
      [s("  └ List ", "--t-dim"), s("ls", "--t-blue")],
      [],
      ...REPLY.map((line, i): Row => [s(i === 0 ? "• " : "  ", "--t-bullet"), s(line, "--t-fg")]),
    ];
  }
  return [
    [s("● ", "--t-green"), s("Bash", "--t-strong", b), s("(ls)", "--t-fg")],
    [s("  └  ", "--t-dim"), s("README.md  Package.swift  Sources  Tests", "--t-dim")],
    [],
    ...REPLY.map((line, i): Row => [s(i === 0 ? "● " : "  ", "--t-fg"), s(line, "--t-fg")]),
  ];
}

export type Activity = { label: string; working: boolean; at: number };

/** What Activity Mode reports for a pane (Rex gets this from OSC 7501); null for an idle shell. */
export function activityOf(p: Pane): Activity | null {
  const at = p.activeAt;
  switch (p.program) {
    case "codex":
    case "claude":
      if (p.busy) return { label: "Working", working: true, at };
      return { label: p.task ? "Done" : "Waiting for a prompt", working: false, at };
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
      return [...p.shell, [...prompt(p.cwd), s(p.input, "--t-fg"), cursor()]];
    case "bun":
      return [...p.shell, [cursor()]];
    case "codex": {
      const hint = p.input ? [] : [s("Ask Codex to do anything", "--t-dim")];
      return [...p.screen, [], [s("› ", "--t-strong", b), s(p.input, "--t-fg"), cursor(), ...hint]];
    }
    case "claude": {
      const w = Math.max(20, Math.min(cols, 80));
      const field = box([[s("> ", "--t-fg"), s(p.input, "--t-fg"), cursor()]], w, "--t-dim");
      return [...p.screen, [], ...field, [s("  ? for shortcuts", "--t-dim")]];
    }
    case "lazygit":
      return GIT;
    case "snake":
      return snakeRows(p.snake!);
  }
}

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
  [s("  codex, claude", "--t-green"), s("        start a coding agent", "--t-dim")],
  [s("  lazygit", "--t-green"), s("              browse the changes (in rex-snake)", "--t-dim")],
  [s("  node demo/snake.mjs", "--t-green"), s("  play snake (in ~/Sites/rex-snake)", "--t-dim")],
  [s("  bun dev", "--t-green"), s("              start a dev server (in announcements)", "--t-dim")],
  [s("  rex split", "--t-green"), s(" [--split below] [-- cmd]  split this pane", "--t-dim")],
  [s("  rex run", "--t-green"), s(" [-- cmd]  open a tab    ", "--t-dim"), s("rex ls", "--t-green"), s("  list tabs", "--t-dim")],
  [s("  ls, cd, pwd, git status, clear, exit", "--t-green")],
  [s("Cmd+D split · Shift+Cmd+D split down · Cmd+E zoom · Ctrl+C stop", "--t-dim")],
  [s("Shift+Cmd+P opens the command palette", "--t-dim")],
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

function newTab(st: State, cwd: string, command?: string): State {
  let tabId: string, paneId: string;
  [tabId, st] = nextId(st, "t");
  [paneId, st] = nextId(st, "p");
  st = {
    ...st,
    tabs: [
      ...st.tabs,
      { id: tabId, session: activeTab(st)?.session ?? "rex-snake", root: { kind: "pane", id: paneId }, focus: paneId, zoom: false },
    ],
    active: tabId,
    panes: { ...st.panes, [paneId]: makePane(paneId, cwd) },
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
  st = { ...st, panes: { ...st.panes, [paneId]: makePane(paneId, st.panes[pane].cwd, { shell: [] }) } };
  return command ? runCommand(st, paneId, command) : st;
}

function closeTab(st: State, tabId: string): State {
  const index = st.tabs.findIndex((t) => t.id === tabId);
  const gone = new Set(leaves(st.tabs[index].root));
  const tabs = st.tabs.filter((t) => t.id !== tabId);
  const panes = Object.fromEntries(Object.entries(st.panes).filter(([id]) => !gone.has(id)));
  st = { ...st, tabs, panes };
  if (!tabs.length) return newTab(st, "~/Sites/rex-snake");
  if (st.active === tabId) st = { ...st, active: tabs[Math.min(index, tabs.length - 1)].id };
  return st;
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
  const kind = p.program as "codex" | "claude";
  const said: Row = kind === "codex" ? [s("› ", "--t-dim"), s(text, "--t-fg")] : [s("> ", "--t-dim"), s(text, "--t-dim")];
  return put(st, id, () => ({
    screen: [...p.screen, [], said, [], WORKING[kind]],
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
  st = put(st, id, (q) => ({ shell: [...q.shell, prompt(q.cwd, line)], input: "", recall: null, history, follow: true }));
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
    case "node": {
      const file = args[0];
      if (!file) return out(plain("The Node REPL isn't part of this demo. Try: node demo/snake.mjs", "--t-dim"));
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
    case "claude": {
      st = startProgram(st, id, cmd, { screen: cmd === "codex" ? codexWelcome(cwd) : claudeWelcome(cwd) });
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
      if (ctrlC(k)) return put(print(st, id, [prompt(p.cwd, p.input)]), id, () => ({ input: "" }));
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
    case "codex":
    case "claude": {
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

export function reducer(st: State, a: Action): State {
  switch (a.type) {
    case "focus": {
      const tab = tabOf(st, a.pane);
      if (!tab || tab.focus === a.pane) return st;
      return putTab(st, tab.id, () => ({ focus: a.pane }));
    }
    case "select-tab":
      return { ...st, active: a.tab };
    case "goto-tab":
      return st.tabs[a.index] ? { ...st, active: st.tabs[a.index].id } : st;
    case "new-tab":
      return newTab({ ...st, palette: false }, st.panes[activeTab(st).focus]?.cwd ?? "~/Sites/rex-snake", a.command);
    case "close-tab":
      return closeTab(st, a.tab);
    case "split":
      return splitPane(st, activeTab(st).focus, a.dir, a.command) ?? st;
    case "close-pane":
      return closePane(st, a.pane ?? activeTab(st).focus);
    case "zoom": {
      const tab = activeTab(st);
      return leaves(tab.root).length > 1 ? putTab(st, tab.id, (t) => ({ zoom: !t.zoom })) : st;
    }
    case "move-focus": {
      const tab = activeTab(st);
      if (tab.zoom) return st;
      const rects = layout(tab.root, areaOf(st)).panes;
      const from = rects[tab.focus];
      const cx = from.x + from.w / 2;
      const cy = from.y + from.h / 2;
      let best: [string, number] | null = null;
      for (const [id, r] of Object.entries(rects)) {
        if (id === tab.focus) continue;
        const ok =
          a.dir === "left" ? r.x + r.w <= from.x + 1 :
          a.dir === "right" ? r.x >= from.x + from.w - 1 :
          a.dir === "up" ? r.y + r.h <= from.y + 1 :
          r.y >= from.y + from.h - 1;
        if (!ok) continue;
        const dx = r.x + r.w / 2 - cx;
        const dy = r.y + r.h / 2 - cy;
        const score = a.dir === "left" || a.dir === "right" ? Math.abs(dx) + Math.abs(dy) * 2 : Math.abs(dy) + Math.abs(dx) * 2;
        if (!best || score < best[1]) best = [id, score];
      }
      return best ? putTab(st, tab.id, () => ({ focus: best[0] })) : st;
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
      if (!["shell", "codex", "claude"].includes(p.program)) return st;
      return put(st, id, () => ({ input: p.input + a.text.split("\n")[0], follow: true }));
    }
    case "clear": {
      const id = activeTab(st).focus;
      return put(st, id, (p) => (p.program === "shell" || p.program === "bun" ? { shell: [] } : p.program === "codex" || p.program === "claude" ? { screen: [] } : {}));
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
        return put(print(st, a.pane, [[s(" ✓ ", "--t-green"), s("Ready in 812ms", "--t-fg")]]), a.pane, () => ({ busy: 0, activeAt: now }));
      }
      if (p.program === "codex" || p.program === "claude") {
        return put(st, a.pane, (q) => ({
          busy: 0,
          activeAt: now,
          screen: [...q.screen.slice(0, -1), ...agentReply(p.program as "codex")],
        }));
      }
      return put(st, a.pane, () => ({ busy: 0, activeAt: now }));
    }
    case "tick": {
      const p = st.panes[a.pane];
      return p?.snake ? put(st, a.pane, () => ({ snake: tickSnake(p.snake!) })) : st;
    }
    case "palette":
      return { ...st, palette: a.open };
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
        session: "rex-snake",
        focus: "p1",
        zoom: false,
      },
      { id: "t2", session: "announcements", root: { kind: "split", id: "s3", dir: "right", ratio: 0.58, a: leaf("p4"), b: leaf("p5") }, focus: "p4", zoom: false },
      { id: "t3", session: "macos-client-ui", root: { kind: "split", id: "s4", dir: "right", ratio: 0.5, a: leaf("p6"), b: leaf("p7") }, focus: "p6", zoom: false },
    ],
    active: "t1",
    panes,
    view: "tabs",
    activity: false,
    palette: false,
    seq: 10,
  };
}
