"use client";

import { useState } from "react";
import { Avatar, Crumb, DetailLayout, IconButton, LineCounts, PageHeader, PanelRow, PanelSection, RefButton, TabBar } from "./chrome";
import {
  BranchIcon,
  ChatIcon,
  CheckSkippedIcon,
  ChecksMixedIcon,
  ChecksPassedIcon,
  CommitIcon,
  CopyPathIcon,
  ExpandLinesIcon,
  FileIcon,
  FilesIcon,
  FullWindowIcon,
  LinkIcon,
  StarIcon,
} from "./code-icons";
import { ISSUE_STATUS, findDiff, type Check, type Diff, type DiffFile, type Line } from "./code-data";
import { Highlight, Markdown } from "./code";
import { ISSUES, STATUSES } from "./data";
import { DiffStateIcon, StatusIcon } from "./glyphs";
import { MoreIcon } from "./icons";
import { useApp } from "./router";

// A diff (Linear's pull request), after Linear Diffs: a breadcrumb from the
// issue it resolves, Overview and Diff tabs, and the properties panel the
// live review page has (Status, Resolves, Reviewers, Checks, files changed).
// The Diff tab is a column of file cards: a header with the file's glyph,
// name, path and counts, and 20px lines in the mono face with Linear's
// added/removed fills and syntax colors.

const STATE_LABEL: Record<Diff["state"], string> = { open: "Open", draft: "Draft", merged: "Merged", closed: "Closed" };
const VERDICT: Record<string, string> = { approved: "Approved", changes: "Requested changes", commented: "Commented" };

const totals = (d: Diff) => ({
  additions: d.files.reduce((n, f) => n + f.additions, 0),
  deletions: d.files.reduce((n, f) => n + f.deletions, 0),
});
const splitPath = (path: string) => {
  const at = path.lastIndexOf("/");
  return { name: path.slice(at + 1), dir: path.slice(0, at + 1) };
};

function CheckIcon({ state }: { state: Check["state"] }) {
  if (state === "passed")
    return (
      <span className="text-(--ln-check-passed)">
        <ChecksPassedIcon size={14} />
      </span>
    );
  if (state === "failed")
    return (
      <span className="text-(--ln-check-failed)">
        <ChecksMixedIcon size={14} />
      </span>
    );
  return (
    <span className={state === "running" ? "text-(--ln-diff-draft)" : "text-(--ln-text-muted)"}>
      <CheckSkippedIcon size={14} />
    </span>
  );
}

function Panel({ diff }: { diff: Diff }) {
  const issue = diff.issue ? ISSUES.find((i) => i.id === diff.issue) : undefined;
  const status = issue ? STATUSES.find((s) => s.id === issue.status) : undefined;
  const passed = diff.checks.filter((c) => c.state === "passed").length;
  return (
    <>
      <PanelSection label="Status">
        <PanelRow icon={<DiffStateIcon state={diff.state} size={14} />}>{STATE_LABEL[diff.state]}</PanelRow>
      </PanelSection>
      {issue && status && (
        <PanelSection label="Resolves">
          <PanelRow icon={<StatusIcon status={status} />}>
            <span className="font-[450]">{issue.title}</span>
          </PanelRow>
        </PanelSection>
      )}
      <PanelSection label="Reviewers">
        {diff.reviewers.length === 0 && <PanelRow muted>No reviewers</PanelRow>}
        {diff.reviewers.map((r) => (
          <PanelRow key={r.who.name} icon={<Avatar who={r.who} size={16} />}>
            {r.who.name}
            {r.verdict && <span className="ml-2 font-[450] text-(--ln-text-muted)">{VERDICT[r.verdict]}</span>}
          </PanelRow>
        ))}
      </PanelSection>
      <PanelSection label="Checks">
        <PanelRow icon={<CheckIcon state={passed === diff.checks.length ? "passed" : "failed"} />}>
          {passed} / {diff.checks.length} passed
        </PanelRow>
        {diff.checks.map((c) => (
          <PanelRow key={c.name} icon={<CheckIcon state={c.state} />}>
            {c.name}
            {c.state === "running" && <span className="ml-2 font-[450] text-(--ln-text-muted)">Running</span>}
          </PanelRow>
        ))}
      </PanelSection>
      {diff.files.length > 0 && (
        <PanelSection label={`${diff.files.length} ${diff.files.length === 1 ? "file" : "files"} changed`}>
          {diff.files.map((f) => {
            const { name, dir } = splitPath(f.path);
            return (
              <div key={f.path} className="flex h-7 items-center gap-2 text-xs">
                <FileIcon kind={f.kind} size={14} />
                <span className="shrink-0 font-medium text-(--ln-text-header)">{name}</span>
                <span className="min-w-0 truncate font-[450] text-(--ln-text-muted)">{dir}</span>
                <LineCounts additions={f.additions} deletions={f.deletions} className="ml-auto" />
              </div>
            );
          })}
        </PanelSection>
      )}
    </>
  );
}

