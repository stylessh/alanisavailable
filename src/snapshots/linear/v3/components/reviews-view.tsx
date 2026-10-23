"use client";

import { useState } from "react";
import { Avatar, LineCounts, PageHeader, TabBar } from "./chrome";
import { CheckSkippedIcon, ChecksPassedIcon } from "./code-icons";
import { DIFFS, ISSUE_STATUS, REVIEW_GROUPS, diffKey, type Diff } from "./code-data";
import { STATUSES } from "./data";
import { DiffStateIcon, StatusIcon } from "./glyphs";
import { Chip, GroupHeader, ViewActions } from "./issues-view";
import { useApp } from "./router";

// Reviews: Linear's list of diffs that need you, in its "focus" order (what
// needs your review, then what you're reviewing, then what's done). Rows
// share the issue list's columns: the diff's state where an issue's priority
// sits, its title where the identifier starts, then the issue it resolves,
// where the review stands, its size, and who's involved.

const REVIEW_TEXT: Record<Diff["review"], string> = {
  requested: "Waiting for your review",
  reviewing: "You’re reviewing",
  changes: "You requested changes",
  approved: "Approved",
  waiting: "Waiting for review",
  done: "",
};

/** The issue a diff resolves, as a chip with its status. */
export function IssueChip({ id }: { id: string }) {
  const status = STATUSES.find((s) => s.id === ISSUE_STATUS[id]) ?? STATUSES[1];
  return (
    <Chip className="flex-none gap-1.5 px-2">
      <StatusIcon status={status} size={12} />
      <span className="ln-tnum">{id}</span>
    </Chip>
  );
}

function ReviewStatus({ diff }: { diff: Diff }) {
  if (diff.state === "merged" || diff.state === "closed")
    return <span className="text-xs text-(--ln-text-muted)">{diff.state === "merged" ? "Merged" : "Closed"}</span>;
  const text = diff.state === "draft" ? "Draft" : REVIEW_TEXT[diff.review];
  const tone =
    diff.review === "changes"
      ? "text-(--ln-check-failed)"
      : diff.review === "requested"
        ? "text-(--ln-check-passed)"
        : "text-(--ln-text-muted)";
  return (
    <span className="flex items-center gap-1.5 text-xs font-[450] whitespace-nowrap text-(--ln-text-muted)">
      <span className={tone}>{diff.review === "requested" ? <ChecksPassedIcon size={12} /> : <CheckSkippedIcon size={12} />}</span>
      {text}
    </span>
  );
}

/** A diff in a list: the same strip of columns as an issue row. */
export function DiffRow({ diff }: { diff: Diff }) {
  const { go } = useApp();
  return (
    <button
      type="button"
      onClick={() => go({ page: "diff", key: diffKey(diff) })}
      className="group/row relative isolate -mx-2 flex h-11 w-[calc(100%+16px)] items-center gap-2 pr-[26px] pl-[42px] text-left before:absolute before:inset-x-2 before:inset-y-0 before:-z-10 before:rounded-lg hover:before:bg-(--ln-row-hover) max-[641px]:pr-[21px] max-[641px]:pl-[18px]"
    >
      <DiffStateIcon state={diff.state} />
      <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <span className="truncate text-[13px] font-medium text-(--ln-text)">{diff.title}</span>
        <span className="ln-mono shrink-0 text-xs text-(--ln-text-muted) max-[641px]:hidden">
          {diff.repo}#{diff.number}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-3">
          {diff.issue && (
            <span className="max-[769px]:hidden">
              <IssueChip id={diff.issue} />
            </span>
          )}
          <span className="max-[641px]:hidden">
            <ReviewStatus diff={diff} />
          </span>
          <LineCounts
            additions={diff.files.reduce((n, f) => n + f.additions, 0)}
            deletions={diff.files.reduce((n, f) => n + f.deletions, 0)}
            className="w-16 justify-end text-xs max-[769px]:hidden"
          />
          <Avatar who={diff.author} />
        </span>
      </span>
      <span className="w-10 shrink-0 text-right text-xs font-[450] whitespace-nowrap text-(--ln-text-muted) max-[769px]:hidden">
        {diff.age}
      </span>
    </button>
  );
}

function Group({ name, diffs, first, startOpen }: { name: string; diffs: Diff[]; first: boolean; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <section className={first ? "" : "mt-1"}>
      <GroupHeader
        icon={
          <span className="text-(--group-ink)">
            <DiffStateIcon state="open" size={14} mono />
          </span>
        }
        name={name}
        count={diffs.length}
        open={open}
        onToggle={() => setOpen(!open)}
        hue={[282, 272]}
        tint={[0, 0]}
      />
      {open && diffs.map((d) => <DiffRow key={diffKey(d)} diff={d} />)}
    </section>
  );
}

type ReviewsTab = "mine" | "created" | "open" | "all";

/**
 * Reviews: the diffs that need you (For me, Created). With `team`, the same
 * list as a team's Diffs: every diff in the team's repos, by state.
 */
export function ReviewsView({ title = "Reviews", crumb, team = false }: { title?: string; crumb?: React.ReactNode; team?: boolean }) {
  const { route, go } = useApp();
  const tabs: { id: ReviewsTab; label: string }[] = team
    ? [
        { id: "open", label: "Open" },
        { id: "all", label: "All diffs" },
      ]
    : [
        { id: "mine", label: "For me" },
        { id: "created", label: "Created" },
      ];
  const asked = route.page === "reviews" ? route.tab : undefined;
  const tab = tabs.find((t) => t.id === asked)?.id ?? tabs[0].id;
  const groups = REVIEW_GROUPS.filter((g) => g.tab === tab)
    .map((g) => ({ ...g, diffs: DIFFS.filter(g.match) }))
    .filter((g) => g.diffs.length > 0);
  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        {crumb}
        <h1>{title}</h1>
      </PageHeader>
      <TabBar
        tabs={tabs}
        value={tab}
        onChange={(t) => go({ page: "reviews", tab: t })}
      >
        <ViewActions />
      </TabBar>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.map((g, i) => (
          <Group key={g.id} name={g.name} diffs={g.diffs} first={i === 0} startOpen={!["completed", "all-closed"].includes(g.id)} />
        ))}
      </div>
    </div>
  );
}
