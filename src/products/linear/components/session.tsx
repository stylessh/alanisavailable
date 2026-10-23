"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Avatar, IconButton } from "./chrome";
import { AttachIcon } from "./code-icons";
import { DIFFS, ME, PEOPLE, type Diff, type Person, type Session } from "./code-data";
import { Markdown } from "./code";
import { Menu } from "./diff-conversation";
import { Switch } from "./diff-list";
import { AskLinearIcon, MoreIcon } from "./icons";
import { useApp } from "./router";

// Coding sessions, after Linear's (a recording of the live app, Oct 2026):
// a session is a thread between you and Linear Agent, which hands the work to
// a coding agent. Its log streams in as it works (notes as quoted lines, tool
// calls as "Bash …", "Edit …", "git_push …" in the mono face, each with a ▸
// to open), then folds under "Worked for 1 minute" above a summary and the
// commit it pushed. The same thread shows three ways: as a card in Agent's
// chat, as the right half of the session page, and docked beside a diff.

export const AGENTS = [
  { id: "claude", name: "Claude Code", model: "Opus 5" },
  { id: "codex", name: "Codex", model: "GPT-5.5" },
] as const;
export type AgentId = (typeof AGENTS)[number]["id"];
export const agentOf = (id: AgentId) => AGENTS.find((a) => a.id === id)!;

/* A coding agent's own mark, from svgl.app: Claude's starburst for Claude Code, OpenAI's knot for Codex. */
const CLAUDE =
  "m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z";
const OPENAI =
  "M252.794 108.802C289.191 99.0484 326.265 110.305 351.148 135.135C385.113 126.072 422.85 134.862 449.492 161.505C476.136 188.149 484.925 225.888 475.862 259.85V259.854C500.696 284.735 511.95 321.81 502.198 358.207C492.447 394.602 464.161 421.084 430.215 430.217C421.083 464.162 394.603 492.448 358.206 502.199C321.812 511.951 284.734 500.693 259.852 475.864C225.887 484.927 188.15 476.137 161.507 449.495C134.864 422.851 126.073 385.111 135.136 351.149C110.304 326.266 99.0496 289.192 108.801 252.795C118.552 216.4 146.84 189.918 180.784 180.785C189.917 146.841 216.396 118.553 252.794 108.802ZM374.292 407.145C374.292 411.271 372.092 415.086 368.517 417.148L283.723 466.102C302.487 480.585 327.555 486.459 352.217 479.852C386.997 470.532 410.068 439.312 410.555 405.006V317.717C410.555 315.08 409.125 312.621 406.843 311.303L374.292 292.509V407.145ZM251.868 415.897C248.296 417.959 243.893 417.959 240.317 415.897L155.526 366.942C152.366 390.436 159.811 415.08 177.866 433.136H177.863C203.325 458.594 241.896 462.962 271.85 446.232L347.449 402.586C349.735 401.268 351.148 398.8 351.148 396.163V358.579L251.868 415.897ZM368.602 220.628C366.319 219.309 363.474 219.318 361.191 220.637L328.641 239.431L427.921 296.749C431.496 298.811 433.697 302.627 433.697 306.752V404.661C455.622 395.654 473.244 376.881 479.851 352.218C489.169 317.442 473.668 281.85 444.201 264.274L368.602 220.628ZM177.303 206.34C155.377 215.348 137.756 234.122 131.148 258.783C121.832 293.561 137.331 329.153 166.799 346.727L242.398 390.373C244.68 391.692 247.525 391.684 249.807 390.366L282.357 371.572L183.078 314.253C179.504 312.189 177.303 308.375 177.303 304.251V206.34ZM259.849 279.145V331.858L305.5 358.213L351.15 331.858V279.145L305.5 252.789L259.849 279.145ZM327.276 144.9C308.512 130.418 283.445 124.543 258.782 131.15C224.002 140.471 200.931 171.691 200.445 205.995V293.286C200.445 295.923 201.875 298.381 204.158 299.7L236.707 318.493V203.856C236.707 199.731 238.909 195.916 242.483 193.853L327.276 144.9ZM433.137 177.867C407.675 152.407 369.103 148.038 339.149 164.769L263.55 208.415C261.265 209.734 259.852 212.202 259.852 214.838V252.423L359.132 195.105C362.703 193.041 367.108 193.041 370.682 195.105L455.473 244.06C458.635 220.567 451.189 195.922 433.135 177.867H433.137Z";

