"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { FileDiff, Stats } from "./diff-panel";
import { highlightTsx } from "./highlight";
import { Icon } from "./icon";
import { type PrBody, type PrCheck, type PullRequest, PULL_REQUESTS } from "./panel-content";
import { Menu, MenuItem, Popover } from "./popover";
import { BarButton, PanelFrame, PanelTab, useEdgeFade } from "./side-panel";

// The PR panel: a pull request this session opened, in the session, instead
// of a GitHub tab. Clicking its link in the conversation opens it on the
// right like the other side panels. Overview has what you'd check before
// merging: its state and branches, its checks, a merge box and its
// description. Checks lists every check and Files changed is the diff.
//
// It's live, as far as a replica goes: a running check finishes a few
// seconds after the panel opens, and merging turns the pull request purple.
// Merging while a check still runs queues it, and it merges once they pass.

type Tab = "overview" | "checks" | "files";
type PrState = "open" | "queued" | "merged";

/** How the pull request goes into its base, as GitHub offers them, each said in a line; the merge button's chevron picks one. */
type Strategy = "squash" | "merge" | "rebase";
const STRATEGIES: Record<Strategy, { label: string; description: string; done: string }> = {
  squash: { label: "Squash and merge", description: "Combines every commit into one", done: "Squashed and merged" },
  merge: { label: "Create a merge commit", description: "Keeps every commit, plus a merge", done: "Merged" },
  rebase: { label: "Rebase and merge", description: "Replays each commit onto the base", done: "Rebased and merged" },
};

const MERGED = "var(--cc-merged)";
const OPEN = "var(--cc-merge)";

