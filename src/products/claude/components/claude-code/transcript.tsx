"use client";

import { useRef, useState } from "react";
import type { Block, Run, Task } from "./conversation";
import { Icon, type IconName } from "./icon";
import { Strong, ToolSummary } from "./tool-calls";
import { sourcesIn, useOpenViewer } from "./viewer";

/** Prose and tool rows stop 56pt short of the column's right edge (where a read image's thumbnail ends). */
const PROSE_INSET = 56;
/** A user's message leaves this much more space under it than the 14pt between other blocks. */
const BUBBLE_AFTER = 19;

/** Inline `code`: mono in clay red on a hairline-bordered chip. */
function CodeChip({ children }: { children: string }) {
  return (
    <code
      className="relative top-[1px] rounded-[5px] px-[3.5px] py-[1.5px] text-[0.9em]"
      style={{ fontFamily: "var(--cc-mono)", color: "var(--cc-code)", background: "var(--cc-code-bg)", boxShadow: "inset 0 0 0 0.5px var(--cc-code-border)" }}
    >
      {children}
    </code>
  );
}

/** A link to a file in the repo: blue, underlined. */
function FileLink({ children }: { children: string }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="underline decoration-1 underline-offset-[3px] hover:brightness-125"
      style={{ color: "var(--cc-link)" }}
    >
      {children}
    </a>
  );
}

/** A link to another session: its title on a dark blue chip. */
function SessionLink({ children }: { children: string }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="rounded-[6px] px-[6px] py-[1px] hover:brightness-125"
      style={{ color: "var(--cc-session-link)", background: "var(--cc-session-link-bg)" }}
    >
      {children}
    </a>
  );
}

export function Runs({ runs }: { runs: Run[] }) {
  return runs.map((r, i) =>
    typeof r === "string" ? (
      r
    ) : "code" in r ? (
      <CodeChip key={i}>{r.code}</CodeChip>
    ) : "link" in r ? (
      <FileLink key={i}>{r.link}</FileLink>
    ) : "session" in r ? (
      <SessionLink key={i}>{r.session}</SessionLink>
    ) : (
      <Strong key={i}>{r.strong}</Strong>
    ),
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end" style={{ marginBottom: BUBBLE_AFTER }}>
      <div
        className="max-w-[85%] rounded-[12px] px-[13px] py-[10px] text-[14px] leading-[20px]"
        style={{ background: "var(--cc-bubble)", color: "var(--cc-text-strong)" }}
      >
        {text}
      </div>
    </div>
  );
}

/** While a block streams in, its newest words fade up from transparent. */
function Caret() {
  return <span aria-hidden className="cc-caret" />;
}

function Prose({ runs, streaming }: { runs: Run[]; streaming?: boolean }) {
  return (
    <p className="px-[4.5px] text-[14px] leading-[20px]" style={{ marginRight: PROSE_INSET, color: "var(--cc-text-strong)" }}>
      <Runs runs={runs} />
      {streaming && <Caret />}
    </p>
  );
}

/** A bulleted list: bullets 13.5pt in, text at 31pt, 4pt between items (from the recording). It sits 3pt closer to the paragraph above than blocks usually do. */
function List({ items, streaming }: { items: Run[][]; streaming?: boolean }) {
  return (
    <ul
      className="-mt-[3px] flex flex-col gap-[4px] text-[14px] leading-[20px]"
      style={{ marginRight: PROSE_INSET, paddingLeft: 31, color: "var(--cc-text-strong)" }}
    >
      {items.map((runs, i) => (
        <li key={i} className="relative">
          <span aria-hidden className="absolute size-[5px] rounded-full" style={{ left: -17.5, top: 8, background: "var(--cc-text)" }} />
          <Runs runs={runs} />
          {streaming && i === items.length - 1 && <Caret />}
        </li>
      ))}
    </ul>
  );
}