export function AgentMark({ agent, size = 14 }: { agent: AgentId; size?: number }) {
  return agent === "claude" ? (
    <svg width={size} height={size} viewBox="0 0 256 257" aria-hidden className="shrink-0">
      <path fill="#D97757" d={CLAUDE} />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 611 611" aria-hidden className="shrink-0 text-(--ln-text)">
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={OPENAI} />
    </svg>
  );
}

/* The sessions you start this visit, shared by Agent's chat, the session page and the diff */

export type Run = {
  id: string;
  title: string;
  prompt: string;
  repo: string;
  agent: AgentId;
  issue: string;
  /** the diff the session opens when it lands */
  diff: number;
  startedAt: number;
  stoppedAt?: number;
  subscribed: boolean;
  archived?: boolean;
};

const listeners = new Set<() => void>();
let runs: Run[] = [];
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useRuns() {
  return useSyncExternalStore(
    subscribe,
    () => runs,
    () => runs,
  );
}
export function startRun(prompt: string, repo: string, agent: AgentId): Run {
  const run: Run = {
    id: Math.random().toString(36).slice(2, 8),
    title: "Compare KPIs with the previous period",
    prompt,
    repo,
    agent,
    issue: "AS-33",
    diff: 24,
    startedAt: Date.now(),
    subscribed: true,
  };
  runs = [...runs, run];
  emit();
  return run;
}
export function updateRun(id: string, patch: Partial<Run>) {
  runs = runs.map((r) => (r.id === id ? { ...r, ...patch } : r));
  emit();
}

/* What a session does, step by step, with when each line lands (seconds in) */

export type Step =
  | { at: number; kind: "note"; text: string }
  | { at: number; kind: "say"; text: string }
  | { at: number; kind: "tool"; tool: string; text: string; out?: string }
  /** a file it changed, by path in the diff it opens */
  | { at: number; kind: "edit"; path: string; verb?: "Delete" | "Move" };

export const RUN_SECONDS = 36;

export function scriptOf(repo: string, agent: AgentId): Step[] {
  const edit = (at: number, path: string, verb?: "Delete" | "Move"): Step => ({ at, kind: "edit", path, verb });
  return [
    { at: 0.4, kind: "note", text: `Setting up \`${repo}\`…` },
    { at: 2, kind: "note", text: `Cloning repo and setting up ${agentOf(agent).name}…` },
    {
      at: 4,
      kind: "say",
      text: "I'll compute the previous period in `@insight/metrics`, fetch it next to the current range, and show the change in the KPI table, then run the checks and open a draft diff.",
    },
    { at: 5.5, kind: "tool", tool: "Bash", text: 'rg -n "useMetric|TrendArrow|formatPercent" apps packages', out: "apps/web/src/hooks/use-metric.ts:6\napps/web/src/components/metric-row.tsx:1\napps/web/src/components/kpi-table.tsx:8\napps/web/src/lib/format.ts:9" },
    { at: 7, kind: "tool", tool: "Bash", text: "sed -n '1,40p' packages/metrics/src/range.ts" },
    edit(8.5, "packages/metrics/src/range.ts"),
    edit(10, "packages/metrics/src/compare.ts"),
    edit(11, "packages/metrics/src/index.ts"),
    edit(12, "packages/metrics/src/format.ts", "Move"),
    {
      at: 13.5,
      kind: "say",
      text: "The package now has `previousRange` and `compare`. Wiring it into the filter and `useMetric`, so the previous range is only fetched while comparing is on.",
    },
    edit(15, "apps/web/src/types/filter.ts"),
    edit(16, "apps/web/src/components/filter-bar.tsx"),
    edit(17.5, "apps/web/src/hooks/use-metric.ts"),
    edit(19, "apps/web/src/components/compare-toggle.tsx"),
    edit(20.5, "apps/web/src/components/kpi-table.tsx"),
    edit(22, "apps/web/src/components/metric-row.tsx"),
    edit(23, "apps/web/src/components/delta-badge.tsx"),
    edit(24, "apps/web/src/components/trend-arrow.tsx", "Delete"),
    edit(25, "apps/web/src/styles/kpi.css"),
    edit(26.5, "tests/compare.test.ts"),
    edit(27.5, "CHANGELOG.md"),
    { at: 28.5, kind: "tool", tool: "Bash", text: "pnpm exec biome check apps packages tests", out: "Checked 214 files in 182ms. No fixes applied." },
    { at: 30, kind: "tool", tool: "Bash", text: "pnpm exec tsc --noEmit", out: "(no output)" },
    { at: 31.5, kind: "tool", tool: "Bash", text: "pnpm vitest run", out: "✓ 221 tests passed (38 files) 4.12s" },
    {
      at: 32.5,
      kind: "say",
      text: "Biome, TypeScript and all 221 tests pass. Committing in three steps, then pushing and opening the draft diff.",
    },
    { at: 33.5, kind: "tool", tool: "git_push", text: "alex/as-33-compare-previous-period" },
    { at: 35, kind: "tool", tool: "create_pull_request", text: "Compare KPIs with the previous period" },
  ];
}

