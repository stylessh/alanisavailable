"use client";

import { type ReactNode, useRef, useState } from "react";
import type { DiffLine, Run, ToolCall } from "./conversation";
import { highlightBash, highlightTsx } from "./highlight";
import { Icon } from "./icon";
import { sourcesIn, useOpenViewer } from "./viewer";

// Tool calls in the transcript (pt, from the recording). A summary row is
// 20pt of muted 14px text with a chevron; it expands into, for one call,
// that call's card, or for several, a bordered group with a 32pt row per
// call that expands in turn. Cards share a 1pt #282828 rim with r 8
// corners; code sits on #0a0a0a in 12.5px mono on a 17.5pt line.

const MONO = { fontFamily: "var(--cc-mono)", fontSize: 12.5, lineHeight: "17.5px" } as const;
const RIM = { boxShadow: "inset 0 0 0 1px var(--cc-card-rim)" } as const;

export function Strong({ children }: { children: ReactNode }) {
  return <span style={{ color: "var(--cc-text-strong)" }}>{children}</span>;
}

/** +added −removed as one pill split down the middle: green half, red half. */
export function DiffStat({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="inline-flex overflow-hidden rounded-[4px] text-[12px] leading-[16px] tabular-nums">
      <span className="px-[4px]" style={{ color: "var(--cc-added)", background: "var(--cc-added-bg)" }}>
        +{added}
      </span>
      <span className="px-[4px]" style={{ color: "var(--cc-removed)", background: "var(--cc-removed-bg)" }}>
        −{removed}
      </span>
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy"
      className="flex size-[22px] flex-none items-center justify-center rounded-[5px] hover:bg-(--cc-button-hover)"
      style={{ color: "var(--cc-text-muted)" }}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      <Icon name={done ? "check" : "copy"} size={13} />
    </button>
  );
}

/** One Bash call: the tool's name, the command on a dark band, and its output (scrolls past 260pt). */
export function BashCard({ command, output }: { command: string; output: string }) {
  return (
    <div className="overflow-hidden rounded-[8px] text-[13px]" style={RIM}>
      <div className="flex h-[36px] items-center px-[12px]" style={{ color: "var(--cc-text)" }}>
        Bash
      </div>
      {/* the command sits on a rounded band inset 7pt in the card; a wrapped command hangs under its first word */}
      <div className="mx-[7px] flex items-start gap-[8px] rounded-[6px] py-[6px] pr-[5px] pl-[8px]" style={{ background: "var(--cc-code-band)" }}>
        <pre className="min-w-0 flex-1 whitespace-pre-wrap" style={{ ...MONO, paddingLeft: "2ch", textIndent: "-2ch" }}>
          <span style={{ color: "var(--cc-text-muted)" }}>$ </span>
          {highlightBash(command)}
        </pre>
        <CopyButton text={command} />
      </div>
      {output && (
        <pre
          className="max-h-[260px] overflow-auto px-[12px] py-[10px] whitespace-pre-wrap"
          style={{ ...MONO, color: "var(--cc-bash-output)", scrollbarWidth: "thin" }}
        >
          {output}
        </pre>
      )}
    </div>
  );
}

/** A long path keeps its start and its file name, with "…" between (as the app shows it). */
function middleTruncate(path: string, max: number) {
  if (path.length <= max) return path;
  const name = path.slice(path.lastIndexOf("/"));
  const head = path.slice(0, Math.max(8, max - name.length - 1));
  return `${head}…${name}`;
}

const DIFF_BG = { add: "var(--cc-diff-add)", del: "var(--cc-diff-del)", ctx: undefined } as const;
const DIFF_MARK = { add: "+", del: "-", ctx: " " } as const;

