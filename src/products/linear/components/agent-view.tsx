"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, IconButton } from "./chrome";
import { AttachIcon, StarIcon } from "./code-icons";
import { DIFFS, ISSUE_STATUS, ME, REPOS, diffKey } from "./code-data";
import { STATUSES } from "./data";
import { Menu } from "./diff-conversation";
import { DiffStateIcon, RepoIcon, StatusIcon } from "./glyphs";
import { ChevronDownIcon, MoreIcon, PriorityNoneIcon } from "./icons";
import { Check, ROW, IDLE } from "./reviewer-picker";
import { useApp } from "./router";
import {
  AGENTS,
  AgentMark,
  Caption,
  Caret,
  CommitChip,
  Feedback,
  Inline,
  Log,
  WorkingGrid,
  agentOf,
  clock,
  runState,
  scriptOf,
  startRun,
  updateRun,
  useRunClock,
  useRuns,
  type AgentId,
  type Run,
} from "./session";

// Linear Agent, where a coding session starts, after a recording of the live
// app (Oct 2026). Empty, it's the "New chat" page: a faint Linear mark behind
// "Welcome to Linear", the composer, suggestions. Once you write, it's a chat:
// the time centred on top, your messages as soft bubbles on the right, and
// Linear's turns on the left: "Worked for 4 seconds ▸", then what it made (an
// issue as a card, a coding session as a live card with its log streaming
// and a timer), its answer, and a way to rate or copy it. "Reply…" stays
// pinned at the foot, with "↓ Latest" floating over it when you've scrolled
// up. The session card opens the session itself.

const SUGGESTIONS = (repo: string) => [
  `Compare every KPI with the previous period in ${repo}`,
  "Find and fix the flakiest test",
  "Add loading skeletons to every chart",
];

const SKILLS = [
  { id: "none", label: "No skill" },
  { id: "review", label: "Code review", detail: "Read a diff, leave notes" },
  { id: "tests", label: "Write tests" },
  { id: "triage", label: "Triage" },
] as const;

/** Linear's mark, drawn as an outline for the empty state's backdrop. */
function Backdrop() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
      className="pointer-events-none absolute top-0 left-1/2 w-[300px] -translate-x-1/2 text-(--ln-chip-border) [mask-image:linear-gradient(to_bottom,black_30%,transparent_85%)]"
    >
      <path
        stroke="currentColor"
        strokeWidth=".6"
        d="M1.225 61.523c-.222-.949.908-1.546 1.597-.857l36.512 36.512c.69.69.092 1.82-.857 1.597-18.425-4.323-32.93-18.827-37.252-37.252ZM.002 46.889a.99.99 0 0 0 .29.76L52.35 99.71c.201.2.478.307.76.29 2.37-.149 4.695-.46 6.963-.927.765-.157 1.03-1.096.478-1.648L2.576 39.448c-.552-.551-1.491-.286-1.648.479a50.067 50.067 0 0 0-.926 6.962ZM4.21 29.705a.988.988 0 0 0 .208 1.1l64.776 64.776c.289.29.726.375 1.1.208a49.908 49.908 0 0 0 5.185-2.684.981.981 0 0 0 .183-1.54L8.436 24.336a.981.981 0 0 0-1.541.183 49.896 49.896 0 0 0-2.684 5.185Zm8.448-11.631a.986.986 0 0 1-.045-1.354C21.78 6.46 35.111 0 49.952 0 77.592 0 100 22.407 100 50.048c0 14.84-6.46 28.172-16.72 37.338a.986.986 0 0 1-1.354-.045L12.659 18.074Z"
      />
    </svg>
  );
}