/** A finished session from a diff's activity, as a log of what it did to the diff's files. */
export function scriptFromSession(s: Session, diff?: Diff): Step[] {
  return [
    { at: 0, kind: "note", text: `Setting up \`${diff?.repo ?? "the repository"}\`…` },
    { at: 0, kind: "note", text: `Cloning repo and setting up ${s.agent.name === PEOPLE.linear.name ? agentOf("claude").name : s.agent.name}…` },
    ...(diff?.files ?? []).map((f): Step => ({ at: 0, kind: "edit", path: f.path })),
    { at: 0, kind: "tool", tool: "Bash", text: "pnpm exec biome check && pnpm test" },
    ...(diff ? [{ at: 0, kind: "tool" as const, tool: "git_push", text: diff.branch }] : []),
  ];
}

/** Seconds into a run, ticking until it lands or stops. */
export function useRunClock(run?: Run) {
  const [now, setNow] = useState(() => Date.now());
  const end = run ? (run.stoppedAt ?? run.startedAt + RUN_SECONDS * 1000) : 0;
  const finished = now >= end;
  useEffect(() => {
    if (!run || finished) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [run, finished]);
  return run ? (Math.min(now, end) - run.startedAt) / 1000 : 0;
}

export const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Where a run stands at `t` seconds in. */
export function runState(run: Run, t: number) {
  const stoppedAt = run.stoppedAt ? (run.stoppedAt - run.startedAt) / 1000 : undefined;
  const at = Math.min(t, stoppedAt ?? Infinity);
  const done = !stoppedAt && at >= RUN_SECONDS;
  return { at, done, stopped: stoppedAt !== undefined, working: !done && stoppedAt === undefined };
}

/* The pieces of a thread */

/** "Setting up `repo`…" with backticked names set in the mono face, as the log writes them. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith("`") ? (
          <code key={i} className="ln-mono rounded-[4px] bg-(--ln-pill-neutral) px-1 text-[0.92em] text-(--ln-text-header)">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** The dot grid that breathes while a session runs, in place of a spinner. */
export function WorkingGrid({ live }: { live: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0 text-(--ln-text-muted)">
      {[1.5, 5.5, 9.5, 13.5].flatMap((y, r) =>
        [1.5, 5.5, 9.5, 13.5].map((x, c) => (
          <circle
            key={`${r}${c}`}
            cx={x - 0.75}
            cy={y - 0.75}
            r="0.9"
            fill="currentColor"
            className={live ? "animate-pulse" : ""}
            style={live ? { animationDelay: `${((r + c) % 4) * 180}ms` } : { opacity: 0.6 }}
          />
        )),
      )}
    </svg>
  );
}

/** The small filled triangle that opens a log line or a "Worked for" summary. */
export function Caret({ open }: { open: boolean }) {
  return (
    <svg width="6" height="7" viewBox="0 0 6 7" aria-hidden className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}>
      <path fill="currentColor" d="M.5 1.07a.5.5 0 0 1 .76-.43l4.03 2.43a.5.5 0 0 1 0 .86L1.26 6.36A.5.5 0 0 1 .5 5.93Z" />
    </svg>
  );
}

