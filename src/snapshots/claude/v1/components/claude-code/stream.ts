"use client";

import { useEffect, useRef, useState } from "react";
import type { Block, DiffLine, Run, Task } from "./conversation";

// The turn in progress. The session opens on the transcript with its
// latest turn still running: these steps play from page load, so text
// streams in, tool calls run (a shimmering "Running…" row that settles into
// its summary), the task list ticks over and the token count climbs. When
// the script runs out the turn keeps working, cycling what it says it's
// doing. With reduced motion the whole script is shown at once.

type Step =
  /** stream a paragraph or list in, about CHARS_PER_TICK characters at a time */
  | { kind: "write"; block: Extract<Block, { kind: "text" | "list" }>; working?: string }
  /** a tool call: its live label for `ms`, then the summary it settles into */
  | { kind: "tool"; live: string; ms: number; done: Extract<Block, { kind: "tools" }> }
  /** the task list's statuses, in order */
  | { kind: "tasks"; statuses: Task["status"][] }
  | { kind: "images"; srcs: string[] }
  | { kind: "pause"; ms: number; working?: string };

const IMG = "/snapshots/claude/v1/transcript";
const TICK_MS = 33;
const CHARS_PER_TICK = 3;
/** tokens the turn spends per second while it works */
const TOKENS_PER_S = 410;

const TOOL_CALLS_EDIT: DiffLine[] = [
  { n: 56, kind: "ctx", text: "/** One Bash call: the tool's name, the command on a dark band, and its output. */" },
  { n: 57, kind: "ctx", text: "export function BashCard({ command, output }: { command: string; output: string }) {" },
  { n: 58, kind: "ctx", text: "  return (" },
  { n: 59, kind: "ctx", text: '    <div className="overflow-hidden rounded-[8px] text-[13px]" style={RIM}>' },
  { n: 60, kind: "del", text: '      <div className="flex items-start gap-[8px] px-[12px] py-[6px]" style={{ background: "var(--cc-code-band)" }}>' },
  { n: 60, kind: "add", text: "      {/* the command sits on a rounded band inset 7pt in the card */}" },
  {
    n: 61,
    kind: "add",
    text: '      <div className="mx-[7px] flex items-start gap-[8px] rounded-[6px] py-[6px] pr-[5px] pl-[8px]" style={{ background: "var(--cc-code-band)" }}>',
  },
  { n: 62, kind: "ctx", text: '        <pre className="min-w-0 flex-1 whitespace-pre-wrap" style={MONO}>' },
];