/** A footer chip that opens a small menu: the repo, the agent. */
function Chooser<T extends string>({
  icon,
  label,
  options,
  value,
  onPick,
  search,
}: {
  icon?: ReactNode;
  label: string;
  options: { id: T; label: string; detail?: string; icon?: ReactNode }[];
  value: T;
  onPick: (v: T) => void;
  /** a search row on top, as the assignee menu has, with this placeholder */
  search?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const close = () => {
    setOpen(false);
    setQ("");
  };
  return (
    <span className="relative flex">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex h-7 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-(--ln-text-muted) hover:bg-(--ln-ghost-hover) hover:text-(--ln-text-header) aria-expanded:bg-(--ln-ghost-hover)"
      >
        {icon}
        {label}
        <ChevronDownIcon size={8} />
      </button>
      {open && (
        <Menu onClose={close} place={`bottom-full left-0 mb-1.5 w-60 ${search ? "p-0" : "p-1.5"}`}>
          {search && (
            <div className="flex h-9 items-center border-b-[0.5px] border-(--ln-popover-border) pr-[11px] pl-[13.5px]">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && shown[0]) {
                    onPick(shown[0].id);
                    close();
                  }
                }}
                placeholder={search}
                className="ln-search min-w-0 flex-1 bg-transparent text-[13px] font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
              />
            </div>
          )}
          <div className={search ? "max-h-64 overflow-y-auto p-1.5" : ""}>
          {shown.length === 0 && <p className="px-2 py-2 text-[13px] text-(--ln-text-muted)">No match for “{q}”</p>}
          {shown.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitemradio"
              aria-checked={o.id === value}
              onClick={() => {
                onPick(o.id);
                close();
              }}
              className={`${ROW} ${IDLE}`}
            >
              {o.icon}
              <span className="min-w-0 truncate">{o.label}</span>
              {o.detail && <span className="shrink-0 text-xs text-(--ln-text-muted)">{o.detail}</span>}
              <span className="ml-auto flex shrink-0 pr-1">{o.id === value && <Check />}</span>
            </button>
          ))}
          </div>
        </Menu>
      )}
    </span>
  );
}

/** Send, as the live app draws it: an arrow in a raised neutral circle. */
function SendButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Send"
      disabled={disabled}
      onClick={onClick}
      className="ln-pill flex size-7 items-center justify-center rounded-full text-(--ln-text) disabled:text-(--ln-text-muted)"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M6 10V2M2.75 5.25 6 2l3.25 3.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** The composer: a card with the text, then Skills, the repo and the agent on the left, attach and send on the right. */
function Composer({
  placeholder,
  repo,
  setRepo,
  agent,
  setAgent,
  onSend,
  autoFocus,
}: {
  placeholder: string;
  repo: string;
  setRepo: (r: string) => void;
  agent: AgentId;
  setAgent: (a: AgentId) => void;
  onSend: (text: string) => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [skill, setSkill] = useState<(typeof SKILLS)[number]["id"]>("none");
  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };
  const a = agentOf(agent);
  return (
    <div className="w-full rounded-xl border-[0.5px] border-(--ln-card-border) bg-(--ln-card) shadow-(--ln-main-shadow)">
      <textarea
        autoFocus={autoFocus}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        className="ln-search block w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] leading-6 font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
      />
      <div className="flex items-center gap-0.5 px-2 pt-1 pb-2">
        <Chooser label={skill === "none" ? "Skills" : SKILLS.find((x) => x.id === skill)!.label} value={skill} onPick={setSkill} options={SKILLS.map((x) => ({ id: x.id, label: x.label }))} />
        <Chooser
          icon={<RepoIcon size={14} />}
          label={repo}
          search="Switch repository…"
          value={repo}
          onPick={setRepo}
          // a repo just imported from GitHub is offered too, before the list catches up
          options={[...new Set([repo, ...REPOS.map((r) => r.slug)])].map((slug) => ({ id: slug, label: slug, icon: <RepoIcon size={14} className="shrink-0 text-(--ln-text-muted)" /> }))}
        />
        <Chooser
          icon={<AgentMark agent={a.id} />}
          label={a.name}
          value={agent}
          onPick={setAgent}
          options={AGENTS.map((x) => ({ id: x.id, label: x.name, detail: x.model, icon: <AgentMark agent={x.id} /> }))}
        />
        <span className="ml-auto flex items-center gap-1.5">
          <IconButton label="Attach images, files, or videos" className="size-7 text-(--ln-text-muted)">
            <AttachIcon size={14} />
          </IconButton>
          <SendButton disabled={!text.trim()} onClick={send} />
        </span>
      </div>
    </div>
  );
}