/** One line of the log: a quoted note, plain words, or a tool call in mono with its output a click away. */
function LogLine({ step, onFile }: { step: Step; onFile?: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  if (step.kind === "note" || step.kind === "say")
    return (
      <div className="border-l-2 border-(--ln-chip-border) pl-3 text-[13px] leading-5 font-[450] text-(--ln-text-muted)">
        <Inline text={step.text} />
      </div>
    );
  const [tool, text, out] = step.kind === "edit" ? [step.verb ?? "Edit", step.path, undefined] : [step.tool, step.text, step.out];
  return (
    <div>
      <button
        type="button"
        onClick={() => (step.kind === "edit" ? onFile?.(step.path) : setOpen(!open))}
        className="ln-mono flex w-full min-w-0 items-center gap-2 text-left text-xs leading-5 text-(--ln-text-muted) hover:text-(--ln-text-header)"
      >
        <span className="shrink-0">{tool}</span>
        <span className="min-w-0 truncate">{text}</span>
        {step.kind !== "edit" && <Caret open={open} />}
      </button>
      {open && out && <pre className="ln-mono mt-1 overflow-x-auto rounded-md bg-(--ln-pill-neutral) px-2.5 py-1.5 text-[11px] leading-[18px] text-(--ln-text-muted)">{out}</pre>}
    </div>
  );
}

export function Log({ steps, onFile }: { steps: Step[]; onFile?: (path: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((s, i) => (
        <LogLine key={i} step={s} onFile={onFile} />
      ))}
    </div>
  );
}

/** The commit a session pushed, as a chip: files, sha and counts. */
export function CommitChip({ diff }: { diff: Diff }) {
  const sha = diff.activity.flatMap((e) => (e.kind === "change" && e.change.type === "commit" ? [e.change.sha] : [])).at(-1) ?? "4e1c0a2";
  const add = diff.files.reduce((n, f) => n + f.additions, 0);
  const del = diff.files.reduce((n, f) => n + f.deletions, 0);
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md border-[0.5px] border-(--ln-chip-border) px-2 text-xs font-medium whitespace-nowrap text-(--ln-text-header)">
      {diff.files.length} {diff.files.length === 1 ? "file" : "files"}
      <span className="ln-mono font-[450] text-(--ln-text-muted)">{sha.slice(0, 7)}</span>
      <span className="ln-tnum text-(--ln-added)">+{add}</span>
      <span className="ln-tnum text-(--ln-removed)">-{del}</span>
    </span>
  );
}