/** One edit: the file's path, then its hunk with line numbers, added lines on green and removed on red. */
export function DiffCard({ path, lines }: { path: string; lines: DiffLine[] }) {
  return (
    <div className="overflow-hidden rounded-[8px]" style={RIM}>
      <div className="flex h-[32px] items-center gap-[8px] px-[12px]">
        <span className="min-w-0 flex-1 truncate" style={{ ...MONO, color: "var(--cc-text-muted)" }} title={path}>
          {middleTruncate(path, 64)}
        </span>
        <CopyButton text={path} />
      </div>
      <div className="max-h-[300px] overflow-auto py-[6px]" style={{ background: "var(--cc-code-band)", ...MONO, scrollbarWidth: "thin" }}>
        {lines.map((l, i) => (
          <div key={i} className="flex" style={{ background: DIFF_BG[l.kind] }}>
            <span className="w-[38px] flex-none pr-[8px] text-right select-none" style={{ color: "var(--cc-text-faint)" }}>
              {l.n}
            </span>
            <span
              className="w-[14px] flex-none select-none"
              style={{ color: l.kind === "add" ? "var(--cc-added)" : l.kind === "del" ? "var(--cc-removed)" : undefined }}
            >
              {DIFF_MARK[l.kind]}
            </span>
            <span className="pr-[12px] whitespace-pre-wrap">{highlightTsx(l.text)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return <Icon name="chevronRight" size={12} className="transition-transform duration-150" style={{ transform: open ? "rotate(90deg)" : undefined }} />;
}

function callSummary(call: ToolCall): ReactNode {
  switch (call.kind) {
    case "bash":
      return (
        <>
          Ran a command
          {call.failed && <span style={{ color: "var(--cc-removed)" }}>Failed</span>}
        </>
      );
    case "edit":
      return (
        <>
          Edited <Strong>{call.file}</Strong>
          <DiffStat added={call.added} removed={call.removed} />
        </>
      );
    case "read":
      return (
        <>
          Read <Strong>{call.file}</Strong>
        </>
      );
  }
}

function CallCard({ call }: { call: ToolCall }) {
  if (call.kind === "bash") return <BashCard command={call.command} output={call.output} />;
  if (call.kind === "edit") return <DiffCard path={call.path} lines={call.lines} />;
  return null;
}

/** A row inside an expanded group: 32pt, expands into its call's card. */
function CallRow({ call, onImage }: { call: ToolCall; onImage: () => void }) {
  const [open, setOpen] = useState(false);
  const expandable = call.kind !== "read";
  return (
    <div className="border-t first:border-t-0" style={{ borderColor: "var(--cc-card-rim)" }}>
      <button
        type="button"
        aria-expanded={expandable ? open : undefined}
        onClick={() => (expandable ? setOpen((o) => !o) : onImage())}
        className="group flex h-[32px] w-full items-center gap-[6px] px-[12px] text-left hover:text-(--cc-text)"
        style={{ color: "var(--cc-text-muted)" }}
      >
        {callSummary(call)}
        {expandable && <Chevron open={open} />}
      </button>
      {open && (
        <div className="px-[8px] pb-[8px]">
          <CallCard call={call} />
        </div>
      )}
    </div>
  );
}

/** The thumbnails of images a group read, right-aligned; past three, a "+N" before them. */
function Thumbnails({ srcs, extra, onOpen }: { srcs: string[]; extra: number; onOpen: (i: number) => void }) {
  return (
    <span className="absolute flex items-center gap-[4px]" style={{ right: 0 }}>
      {extra > 0 && <span className="mr-[6px] text-[12.5px]">+{extra}</span>}
      {srcs.map((src, i) => (
        <button key={src} type="button" aria-label="View image" onClick={() => onOpen(i)} className="rounded-[6px] hover:brightness-125">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src={src}
            data-cc-image={src}
            className="size-[24px] max-w-none rounded-[6px] object-cover"
            style={{ boxShadow: "0 0 0 1px var(--cc-card-border)" }}
          />
        </button>
      ))}
    </span>
  );
}

/** A summary row ("Ran 3 commands, read …") that expands into its calls. */
export function ToolSummary({
  runs,
  added,
  removed,
  thumbnails = [],
  calls = [],
  live,
  inset,
  renderRuns,
}: {
  runs: Run[];
  added?: number;
  removed?: number;
  thumbnails?: string[];
  calls?: ToolCall[];
  /** still running: its label shimmers and there's nothing to open yet */
  live?: boolean;
  inset: number;
  renderRuns: (runs: Run[]) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openViewer = useOpenViewer();
  const root = useRef<HTMLDivElement>(null);
  const images = calls.flatMap((c) => (c.kind === "read" && c.image ? [c.image] : []));
  const shown = thumbnails.slice(-3);
  const single = calls.length === 1 && calls[0].kind !== "read" ? calls[0] : null;

  if (live)
    return (
      <div className="flex h-[20px] items-center px-[4.5px] text-[14px]" style={{ marginRight: inset, color: "var(--cc-text-muted)" }}>
        <span className="cc-shimmer">{renderRuns(runs)}</span>
      </div>
    );

  return (
    <div ref={root} className="cc-settle" style={{ marginRight: inset }}>
      <div className="relative flex h-[20px] items-center px-[4.5px] text-[14px]">
        <button
          type="button"
          aria-expanded={calls.length ? open : undefined}
          disabled={!calls.length}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-[6px] text-left enabled:hover:text-(--cc-text)"
          style={{ color: "var(--cc-text-muted)" }}
        >
          <span>{renderRuns(runs)}</span>
          {added !== undefined && <DiffStat added={added} removed={removed ?? 0} />}
          <Chevron open={open} />
        </button>
        {shown.length > 0 && (
          <Thumbnails
            srcs={shown}
            extra={thumbnails.length - shown.length}
            onOpen={(i) => {
              const list = images.length ? images : thumbnails;
              openViewer(list, i + thumbnails.length - shown.length, "Read", sourcesIn(root.current, list));
            }}
          />
        )}
      </div>
      {open && (
        <div className="mt-[8px]">
          {single ? (
            <CallCard call={single} />
          ) : (
            <div className="overflow-hidden rounded-[8px] text-[14px]" style={RIM}>
              {calls.map((c, i) => (
                <CallRow
                  key={i}
                  call={c}
                  onImage={() => c.kind === "read" && c.image && openViewer(images, images.indexOf(c.image), "Read", sourcesIn(root.current, images))}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
