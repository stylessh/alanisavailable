"use client";

import { Fragment, useState } from "react";
import { IconButton, LineCounts } from "./chrome";
import { ChatIcon, CopyPathIcon, ExpandLinesIcon, FileIcon } from "./code-icons";
import type { DiffFile, Line, Thread } from "./code-data";
import { Highlight } from "./code";
import { ThreadCard } from "./diff-conversation";
import { useDiffOptions, type DiffOptions } from "./diff-options";
import { MoreIcon } from "./icons";

// A file in a diff, as a card: a header with the file's glyph, name, path,
// counts and Reviewed, and 20px lines in the mono face with Linear's
// added/removed fills and syntax colors. The reader's Display options decide
// whether the lines read unified or split, wrap, and carry their colors.

export const splitPath = (path: string) => {
  const at = path.lastIndexOf("/");
  return { name: path.slice(at + 1), dir: path.slice(0, at + 1) };
};

function lang(f: DiffFile) {
  return f.kind === "markdown" ? "markdown" : f.kind === "css" ? "css" : "code";
}

function Gap({ line }: { line: Line }) {
  return (
    <div className="flex h-7 items-center bg-(--ln-card)">
      <span className="flex w-[50px] shrink-0 justify-center">
        <span className="flex h-5 w-7 items-center justify-center rounded-full bg-(--ln-gap) text-(--ln-text-muted)">
          <ExpandLinesIcon size={14} />
        </span>
      </span>
      <button type="button" className="mx-auto flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-(--ln-text-muted) hover:bg-(--ln-ghost-hover)">
        <ExpandLinesIcon size={14} />
        {line.skipped} unchanged lines
      </button>
    </div>
  );
}

const fill = (l?: Line) => (l?.kind === "add" ? "bg-(--ln-line-added)" : l?.kind === "del" ? "bg-(--ln-line-removed)" : "");
const tone = (l: Line) => (l.kind === "add" ? "text-(--ln-number-added)" : l.kind === "del" ? "text-(--ln-number-removed)" : "text-(--ln-line-number)");

/** A line's number and code; hovering it offers a comment, as Linear's diff does. */
function Cell({ line, file, o, n }: { line?: Line; file: DiffFile; o: DiffOptions; n?: number }) {
  if (!line) return <div className="min-h-5 flex-1 bg-(--ln-card)" />;
  return (
    <div className={`group/line relative flex min-h-5 min-w-0 flex-1 ${fill(line)}`}>
      <span className={`ln-mono w-[50px] shrink-0 pr-3 text-right text-xs leading-5 ${tone(line)}`}>{n}</span>
      <code className={`ln-mono min-w-0 flex-1 pr-4 text-xs leading-5 text-(--ln-syn-text) ${o.wrap ? "break-all whitespace-pre-wrap" : "overflow-hidden whitespace-pre"}`}>
        {o.highlight ? <Highlight text={line.text} lang={lang(file)} /> : line.text}
      </code>
      {line.kind !== "del" && (
        <button
          type="button"
          aria-label="Comment on this line"
          className="ln-pill absolute top-1/2 left-[42px] hidden size-5 -translate-y-1/2 items-center justify-center rounded-full text-(--ln-text-muted) group-hover/line:flex"
        >
          <ChatIcon size={11} />
        </button>
      )}
    </div>
  );
}

/** Lines paired for the split view: removed on the left against what replaced them on the right. */
function pairs(lines: Line[]) {
  const rows: ({ gap: Line } | { left?: Line; right?: Line })[] = [];
  for (let i = 0; i < lines.length; ) {
    const l = lines[i];
    if (l.kind === "gap") {
      rows.push({ gap: l });
      i++;
    } else if (l.kind === "ctx") {
      rows.push({ left: l, right: l });
      i++;
    } else {
      const del: Line[] = [];
      const add: Line[] = [];
      while (lines[i]?.kind === "del") del.push(lines[i++]);
      while (lines[i]?.kind === "add") add.push(lines[i++]);
      for (let k = 0; k < Math.max(del.length, add.length); k++) rows.push({ left: del[k], right: add[k] });
    }
  }
  return rows;
}

/** What happened to a file as a whole, in its header after the path: green when it's new, red when it's gone, muted when it moved. */
const CHANGE = {
  added: { label: "New", tone: "text-(--ln-added)" },
  deleted: { label: "Deleted", tone: "text-(--ln-removed)" },
  renamed: { label: "Renamed", tone: "text-(--ln-text-muted)" },
} as const;

