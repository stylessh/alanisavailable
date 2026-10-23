"use client";

import { Fragment, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { AddButton, Avatar, BranchBadge, Crumb, DetailLayout, IconButton, LineCounts, PageHeader, PanelRow, PanelSection, TabBar } from "./chrome";
import {
  AttachIcon,
  BranchIcon,
  ChatIcon,
  CommitIcon,
  FilesIcon,
  LinkIcon,
  ReactionIcon,
  ResolveThreadIcon,
  StarIcon,
} from "./code-icons";
import { DIFFS, ISSUE_STATUS, ME, diffKey as diffKeyOf, listDate, findDiff, findProject, type Diff, type Event, type Reviewer } from "./code-data";
import { Composer, Menu, MergeCard, StateDot, Timeline, commentCount, commitCount, threadsOf } from "./diff-conversation";
import { Markdown } from "./code";
import { ISSUES, STATUSES } from "./data";
import { DiffStateIcon, DueDateIcon, StatusIcon, VerdictGlyph } from "./glyphs";
import { ChevronDownIcon, MoreIcon } from "./icons";
import { LabelChip } from "./issues-view";
import { Facepile, HoverCard, ProjectCard, ProjectGlyph } from "./person-card";
import { Check, Reviewers } from "./reviewer-picker";
import { BaseBranchPicker } from "./branch-picker";
import { useApp } from "./router";
import { arrange, DiffOptionsButton, useDiffOptions } from "./diff-options";
import { FileCard } from "./file-card";
import { AgentToggle, DiffAgent, Inline, ThumbIcon, hasSession, useRuns } from "./session";

// A diff (Linear's pull request), after Linear Diffs: a breadcrumb from the
// issue it resolves, Overview and Diff tabs, and the properties panel the
// live review page has (Properties, Resolves, Reviewers, Labels, Project);
// the diff's size sits in the header and in Properties. A Guide tab walks
// through the change, and the session that wrote it docks on the right.
// The Diff tab is a column of file cards: a header with the file's glyph,
// name, path and counts, and 20px lines in the mono face with Linear's
// added/removed fills and syntax colors.

const STATE_LABEL: Record<Diff["state"], string> = { open: "Open", draft: "Draft", merged: "Merged", closed: "Closed" };

const totals = (d: Diff) => ({
  additions: d.files.reduce((n, f) => n + f.additions, 0),
  deletions: d.files.reduce((n, f) => n + f.deletions, 0),
});

function Panel({ diff, setReviewers }: { diff: Diff; setReviewers: Dispatch<SetStateAction<Reviewer[]>> }) {
  const { go } = useApp();
  const issue = diff.issue ? ISSUES.find((i) => i.id === diff.issue) : undefined;
  const status = issue ? STATUSES.find((s) => s.id === issue.status) : undefined;
  const project = diff.project ? findProject(diff.project) : undefined;
  const commits = commitCount(diff);
  // the preview Linear deployed for the branch, the latest one
  const preview = diff.activity.flatMap((e) => (e.kind === "change" && e.change.type === "deployed" ? [e.change.url] : [])).at(-1);
  // when it was opened, as the lists date things: "4h ago" within the day, then "Mar 30"
  const opened = listDate(diff.age) === diff.age ? `${diff.age} ago` : listDate(diff.age);
  const toChanges = () => go({ page: "diff", key: diffKeyOf(diff), tab: "diff" });
  return (
    <>
      {/* as on the issue page, one row per fact with its icon: where the diff stands, how big it is, where it runs and since when */}
      <PanelSection label="Properties">
        <PanelRow icon={<DiffStateIcon state={diff.state} size={14} />}>{STATE_LABEL[diff.state]}</PanelRow>
        <PanelRow icon={<FilesIcon size={14} className="text-(--ln-text-muted)" />} onClick={toChanges} onGo={toChanges} goLabel="Open diff">
          <span className="flex items-center gap-2">
            {diff.files.length} {diff.files.length === 1 ? "file" : "files"}
            <LineCounts {...totals(diff)} />
          </span>
        </PanelRow>
        <PanelRow icon={<CommitIcon size={14} className="text-(--ln-text-muted)" />}>
          {commits} {commits === 1 ? "commit" : "commits"}
        </PanelRow>
        {preview && (
          <PanelRow icon={<LinkIcon size={14} className="text-(--ln-text-muted)" />}>
            <span className="font-[450]">{preview}</span>
          </PanelRow>
        )}
        <PanelRow icon={<DueDateIcon color="var(--ln-text-muted)" />}>
          <span className="font-[450]">
            Opened <span className="text-(--ln-text-header)">{opened}</span>
          </span>
        </PanelRow>
      </PanelSection>
      {issue && status && (
        <PanelSection label="Resolves">
          <PanelRow icon={<StatusIcon status={status} />} onClick={() => go({ page: "issues" })} onGo={() => go({ page: "issues" })} goLabel="Open issue">
            <span className="font-[450]">{issue.title}</span>
          </PanelRow>
        </PanelSection>
      )}
      <Reviewers diff={diff} setReviewers={setReviewers} />
      {/* as on the issue page: the labels as chips, then the section's + */}
      <PanelSection label="Labels">
        <div className="flex flex-wrap items-center gap-1.5">
          {diff.labels.map((l) => (
            <LabelChip key={l.name} label={l} full />
          ))}
        </div>
        <AddButton label="Add label" />
      </PanelSection>
      {/* the project it moves forward, as an issue's panel ends with its project */}
      {project && (
        <PanelSection label="Project">
          <HoverCard card={<ProjectCard project={project} repo={diff.repo} />}>
            <PanelRow
              icon={<ProjectGlyph project={project} />}
              onClick={() => go({ page: "repo", slug: diff.repo, tab: "diffs" })}
              onGo={() => go({ page: "repo", slug: diff.repo, tab: "diffs" })}
              goLabel="Open project"
            >
              {project.name}
            </PanelRow>
          </HoverCard>
        </PanelSection>
      )}
    </>
  );
}

/** The review page's body: title and branch, the description, then the activity, the merge card and the composer. */
function Overview({
  diff,
  setReviewers,
  base,
  setBase,
}: {
  diff: Diff;
  setReviewers: Dispatch<SetStateAction<Reviewer[]>>;
  base: string;
  setBase: (b: string) => void;
}) {
  return (
    // pinned left, so docking the agent beside the page doesn't slide the text across
    <DetailLayout pinStart panel={<Panel diff={diff} setReviewers={setReviewers} />}>
      <h2 className="text-2xl leading-8 font-semibold text-(--ln-text)">{diff.title}</h2>
      <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs font-[450] text-(--ln-text-muted)">
        <Avatar who={diff.author} size={16} />
        <span className="shrink-0 text-(--ln-text)">{diff.author.name}</span>
        <span className="text-(--ln-icon-faint)">·</span>
        <span className="flex min-w-0 items-center gap-1.5">
          <BaseBranchPicker diff={diff} base={base} onPick={setBase} />
          <span className="text-(--ln-icon-faint)">←</span>
          <BranchBadge name={diff.branch} />
        </span>
      </div>
      {/* the description as the issue page has it: straight under the title, no label */}
      <div className="mt-6">
        <Markdown source={diff.body} compact />
      </div>
      <div className="mt-4 -ml-1 flex text-(--ln-text-muted)">
        <IconButton label="Add reaction">
          <ReactionIcon size={14} />
        </IconButton>
        <IconButton label="Attach images, files, or videos">
          <AttachIcon size={14} />
        </IconButton>
      </div>
      <section className="mt-6 border-t-[0.5px] border-(--ln-header-rule) pt-6">
        {/* as on the issue page: the heading, then who's subscribed */}
        <div className="mb-5 flex items-center">
          <h3 className="text-[15px] font-semibold text-(--ln-text)">Activity</h3>
          <button type="button" className="ml-auto text-xs font-medium text-(--ln-text-muted) hover:text-(--ln-text)">
            Unsubscribe
          </button>
          {/* who's subscribed: the author and the reviewers, stacked */}
          <span className="ml-5 flex h-7 items-center">
            <Facepile people={[diff.author, ...diff.reviewers.map((r) => r.who)]} size={16} />
          </span>
        </div>
        <Timeline diff={diff}>
          <li className="mt-5">
            <MergeCard diff={diff} base={base} />
          </li>
          <li className="mt-5">
            <Composer />
          </li>
        </Timeline>
      </section>
    </DetailLayout>
  );
}

/** A toolbar button that copies something, and shows a check for a moment once it has. */
function CopyButton({ label, text, children }: { label: string; text: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <IconButton
      label={copied ? "Copied" : label}
      raised
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
      }}
    >
      {copied ? <Check /> : children}
    </IconButton>
  );
}