/** "Created AS-33": the issue as a card, its key over its title, then status, priority and assignee under a hairline. */
function IssueCard({ id, title }: { id: string; title: string }) {
  const { go } = useApp();
  const status = STATUSES.find((s) => s.id === ISSUE_STATUS[id]) ?? STATUSES[0];
  return (
    <button
      type="button"
      onClick={() => go({ page: "issues" })}
      className="w-full max-w-[420px] rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) text-left hover:bg-(--ln-item-hover)"
    >
      <div className="px-3.5 pt-2.5 pb-2">
        <div className="ln-tnum text-xs font-[450] text-(--ln-text-muted)">{id}</div>
        <div className="mt-0.5 truncate text-[13px] font-medium text-(--ln-text)">{title}</div>
      </div>
      <div className="flex h-9 items-center gap-3 border-t-[0.5px] border-(--ln-card-border) px-3.5 text-xs font-[450] text-(--ln-text-muted)">
        <span className="flex items-center gap-1.5">
          <StatusIcon status={status} size={13} />
          {status.name}
        </span>
        <span className="flex items-center gap-1.5">
          <PriorityNoneIcon size={13} />
          No priority
        </span>
        <span className="flex items-center gap-1.5">
          <Avatar who={ME} size={14} />
          {ME.name}
        </span>
      </div>
    </button>
  );
}

/**
 * "Created coding session": the session as a live card. Its title, the dot
 * grid breathing beside a timer and a round stop button while it works; under
 * a hairline, its log streaming in a short scrolling window that keeps to the
 * latest line, folded by the caret at its foot. Once it lands, the diff it
 * opened.
 */
function SessionCard({ run }: { run: Run }) {
  const { go } = useApp();
  const t = useRunClock(run);
  const st = runState(run, t);
  const steps = scriptOf(run.repo, run.agent).filter((s) => s.at <= st.at);
  const diff = DIFFS.find((d) => d.number === run.diff);
  const [log, setLog] = useState(true);
  const tail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tail.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [steps.length]);
  return (
    <div className="w-full max-w-[560px] overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card)">
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <button type="button" onClick={() => go({ page: "session", id: run.id })} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[13px] font-medium text-(--ln-text) hover:underline">{run.title}</span>
          <span className="mt-1 flex items-center gap-2 text-xs font-[450] text-(--ln-text-muted)">
            <WorkingGrid live={st.working} />
            <span className="ln-tnum">{st.working ? clock(st.at) : st.stopped ? `Stopped at ${clock(st.at)}` : `Worked for ${Math.round(st.at)} seconds`}</span>
          </span>
        </button>
        {st.working ? (
          <button
            type="button"
            aria-label="Stop session"
            onClick={() => updateRun(run.id, { stoppedAt: Date.now() })}
            className="ln-pill flex size-7 shrink-0 items-center justify-center rounded-full text-(--ln-text)"
          >
            <span className="size-2 rounded-[2px] bg-current" />
          </button>
        ) : (
          <button type="button" onClick={() => go({ page: "session", id: run.id })} className="ln-pill h-7 shrink-0 rounded-full px-3 text-xs font-medium text-(--ln-text-header)">
            Open session
          </button>
        )}
      </div>
      <div className="relative border-t-[0.5px] border-(--ln-card-border)">
        {log && (
          <div ref={tail} className="max-h-[188px] overflow-y-auto px-3.5 pt-3 pb-6">
            <Log steps={steps} />
          </div>
        )}
        <button
          type="button"
          aria-label={log ? "Hide log" : "Show log"}
          aria-expanded={log}
          onClick={() => setLog(!log)}
          className={`flex w-full justify-center text-(--ln-text-muted) hover:text-(--ln-text-header) ${log ? "absolute bottom-0 h-5 bg-gradient-to-t from-(--ln-card) to-transparent" : "h-6 items-center"}`}
        >
          <ChevronDownIcon size={8} className={log ? "rotate-180" : ""} />
        </button>
      </div>
      {st.done && diff && (
        <button
          type="button"
          onClick={() => go({ page: "diff", key: diffKey(diff), tab: "diff" })}
          className="flex h-10 w-full items-center gap-2 border-t-[0.5px] border-(--ln-card-border) px-3.5 text-left text-xs font-[450] text-(--ln-text-muted) hover:bg-(--ln-item-hover)"
        >
          <DiffStateIcon state={diff.state} size={14} />
          <span className="min-w-0 truncate font-medium text-(--ln-text)">{diff.title}</span>
          <span className="ln-tnum shrink-0 whitespace-nowrap">
            {diff.repo}#{diff.number}
          </span>
          <span className="ml-auto shrink-0">
            <CommitChip diff={diff} />
          </span>
        </button>
      )}
    </div>
  );
}