export function FileCard({
  file,
  threads = [],
  reviewed: controlled,
  onReviewed,
  className = "mt-2",
}: {
  file: DiffFile;
  threads?: Thread[];
  /** Reviewed, when the page keeps it (so Hide reviewed can read it) */
  reviewed?: boolean;
  onReviewed?: (v: boolean) => void;
  className?: string;
}) {
  const [o] = useDiffOptions();
  const [own, setOwn] = useState(false);
  const reviewed = controlled ?? own;
  // a deleted file starts folded: its lines are all red and rarely worth reading
  const [open, setOpen] = useState(file.change !== "deleted");
  const { name, dir } = splitPath(file.path);
  const moved = file.from ? splitPath(file.from) : undefined;
  const split = o.layout === "split";
  return (
    <section id={`file-${file.path}`} className={`scroll-mt-2 overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) ${className}`}>
      <div className="flex h-9 items-center gap-2 pr-2 pl-4">
        <button type="button" aria-label={open ? "Collapse file contents" : "Expand file contents"} onClick={() => setOpen(!open)}>
          <FileIcon kind={file.kind} />
        </button>
        {/* a moved file reads "old → new", the old name struck through when it changed too */}
        {moved && (
          <>
            <span className={`shrink-0 text-xs font-[450] text-(--ln-text-muted) ${moved.name !== name ? "line-through" : ""}`}>{moved.name !== name ? moved.name : moved.dir}</span>
            <span className="shrink-0 text-xs text-(--ln-icon-faint)">→</span>
          </>
        )}
        <span className={`shrink-0 text-xs font-[450] ${file.change === "deleted" ? "text-(--ln-text-muted) line-through" : "text-(--ln-text)"}`}>{name}</span>
        <span className="min-w-0 truncate text-xs font-[450] text-(--ln-text-muted)">{dir}</span>
        {file.change && <span className={`shrink-0 text-xs font-medium ${CHANGE[file.change].tone}`}>{CHANGE[file.change].label}</span>}
        <span className="shrink-0 text-(--ln-text-muted)">
          <CopyPathIcon size={12} />
        </span>
        <span className="ml-auto" />
        {o.counts && <LineCounts additions={file.additions} deletions={file.deletions} className="text-xs" />}
        <label className="ml-3 flex h-6 cursor-pointer items-center gap-2 rounded-full px-2 text-xs font-[450] text-(--ln-text-muted) hover:bg-(--ln-ghost-hover)">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={() => {
              setOwn(!reviewed);
              onReviewed?.(!reviewed);
              setOpen(reviewed);
            }}
            className="size-3.5 accent-(--ln-focus)"
          />
          Reviewed
        </label>
        <IconButton label="File actions" className="size-6">
          <MoreIcon size={14} />
        </IconButton>
      </div>
      {open && file.lines.length === 0 && (
        // nothing to show line by line: a binary file by its sizes, a move by saying so
        <p className="border-t-[0.5px] border-(--ln-card-border) px-4 py-3 text-xs font-[450] text-(--ln-text-muted)">
          {file.binary
            ? file.binary.before
              ? `Binary file changed · ${file.binary.before} → ${file.binary.after}`
              : `Binary file added · ${file.binary.after}`
            : "Renamed without changes"}
        </p>
      )}
      {open && file.lines.length > 0 && split && (
        <div className="border-t-[0.5px] border-(--ln-card-border) py-1">
          {pairs(file.lines).map((row, i) =>
            "gap" in row ? (
              <Gap key={i} line={row.gap} />
            ) : (
              <Fragment key={i}>
                <div className="flex">
                  <Cell line={row.left} file={file} o={o} n={row.left?.old} />
                  <span className="w-px shrink-0 bg-(--ln-card-border)" />
                  <Cell line={row.right} file={file} o={o} n={row.right?.new} />
                </div>
                {/* a thread opens under its line, across both sides */}
                {threads
                  .filter((t) => row.right && t.line === row.right.new)
                  .map((t) => (
                    <div key={t.line} className="border-y-[0.5px] border-(--ln-card-border) bg-(--ln-main) py-3 pr-4 pl-[50px]">
                      <ThreadCard thread={t} file={file} inline />
                    </div>
                  ))}
              </Fragment>
            ),
          )}
        </div>
      )}
      {open && file.lines.length > 0 && !split && (
        <div className="border-t-[0.5px] border-(--ln-card-border) py-1">
          {file.lines.map((l, i) => {
            if (l.kind === "gap") return <Gap key={i} line={l} />;
            const n = l.kind === "del" ? l.old : l.new;
            // threads sit on the new side: added and unchanged lines
            const here = l.kind === "del" ? [] : threads.filter((t) => t.line === n);
            return (
              <Fragment key={i}>
                <div className="flex">
                  <Cell line={l} file={file} o={o} n={n} />
                </div>
                {here.map((t) => (
                  <div key={t.line} className="border-y-[0.5px] border-(--ln-card-border) bg-(--ln-main) py-3 pr-4 pl-[50px]">
                    <ThreadCard thread={t} file={file} inline />
                  </div>
                ))}
              </Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
}