/** The pull request mark, as the app draws it (its own icon font): a branch, and a change coming back into it. */
export function PrMark({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return <Icon name="pullRequest" size={size} style={{ color }} />;
}

/** A merged pull request's mark: the branch coming home. */
function MergedMark({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return <Icon name="merged" size={size} style={{ color }} />;
}

const CHECK_LABELS: Record<PrCheck["state"], string> = { success: "Passed", failure: "Failed", running: "Running", queued: "Queued" };
/** the ring's radius and circumference, in a 16-unit box */
const RING_R = 6.75;
const RING_C = 2 * Math.PI * RING_R;

/**
 * A check's state, 14pt: passed is a green disc with a check, failed a red
 * disc with a cross, queued a muted ring, and running the same ring with an
 * amber arc going round it.
 */
function CheckState({ state, size = 14 }: { state: PrCheck["state"]; size?: number }) {
  // the ring stays a 1.5pt line at any size; the marks inside scale with the disc
  const ring = { cx: 8, cy: 8, r: RING_R, fill: "none", strokeWidth: (1.5 * 16) / size };
  return (
    // centered on its line, a mark rides high of the lowercase beside it: it sits a point lower, level with it
    <span role="img" aria-label={CHECK_LABELS[state]} className="relative flex-none" style={{ width: size, height: size, top: 1 }}>
      <svg viewBox="0 0 16 16" className="absolute inset-0 size-full">
        {state === "success" || state === "failure" ? (
          <>
            <circle cx={8} cy={8} r={8} fill={state === "success" ? OPEN : "var(--cc-danger)"} />
            <path
              d={state === "success" ? "M4.75 8.25 7 10.5l4.25-4.75" : "M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5"}
              fill="none"
              stroke="#fff"
              // the check or cross reads as a 2–3pt line whatever the disc's size
              strokeWidth={Math.min(1.8, Math.max(1.15, (1.6 * 14) / size))}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          // the running ring's track is the text color, faint: it reads on any fill under it (a lit row too)
          <circle {...ring} stroke={state === "queued" ? "var(--cc-text-faint)" : "color-mix(in srgb, var(--cc-text) 16%, transparent)"} />
        )}
      </svg>
      {state === "running" && (
        <svg viewBox="0 0 16 16" className="absolute inset-0 size-full animate-spin">
          <circle {...ring} stroke="var(--cc-warning)" strokeLinecap="round" strokeDasharray={`${RING_C * 0.3} ${RING_C}`} transform="rotate(-90 8 8)" />
        </svg>
      )}
    </span>
  );
}

/** The checks as they stand: queued ones start running, and running ones pass, on their times from when the panel first opened. */
function useChecks(pr: PullRequest) {
  const [checks, setChecks] = useState<RunCheck[]>(() => pr.checks.map((c) => ({ ...c, attempt: 1 })));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const set = useCallback((i: number, patch: Partial<RunCheck>) => setChecks((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x))), []);
  useEffect(() => {
    const own = timers.current;
    pr.checks.forEach((c, i) => {
      if (c.state === "queued" && c.startMs) own.push(setTimeout(() => set(i, { state: "running", detail: c.runningDetail ?? "In progress" }), c.startMs));
      // a check that fails on its first run does, at the time it would have passed
      if ((c.state === "running" || c.state === "queued") && c.ms)
        own.push(setTimeout(() => set(i, c.fail ? { state: "failure", detail: c.fail.detail } : { state: "success", detail: c.done ?? "Successful" }), c.ms));
    });
    return () => own.forEach((t) => clearTimeout(t));
  }, [set, pr]);
  // Re-run: it runs again from the top, and this time it passes
  const rerun = (i: number) => {
    const c = pr.checks[i];
    setChecks((all) => all.map((x, j) => (j === i ? { ...x, state: "running", detail: "In progress", attempt: x.attempt + 1 } : x)));
    timers.current.push(setTimeout(() => set(i, { state: "success", detail: c.rerunDone ?? c.done ?? "Successful" }), c.rerunMs ?? 5000));
  };
  return { checks, rerun };
}

/** A check as it's going: which run it's on (a re-run is the second). */
type RunCheck = PrCheck & { attempt: number };

function StatePill({ state }: { state: PrState }) {
  const merged = state === "merged";
  return (
    // inline, so it starts the "wants to merge" line and the text wraps after it
    <span
      className="mr-[8px] inline-flex h-[22px] items-center gap-[5px] rounded-full pr-[9px] pl-[7px] align-middle text-[12px] font-medium"
      style={{ color: "#fff", background: merged ? MERGED : "var(--cc-merge)" }}
    >
      {merged ? <MergedMark size={13} /> : <PrMark size={13} />}
      {merged ? "Merged" : "Open"}
    </span>
  );
}

function Branch({ children }: { children: string }) {
  return (
    // a branch stays whole: too long for the line, it truncates (the full name is its tooltip). Truncating
    // makes it sit on the line by its bottom edge, not its text, so it's centered on the line instead, and
    // the mono's letters, which ride low in their line, are lifted a point to sit level with the prose
    <code
      title={children}
      className="inline-block max-w-full truncate rounded-[5px] px-[5px] pb-[2px] align-middle text-[11.5px] leading-[18px]"
      style={BRANCH_CHIP}
    >
      {children}
    </code>
  );
}

/** A part of the overview that folds: its whole heading row shows or hides it, the chevron by its title saying which. */
function Section({
  title,
  aside,
  open,
  onToggle,
  children,
}: {
  title: string;
  aside?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section style={{ borderTop: "1px solid var(--cc-rule)" }}>
      <h3 className="relative flex items-center text-[12px] font-medium" style={{ color: "var(--cc-text-muted)" }}>
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex flex-1 cursor-default items-center gap-[4px] px-[16px] py-[12px] text-left hover:text-(--cc-text)"
        >
          {title}
          <Icon name="chevronRight" size={10} className="transition-transform duration-150" style={{ transform: open ? "rotate(90deg)" : undefined }} />
        </button>
        {/* what sits at the right does its own thing, it doesn't fold the section */}
        {aside && <span className="absolute right-[16px]">{aside}</span>}
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.28, bounce: 0 }}
          >
            <div className="px-[16px] pb-[14px]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/**
 * Whose check it is, as the app shows it: the service's app icon, a 16pt
 * rounded black tile with its logo in white and a hairline around it (Vercel's
 * triangle, or GitHub's mark from the app's own icon font).
 */
function CheckLogo({ logo }: { logo: NonNullable<PrCheck["logo"]> }) {
  return (
    <span
      aria-hidden
      className="flex size-[16px] flex-none items-center justify-center rounded-[4.5px] bg-black text-white"
      style={{ boxShadow: "0 0 0 1px var(--cc-card-rim)" }}
    >
      {logo === "github" ? (
        <Icon name="github" size={12} />
      ) : (
        <svg viewBox="0 0 16 16" className="size-[9px]">
          <path d="M8 2 15 14H1z" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}

/** A check in a list: the whole row opens its details. */
function CheckRow({ check, onOpen }: { check: PrCheck; onOpen: () => void }) {
  return (
    <li className="-mx-[8px]">
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full cursor-default items-center gap-[9px] rounded-[7px] px-[8px] py-[5px] text-left hover:bg-(--cc-button-hover)"
      >
        <CheckState state={check.state} />
        <span className="flex min-w-0 flex-none items-center gap-[6px] truncate" style={{ color: "var(--cc-text-strong)" }}>
          {check.logo && <CheckLogo logo={check.logo} />}
          <span className="truncate">{check.name}</span>
        </span>
        <span className="min-w-0 flex-1 truncate" style={{ color: "var(--cc-text-muted)" }}>
          {check.detail}
        </span>
        <Icon name="chevronRight" size={11} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--cc-text-muted)" }} />
      </button>
    </li>
  );
}

/** Each step's state, from the check's: steps before the one it's on (or failed in) passed, the rest wait. */
function stepStates(check: RunCheck): PrCheck["state"][] {
  const last = check.steps.length - 1;
  const at = check.state === "running" ? (check.runningStep ?? last) : check.state === "failure" ? (check.fail?.step ?? last) : -1;
  return check.steps.map((_, i) =>
    check.state === "success" ? "success" : check.state === "queued" ? "queued" : i < at ? "success" : i === at ? check.state : "queued",
  );
}

/** A step's log as it stands: the failing run's, half of it while the step runs, none before it starts. */
function stepLog(check: RunCheck, i: number, state: PrCheck["state"]) {
  if (state === "queued") return [];
  if (state === "failure" && check.fail?.step === i) return check.fail.log;
  const log = check.steps[i].log;
  return state === "running" ? log.slice(0, Math.ceil(log.length / 2)) : log;
}

/** how a log line reads: a failure in red, a pass in green, the rest plain */
const logTone = (line: string) => (/✘|Error|^\s*> \d/.test(line) ? "var(--cc-removed)" : /✓|✔/.test(line) ? "var(--cc-merge)" : undefined);

/** a code excerpt in a log, "   42 |   code" (the failing line marked "> 43 |"): its gutter, and its code */
const EXCERPT = /^(\s*>?\s*\d+ \| )(.*)$/;

/** One log line: a code excerpt keeps its gutter in the line's tone and highlights its code; others are toned whole. */
function LogLine({ line }: { line: string }) {
  const m = EXCERPT.exec(line);
  if (!m) return <span style={{ color: logTone(line) ?? "var(--cc-text)" }}>{line || " "}</span>;
  return (
    <>
      <span style={{ color: logTone(line) ?? "var(--cc-text-faint)" }}>{m[1]}</span>
      {highlightTsx(m[2])}
    </>
  );
}

/** A step's log, numbered, as the runner printed it; a step still running ends on a blinking cursor. */
function Log({ lines, running }: { lines: string[]; running: boolean }) {
  return (
    <pre className="overflow-x-auto py-[8px] text-[11.5px] leading-[18px]" style={{ fontFamily: "var(--cc-mono)", background: "var(--cc-code-pane)", scrollbarWidth: "thin" }}>
      {lines.map((line, n) => (
        <div key={n} className="flex">
          <span className="w-[38px] flex-none pr-[12px] text-right select-none" style={{ color: "var(--cc-text-faint)" }}>
            {n + 1}
          </span>
          <span className="whitespace-pre">
            <LogLine line={line} />
          </span>
        </div>
      ))}
      {running && (
        <div className="flex">
          <span className="w-[38px] flex-none" />
          <span className="cc-caret" />
        </div>
      )}
      {!lines.length && !running && (
        <div className="px-[12px]" style={{ color: "var(--cc-text-muted)", fontFamily: "var(--cc-sans)" }}>
          Waiting to start
        </div>
      )}
    </pre>
  );
}

/**
 * One check's page: what it is and where it stands, a Re-run, why it failed
 * (the error and where), and its steps, each opening onto its log. The step
 * it failed in, or is running, starts open.
 */
function CheckDetail({ check, onBack, onRerun }: { check: RunCheck; onBack: () => void; onRerun: () => void }) {
  const states = stepStates(check);
  const failed = check.state === "failure";
  const live = states.findIndex((st) => st === "failure" || st === "running");
  const [shut, setShut] = useState<ReadonlySet<number>>(() => new Set());
  const [opened, setOpened] = useState<ReadonlySet<number>>(() => new Set());
  // a step is open if it's the one failing or running (until it's closed), or was opened by hand
  const isOpen = (i: number) => opened.has(i) || (i === live && !shut.has(i));
  const toggle = (i: number) => {
    const open = isOpen(i);
    setOpened((o) => {
      const next = new Set(o);
      if (open) next.delete(i);
      else next.add(i);
      return next;
    });
    setShut((o) => {
      const next = new Set(o);
      if (open) next.add(i);
      else next.delete(i);
      return next;
    });
  };
  const finished = check.state === "success" || failed;

  return (
    <div className="px-[16px] pt-[10px] pb-[16px]">
      <button type="button" onClick={onBack} className="-ml-[6px] flex h-[24px] cursor-default items-center gap-[4px] rounded-[6px] px-[6px] hover:bg-(--cc-button-hover)" style={{ color: "var(--cc-text-muted)" }}>
        <Icon name="chevronLeft" size={11} />
        All checks
      </button>

      <header className="mt-[10px] flex items-start gap-[10px]">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-[7px] text-[15px] leading-[21px] font-medium" style={{ color: "var(--cc-text-strong)" }}>
            {check.logo && <CheckLogo logo={check.logo} />}
            <span className="truncate">{check.name}</span>
          </h2>
          <p className="mt-[4px] flex items-center gap-[7px] text-[12.5px]" style={{ color: "var(--cc-text-muted)" }}>
            <CheckState state={check.state} size={12} />
            {check.detail}
            {check.attempt > 1 && <span>· Attempt {check.attempt}</span>}
          </p>
        </div>
        <button
          type="button"
          disabled={!finished}
          onClick={onRerun}
          className="flex h-[28px] flex-none cursor-default items-center gap-[6px] rounded-[8px] px-[10px] text-(--cc-text-muted) enabled:hover:bg-[color-mix(in_srgb,var(--cc-text)_7%,transparent)] enabled:hover:text-(--cc-text) disabled:opacity-50"
          style={{ boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--cc-text) 18%, transparent)" }}
        >
          <Icon name="reload" size={12} />
          Re-run
        </button>
      </header>

      {/* why it failed, before anything else */}
      {/* a card like the merge card: red only says what failed, and marks the line it failed on */}
      {failed && check.fail && (
        <div className="mt-[14px] overflow-hidden rounded-[10px]" style={{ background: "var(--cc-tab)" }}>
          <div className="px-[12px] pt-[10px] pb-[9px]">
            <div className="flex items-center gap-[7px]">
              <CheckState state="failure" size={12} />
              <span className="flex-none text-[12px] font-medium" style={{ color: "var(--cc-danger)" }}>
                Failed
              </span>
              <span className="min-w-0 truncate font-medium" style={{ color: "var(--cc-text-strong)" }}>
                {check.fail.error.title}
              </span>
            </div>
            <p className="mt-[5px] text-[12.5px] leading-[18px]" style={{ color: "var(--cc-text)" }}>
              {check.fail.error.message}
            </p>
          </div>
          <pre
            className="flex overflow-x-auto py-[7px] pr-[12px] text-[11.5px] leading-[18px]"
            style={{ fontFamily: "var(--cc-mono)", background: "var(--cc-code-pane)", boxShadow: "inset 2px 0 0 var(--cc-danger)", scrollbarWidth: "thin" }}
          >
            <span className="w-[38px] flex-none pr-[12px] text-right select-none" style={{ color: "var(--cc-text-faint)" }}>
              {check.fail.error.line}
            </span>
            <span className="whitespace-pre">{highlightTsx(check.fail.error.code)}</span>
          </pre>
          <div className="flex items-center gap-[6px] px-[12px] py-[7px] text-[11.5px]" style={{ fontFamily: "var(--cc-mono)", color: "var(--cc-text-muted)" }}>
            <Icon name="file" size={11} />
            {check.fail.error.at}
          </div>
        </div>
      )}

      {/* a real border, not an inset shadow: the logs' fill would paint over a shadow at the edges */}
      <ol className="mt-[14px] overflow-hidden rounded-[10px]" style={{ border: "1px solid color-mix(in srgb, var(--cc-text) 16%, transparent)" }}>
        {check.steps.map((step, i) => {
          const st = states[i];
          const open = isOpen(i);
          return (
            <li key={step.name} style={{ borderTop: i ? "1px solid color-mix(in srgb, var(--cc-text) 12%, transparent)" : undefined }}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(i)}
                className="flex h-[32px] w-full cursor-default items-center gap-[8px] px-[10px] text-left hover:bg-(--cc-button-hover)"
              >
                <Icon name="chevronRight" size={10} className="transition-transform duration-150" style={{ color: "var(--cc-text-muted)", transform: open ? "rotate(90deg)" : undefined }} />
                <CheckState state={st} size={12} />
                <span className="min-w-0 flex-1 truncate" style={{ color: st === "queued" ? "var(--cc-text-muted)" : "var(--cc-text-strong)" }}>
                  {step.name}
                </span>
                {(st === "success" || st === "failure") && (
                  <span className="flex-none text-[12px] tabular-nums" style={{ color: "var(--cc-text-muted)" }}>
                    {step.time}
                  </span>
                )}
              </button>
              {open && <Log lines={stepLog(check, i, st)} running={st === "running"} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A branch name, quiet: mono in the plain text color on a faint tint of it, no accent. */
const BRANCH_CHIP = {
  fontFamily: "var(--cc-mono)",
  color: "var(--cc-text)",
  background: "color-mix(in srgb, var(--cc-text) 8%, transparent)",
} as const;

/** GitHub's merge green: the merge button, and what's ready */
const MERGE_GREEN = "var(--cc-merge)";
/** the widest the merge card gets (pt), however wide the panel */
const MERGE_MAX_W = 440;

/** Where a pull request in a stack stands, as its label says it and in its color: merged, failing, still checking, or ready. */
function readiness(st: PrStatus | undefined): { label: string; tone: string; mark: PrCheck["state"] | "merged" } {
  if (st?.state === "merged") return { label: "Merged", tone: MERGED, mark: "merged" };
  if (st?.checks === "failure") return { label: "Failing", tone: "var(--cc-danger)", mark: "failure" };
  if (st?.checks !== "success") return { label: "Not ready", tone: "var(--cc-warning)", mark: "running" };
  return { label: "Ready", tone: OPEN, mark: "success" };
}

/**
 * A stacked pull request's stack, inside its merge card the way GitHub shows
 * it: top first, down to the branch it all goes into. Each one has its state's
 * mark (merged, failing, still checking or ready), its title, and its number
 * and branch; the one on show is lit, and the others a click away. A
 * line runs down from each one's mark to the next, in its state's color.
 */
function StackList({ stack, current, statuses, onOpen }: { stack: PullRequest[]; current: number; statuses: Readonly<Record<number, PrStatus>>; onOpen: (n: number) => void }) {
  const top = [...stack].reverse();
  return (
    <div className="mt-[12px] pt-[12px]" style={{ boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--cc-text) 22%, transparent)" }}>
      <h4 className="mb-[6px] text-[12px] font-medium" style={{ color: "var(--cc-text-muted)" }}>
        Stack · {stack.length} pull requests
      </h4>
      <ol className="-mx-[8px]">
        {top.map((p) => {
          const on = p.number === current;
          const r = readiness(statuses[p.number]);
          return (
            <li key={p.number} className="relative">
              <button
                type="button"
                onClick={() => onOpen(p.number)}
                aria-current={on || undefined}
                className="relative flex w-full cursor-default items-start gap-[9px] rounded-[8px] px-[8px] py-[6px] text-left hover:bg-[color-mix(in_srgb,var(--cc-text)_6%,transparent)]"
                style={{ background: on ? "color-mix(in srgb, var(--cc-text) 7%, transparent)" : undefined }}
              >
                {/* down from this mark to the next one, in this one's color */}
                <span aria-hidden className="absolute top-[24px] -bottom-[6px] left-[14.25px] w-[1.5px] rounded-full opacity-45" style={{ background: r.tone }} />
                {/* the mark says where it stands; its name is there for a screen reader */}
                <span role="img" aria-label={r.label} title={r.label} className="mt-[2px] flex size-[14px] flex-none items-center justify-center">
                  {r.mark === "merged" ? <MergedMark size={14} color={MERGED} /> : <CheckState state={r.mark} size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate" style={{ color: "var(--cc-text-strong)", fontWeight: on ? 500 : 400 }}>
                    {p.title}
                  </span>
                  <span className="mt-[1px] block truncate text-[12px]" style={{ color: "var(--cc-text-muted)" }}>
                    #{p.number} · {p.head}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        <li className="flex items-center gap-[9px] px-[8px] py-[5px]">
          <span className="flex size-[14px] flex-none items-center justify-center">
            <span className="size-[9px] rounded-full" style={{ boxShadow: "inset 0 0 0 1.5px var(--cc-text-muted)" }} />
          </span>
          <code className="rounded-[5px] px-[5px] text-[11.5px] leading-[18px]" style={BRANCH_CHIP}>
            {stack[0].base}
          </code>
        </li>
      </ol>
    </div>
  );
}

/** One line of what the merge depends on: a small state mark and what it says. */
function Requirement({ state, children }: { state: PrCheck["state"]; children: ReactNode }) {
  return (
    <li className="flex items-center gap-[8px]">
      <CheckState state={state} size={12} />
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

/**
 * Where the pull request stands, and the merge. A header names it, a short
 * list says what the merge depends on (each with its check mark), and the
 * button merges, or queues the merge until the checks pass. After merging,
 * the branch can be deleted.
 */
function MergeBox({
  pr,
  base,
  blockedBy,
  stack,
  statuses,
  onOpenPr,
  state,
  checks,
  strategy,
  onStrategy,
  onMerge,
}: {
  pr: PullRequest;
  /** its stack, when it's in one (shown in the card, in place of what the merge depends on), where each stands, and opening one */
  stack: PullRequest[];
  statuses: Readonly<Record<number, PrStatus>>;
  onOpenPr: (n: number) => void;
  /** the branch it merges into: its own base, or main once the one it's stacked on has merged */
  base: string;
  /** the pull request it's stacked on, until that one merges */
  blockedBy?: PullRequest;
  state: PrState;
  checks: PrCheck[];
  strategy: Strategy;
  onStrategy: (s: Strategy) => void;
  onMerge: () => void;
}) {
  const [deleted, setDeleted] = useState(false);
  const merged = state === "merged";
  const queued = state === "queued";
  const passed = checks.filter((c) => c.state === "success").length;
  const failed = checks.filter((c) => c.state === "failure").length;
  const pending = checks.length - passed - failed;
  const { head, author } = pr;
  const failedLine = `${failed} ${failed === 1 ? "check" : "checks"} failed`;
  const [title, detail] = merged
    ? [`${STRATEGIES[strategy].done} into ${base}`, `${author} merged just now`]
    : blockedBy
      ? queued
        ? [`Merging after #${blockedBy.number}`, `It merges once #${blockedBy.number}, under it, has merged`]
        : [`Waiting on #${blockedBy.number}`, `Stacked on #${blockedBy.number}: it merges after that one`]
    : queued
      ? failed
        ? ["Merge waiting on a failed check", "It merges once a re-run or a fix passes"]
        : ["Merging when checks pass", `${STRATEGIES[strategy].label} once ${pending === 1 ? "the last check passes" : `the last ${pending} checks pass`}`]
      : failed
        ? [failedLine, "Re-run it or push a fix before merging"]
        : pending
          ? ["Checks in progress", "It can merge once they pass"]
          : ["Ready to merge", "All checks passed and nothing conflicts"];
  return (
    // it reads as a card at any panel width: it stops growing, left in line with the rest, past MERGE_MAX_W
    <div className="mx-[16px] mb-[14px] rounded-[12px] p-[14px]" style={{ background: "var(--cc-tab)", maxWidth: MERGE_MAX_W }}>
      <div className="flex">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={title} className="min-w-0 flex-1" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            <div className="truncate text-[14px] leading-[19px] font-medium" style={{ color: "var(--cc-text-strong)" }}>
              {title}
            </div>
            <div className="truncate text-[12.5px] leading-[17px]" style={{ color: "var(--cc-text-muted)" }}>
              {detail}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* stacked: the stack says what it all waits on; otherwise, a rule (drawn from the text color, so it
          shows on the card's gray in either appearance) and what the merge depends on */}
      {stack.length > 1 ? (
        <StackList stack={stack} current={pr.number} statuses={statuses} onOpen={onOpenPr} />
      ) : (
        <ul
          className="mt-[12px] flex flex-col gap-[7px] pt-[12px] text-[12.5px]"
          style={{ color: "var(--cc-text)", boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--cc-text) 22%, transparent)" }}
        >
          {merged ? (
            <>
              <Requirement state="success">
                {checks.length} of {checks.length} checks passed
              </Requirement>
              <Requirement state={deleted ? "success" : "queued"}>{deleted ? `${head} deleted` : `${head} can be deleted`}</Requirement>
            </>
          ) : (
            <>
              <Requirement state={failed ? "failure" : pending ? "running" : "success"}>
                {failed
                  ? `${failedLine}, ${passed} of ${checks.length} passed`
                  : pending
                    ? `${passed} of ${checks.length} checks passed, ${pending} in progress`
                    : `All ${checks.length} checks passed`}
              </Requirement>
              {blockedBy && <Requirement state="queued">#{blockedBy.number} has to merge first</Requirement>}
              <Requirement state="success">No conflicts with {base}</Requirement>
            </>
          )}
        </ul>
      )}

      {/* nothing left to do once the branch is gone */}
      {!(merged && deleted) && (
        <div className="mt-[14px] flex items-center gap-[8px]">
          {merged ? (
            // a quiet afterthought: muted, an outline and no fill until it's pointed at
            <button
              type="button"
              onClick={() => setDeleted(true)}
              className="h-[28px] cursor-default rounded-[8px] px-[11px] text-(--cc-text-muted) hover:bg-[color-mix(in_srgb,var(--cc-text)_7%,transparent)] hover:text-(--cc-text)"
              style={{ boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--cc-text) 18%, transparent)" }}
            >
              Delete branch
            </button>
          ) : (
            // one button group: the merge, and a chevron for the other ways to merge
            <div data-focus-group className={`flex h-[30px] items-stretch text-white ${queued ? "opacity-60" : ""}`}>
              <button
                type="button"
                disabled={queued}
                onClick={onMerge}
                className="cursor-default rounded-l-[8px] pr-[11px] pl-[12px] font-medium enabled:hover:brightness-110"
                style={{ background: MERGE_GREEN }}
              >
                {queued ? "Merge queued" : pending || failed || blockedBy ? "Merge when ready" : STRATEGIES[strategy].label}
              </button>
              <Popover
                placement="bottom-start"
                offset={6}
                className="flex"
                trigger={({ open, toggle }) => (
                  <button
                    type="button"
                    aria-label="Merge options"
                    aria-expanded={open}
                    disabled={queued}
                    onClick={toggle}
                    className="flex w-[28px] cursor-default items-center justify-center rounded-r-[8px] enabled:hover:brightness-110"
                    // a hairline between the two halves
                    style={{ background: MERGE_GREEN, boxShadow: "inset 1px 0 0 rgb(255 255 255 / 0.22)" }}
                  >
                    <Icon name="chevronDown" size={11} />
                  </button>
                )}
              >
                <Menu width={208}>
                  {(Object.keys(STRATEGIES) as Strategy[]).map((s) => (
                    <MenuItem
                      key={s}
                      inset={false}
                      label={STRATEGIES[s].label}
                      description={STRATEGIES[s].description}
                      checked={s === strategy}
                      onSelect={() => onStrategy(s)}
                    />
                  ))}
                </Menu>
              </Popover>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The description as GitHub renders it. */
function Body({ body }: { body: PrBody }) {
  return (
    <div className="flex flex-col gap-[8px] leading-[19px]" style={{ color: "var(--cc-text)" }}>
      {body.map((b, i) =>
        "h" in b ? (
          <h4 key={i} className="mt-[4px] text-[13.5px] font-semibold first:mt-0" style={{ color: "var(--cc-text-strong)" }}>
            {b.h}
          </h4>
        ) : "p" in b ? (
          <p key={i}>{b.p}</p>
        ) : "list" in b ? (
          <ul key={i} className="flex list-disc flex-col gap-[4px] pl-[18px]">
            {b.list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <ul key={i} className="flex flex-col gap-[5px]">
            {b.tasks.map((t) => (
              <li key={t.label} className="flex items-start gap-[8px]">
                <span
                  aria-label={t.done ? "Done" : "Not done"}
                  className="mt-[2px] flex size-[14px] flex-none items-center justify-center rounded-[4px]"
                  style={t.done ? { background: "var(--cc-check)", color: "#fff" } : { boxShadow: "inset 0 0 0 1px var(--cc-field-border)" }}
                >
                  {t.done && <Icon name="check" size={10} />}
                </span>
                {t.label}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

/** Where a pull request stands, for the list of them: its state and how its checks are going. */
export type PrStatus = { state: PrState; checks: PrCheck["state"]; passed: number; total: number };

/** One pull request's page: its overview, its checks (and each one's page), and its files. */
function PrDetail({
  pr,
  onBack,
  onStatus,
  statuses,
  onOpenPr,
  expanded,
  onExpand,
  onClose,
}: {
  pr: PullRequest;
  /** where every pull request stands: a stacked one waits on the one it builds on, and shows its stack */
  statuses: Readonly<Record<number, PrStatus>>;
  onOpenPr: (n: number) => void;
  /** back to the list of the session's pull requests, when it has more than one */
  onBack?: () => void;
  onStatus: (number: number, status: PrStatus) => void;
  expanded: boolean;
  onExpand: () => void;
  onClose: () => void;
}) {
  const files = pr.files;
  const [tab, setTab] = useState<Tab>("overview");
  const [asked, setAsked] = useState<PrState>(pr.state);
  const [strategy, setStrategy] = useState<Strategy>("squash");
  const { checks, rerun } = useChecks(pr);
  const [scroller, scrollFade] = useEdgeFade<HTMLDivElement>("y", 24);
  // checks still to finish, running or waiting their turn, and checks that failed
  const running = checks.filter((c) => c.state === "running" || c.state === "queued").length;
  const failed = checks.filter((c) => c.state === "failure").length;
  // the check whose page is open in the Checks tab (none: the list)
  const [shown, setShown] = useState<number | null>(null);
  const openCheck = (i: number) => {
    setShown(i);
    setTab("checks");
  };
  // The overview's sections: open, except Checks once every check is done (there's nothing to
  // watch). One that's been opened or folded by hand stays that way, while another tab is open too.
  const [chosen, setChosen] = useState<Readonly<Record<string, boolean>>>({});
  const fold = (title: string) => {
    const open = chosen[title] ?? (title === "Checks" ? running > 0 || failed > 0 : true);
    return { title, open, onToggle: () => setChosen((c) => ({ ...c, [title]: !open })) };
  };
  // Stacked, it waits on the pull request it builds on: until that one merges it can't, and once it
  // has, its base moves down to that one's base (main), the way GitHub retargets it.
  const parent = parentOf(pr);
  const blockedBy = parent && statuses[parent.number]?.state !== "merged" ? parent : undefined;
  // down past every merged one under it: #10 on #9 on #7 goes into main once both have merged
  let base = pr.base;
  for (let below = parent; below && statuses[below.number]?.state === "merged"; below = parentOf(below)) base = below.base;
  const stack = stackOf(pr);
  // a queued merge goes through once nothing's running, nothing has failed and nothing's under it
  const state: PrState = asked === "queued" && !running && !failed && !blockedBy ? "merged" : asked;
  const passed = checks.filter((c) => c.state === "success").length;
  const added = files.reduce((n, f) => n + f.added, 0);
  const removed = files.reduce((n, f) => n + f.removed, 0);
  // the list of pull requests shows how this one is going
  const overall: PrCheck["state"] = failed ? "failure" : running ? "running" : "success";
  useEffect(() => onStatus(pr.number, { state, checks: overall, passed, total: checks.length }), [onStatus, pr.number, state, overall, passed, checks.length]);

  const checksAside = (
    <span className="flex items-center gap-[6px] font-normal">
      <CheckState state={failed ? "failure" : running ? "running" : "success"} />
      {passed} of {checks.length} passed
    </span>
  );

  return (
    <PanelFrame
      expanded={expanded}
      onExpand={onExpand}
      onClose={onClose}
      title={
        <div role="tablist" className="flex items-center gap-[2px]">
          {onBack && <BarButton icon="chevronLeft" size={13} label="All pull requests" onClick={onBack} />}
          <PanelTab active={tab === "overview"} label="Overview" icon={<PrMark size={13} color={state === "merged" ? MERGED : OPEN} />} onSelect={() => setTab("overview")} />
          <PanelTab
            active={tab === "checks"}
            label={`Checks ${checks.length}`}
            onSelect={() => {
              setTab("checks");
              setShown(null);
            }}
          />
          <PanelTab active={tab === "files"} label={`Files changed ${files.length}`} onSelect={() => setTab("files")} />
        </div>
      }
      actions={
        <BarButton icon="external" label="Open on GitHub" />
      }
    >
      {/* its top and bottom fade while there's more to scroll that way, instead of cutting off at the bar or the edge */}
      <div ref={scroller} className="absolute inset-0 overflow-y-auto" style={{ scrollbarWidth: "thin", ...scrollFade }}>
        {tab === "overview" && (
          <>
            <header className="px-[16px] pt-[12px] pb-[14px]">
              <h2 className="text-[16px] leading-[22px] font-medium text-pretty" style={{ color: "var(--cc-text-strong)" }}>
                {pr.title} <span style={{ color: "var(--cc-text-muted)", fontWeight: 400 }}>#{pr.number}</span>
              </h2>
              <p className="mt-[10px] leading-[24px]" style={{ color: "var(--cc-text-muted)" }}>
                <StatePill state={state} />
                <span style={{ color: "var(--cc-text-strong)" }}>{pr.author}</span> {state === "merged" ? "merged" : "wants to merge"} {pr.commits}{" "}
                {pr.commits === 1 ? "commit" : "commits"} into <Branch>{base}</Branch> from <Branch>{pr.head}</Branch>
              </p>
            </header>
            <MergeBox pr={pr} base={base} blockedBy={blockedBy} stack={stack} statuses={statuses} onOpenPr={onOpenPr} state={state} checks={checks} strategy={strategy} onStrategy={setStrategy} onMerge={() => setAsked(running || failed || blockedBy ? "queued" : "merged")} />
            <Section {...fold("Checks")} aside={checksAside}>
              <ul>
                {checks.map((c, i) => (
                  <CheckRow key={c.name} check={c} onOpen={() => openCheck(i)} />
                ))}
              </ul>
            </Section>
            <Section
              {...fold("Changes")}
              aside={
                <button type="button" className="cursor-default font-normal hover:underline" style={{ color: "var(--cc-link)" }} onClick={() => setTab("files")}>
                  View files
                </button>
              }
            >
              <div className="flex items-center gap-[8px]" style={{ color: "var(--cc-text)" }}>
                <Stats added={added} removed={removed} />
                <span style={{ color: "var(--cc-text-muted)" }}>
                  across {files.length} files · {pr.commits} {pr.commits === 1 ? "commit" : "commits"}
                </span>
              </div>
            </Section>
            <Section {...fold("Description")}>
              <Body body={pr.body} />
            </Section>
          </>
        )}
        {tab === "checks" &&
          (shown === null ? (
            <ul className="px-[16px] py-[8px]">
              {checks.map((c, i) => (
                <CheckRow key={c.name} check={c} onOpen={() => setShown(i)} />
              ))}
            </ul>
          ) : (
            // a new run starts its page afresh (which steps are open)
            <CheckDetail key={`${shown}-${checks[shown].attempt}`} check={checks[shown]} onBack={() => setShown(null)} onRerun={() => rerun(shown)} />
          ))}
        {tab === "files" && (
          <div className="min-h-full" style={{ background: "var(--cc-code-pane)" }}>
            {files.map((f) => (
              <FileDiff key={f.dir + f.name} file={f} />
            ))}
          </div>
        )}
      </div>
    </PanelFrame>
  );
}

/**
 * Which of the session's pull requests the panel shows: one (a link in the
 * conversation names it), or none, for the list of them. Main keeps it.
 */
type PrStore = {
  focus: number | null;
  setFocus: (n: number | null) => void;
  /** where each pull request stands: kept by the session, so its header can show it with the panel shut */
  statuses: Readonly<Record<number, PrStatus>>;
  report: (n: number, status: PrStatus) => void;
};
const PrStoreContext = createContext<PrStore>({ focus: null, setFocus: () => {}, statuses: {}, report: () => {} });
export const PrStoreProvider = PrStoreContext.Provider;

/** How a pull request stands before its page has said: its own state, and its checks as they start. */
const startingStatus = (pr: PullRequest): PrStatus => {
  const passed = pr.checks.filter((c) => c.state === "success").length;
  return { state: pr.state, checks: passed === pr.checks.length ? "success" : "running", passed, total: pr.checks.length };
};

/** The session's pull requests' store: which one the panel shows, and where each stands. Main keeps it. */
export function usePrStore(): PrStore {
  const [focus, setFocus] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<Readonly<Record<number, PrStatus>>>(() => Object.fromEntries(PULL_REQUESTS.map((pr) => [pr.number, startingStatus(pr)])));
  const report = useCallback(
    (n: number, st: PrStatus) =>
      setStatuses((all) => {
        const was = all[n];
        return was && was.state === st.state && was.checks === st.checks && was.passed === st.passed ? all : { ...all, [n]: st };
      }),
    [],
  );
  return { focus, setFocus, statuses, report };
}

/** The pull request a stacked one builds on: the one whose branch is its base. */
const parentOf = (pr: PullRequest) => PULL_REQUESTS.find((p) => p.head === pr.base);
/** The pull request stacked on this one, if any. */
const childOf = (pr: PullRequest) => PULL_REQUESTS.find((p) => p.base === pr.head);
/** A pull request's whole stack, from the one on its base branch up to the top; just itself if it's not stacked. */
function stackOf(pr: PullRequest) {
  let root = pr;
  for (let up = parentOf(root); up; up = parentOf(root)) root = up;
  const stack = [root];
  for (let next = childOf(root); next; next = childOf(next)) stack.push(next);
  return stack;
}

/** The pull request's mark in its state's color: green while open, purple once merged. */
function PrStateMark({ state, size = 15 }: { state: PrState; size?: number }) {
  return state === "merged" ? <MergedMark size={size} color={MERGED} /> : <PrMark size={size} color={OPEN} />;
}

/** One pull request in the list: its mark, title and number, branch and when it changed; then its checks and size. */
// Stacks are drawn like the sidebar's nested sessions: the pull requests on a
// branch sit one step in under the one it's for, and a tree line comes out of
// that one, level with the middle of its second line, and runs down through
// them, ending in a hook into the last one's mark.
/** where a row's mark starts, and a stacked one's (pt) */
const ROW_X = 16;
const STACKED_X = 38;
/** the mark's size, and its top within the row: the tree line meets the middle of it */
const MARK = 15;
const MARK_TOP = 13;
/** the middle of a row's second line ("Open · branch · when"), where the tree line leaves the bottom pull request */
const SUBTITLE_MID = 42.5;

function PrRow({
  pr,
  status,
  stacked,
  stackBase,
  last,
  endsGroup,
  onOpen,
}: {
  pr: PullRequest;
  status: PrStatus;
  /** others are stacked on it: the tree line starts in its row, under its mark */
  stackBase?: boolean;
  /** it's on another pull request's branch: it sits one step in, on the tree line */
  stacked?: boolean;
  /** the last of its stack's pull requests: the line hooks into it */
  last?: boolean;
  /** its stack (or itself) ends here: a rule under it */
  endsGroup: boolean;
  onOpen: () => void;
}) {
  const added = pr.files.reduce((n, f) => n + f.added, 0);
  const removed = pr.files.reduce((n, f) => n + f.removed, 0);
  const mid = MARK_TOP + MARK / 2;
  return (
    <li style={{ borderBottom: endsGroup ? "1px solid var(--cc-rule)" : undefined }}>
      <button
        type="button"
        onClick={onOpen}
        className="relative flex w-full cursor-default items-start gap-[10px] py-[11px] pr-[16px] text-left hover:bg-(--cc-button-hover)"
        style={{ paddingLeft: stacked ? STACKED_X : ROW_X }}
      >
        {stackBase && (
          // the tree line comes out of this one, level with the middle of its second line
          <span aria-hidden className="absolute bottom-0 border-l" style={{ left: ROW_X + MARK / 2 - 0.5, top: SUBTITLE_MID, borderColor: "var(--cc-tree)" }} />
        )}
        {stacked && (
          // and runs on down, hooking into the last one's mark
          <span
            aria-hidden
            className="absolute top-0 border-l"
            style={{
              left: ROW_X + MARK / 2 - 0.5,
              height: last ? mid : "100%",
              width: STACKED_X - 3 - (ROW_X + MARK / 2 - 0.5),
              borderColor: "var(--cc-tree)",
              borderBottomWidth: last ? 1 : 0,
              borderBottomLeftRadius: last ? 4 : 0,
            }}
          />
        )}
        <span className="mt-[2px] flex-none">
          <PrStateMark state={status.state} />
        </span>
        <span className="min-w-0 flex-1">
          {/* the checks and size ride on the title's line, so the line under it has the row's whole width */}
          <span className="flex items-center gap-[10px]">
            <span className="min-w-0 flex-1 truncate font-medium" style={{ color: "var(--cc-text-strong)" }}>
              {pr.title} <span style={{ color: "var(--cc-text-muted)", fontWeight: 400 }}>#{pr.number}</span>
            </span>
            <span className="flex flex-none items-center gap-[10px] text-[12px]">
              <span className="flex items-center gap-[5px] tabular-nums" style={{ color: "var(--cc-text-muted)" }}>
                <CheckState state={status.checks} size={12} />
                {status.passed}/{status.total}
              </span>
              <Stats added={added} removed={removed} />
            </span>
          </span>
          <span className="mt-[3px] block truncate text-[12px]" style={{ color: "var(--cc-text-muted)" }}>
            {status.state === "merged" ? "Merged" : "Open"} · {parentOf(pr) ? `on #${parentOf(pr)!.number} · ` : ""}
            {pr.head} · {pr.updated}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * The session's pull requests. With one, its page; with more, a list of them
 * first, each opening onto its page (and the page back onto the list). Every
 * page stays mounted while the panel is open, so each keeps where it was (its
 * tab, its merge) and its checks keep running while another is on show.
 */
export function PrPanel({ expanded, onExpand, onClose }: { expanded: boolean; onExpand: () => void; onClose: () => void }) {
  const { focus, setFocus, statuses, report: onStatus } = useContext(PrStoreContext);
  const many = PULL_REQUESTS.length > 1;
  const shown = focus ?? (many ? null : PULL_REQUESTS[0].number);
  const [list, listFade] = useEdgeFade<HTMLDivElement>("y", 24);

  return (
    <>
      {shown === null && (
        <PanelFrame
          expanded={expanded}
          onExpand={onExpand}
          onClose={onClose}
          title={
            <span className="flex items-center gap-[6px] pl-[8px]" style={{ color: "var(--cc-text-strong)" }}>
              Pull requests
              <span className="rounded-full px-[6px] text-[11px] leading-[16px] tabular-nums" style={{ background: "var(--cc-tab)", color: "var(--cc-text-muted)" }}>
                {PULL_REQUESTS.length}
              </span>
            </span>
          }
        >
          <div ref={list} className="absolute inset-0 overflow-y-auto" style={{ scrollbarWidth: "thin", ...listFade }}>
            <ul>
              {PULL_REQUESTS.filter((pr) => !parentOf(pr))
                .reverse()
                .flatMap((root) => stackOf(root).map((pr, i, stack) => ({ pr, i, size: stack.length })))
                .map(({ pr, i, size }) => (
                  <PrRow
                    key={pr.number}
                    pr={pr}
                    status={statuses[pr.number]}
                    stacked={i > 0}
                    stackBase={i === 0 && size > 1}
                    last={i === size - 1}
                    endsGroup={i === size - 1}
                    onOpen={() => setFocus(pr.number)}
                  />
                ))}
            </ul>
          </div>
        </PanelFrame>
      )}
      {PULL_REQUESTS.map((pr) => (
        <div key={pr.number} className="size-full" hidden={pr.number !== shown}>
          <PrDetail
            pr={pr}
            onBack={many ? () => setFocus(null) : undefined}
            onStatus={onStatus}
            statuses={statuses}
            onOpenPr={setFocus}
            expanded={expanded}
            onExpand={onExpand}
            onClose={onClose}
          />
        </div>
      ))}
    </>
  );
}