type Item =
  | { kind: "you"; text: string }
  /** Linear's turn: how long it thought, what it made, and what it says */
  | { kind: "linear"; seconds: number; steps: string[]; issue?: { id: string; title: string }; run?: string; text: string };

function Reply({ item, runs }: { item: Extract<Item, { kind: "linear" }>; runs: Run[] }) {
  const [open, setOpen] = useState(false);
  const run = runs.find((r) => r.id === item.run);
  return (
    <div className="flex flex-col gap-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-fit items-center gap-1.5 text-[13px] font-[450] text-(--ln-text-muted) hover:text-(--ln-text-header)">
        Worked for {item.seconds} seconds
        <Caret open={open} />
      </button>
      {open && (
        <ol className="flex flex-col gap-1.5 border-l-2 border-(--ln-chip-border) pl-3 text-[13px] font-[450] text-(--ln-text-muted)">
          {item.steps.map((s) => (
            <li key={s}>
              <Inline text={s} />
            </li>
          ))}
        </ol>
      )}
      {item.issue && (
        <>
          <Caption>Created {item.issue.id}</Caption>
          <IssueCard {...item.issue} />
        </>
      )}
      {run && (
        <>
          <Caption>Created coding session</Caption>
          <SessionCard run={run} />
        </>
      )}
      <p className="text-[15px] leading-6 font-[450] text-(--ln-text)">
        <Inline text={item.text} />
      </p>
      <Feedback text={item.text} />
    </div>
  );
}

/** Linear thinking before it answers: the dot grid and a word. */
function Thinking() {
  return (
    <div className="flex items-center gap-2 text-[13px] font-[450] text-(--ln-text-muted)">
      <WorkingGrid live />
      <span className="animate-pulse">Thinking…</span>
    </div>
  );
}