/** Images sent to the user, drawn large side by side; each opens the viewer. */
function Images({ srcs }: { srcs: string[] }) {
  const openViewer = useOpenViewer();
  const root = useRef<HTMLDivElement>(null);
  return (
    <div ref={root} className="flex items-start gap-[8px] px-[4.5px]" style={{ marginRight: PROSE_INSET }}>
      {srcs.map((src, i) => (
        <button
          key={src}
          type="button"
          aria-label="View image"
          data-cc-image={src}
          onClick={() => openViewer(srcs, i, "Image", sourcesIn(root.current, srcs))}
          className="min-w-0 flex-1 overflow-hidden rounded-[8px] hover:brightness-110"
          style={{ maxWidth: 320, boxShadow: "0 0 0 1px var(--cc-card-rim)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={src} className="block h-auto w-full" />
        </button>
      ))}
    </div>
  );
}

const FOOTER_ACTIONS: { icon: IconName; label: string }[] = [
  { icon: "copy", label: "Copy" },
  { icon: "fork", label: "Fork from here" },
  { icon: "pin", label: "Pin" },
  { icon: "speaker", label: "Read aloud" },
];

/** The end of a turn: copy, fork, pin and read aloud on a 24pt pitch, then when it happened. */
function TurnFooter({ time }: { time: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="-mt-[6px] flex h-[24px] items-center px-[0.5px] text-[13px]" style={{ color: "var(--cc-text-muted)" }}>
      {FOOTER_ACTIONS.map((a) => (
        <button
          key={a.icon}
          type="button"
          aria-label={a.label}
          className="flex size-[24px] items-center justify-center rounded-[6px] hover:bg-(--cc-chip-hover) hover:text-(--cc-text)"
          onClick={() => {
            if (a.icon !== "copy") return;
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          <Icon name={a.icon === "copy" && copied ? "check" : a.icon} size={15} />
        </button>
      ))}
      <span className="ml-[6px]">{time}</span>
    </div>
  );
}

function TaskStatus({ status }: { status: Task["status"] }) {
  // done: a check in a filled disc; in progress: a solid ring; pending: a dashed ring
  if (status === "completed")
    return (
      <span aria-hidden className="mt-[4px] flex size-[12px] flex-none items-center justify-center rounded-full" style={{ background: "var(--cc-text-muted)" }}>
        <Icon name="check" size={9} style={{ color: "var(--cc-main)" }} />
      </span>
    );
  return (
    <span
      aria-hidden
      className="mt-[4px] size-[12px] flex-none rounded-full"
      style={status === "pending" ? { border: "1px dashed var(--cc-text-muted)" } : { border: "1.5px solid var(--cc-task-ring)" }}
    />
  );
}

/** The session's task list: one row per task on a 26pt pitch, in a hairline card. */
function TaskList({ items }: { items: Task[] }) {
  return (
    <ul
      className="-mt-[2px] flex flex-col gap-[6px] rounded-[12px] px-[18px] py-[16px] text-[14px]"
      style={{ boxShadow: "inset 0 0 0 1px var(--cc-card-border)", color: "var(--cc-text-strong)" }}
    >
      {items.map((t) => (
        <li
          key={t.label}
          className="flex min-h-[20px] items-start gap-[6.5px] leading-[20px] transition-colors duration-300"
          style={{ color: t.status === "completed" ? "var(--cc-text-muted)" : undefined }}
        >
          <TaskStatus status={t.status} />
          {t.label}
        </li>
      ))}
    </ul>
  );
}

export function TranscriptBlock({ block, streaming }: { block: Block; streaming?: boolean }) {
  switch (block.kind) {
    case "user":
      return <UserMessage text={block.text} />;
    case "text":
      return <Prose runs={block.runs} streaming={streaming} />;
    case "list":
      return <List items={block.items} streaming={streaming} />;
    case "tools":
      return <ToolSummary {...block} inset={PROSE_INSET} renderRuns={(runs) => <Runs runs={runs} />} />;
    case "images":
      return <Images srcs={block.srcs} />;
    case "tasks":
      return <TaskList items={block.items} />;
    case "footer":
      return <TurnFooter time={block.time} />;
  }
}

/** The spinner's clay dots in its 20pt slot: center x, center y and diameter (pt), as captured. */
const SPINNER_DOTS = [
  [4, 12.75, 4],
  [9.25, 5.75, 2.5],
  [12, 11.25, 3],
] as const;

/** Claude's working indicator: three clay dots pulsing in turn. */
function Spinner() {
  return (
    <span aria-hidden className="relative size-[20px] flex-none">
      {SPINNER_DOTS.map(([x, y, d], i) => (
        <span
          key={i}
          className="cc-blink absolute rounded-full"
          style={{ left: x - d / 2, top: y - d / 2, width: d, height: d, background: "var(--cc-clay)", animationDelay: `${i * 200}ms` }}
        />
      ))}
    </span>
  );
}

/** The turn in progress, under the transcript: the spinner, what it's doing (with a highlight sweeping across it), and tokens used. */
export function Working({ label, tokens }: { label: string; tokens: string }) {
  return (
    <div className="mt-[5px] flex h-[20px] items-center gap-[12px] px-[4.5px] text-[14px]" style={{ color: "var(--cc-text-muted)" }}>
      <Spinner />
      <span className="flex gap-[7.25px]">
        <span className="cc-shimmer">{label}</span>
        <span>{tokens}</span>
      </span>
    </div>
  );
}