export const STEPS: Step[] = [
  { kind: "pause", ms: 900, working: "Thinking" },
  {
    kind: "tool",
    live: "Running a command",
    ms: 2200,
    done: {
      kind: "tools",
      runs: ["Ran a command"],
      calls: [{ kind: "bash", command: "for t in 1 5 17 22.5 45.5 48; do ffmpeg -ss $t -i rec.mov -frames:v 1 full/f_$t.png; done", output: "" }],
    },
  },
  { kind: "tasks", statuses: ["completed", "in_progress", "pending", "pending", "pending"] },
  {
    kind: "write",
    working: "Cataloging components",
    block: { kind: "text", runs: ["The recording shows seven kinds of block in the transcript, beyond the prose and the bubble we already had:"] },
  },
  {
    kind: "write",
    block: {
      kind: "list",
      items: [
        [{ strong: "Tool groups" }, " that open into one row per call, and a single call that opens straight into its card."],
        [{ strong: "Bash cards:" }, " the command on a dark band with violet commands and green strings, then the output."],
        [{ strong: "Edits:" }, " a ", { code: "+2 −1" }, " pill on the row, and a diff with line numbers on green and red."],
        [{ strong: "Images" }, " as thumbnails and large previews, with a full-window viewer."],
      ],
    },
  },
  {
    kind: "tool",
    live: "Reading 3 files",
    ms: 1800,
    done: {
      kind: "tools",
      runs: ["Read 3 files"],
      thumbnails: [`${IMG}/model-menu.webp`, `${IMG}/account-menu.webp`, `${IMG}/window-edge.webp`],
      calls: [
        { kind: "read", file: "f_17.png", image: `${IMG}/model-menu.webp` },
        { kind: "read", file: "f_45.5.png", image: `${IMG}/account-menu.webp` },
        { kind: "read", file: "f_48.png", image: `${IMG}/window-edge.webp` },
      ],
    },
  },
  { kind: "tasks", statuses: ["completed", "completed", "in_progress", "pending", "pending"] },
  {
    kind: "write",
    working: "Measuring the Bash card",
    block: {
      kind: "text",
      runs: [
        "Measured the Bash card: a 1pt ",
        { code: "#282828" },
        " rim, a 36pt header, and the command on ",
        { code: "#0a0a0a" },
        " inset 7pt from the card’s edges. Added lines sit on ",
        { code: "#1a2918" },
        ", removed on ",
        { code: "#311719" },
        ".",
      ],
    },
  },
  {
    kind: "tool",
    live: "Editing tool-calls.tsx",
    ms: 2400,
    done: {
      kind: "tools",
      runs: ["Edited ", { strong: "tool-calls.tsx" }],
      added: 3,
      removed: 1,
      calls: [
        {
          kind: "edit",
          file: "tool-calls.tsx",
          path: "/Users/alan/Dev/alanisavailable/src/snapshots/claude/v1/components/claude-code/tool-calls.tsx",
          added: 3,
          removed: 1,
          lines: TOOL_CALLS_EDIT,
        },
      ],
    },
  },
  { kind: "tasks", statuses: ["completed", "completed", "completed", "in_progress", "pending"] },
  {
    kind: "tool",
    live: "Running 2 commands",
    ms: 3200,
    done: {
      kind: "tools",
      runs: ["Ran 2 commands"],
      calls: [
        { kind: "bash", command: "npx tsc --noEmit -p .", output: "" },
        { kind: "bash", command: "npx eslint src/products/claude", output: "" },
      ],
    },
  },
  {
    kind: "write",
    working: "Comparing against the recording",
    block: { kind: "text", runs: ["Typecheck and lint pass. Rendering each component next to its frame from the recording."] },
  },
  { kind: "images", srcs: [`${IMG}/model-menu.webp`, `${IMG}/replica-desktop.webp`] },
  { kind: "tasks", statuses: ["completed", "completed", "completed", "completed", "in_progress"] },
  {
    kind: "tool",
    live: "Running a command",
    ms: 2600,
    done: {
      kind: "tools",
      runs: ["Ran a command, read ", { strong: "transcript-components.png" }],
      thumbnails: [`${IMG}/replica-desktop.webp`],
      calls: [
        { kind: "bash", command: "python3 -I sheet.py --pairs bash,diff,group,footer", output: "wrote out/transcript-components.png (2004×1980)" },
        { kind: "read", file: "transcript-components.png", image: `${IMG}/replica-desktop.webp` },
      ],
    },
  },
];

/** What the turn says it's doing once the script has run out, in turn. */
const IDLE_LABELS = ["Comparing against the recording", "Measuring the diff card", "Checking the image viewer", "Thinking"];
const IDLE_MS = 5200;

/** The first n characters of a paragraph's runs (code and links stream as text too). */
function sliceRuns(runs: Run[], n: number): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    if (n <= 0) break;
    if (typeof r === "string") {
      out.push(r.slice(0, n));
      n -= r.length;
      continue;
    }
    const [key, text] = Object.entries(r)[0] as [string, string];
    out.push({ [key]: text.slice(0, n) } as Run);
    n -= text.length;
  }
  return out;
}

const runsLength = (runs: Run[]) => runs.reduce((n, r) => n + (typeof r === "string" ? r.length : Object.values(r)[0].length), 0);

function partial(block: Extract<Block, { kind: "text" | "list" }>, n: number): Block {
  if (block.kind === "text") return { ...block, runs: sliceRuns(block.runs, n) };
  const items: Run[][] = [];
  for (const item of block.items) {
    if (n <= 0) break;
    items.push(sliceRuns(item, n));
    n -= runsLength(item);
  }
  return { ...block, items };
}

const blockLength = (b: Extract<Block, { kind: "text" | "list" }>) => (b.kind === "text" ? runsLength(b.runs) : b.items.reduce((n, i) => n + runsLength(i), 0));

type State = { step: number; chars: number; blocks: Block[]; statuses: Task["status"][] | null; label: string; done: boolean };