export function AgentView({ repo: startRepo }: { repo?: string }) {
  const [repo, setRepo] = useState(startRepo ?? REPOS[0].slug);
  const [agent, setAgent] = useState<AgentId>("claude");
  const [items, setItems] = useState<Item[]>([]);
  const [thinking, setThinking] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pinned, setPinned] = useState(true);
  const runs = useRuns();
  const scroller = useRef<HTMLDivElement>(null);

  const toLatest = (behavior: ScrollBehavior = "smooth") => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };
  // new turns keep the chat at its latest line, unless you've scrolled up to read
  useEffect(() => {
    if (pinned) toLatest();
  }, [items, thinking, pinned]);

  const send = (prompt: string) => {
    setStartedAt((t) => t ?? Date.now());
    setItems((xs) => [...xs, { kind: "you", text: prompt }]);
    setThinking(true);
    setPinned(true);
    const first = !items.some((x) => x.kind === "linear" && x.run);
    setTimeout(() => {
      setThinking(false);
      if (first) {
        const run = startRun(prompt, repo, agent);
        setItems((xs) => [
          ...xs,
          {
            kind: "linear",
            seconds: 4,
            steps: [`Read \`${repo}\` and its open diffs`, "Created AS-33 in Asia", `Started a coding session with ${agentOf(agent).name}`],
            issue: { id: "AS-33", title: run.title },
            run: run.id,
            text: `I've started on AS-33 in \`${repo}\`, and will open a draft diff for review once the checks pass.`,
          },
        ]);
      } else {
        setItems((xs) => [...xs, { kind: "linear", seconds: 2, steps: ["Relayed your message to the session"], text: "Passed that on to the coding session; it'll pick it up after its current step." }]);
      }
    }, 1600);
  };
  const first = items.find((x): x is Extract<Item, { kind: "linear" }> => x.kind === "linear" && !!x.issue);
  const title = first?.issue?.title ?? (items[0]?.kind === "you" ? items[0].text : undefined);
  const time = startedAt ? `Today ${new Date(startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "";

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-11 shrink-0 items-center gap-1 border-b-[0.5px] border-(--ln-header-rule) pr-2 pl-5 text-[13px] font-medium text-(--ln-text)">
        <button type="button" className="flex min-w-0 items-center gap-1.5 rounded-md">
          <span className="truncate">{title ?? "New chat"}</span>
          <ChevronDownIcon size={8} className="shrink-0 text-(--ln-text-muted)" />
        </button>
        {title && (
          <>
            <span className="ml-1.5 flex text-(--ln-icon-faint)">
              <StarIcon size={15} />
            </span>
            <IconButton label="More" className="ml-0.5 text-(--ln-text-muted)">
              <MoreIcon size={14} />
            </IconButton>
          </>
        )}
      </header>

      {items.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-16">
          <div className="relative w-full max-w-[680px] pt-[150px]">
            <Backdrop />
            <h2 className="relative text-center text-xl font-medium text-(--ln-text)">Welcome to Linear</h2>
            <div className="relative mt-5">
              <Composer placeholder="Ask Linear…" repo={repo} setRepo={setRepo} agent={agent} setAgent={setAgent} onSend={send} autoFocus />
            </div>
            {/* things to start with, here in the repo you're in */}
            <div className="relative mt-3 flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS(repo).map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="ln-pill h-7 rounded-full px-3 text-xs font-medium text-(--ln-text-header)">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget;
              setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
            }}
            className="min-h-0 flex-1 overflow-y-auto px-6"
          >
            <div className="mx-auto flex max-w-[720px] flex-col gap-7 pt-6 pb-8">
              <div className="text-center text-xs font-[450] text-(--ln-icon-faint)">{time}</div>
              {items.map((x, i) =>
                x.kind === "you" ? (
                  <div key={i} className="ml-auto max-w-[80%] rounded-xl bg-(--ln-pill-neutral) px-3.5 py-2.5 text-[15px] leading-6 font-[450] text-(--ln-text)">
                    {x.text}
                  </div>
                ) : (
                  <Reply key={i} item={x} runs={runs} />
                ),
              )}
              {thinking && <Thinking />}
            </div>
          </div>
          <div className="relative shrink-0 px-6 pb-5">
            {!pinned && (
              <button
                type="button"
                onClick={() => {
                  setPinned(true);
                  toLatest();
                }}
                className="ln-pill absolute -top-11 left-1/2 flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-(--ln-text-header)"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M6 2v8M2.75 6.75 6 10l3.25-3.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Latest
              </button>
            )}
            <div className="mx-auto max-w-[720px]">
              <Composer placeholder="Reply…" repo={repo} setRepo={setRepo} agent={agent} setAgent={setAgent} onSend={send} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