function Activity({ diff }: { diff: Diff }) {
  return (
    <section className="mt-12">
      <h3 className="mb-4 text-[15px] font-semibold text-(--ln-text)">Activity</h3>
      <ol className="flex flex-col gap-3.5">
        {diff.activity.map((e, i) => (
          <li key={i}>
            <div className="flex items-center gap-2 text-xs font-[450] text-(--ln-text-muted)">
              <Avatar who={e.who} size={16} />
              <span>
                <span className="font-medium text-(--ln-text-header)">{e.who.name}</span> {e.what} · {e.age} ago
              </span>
            </div>
            {e.comment && (
              <p className="mt-2 ml-6 rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) px-3.5 py-2.5 text-[13px] leading-5 font-[450] text-(--ln-text-strong)">
                {e.comment}
              </p>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) p-3.5">
        <p className="text-[13px] font-[450] text-(--ln-icon-faint)">Leave a review comment…</p>
        <div className="mt-6 flex items-center justify-end gap-1.5">
          <button type="button" className="ln-pill h-7 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header)">
            Request changes
          </button>
          <button type="button" className="h-7 rounded-full bg-(--ln-focus) px-2.5 text-xs font-medium text-white">
            Approve
          </button>
        </div>
      </div>
    </section>
  );
}

function Overview({ diff }: { diff: Diff }) {
  return (
    <DetailLayout panel={<Panel diff={diff} />}>
      <h2 className="text-2xl leading-8 font-semibold text-(--ln-text)">{diff.title}</h2>
      <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs font-[450] text-(--ln-text-muted)">
        <Avatar who={diff.author} size={16} />
        <span className="shrink-0 text-(--ln-text)">{diff.author.name}</span>
        <span className="ln-mono text-(--ln-icon-faint)">⋅</span>
        <span className="ln-mono min-w-0 truncate">
          main <span className="text-(--ln-icon-faint)">←</span> {diff.branch}
        </span>
      </div>
      <div className="mt-8 mb-2 text-xs font-[450] text-(--ln-text-muted)">Description</div>
      <Markdown source={diff.body} compact />
      <Activity diff={diff} />
    </DetailLayout>
  );
}

function lang(f: DiffFile) {
  return f.kind === "markdown" ? "markdown" : f.kind === "css" ? "css" : "code";
}

function DiffLine({ line, file }: { line: Line; file: DiffFile }) {
  if (line.kind === "gap") {
    return (
      <div className="flex h-7 items-center bg-(--ln-card)">
        <span className="flex w-[50px] justify-center">
          <span className="flex h-5 w-7 items-center justify-center rounded-full bg-(--ln-gap) text-(--ln-text-muted)">
            <ExpandLinesIcon size={14} />
          </span>
        </span>
        <button
          type="button"
          className="mx-auto flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-(--ln-text-muted) hover:bg-(--ln-ghost-hover)"
        >
          <ExpandLinesIcon size={14} />
          {line.skipped} unchanged lines
        </button>
      </div>
    );
  }
  const bg = line.kind === "add" ? "bg-(--ln-line-added)" : line.kind === "del" ? "bg-(--ln-line-removed)" : "";
  const num =
    line.kind === "add" ? "text-(--ln-number-added)" : line.kind === "del" ? "text-(--ln-number-removed)" : "text-(--ln-line-number)";
  return (
    <div className={`flex min-h-5 ${bg}`}>
      <span className={`ln-mono w-[50px] shrink-0 pr-3 text-right text-xs leading-5 ${num}`}>
        {line.kind === "del" ? line.old : line.new}
      </span>
      <code className="ln-mono min-w-0 flex-1 pr-4 text-xs leading-5 whitespace-pre text-(--ln-syn-text)">
        <Highlight text={line.text} lang={lang(file)} />
      </code>
    </div>
  );
}

function FileCard({ file }: { file: DiffFile }) {
  const [reviewed, setReviewed] = useState(false);
  const [open, setOpen] = useState(true);
  const { name, dir } = splitPath(file.path);
  return (
    <section className="mt-2 overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card)">
      <div className="flex h-9 items-center gap-2 pr-2 pl-4">
        <button type="button" aria-label={open ? "Collapse file contents" : "Expand file contents"} onClick={() => setOpen(!open)}>
          <FileIcon kind={file.kind} />
        </button>
        <span className="shrink-0 text-xs font-[450] text-(--ln-text)">{name}</span>
        <span className="min-w-0 truncate text-xs font-[450] text-(--ln-text-muted)">{dir}</span>
        <span className="shrink-0 text-(--ln-text-muted)">
          <CopyPathIcon size={12} />
        </span>
        <LineCounts additions={file.additions} deletions={file.deletions} className="ml-auto text-xs" />
        <label className="ml-3 flex h-6 cursor-pointer items-center gap-2 rounded-full px-2 text-xs font-[450] text-(--ln-text-muted) hover:bg-(--ln-ghost-hover)">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={() => {
              setReviewed(!reviewed);
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
      {open && (
        <div className="border-t-[0.5px] border-(--ln-card-border) py-1">
          {file.lines.map((l, i) => (
            <DiffLine key={i} line={l} file={file} />
          ))}
        </div>
      )}
    </section>
  );
}

function Changes({ diff }: { diff: Diff }) {
  if (diff.files.length === 0)
    return <p className="px-6 py-10 text-center text-[13px] font-[450] text-(--ln-text-muted)">This diff was closed without changes.</p>;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-[14px] pb-6">
      <div className="flex h-9 items-center gap-1 rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) px-3 text-xs">
        <span className="flex h-6 items-center gap-1.5 rounded-full px-1.5 font-[450] text-(--ln-text-header)">
          <FilesIcon size={14} />
          Files <span className="font-medium text-(--ln-icon-faint)">{diff.files.length}</span>
        </span>
        <span className="flex h-6 items-center gap-1.5 rounded-full px-1.5 font-medium text-(--ln-text-muted)">
          <CommitIcon size={14} />
          Commits <span className="text-(--ln-icon-faint)">{Math.max(1, diff.activity.length - 1)}</span>
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-(--ln-text-muted)">
          <ChatIcon size={14} />
          {diff.activity.filter((e) => e.comment).length}
        </span>
      </div>
      {diff.files.map((f) => (
        <FileCard key={f.path} file={f} />
      ))}
    </div>
  );
}

export function DiffView({ diffKey }: { diffKey: string }) {
  const { route, go } = useApp();
  const diff = findDiff(diffKey);
  if (!diff) return null;
  const tab = route.page === "diff" ? (route.tab ?? "overview") : "overview";
  const status = diff.issue ? STATUSES.find((s) => s.id === ISSUE_STATUS[diff.issue!]) : undefined;
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <>
            <RefButton icon={<BranchIcon size={14} />}>
              {diff.repo}#{diff.number}
            </RefButton>
            <IconButton label="Copy URL">
              <LinkIcon size={14} />
            </IconButton>
            <IconButton label="Review diff in full window">
              <FullWindowIcon size={14} />
            </IconButton>
          </>
        }
      >
        {diff.issue && status ? (
          <Crumb onClick={() => go({ page: "issues" })}>
            <StatusIcon status={status} />
            <span className="ln-tnum">{diff.issue}</span>
          </Crumb>
        ) : (
          <Crumb onClick={() => go({ page: "repo", slug: diff.repo })}>{diff.repo}</Crumb>
        )}
        <span className="mr-2 flex">
          <DiffStateIcon state={diff.state} />
        </span>
        <h1 className="truncate">{diff.title}</h1>
        <LineCounts {...totals(diff)} className="ml-2 text-[13px]" />
        <span className="ml-2 flex text-(--ln-icon-faint)">
          <StarIcon size={15} />
        </span>
        <IconButton label="More" className="ml-1">
          <MoreIcon size={14} />
        </IconButton>
      </PageHeader>
      <TabBar
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "diff", label: "Diff" },
        ]}
        value={tab}
        onChange={(t) => go({ page: "diff", key: diffKey, tab: t })}
      />
      {tab === "overview" ? <Overview diff={diff} /> : <Changes diff={diff} />}
    </div>
  );
}