/** The composer under a session: "Tell Linear what to do next…", with stop in place of send while it works. */
export function SessionComposer({ working, onStop, autoFocus }: { working: boolean; onStop?: () => void; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  return (
    <div className="rounded-xl border-[0.5px] border-(--ln-card-border) bg-(--ln-card)">
      <textarea
        autoFocus={autoFocus}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell Linear what to do next…"
        className="ln-search block w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] leading-5 font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
      />
      <div className="flex items-center justify-end gap-1.5 px-2 pb-2">
        <IconButton label="Attach images, files, or videos" className="size-7 text-(--ln-text-muted)">
          <AttachIcon size={14} />
        </IconButton>
        {working ? (
          <button type="button" aria-label="Stop session" onClick={onStop} className="flex size-7 items-center justify-center rounded-full bg-(--ln-pill-neutral) text-(--ln-text)">
            <span className="size-2 rounded-[2px] bg-current" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Send"
            disabled={!text.trim()}
            onClick={() => setText("")}
            className="flex size-7 items-center justify-center rounded-full bg-(--ln-accent) text-white disabled:bg-(--ln-pill-neutral) disabled:text-(--ln-text-muted)"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 10V2M2.75 5.25 6 2l3.25 3.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className={down ? "rotate-180" : ""}>
      <path
        d="M4.25 6.25 6.6 1.9a1.1 1.1 0 0 1 2.06.72L8.2 5.25h2.6a1.25 1.25 0 0 1 1.22 1.52l-.86 3.9a1.75 1.75 0 0 1-1.7 1.38H4.25m0-5.8v5.8m0-5.8H2.6a.85.85 0 0 0-.85.85v4.1c0 .47.38.85.85.85h1.65"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="4.5" y="4.5" width="7.5" height="7.5" rx="1.75" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9.5 2.75A1.25 1.25 0 0 0 8.25 2H3.5A1.5 1.5 0 0 0 2 3.5v4.75c0 .5.3.95.75 1.15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Under an answer: was it good, and a way to copy it. */
export function Feedback({ text, thumbs = true }: { text: string; thumbs?: boolean }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);
  const btn = "flex size-6 items-center justify-center rounded-md text-(--ln-text-muted) hover:bg-(--ln-ghost-hover) hover:text-(--ln-text-header) aria-pressed:text-(--ln-text)";
  return (
    <div className="-ml-1 flex items-center gap-0.5">
      {thumbs && (
        <>
          <button type="button" aria-label="Good response" aria-pressed={vote === "up"} onClick={() => setVote(vote === "up" ? null : "up")} className={btn}>
            <ThumbIcon />
          </button>
          <button type="button" aria-label="Bad response" aria-pressed={vote === "down"} onClick={() => setVote(vote === "down" ? null : "down")} className={btn}>
            <ThumbIcon down />
          </button>
        </>
      )}
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy"}
        onClick={() => {
          navigator.clipboard?.writeText(text).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={btn}
      >
        {copied ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="m2.5 6.25 2.25 2.25L9.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <CopyIcon />
        )}
      </button>
    </div>
  );
}

/** A thread's model of a session, whichever way it started. */
export type Thread = {
  title: string;
  by: Person;
  agent: AgentId | Person;
  prompt: string;
  steps: Step[];
  working: boolean;
  stopped?: boolean;
  /** seconds it ran, or has been running */
  seconds: number;
  summary?: string;
  diff?: Diff;
  repo: string;
  /** when it started, as the thread's heading says it */
  when: string;
};

export function threadOfRun(run: Run, t: number): Thread {
  const st = runState(run, t);
  const steps = scriptOf(run.repo, run.agent).filter((s) => s.at <= st.at);
  const diff = DIFFS.find((d) => d.number === run.diff);
  return {
    title: run.title,
    by: ME,
    agent: run.agent,
    prompt: run.prompt,
    steps,
    working: st.working,
    stopped: st.stopped,
    seconds: st.at,
    summary: st.done ? (diff?.activity.find((e): e is Session => e.kind === "session")?.output ?? "") : undefined,
    diff: st.done ? diff : undefined,
    repo: run.repo,
    when: `Today ${new Date(run.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
  };
}

export function threadOfSession(s: Session, diff?: Diff): Thread {
  return {
    title: s.title,
    by: s.by,
    // Linear hands its own sessions to a coding agent; another agent (Cursor) runs its own
    agent: s.agent.name === PEOPLE.linear.name ? "claude" : s.agent,
    prompt: diff ? `In ${diff.repo}, ${diff.title[0].toLowerCase()}${diff.title.slice(1)}.` : s.title,
    steps: scriptFromSession(s, diff),
    working: s.status === "working",
    seconds: 64,
    summary: s.output,
    diff,
    repo: diff?.repo ?? "",
    when: `${s.age} ago`,
  };
}

const agentLabel = (a: AgentId | Person) => (typeof a === "string" ? `${agentOf(a).name} · ${agentOf(a).model}` : a.name);

/**
 * The thread itself, as Linear lays it out: the time; your message, relayed by
 * Linear, in a soft card on the right; who it was routed to; the log while it
 * works (or folded under "Worked for …" once it's done); the summary; the
 * commit; then a way to copy it.
 */
export function SessionThread({ thread, onFile }: { thread: Thread; onFile?: (path: string) => void }) {
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? thread.working;
  const minutes = thread.seconds >= 60 ? `${Math.round(thread.seconds / 60)} minute${Math.round(thread.seconds / 60) === 1 ? "" : "s"}` : `${Math.round(thread.seconds)} seconds`;
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-xs font-[450] text-(--ln-icon-faint)">{thread.when}</div>
      <div className="ml-auto max-w-[88%] rounded-lg bg-(--ln-pill-neutral) px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-xs font-[450] text-(--ln-text-muted)">
          <Avatar who={thread.by} size={14} />
          <span className="font-medium text-(--ln-text-header)">{thread.by.name}</span> relayed by Linear
          <span className="text-(--ln-icon-faint)">{thread.when.startsWith("Today") ? "just now" : thread.when}</span>
        </div>
        <p className="mt-1 text-[13px] leading-5 font-[450] text-(--ln-text)">{thread.prompt}</p>
      </div>
      <div className="text-xs font-[450] text-(--ln-text-muted)">Linear routed this session to {agentLabel(thread.agent)}</div>
      {thread.working ? (
        <>
          <Log steps={thread.steps} onFile={onFile} />
          <div className="flex items-center gap-2 text-xs font-[450] text-(--ln-text-muted)">
            <span className="animate-pulse">Working…</span>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setToggled(!open)}
            className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-(--ln-text-header) hover:text-(--ln-text)"
          >
            {thread.stopped ? `Stopped after ${minutes}` : `Worked for ${minutes}`}
            <span className="text-(--ln-text-muted)">
              <Caret open={open} />
            </span>
          </button>
          {open && (
            <div className="pl-2.5">
              <Log steps={thread.steps} onFile={onFile} />
            </div>
          )}
          {thread.summary && (
            <div className="text-[13px] leading-[21px] text-(--ln-text)">
              <Markdown source={thread.summary} compact small />
            </div>
          )}
          {thread.diff && (
            <div>
              <CommitChip diff={thread.diff} />
            </div>
          )}
          {thread.summary && <Feedback text={thread.summary} thumbs={false} />}
        </>
      )}
    </div>
  );
}

const MENU_ROW = "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-[450] text-(--ln-text-header) hover:bg-(--ln-menu-hover)";

function MenuGlyph({ d }: { d: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0 text-(--ln-text-muted)">
      <path d={d} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A session's "…" menu, as the live app has it: Session details (the model
 * and what it was asked, then the repository it runs in), Subscribe to
 * session, Copy ›, Start over with the other agent, and Archive, each part
 * between full-width hairlines.
 */
export function SessionMenu({
  thread,
  subscribed,
  onSubscribe,
  onStartOver,
  onArchive,
  onClose,
}: {
  thread: Thread;
  subscribed: boolean;
  onSubscribe: (v: boolean) => void;
  onStartOver?: (agent: AgentId) => void;
  onArchive?: () => void;
  onClose: () => void;
}) {
  const [copy, setCopy] = useState(false);
  const other = typeof thread.agent === "string" ? AGENTS.find((a) => a.id !== thread.agent)! : AGENTS[0];
  const rule = <div className="my-1.5 border-t-[0.5px] border-(--ln-popover-border)" />;
  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    onClose();
  };
  return (
    <Menu onClose={onClose} place="top-full right-0 mt-1.5 w-[300px] py-1.5">
      <div className="px-1.5">
        <div className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-(--ln-text-muted)">Session details</div>
        <div className="flex gap-2.5 px-2.5 py-1">
          <span className="mt-0.5 flex">{typeof thread.agent === "string" ? <AgentMark agent={thread.agent} /> : <Avatar who={thread.agent} size={14} />}</span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-(--ln-text-header)">{agentLabel(thread.agent)}</span>
            <span className="line-clamp-2 text-xs font-[450] text-(--ln-text-muted)">{thread.prompt}</span>
          </span>
        </div>
        {thread.repo && (
          <div className="flex h-8 items-center gap-2.5 px-2.5 text-[13px] font-[450] text-(--ln-text-header)">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0 text-(--ln-text-muted)">
              <path fill="currentColor" d="M3.6 11.25a2.85 2.85 0 0 1-.42-5.67 4 4 0 0 1 7.62-.55 3.12 3.12 0 0 1-.3 6.22Z" />
            </svg>
            as-mobbin/{thread.repo}
          </div>
        )}
      </div>
      {rule}
      <div className="flex h-8 items-center px-4 text-[13px] font-[450] text-(--ln-text-header)">
        Subscribe to session
        <span className="ml-auto flex">
          <Switch label="Subscribe to session" on={subscribed} onChange={onSubscribe} />
        </span>
      </div>
      {rule}
      <div className="relative px-1.5" onMouseLeave={() => setCopy(false)}>
        <button type="button" aria-expanded={copy} onMouseEnter={() => setCopy(true)} onClick={() => setCopy(!copy)} className={MENU_ROW}>
          <MenuGlyph d="M5 2.5h4M4.75 2H4a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 4 12h6a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 10 2h-.75M5.25 1.5h3.5v1.5h-3.5Z" />
          Copy
          <span className="ml-auto text-(--ln-text-muted)">
            <Caret open={false} />
          </span>
        </button>
        {copy && (
          // the submenu opens beside the row, as Linear's do
          <div className="absolute top-0 right-full mr-1 w-48 rounded-xl border-[0.5px] border-(--ln-popover-border) bg-(--ln-popover) p-1.5 shadow-(--ln-popover-shadow)">
            <button type="button" className={MENU_ROW} onClick={() => copyText(thread.prompt)}>
              Copy prompt
            </button>
            <button type="button" className={MENU_ROW} onClick={() => copyText(thread.summary ?? thread.prompt)}>
              Copy summary
            </button>
            {thread.diff && (
              <button type="button" className={MENU_ROW} onClick={() => copyText(`git fetch origin ${thread.diff!.branch} && git switch ${thread.diff!.branch}`)}>
                Copy checkout command
              </button>
            )}
          </div>
        )}
      </div>
      {rule}
      <div className="px-1.5">
        <button
          type="button"
          className={MENU_ROW}
          onClick={() => {
            onStartOver?.(other.id);
            onClose();
          }}
        >
          <MenuGlyph d="M2.25 7a4.75 4.75 0 0 1 8.4-3.05M11.75 7a4.75 4.75 0 0 1-8.4 3.05M10.9 1.75v2.4H8.5M3.1 12.25v-2.4h2.4" />
          Start over with {other.name}
        </button>
        <button
          type="button"
          className={MENU_ROW}
          onClick={() => {
            onArchive?.();
            onClose();
          }}
        >
          <MenuGlyph d="M2 3.25A1.25 1.25 0 0 1 3.25 2h7.5A1.25 1.25 0 0 1 12 3.25V5H2ZM2.75 5v5.75A1.25 1.25 0 0 0 4 12h6a1.25 1.25 0 0 0 1.25-1.25V5M5.75 7.5h2.5" />
          Archive
        </button>
      </div>
    </Menu>
  );
}

/**
 * The agent docked beside a diff or filling a session page's right half: a
 * card with the session's title under Linear's mark, "…" and ×, the thread
 * scrolling, and the composer pinned at the foot.
 */
export function AgentPanel({
  thread,
  onClose,
  onStop,
  onFile,
  subscribed = true,
  onSubscribe,
  onStartOver,
  onArchive,
  autoFocus,
  className = "",
}: {
  thread: Thread;
  onClose?: () => void;
  onStop?: () => void;
  onFile?: (path: string) => void;
  subscribed?: boolean;
  onSubscribe?: (v: boolean) => void;
  onStartOver?: (agent: AgentId) => void;
  onArchive?: () => void;
  /** put the cursor in the composer as the panel appears: when you open it, not when a page loads with it open */
  autoFocus?: boolean;
  className?: string;
}) {
  const [menu, setMenu] = useState(false);
  const [sub, setSub] = useState(subscribed);
  return (
    <section className={`flex min-h-0 flex-col rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) shadow-(--ln-main-shadow) ${className}`}>
      <header className="flex h-11 shrink-0 items-center gap-2 pr-2 pl-3.5">
        <Avatar who={PEOPLE.linear} size={16} />
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-medium text-(--ln-text)">{thread.title}</h2>
        <span className="relative flex">
          <IconButton label="Session options" className="size-7 text-(--ln-text-muted)" onClick={() => setMenu(!menu)}>
            <MoreIcon size={14} />
          </IconButton>
          {menu && (
            <SessionMenu
              thread={thread}
              subscribed={sub}
              onSubscribe={(v) => {
                setSub(v);
                onSubscribe?.(v);
              }}
              onStartOver={onStartOver}
              onArchive={onArchive}
              onClose={() => setMenu(false)}
            />
          )}
        </span>
        {onClose && (
          <IconButton label="Hide agent" className="size-7 text-(--ln-text-muted)" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="m3 3 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </IconButton>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <SessionThread thread={thread} onFile={onFile} />
      </div>
      <div className="shrink-0 p-2 pt-0">
        <SessionComposer working={thread.working} onStop={onStop} autoFocus={autoFocus} />
      </div>
    </section>
  );
}

/** The round agent button at a page's top right: the sidebar's Agent glyph, filled while its panel is open. */
export function AgentToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={open ? "Hide agent" : "Show agent"}
      aria-pressed={open}
      onClick={onToggle}
      className={`flex size-7 items-center justify-center rounded-full ${open ? "bg-(--ln-text) text-(--ln-main)" : "ln-pill text-(--ln-text-header)"}`}
    >
      {/* the sidebar's Agent glyph, so the button reads as the same place */}
      <AskLinearIcon size={14} />
    </button>
  );
}

/** What "Start over" and "Archive" do to a run you started: a fresh run with the other agent, or off the list and back to Agent. */
export function useRunActions(run?: Run) {
  const { go } = useApp();
  if (!run) return {};
  return {
    onStartOver: (agent: AgentId) => go({ page: "session", id: startRun(run.prompt, run.repo, agent).id }),
    onArchive: () => {
      updateRun(run.id, { archived: true });
      go({ page: "agent" });
    },
    onStop: () => updateRun(run.id, { stoppedAt: Date.now() }),
  };
}

/**
 * The agent docked beside a diff: the run you started from Agent that opened
 * it, live, or else the latest session in its activity, as it finished.
 */
export function DiffAgent({
  diff,
  onClose,
  onFile,
  autoFocus,
  className,
}: {
  diff: Diff;
  onClose: () => void;
  onFile?: (path: string) => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const runs = useRuns();
  const run = runs.findLast((r) => r.diff === diff.number && !r.archived);
  const t = useRunClock(run);
  const session = diff.activity.findLast((e): e is Session => e.kind === "session");
  const actions = useRunActions(run);
  const thread = run ? threadOfRun(run, t) : session ? threadOfSession(session, diff) : undefined;
  if (!thread) return null;
  return <AgentPanel thread={thread} onClose={onClose} onFile={onFile} autoFocus={autoFocus} className={className} {...actions} />;
}

/** Whether a diff has a session to dock: one in its activity, or a run you started. */
export const hasSession = (diff: Diff, runs: Run[]) => runs.some((r) => r.diff === diff.number && !r.archived) || diff.activity.some((e) => e.kind === "session");

/** The line over something Linear made in a chat: "Created AS-33", "Created coding session". */
export function Caption({ children }: { children: ReactNode }) {
  return <div className="text-[13px] font-[450] text-(--ln-text-muted)">{children}</div>;
}