function apply(s: State, step: Step): State {
  switch (step.kind) {
    case "write":
      return { ...s, blocks: [...s.blocks, step.block], label: step.working ?? s.label };
    case "tool":
      // the call is done; until the next step says otherwise, Claude is thinking
      return { ...s, blocks: [...s.blocks, step.done], label: "Thinking" };
    case "tasks":
      return { ...s, statuses: step.statuses };
    case "images":
      return { ...s, blocks: [...s.blocks, { kind: "images", srcs: step.srcs }] };
    case "pause":
      return { ...s, label: step.working ?? s.label };
  }
}

/** Plays STEPS after `base`; returns the blocks to draw, which of them is still being written, and the working line. */
export function useTurnStream(base: Block[], initialTokens: number) {
  const [state, setState] = useState<State>({ step: 0, chars: 0, blocks: [], statuses: null, label: "Thinking", done: false });
  const [live, setLive] = useState<string | null>(null);
  const [tokens, setTokens] = useState(initialTokens);
  const started = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timer = setTimeout(() => setState((s) => ({ ...STEPS.reduce(apply, s), step: STEPS.length, done: true })));
      return () => clearTimeout(timer);
    }
    const run = (i: number) => {
      if (cancelled) return;
      if (i >= STEPS.length) {
        setState((s) => ({ ...s, step: i, done: true }));
        return;
      }
      const step = STEPS[i];
      if (step.kind === "write") {
        const total = blockLength(step.block);
        setState((s) => ({ ...s, step: i, chars: 0, label: step.working ?? s.label }));
        let n = 0;
        const tick = () => {
          if (cancelled) return;
          n = Math.min(total, n + CHARS_PER_TICK);
          setState((s) => ({ ...s, chars: n }));
          if (n < total) timer = setTimeout(tick, TICK_MS);
          else
            timer = setTimeout(() => {
              setState((s) => ({ ...apply(s, step), step: i + 1, chars: 0 }));
              run(i + 1);
            }, 380);
        };
        timer = setTimeout(tick, TICK_MS);
      } else if (step.kind === "tool") {
        setLive(step.live);
        setState((s) => ({ ...s, step: i, label: step.live }));
        timer = setTimeout(() => {
          setLive(null);
          setState((s) => ({ ...apply(s, step), step: i + 1 }));
          timer = setTimeout(() => run(i + 1), 450);
        }, step.ms);
      } else {
        setState((s) => ({ ...apply(s, step), step: i + 1 }));
        timer = setTimeout(() => run(i + 1), step.kind === "pause" ? step.ms : 500);
      }
    };
    run(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // the token count climbs while the turn works; once the script is done the label cycles
  useEffect(() => {
    started.current = performance.now();
    const id = setInterval(() => setTokens(initialTokens + ((performance.now() - started.current) / 1000) * TOKENS_PER_S), 250);
    return () => clearInterval(id);
  }, [initialTokens]);
  useEffect(() => {
    if (!state.done) return;
    let i = 0;
    const id = setInterval(() => setState((s) => ({ ...s, label: IDLE_LABELS[i++ % IDLE_LABELS.length] })), IDLE_MS);
    return () => clearInterval(id);
  }, [state.done]);

  const current = STEPS[state.step];
  const writing = current?.kind === "write" && state.chars > 0 ? partial(current.block, state.chars) : null;

  // the task list the turn keeps updating is the last one in the transcript
  const lastTasks = base.findLastIndex((b) => b.kind === "tasks");
  const blocks = base.map((b, i) =>
    i === lastTasks && b.kind === "tasks" && state.statuses ? { ...b, items: b.items.map((t, j) => ({ ...t, status: state.statuses![j] ?? t.status })) } : b,
  );
  const liveBlock: Block | null = live ? { kind: "tools", runs: [live], live: true } : null;

  return {
    blocks: [...blocks, ...state.blocks, ...(writing ? [writing] : []), ...(liveBlock ? [liveBlock] : [])],
    /** index of the block still being written (it gets a caret), or -1 */
    writingIndex: writing ? blocks.length + state.blocks.length : -1,
    working: { label: state.label, tokens: `${(tokens / 1000).toFixed(1)}k tokens` },
  };
}
