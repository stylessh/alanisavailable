"use client";

import { useState } from "react";
import { CODE_LINE, CodeLine } from "./code-view";
import { Icon } from "./icon";
import type { DiffFile } from "./panel-content";
import { useWorkspace } from "./workspace";
import { BarButton, FileMark, PanelFrame } from "./side-panel";

// The Diff panel (pt, from the recording): a #0a0a0a card. Its bar shows the
// branch ("main → claude-code-desktop"); the list button splits off a
// column of changed files. Each file's diff opens under a 28pt heading (its
// mark, name, +added −removed, a reviewed check and a ⋯), added lines on
// #1a2918 with a 4pt green rule down the left edge, and runs of unchanged
// lines folded into "N unmodified lines".
/** the changed-files column takes the share of the panel it did in the recording (320 of 568pt) */
const LIST_SHARE = 0.56;

export function Stats({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="flex-none whitespace-nowrap">
      <span style={{ color: "var(--cc-added)" }}>+{added}</span>
      {/* a little apart, so the two counts don't run together */}
      <span className="ml-[4px]" style={{ color: "var(--cc-removed)" }}>
        −{removed}
      </span>
    </span>
  );
}

export function FileDiff({ file }: { file: DiffFile }) {
  const [open, setOpen] = useState(!!file.hunks);
  return (
    <section style={{ borderBottom: "1px solid var(--cc-rule)" }}>
      <div className="sticky top-0 z-10 flex h-[28px] items-center gap-[6px] pr-[8px] pl-[10px]" style={{ background: "var(--cc-diff-head)" }}>
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((o) => !o)}
          className="flex size-[16px] items-center justify-center"
        >
          <Icon name={open ? "chevronDown" : "chevronRight"} size={11} style={{ color: "var(--cc-text-muted)" }} />
        </button>
        <FileMark name={file.name} />
        <span className="min-w-0 truncate" style={{ color: "var(--cc-text-strong)" }}>
          {file.name}
        </span>
        <Stats added={file.added} removed={file.removed} />
        <span className="flex-1" />
        <Icon name="checkCircle" size={13} style={{ color: "var(--cc-text-muted)" }} />
        <Icon name="more" size={13} style={{ color: "var(--cc-text-muted)" }} />
      </div>
      {open && file.hunks && (
        <div className="pb-[4px] text-[12.25px]" style={{ fontFamily: "var(--cc-mono)" }}>
          {file.hunks.map((h, i) =>
            "skipped" in h ? (
              // the folded run's arrow points toward the code it would reveal
              <div
                key={i}
                className="flex items-center gap-[8px] pl-[14px] text-[13px]"
                style={{ height: 28, fontFamily: "var(--cc-sans)", color: "var(--cc-text-muted)" }}
              >
                <Icon name="chevronDown" size={11} style={{ transform: i === 0 ? "rotate(180deg)" : undefined }} />
                {h.skipped} unmodified lines
              </div>
            ) : (
              h.map((l, k) => (
                <CodeLine
                  key={`${i}-${k}`}
                  n={l.n}
                  text={l.text}
                  gutter={44}
                  marker={
                    <span className="w-[14px] flex-none select-none" style={{ color: l.kind === "ctx" ? "transparent" : "var(--cc-text-muted)" }}>
                      {l.kind === "add" ? "+" : "-"}
                    </span>
                  }
                  style={
                    l.kind === "ctx"
                      ? undefined
                      : {
                          background: l.kind === "add" ? "var(--cc-diff-add)" : "var(--cc-diff-del)",
                          boxShadow: `inset 4px 0 0 ${l.kind === "add" ? "var(--cc-diff-add-rule)" : "var(--cc-removed)"}`,
                        }
                  }
                />
              ))
            ),
          )}
        </div>
      )}
    </section>
  );
}

/** The working branch's changes. */
export function DiffPanel({ expanded, onExpand, onClose }: { expanded: boolean; onExpand: () => void; onClose: () => void }) {
  const { branch, diff } = useWorkspace();
  const [list, setList] = useState(true);
  return (
    <PanelFrame
      expanded={expanded}
      onExpand={onExpand}
      onClose={onClose}
      background="var(--cc-code-pane)"
      title={
        <button
          type="button"
          className="flex items-center gap-[6px] rounded-[6px] px-[12px] hover:bg-(--cc-button-hover)"
          style={{ height: 24, color: "var(--cc-text)" }}
        >
          {branch.base}
          <Icon name="arrowRight" size={11} style={{ color: "var(--cc-text-muted)" }} />
          {branch.head}
          <Icon name="chevronDown" size={11} style={{ color: "var(--cc-text-muted)" }} />
        </button>
      }
      actions={
        <>
          <BarButton icon="search" label="Search the diff" />
          <BarButton icon="list" label="Changed files" active={list} onClick={() => setList((l) => !l)} />
          <BarButton icon="moreVertical" label="Diff options" />
        </>
      }
    >
      <div className="absolute inset-0 flex">
        <div className="min-w-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {diff.length === 0 && (
            <p className="px-[17px] py-[14px]" style={{ color: "var(--cc-text-muted)" }}>
              No changes on this branch yet.
            </p>
          )}
          {diff.map((f) => (
            <FileDiff key={f.dir + f.name} file={f} />
          ))}
          <div style={{ height: CODE_LINE }} />
        </div>
        {list && (
          <ul
            className="flex-none overflow-y-auto pt-[3px]"
            style={{ width: `${LIST_SHARE * 100}%`, borderLeft: "1px solid var(--cc-rule)", scrollbarWidth: "none" }}
          >
            {diff.map((f) => (
              <li key={f.dir + f.name} className="flex h-[24px] cursor-default items-center gap-[6px] pr-[13px] pl-[17px] hover:bg-(--cc-button-hover)">
                <FileMark name={f.name} />
                <span className="flex-none" style={{ color: "var(--cc-text-strong)" }}>
                  {f.name}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: "var(--cc-text-muted)" }}>
                  {f.dir}
                </span>
                <Stats added={f.added} removed={f.removed} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelFrame>
  );
}
