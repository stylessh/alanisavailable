"use client";

import { useState } from "react";
import { Crumb, LineCounts, PageHeader } from "./chrome";
import { FilesIcon } from "./code-icons";
import { DIFFS, ISSUE_STATUS, diffKey } from "./code-data";
import { STATUSES } from "./data";
import { DiffOptionsButton } from "./diff-options";
import { FileCard } from "./file-card";
import { DiffStateIcon, StatusIcon } from "./glyphs";
import { useApp } from "./router";
import { AgentPanel, AgentToggle, runState, threadOfRun, useRunActions, useRunClock, useRuns, type Run } from "./session";

// A coding session's own page, after the live app (Oct 2026): the issue and
// the session's title in the header with the lines it has changed so far, and
// the round agent button on the right. The left half is the work as it lands:
// a "Files" bar with Display options, shimmering placeholders until the first
// edit, then a card per file it touched. The right half is the thread, with
// "Tell Linear what to do next…" at its foot. Once the diff is open, the
// header links to it.

function Skeleton() {
  return (
    <section className="mt-2 overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card)">
      <div className="flex h-9 items-center gap-2 px-4">
        <span className="h-2.5 w-40 animate-pulse rounded-full bg-(--ln-pill-neutral)" />
      </div>
      <div className="flex flex-col gap-2.5 border-t-[0.5px] border-(--ln-card-border) px-4 py-4">
        {[70, 52, 84, 40, 66, 58].map((w, i) => (
          <span key={i} className="h-2.5 animate-pulse rounded-full bg-(--ln-pill-neutral)" style={{ width: `${w}%`, animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
    </section>
  );
}

function Session({ run }: { run: Run }) {
  const { go } = useApp();
  const [agent, setAgent] = useState(true);
  // reopening it puts the cursor in its composer
  const [opened, setOpened] = useState(false);
  const t = useRunClock(run);
  const st = runState(run, t);
  const thread = threadOfRun(run, t);
  const actions = useRunActions(run);
  const diff = DIFFS.find((d) => d.number === run.diff);
  // the files it has written so far, in the order it wrote them
  const edited = thread.steps.flatMap((s) => (s.kind === "edit" ? [s.path] : []));
  const files = edited.flatMap((p) => diff?.files.filter((f) => f.path === p) ?? []);
  const status = STATUSES.find((s) => s.id === ISSUE_STATUS[run.issue]);
  const openFile = (path: string) => document.getElementById(`file-${path}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <span className="flex items-center gap-1.5">
            {st.done && diff && (
              <button
                type="button"
                onClick={() => go({ page: "diff", key: diffKey(diff), tab: "diff" })}
                className="ln-pill flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header)"
              >
                <DiffStateIcon state={diff.state} size={14} />
                Open diff
                <span className="ln-tnum text-(--ln-text-muted)">#{diff.number}</span>
              </button>
            )}
            <AgentToggle
              open={agent}
              onToggle={() => {
                setAgent(!agent);
                setOpened(true);
              }}
            />
          </span>
        }
      >
        {status && (
          <Crumb onClick={() => go({ page: "issues" })}>
            <StatusIcon status={status} />
            <span className="ln-tnum">{run.issue}</span>
          </Crumb>
        )}
        <span className="mr-2 flex">
          <DiffStateIcon state="draft" />
        </span>
        <h1 className="truncate">{run.title}</h1>
        <LineCounts
          additions={files.reduce((n, f) => n + f.additions, 0)}
          deletions={files.reduce((n, f) => n + f.deletions, 0)}
          className="ml-2 text-[13px]"
        />
      </PageHeader>
      <div className="flex min-h-0 flex-1 gap-2 pt-2 pr-2 pb-2">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pl-[14px]">
          <div className="flex h-9 items-center gap-1.5 rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) pr-1.5 pl-3 text-xs">
            <FilesIcon size={14} className="text-(--ln-text-header)" />
            <span className="font-[450] text-(--ln-text-header)">Files</span>
            <span className="font-medium text-(--ln-icon-faint)">{files.length}</span>
            <span className="ml-auto flex">
              <DiffOptionsButton />
            </span>
          </div>
          {files.length === 0 && st.working ? (
            <>
              <Skeleton />
              <Skeleton />
            </>
          ) : files.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] font-[450] text-(--ln-text-muted)">The session stopped before changing any files.</p>
          ) : (
            files.map((f) => <FileCard key={f.path} file={f} />)
          )}
        </div>
        {agent && <AgentPanel thread={thread} onFile={openFile} autoFocus={opened} className="w-[420px] shrink-0 max-[1000px]:hidden" {...actions} />}
      </div>
    </div>
  );
}

export function SessionView({ id }: { id: string }) {
  const { go } = useApp();
  const run = useRuns().find((r) => r.id === id);
  if (!run)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-[13px] font-[450] text-(--ln-text-muted)">
        This session has ended or was archived.
        <button type="button" onClick={() => go({ page: "agent" })} className="ln-pill h-7 rounded-full px-3 text-xs font-medium text-(--ln-text-header)">
          Back to Agent
        </button>
      </div>
    );
  return <Session run={run} />;
}