const VERDICTS = [
  { id: "approved", label: "Approve", detail: "Let it merge once checks pass", dot: "ok" },
  { id: "changes", label: "Request changes", detail: "Block merging until you approve", dot: "blocked" },
  { id: "commented", label: "Comment", detail: "Leave feedback without a verdict", dot: "pending" },
] as const;
type Verdict = (typeof VERDICTS)[number]["id"];

/**
 * The review popover off the toolbar's chevron: a summary, the verdict, and
 * submit. Approving can go without a word; asking for changes or commenting
 * needs one.
 */
function ReviewMenu({ initial, onSubmit, onClose }: { initial?: Verdict; onSubmit: (v: Verdict, body: string) => void; onClose: () => void }) {
  const [verdict, setVerdict] = useState<Verdict>(initial ?? "approved");
  const [body, setBody] = useState("");
  const needsBody = verdict !== "approved" && !body.trim();
  return (
    <Menu onClose={onClose} place="top-full right-0 mt-1.5 w-[320px] p-0">
      <div className="flex h-9 items-center border-b-[0.5px] border-(--ln-popover-border) px-3 text-xs font-medium text-(--ln-text-muted)">Submit review</div>
      <div className="p-1.5">
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={verdict === "approved" ? "Leave a summary (optional)…" : "Leave a summary…"}
          rows={3}
          className="ln-search w-full resize-none rounded-lg bg-transparent px-2 py-1.5 text-[13px] leading-5 font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
        />
        {VERDICTS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="menuitemradio"
            aria-checked={verdict === o.id}
            onClick={() => setVerdict(o.id)}
            className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-[7px] text-left ${verdict === o.id ? "bg-(--ln-menu-hover)" : "hover:bg-(--ln-menu-hover)"}`}
          >
            {/* a comment carries no verdict, so it gets the comment bubble rather than a status dot */}
            <span className="mt-[3px] flex">{o.id === "commented" ? <VerdictGlyph verdict="commented" /> : <StateDot state={o.dot} size={12} />}</span>
            <span>
              <span className="block text-[13px] font-medium text-(--ln-text)">{o.label}</span>
              <span className="block text-xs font-[450] text-(--ln-text-muted)">{o.detail}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-1.5 border-t-[0.5px] border-(--ln-popover-border) p-2">
        <button type="button" onClick={onClose} className="h-7 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header) hover:bg-(--ln-ghost-hover)">
          Cancel
        </button>
        <button
          type="button"
          disabled={needsBody}
          onClick={() => onSubmit(verdict, body.trim())}
          className="ln-pill h-7 rounded-full px-3 text-xs font-medium text-(--ln-text) disabled:opacity-45"
        >
          Submit review
        </button>
      </div>
    </Menu>
  );
}

/**
 * The toolbar under the header, in the round 28px buttons of Linear's issue
 * page, holding what a diff's reader reaches for: copy its link, copy the
 * command that checks the branch out locally, and review it. The review is a
 * split button: the check approves outright (it turns green once you have),
 * the chevron opens the full review with a summary and a verdict. Reviewing
 * your own diff isn't offered.
 */
function Toolbar({ diff, onReview }: { diff: Diff; onReview: (v: Verdict, body: string) => void }) {
  const [open, setOpen] = useState(false);
  const live = diff.state === "open" || diff.state === "draft";
  const mine = diff.reviewers.find((r) => r.who.name === ME.name)?.verdict;
  const approved = mine === "approved";
  return (
    <div className="flex items-center gap-1.5 text-(--ln-text-muted)">
      <CopyButton label="Copy link" text={`https://linear.app/as-mobbin/diff/${diff.repo}/${diff.number}`}>
        <LinkIcon size={14} />
      </CopyButton>
      <CopyButton label="Copy checkout command" text={`git fetch origin ${diff.branch} && git switch ${diff.branch}`}>
        <BranchIcon size={14} />
      </CopyButton>
      {live && diff.author.name !== ME.name && (
        <div className="relative">
          <div className="ln-pill flex h-7 items-center rounded-full">
            <button
              type="button"
              aria-label={approved ? "You approved" : "Approve"}
              title={approved ? "You approved" : "Approve"}
              aria-pressed={approved}
              onClick={() => !approved && onReview("approved", "")}
              className={`flex h-7 w-7 items-center justify-center rounded-l-full pl-0.5 ${approved ? "text-(--ln-check-passed)" : "hover:text-(--ln-text-header)"}`}
            >
              <ResolveThreadIcon size={14} />
            </button>
            <span className="h-3.5 w-px bg-(--ln-chip-border)" />
            <button
              type="button"
              aria-label="Submit a review"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="flex h-7 w-6 items-center justify-center rounded-r-full pr-0.5 hover:text-(--ln-text-header)"
            >
              <ChevronDownIcon size={8} />
            </button>
          </div>
          {open && (
            <ReviewMenu
              initial={mine}
              onClose={() => setOpen(false)}
              onSubmit={(v, body) => {
                onReview(v, body);
                setOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className={className}>
      <path d="M6 1.75v8.5M3.6 7.85 6 10.25l2.4-2.4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The header's pager, as on Linear's issue page: where this diff sits in the list, and the next and previous. */
function Pager({ diff }: { diff: Diff }) {
  const { go } = useApp();
  const at = DIFFS.findIndex((d) => d.repo === diff.repo && d.number === diff.number);
  const to = (i: number) => DIFFS[i] && go({ page: "diff", key: diffKeyOf(DIFFS[i]) });
  return (
    <span className="mr-1.5 flex items-center gap-[3px]">
      <span className="ln-tnum mr-[8.5px] text-[13px] font-[450] text-(--ln-text)">
        {at + 1}
        <span className="text-(--ln-text-muted)"> / {DIFFS.length}</span>
      </span>
      <IconButton label="Next diff" className="size-6" onClick={() => to(at + 1)}>
        <ArrowIcon />
      </IconButton>
      <IconButton label="Previous diff" className="size-6" onClick={() => to(at - 1)}>
        <ArrowIcon className="rotate-180" />
      </IconButton>
    </span>
  );
}

/** Files and Commits, the Diff tab's two views. */
function SubTab({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-6 items-center gap-1.5 rounded-full px-1.5 ${on ? "font-[450] text-(--ln-text-header)" : "font-medium text-(--ln-text-muted) hover:text-(--ln-text-header)"}`}
    >
      {children}
    </button>
  );
}

/** The commits on the branch, newest last, as the activity records them. */
function Commits({ diff }: { diff: Diff }) {
  const commits = diff.activity.flatMap((e) => (e.kind === "change" && e.change.type === "commit" ? [{ who: e.who, age: e.age, ...e.change }] : []));
  if (commits.length === 0) return <p className="px-4 py-8 text-center text-[13px] font-[450] text-(--ln-text-muted)">No commits yet.</p>;
  return (
    <section className="mt-2 overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card)">
      {commits.map((c, i) => (
        <div key={c.sha} className={`flex h-10 items-center gap-2.5 px-4 text-[13px] ${i > 0 ? "border-t-[0.5px] border-(--ln-card-border)" : ""}`}>
          <CommitIcon size={14} className="shrink-0 text-(--ln-text-muted)" />
          <span className="min-w-0 flex-1 truncate font-[450] text-(--ln-text)">{c.message}</span>
          <Avatar who={c.who} size={16} />
          <span className="ln-mono shrink-0 text-[11px] text-(--ln-icon-faint)">{c.sha.slice(0, 7)}</span>
          <span className="w-8 shrink-0 text-right text-xs font-[450] text-(--ln-text-muted)">{c.age}</span>
        </div>
      ))}
    </section>
  );
}

function Changes({ diff }: { diff: Diff }) {
  const [view, setView] = useState<"files" | "commits">("files");
  const [o] = useDiffOptions();
  const [reviewed, setReviewed] = useState<Set<string>>(() => new Set());
  if (diff.files.length === 0)
    return <p className="px-6 py-10 text-center text-[13px] font-[450] text-(--ln-text-muted)">This diff was closed without changes.</p>;
  const shown = arrange(diff.files, o, reviewed);
  const mark = (path: string, v: boolean) =>
    setReviewed((r) => {
      const next = new Set(r);
      if (v) next.add(path);
      else next.delete(path);
      return next;
    });
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-[14px] pb-6">
      <div className="flex h-9 items-center gap-1 rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) pr-1.5 pl-3 text-xs">
        <SubTab on={view === "files"} onClick={() => setView("files")}>
          <FilesIcon size={14} />
          Files <span className="font-medium text-(--ln-icon-faint)">{diff.files.length}</span>
        </SubTab>
        <SubTab on={view === "commits"} onClick={() => setView("commits")}>
          <CommitIcon size={14} />
          Commits <span className="text-(--ln-icon-faint)">{commitCount(diff)}</span>
        </SubTab>
        <span className="ml-auto flex items-center gap-1.5 text-(--ln-text-muted)">
          <ChatIcon size={14} />
          {commentCount(diff)}
          <span className="ml-1.5 flex">
            <DiffOptionsButton />
          </span>
        </span>
      </div>
      {view === "commits" ? (
        <Commits diff={diff} />
      ) : shown.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] font-[450] text-(--ln-text-muted)">Every file is hidden by your display options.</p>
      ) : (
        shown.map(({ file, heading }) => (
          <Fragment key={file.path}>
            {heading && <h3 className="ln-mono mt-4 mb-1 px-1 text-[11px] text-(--ln-text-muted)">{heading}</h3>}
            <FileCard
              file={file}
              threads={threadsOf(diff).filter((t) => t.path === file.path)}
              reviewed={reviewed.has(file.path)}
              onReviewed={(v) => mark(file.path, v)}
            />
          </Fragment>
        ))
      )}
    </div>
  );
}

/*
 * The Guide tab, after Linear's guided review (a recording of the live app,
 * Oct 2026), already written by the time you open it: the title, its author
 * and branch (thumbs and settings at the right), and a few sentences on what
 * the change does and the issue it completes, all flush with the file cards.
 * Then the change in the order worth reading it: a sentence on each part,
 * then that part's files at full width.
 */

type GuidePart = { text: string; paths: string[] };

/** The walk-through for a diff: an opening, then its parts, the code before the tests. */
function guideOf(diff: Diff): { intro: string; outro?: string; parts: GuidePart[] } {
  if (diff.number === 24)
    return {
      intro:
        "Every KPI on the dashboard can now be read against the period before it. The comparison is computed once in `@insight/metrics`, fetched alongside the current range, and shown as a change badge that turns green when a metric moved the right way.",
      outro: "while replacing the trend arrows, which only ever showed a direction.",
      parts: [
        {
          text: "Start in the metrics package. `previousRange` takes the range just before the current one, of the same length, and `compare` turns two series into a change, left empty when there's nothing to compare against.",
          paths: ["packages/metrics/src/range.ts", "packages/metrics/src/compare.ts", "packages/metrics/src/index.ts"],
        },
        {
          text: "`formatPercent` moves into the package with it, and now signs its output and keeps a decimal, so a 0.4% dip no longer rounds to 0%.",
          paths: ["packages/metrics/src/format.ts"],
        },
        {
          text: "On the page, the filter gains a `compare` switch, on by default, and `useMetric` fetches the previous range only while it's on, so turning it off costs nothing.",
          paths: ["apps/web/src/types/filter.ts", "apps/web/src/components/filter-bar.tsx", "apps/web/src/hooks/use-metric.ts"],
        },
        {
          text: "The table gets its header toggle and two columns, Previous and Change. Each row hands its change to the new `DeltaBadge`, which reads green or red by the KPI's `goodWhen`, since a falling churn rate is good news.",
          paths: [
            "apps/web/src/components/compare-toggle.tsx",
            "apps/web/src/components/kpi-table.tsx",
            "apps/web/src/components/metric-row.tsx",
            "apps/web/src/components/delta-badge.tsx",
          ],
        },
        {
          text: "`TrendArrow` goes away, and its styles with it; the badge's take their place.",
          paths: ["apps/web/src/components/trend-arrow.tsx", "apps/web/src/styles/kpi.css"],
        },
        {
          text: "Tests cover the range arithmetic and the empty case, and the changelog notes both changes.",
          paths: ["tests/compare.test.ts", "CHANGELOG.md"],
        },
      ],
    };
  const test = (p: string) => /(^|\/)tests?\/|\.test\./.test(p);
  const files = [...diff.files].sort((a, b) => Number(test(a.path)) - Number(test(b.path)));
  const name = (p: string) => p.slice(p.lastIndexOf("/") + 1);
  return {
    intro: diff.body.split("\n")[0].replace(/\*\*/g, ""),
    parts: files.map((f) => ({
      paths: [f.path],
      text:
        f.change === "added"
          ? `\`${name(f.path)}\` is new.`
          : f.change === "deleted"
            ? `\`${name(f.path)}\` goes away.`
            : f.change === "renamed"
              ? `\`${name(f.from ?? f.path)}\` moves to \`${f.path.slice(0, f.path.lastIndexOf("/") + 1)}\`.`
              : test(f.path)
                ? `\`${name(f.path)}\` covers the change.`
                : `Then \`${name(f.path)}\`.`,
    })),
  };
}

function Guide({ diff, base }: { diff: Diff; base: string }) {
  const status = diff.issue ? STATUSES.find((s) => s.id === ISSUE_STATUS[diff.issue!]) : undefined;
  const guide = guideOf(diff);
  const card = (path: string, className = "mt-2") => {
    const f = diff.files.find((x) => x.path === path);
    return f && <FileCard key={path} file={f} threads={threadsOf(diff).filter((t) => t.path === f.path)} className={className} />;
  };
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-[30px] pb-16">
      <div className="flex items-start gap-3 pt-5">
        <h2 className="min-w-0 flex-1 text-2xl leading-8 font-semibold text-(--ln-text)">{diff.title}</h2>
        <span className="flex shrink-0 items-center gap-1 pt-1 text-(--ln-text-muted)">
          <IconButton label="Helpful" className="size-6">
            <ThumbIcon />
          </IconButton>
          <IconButton label="Not helpful" className="size-6">
            <ThumbIcon down />
          </IconButton>
          <DiffOptionsButton />
        </span>
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] font-[450] text-(--ln-text-muted)">
        <Avatar who={diff.author} size={16} />
        <span className="shrink-0 font-medium text-(--ln-text)">{diff.author.name}</span>
        <span className="text-(--ln-icon-faint)">·</span>
        <span className="ln-mono min-w-0 truncate text-xs">
          {base} <span className="text-(--ln-icon-faint)">←</span> {diff.branch}
        </span>
      </div>
      <div className="mt-8 flex flex-col gap-3 text-[15px] leading-[23px] font-[450] text-(--ln-text)">
        <p>
          <Inline text={guide.intro} />
        </p>
        {diff.issue && status && (
          <p>
            This completes{" "}
            <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
              <span className="relative top-[2px] flex">
                <StatusIcon status={status} size={14} />
              </span>
              <span className="ln-tnum">{diff.issue}</span>
            </span>{" "}
            {guide.outro ?? "once it merges."}
          </p>
        )}
      </div>
      {guide.parts.map((part, i) => (
        <section key={i} className={i === 0 ? "mt-5" : "mt-8"}>
          {/* the first part reads straight on from the opening; the rest each get their sentence */}
          {(i > 0 || guide.parts.length > 1) && (
            <p className="mb-4 text-[15px] leading-[23px] font-[450] text-(--ln-text)">
              <Inline text={part.text} />
            </p>
          )}
          {part.paths.map((path, k) => card(path, k === 0 ? "" : "mt-2"))}
        </section>
      ))}
    </div>
  );
}

export function DiffView({ diffKey }: { diffKey: string }) {
  const diff = findDiff(diffKey);
  if (!diff) return null;
  // keyed, so moving to another diff starts from its own reviewers and activity
  return <DiffPage key={diffKey} diff={diff} diffKey={diffKey} />;
}

function PreviewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 4.5V3.25C2 2.56 2.56 2 3.25 2H4.5M9.5 2h1.25c.69 0 1.25.56 1.25 1.25V4.5M12 9.5v1.25c0 .69-.56 1.25-1.25 1.25H9.5M4.5 12H3.25C2.56 12 2 11.44 2 10.75V9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="6.6" cy="6.6" r="1.9" stroke="currentColor" strokeWidth="1.2" />
      <path d="m8 8 1.4 1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DiffPage({ diff: source, diffKey }: { diff: Diff; diffKey: string }) {
  const { route, go } = useApp();
  const runs = useRuns();
  // what changes while you're on the page: who reviews, and the reviews you submit
  const [reviewers, setReviewers] = useState(source.reviewers);
  const [added, setAdded] = useState<Event[]>([]);
  // the branch it merges into, picked under the title and read by the merge card and the guide
  const [base, setBase] = useState("main");
  const diff = useMemo(
    () => ({ ...source, reviewers, activity: [...source.activity, ...added] }),
    [source, reviewers, added],
  );
  const review = (verdict: Verdict, body: string) => {
    setReviewers((rs) =>
      rs.some((r) => r.who.name === ME.name) ? rs.map((r) => (r.who.name === ME.name ? { ...r, verdict } : r)) : [...rs, { who: ME, verdict }],
    );
    setAdded((a) => [...a, { kind: "review", who: ME, age: "1m", verdict, body: body || undefined, threads: [] }]);
  };

  // the agent docks beside every tab, open from the start on a diff a session opened
  const session = hasSession(source, runs);
  const [agent, setAgent] = useState(() => session && source.activity.some((e) => e.kind === "session" && e.diff === source.number));
  // opening it yourself puts the cursor in its composer; a page that loads with it open leaves focus alone
  const [opened, setOpened] = useState(false);
  const preview = diff.activity.flatMap((e) => (e.kind === "change" && e.change.type === "deployed" ? [e.change.url] : [])).at(-1)
    ?? diff.checks.find((c) => c.name === "Preview" && c.state === "passed")?.detail;

  const tab = route.page === "diff" ? (route.tab ?? "overview") : "overview";
  const status = diff.issue ? STATUSES.find((s) => s.id === ISSUE_STATUS[diff.issue!]) : undefined;
  // an Edit line in the agent's log opens that file on the Diff tab
  const openFile = (path: string) => {
    go({ page: "diff", key: diffKey, tab: "diff" });
    requestAnimationFrame(() => document.getElementById(`file-${path}`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  return (
    <div className="flex h-full flex-col">
      <PageHeader actions={<Pager diff={diff} />}>
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
        {diff.files.length > 0 && <LineCounts {...totals(diff)} className="ml-2 text-[13px]" />}
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
          // a walk-through of the change, in the order worth reading it
          ...(diff.files.length > 0 ? [{ id: "guide" as const, label: "Guide" }] : []),
          { id: "diff", label: "Diff" },
        ]}
        value={tab}
        onChange={(t) => go({ page: "diff", key: diffKey, tab: t })}
        className="pr-[15px] pl-2"
      >
        <Toolbar diff={diff} onReview={review} />
        {preview && (
          <a href={`https://${preview}`} target="_blank" rel="noreferrer" className="ln-pill flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header)">
            <PreviewIcon />
            {diff.repo} preview
          </a>
        )}
        {session && (
          <AgentToggle
            open={agent}
            onToggle={() => {
              setAgent(!agent);
              setOpened(true);
            }}
          />
        )}
      </TabBar>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {tab === "overview" ? (
            <Overview diff={diff} setReviewers={setReviewers} base={base} setBase={setBase} />
          ) : tab === "guide" ? (
            <Guide diff={diff} base={base} />
          ) : (
            <Changes diff={diff} />
          )}
        </div>
        {agent && (
          <DiffAgent diff={diff} onClose={() => setAgent(false)} onFile={openFile} autoFocus={opened} className="mr-2 mb-2 w-[400px] shrink-0 max-[1000px]:hidden" />
        )}
      </div>
    </div>
  );
}

