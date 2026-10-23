"use client";

import { Avatar, LineCounts, PageHeader, TabBar } from "./chrome";
import { DIFFS, ISSUE_STATUS, REVIEW_GROUPS, diffKey, listDate, type Diff } from "./code-data";
import { ISSUES, STATUSES } from "./data";
import { DiffStateIcon, PriorityIcon, RepoIcon, ReviewStateIcon, StatusIcon } from "./glyphs";
import { DiffList, FilterBar, ViewControls, useDiffView, type Field, type Prop } from "./diff-list";
import { Chip, LabelChip } from "./issues-view";
import { useFocusSections } from "./focus-prefs";
import { useApp } from "./router";

// Reviews: Linear's list of diffs that need you, in its "focus" order (what
// needs your review, then what you're reviewing, then what's done). Rows
// are the issue list's rows, adapted (see DiffRow).

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

/** What a row shows when Display options hasn't been touched: everything but the repository. */
export const DEFAULT_PROPS: Prop[] = ["id", "priority", "state", "labels", "issue", "review", "size", "author", "created"];

/** Where a diff stands for you, as a chip with its icon: the review while it's open, else merged, closed or draft. */
function ReviewChip({ diff }: { diff: Diff }) {
  const [icon, text] =
    diff.state === "merged" || diff.state === "closed" || diff.state === "draft"
      ? [<DiffStateIcon key="s" state={diff.state} size={12} />, { merged: "Merged", closed: "Closed", draft: "Draft" }[diff.state]]
      : diff.review === "done"
        ? [<ReviewStateIcon key="r" state="approved" size={12} />, "Reviewed"]
        : [<ReviewStateIcon key="r" state={diff.review} size={12} />, REVIEW_TEXT[diff.review]];
  return (
    <Chip className="flex-none gap-1.5 px-2 whitespace-nowrap">
      {icon}
      {text}
    </Chip>
  );
}

/** The repository a diff is in, as a chip, for lists that span repositories. */
function RepoChip({ slug }: { slug: string }) {
  return (
    <Chip className="min-w-0 gap-1.5 px-2">
      <RepoIcon size={12} className="shrink-0" />
      <span className="truncate">{slug}</span>
    </Chip>
  );
}

/**
 * The chips on the right of a diff row, behaving as the issue row's do: the
 * group gives way 1.5x as fast as the title, down to 90px; the labels go
 * first, then the rest truncate.
 */
function DiffChips({ diff, props }: { diff: Diff; props: Prop[] }) {
  return (
    <span className="flex min-w-[90px] flex-[1_1.5_auto] items-center justify-between gap-1 overflow-hidden">
      <span className="min-w-0 flex-auto" />
      {props.includes("labels") && diff.labels.length > 0 && (
        <span className="flex min-w-0 gap-1 max-[641px]:hidden">
          {diff.labels.map((l) => (
            <LabelChip key={l.name} label={l} />
          ))}
        </span>
      )}
      {props.includes("repo") && (
        <span className="flex min-w-0 max-[769px]:hidden" style={{ flexShrink: 1e-6 }}>
          <RepoChip slug={diff.repo} />
        </span>
      )}
      {props.includes("issue") && diff.issue && <IssueChip id={diff.issue} />}
      {props.includes("review") && <ReviewChip diff={diff} />}
    </span>
  );
}

/** The row properties a list's grouping already states for a diff. */
function impliedProps(implied: Field[], diff: Diff): Prop[] {
  return implied.flatMap((f): Prop[] => {
    switch (f) {
      case "focus":
      case "review":
        return ["review"];
      // the review chip names the state for drafts, merged and closed diffs, so a state group makes it repeat itself there too
      case "state":
        return diff.state === "open" ? ["state"] : ["state", "review"];
      case "repo":
        return ["repo"];
      case "label":
        return ["labels"];
      case "author":
        return ["author"];
      case "priority":
        return ["priority"];
      default:
        return [];
    }
  });
}

/**
 * A diff in a list, on the issue row's strip of columns and classes: the
 * priority of the issue it resolves, its number where the issue's identifier
 * is, its state where the issue's status is, the title and its size, the chips, the
 * author where the assignee is and its age where the date is. `props` are
 * the ones Display options shows.
 */
export function DiffRow({ diff, props: shown = DEFAULT_PROPS, implied = [] }: { diff: Diff; props?: Prop[]; implied?: Field[] }) {
  const { go } = useApp();
  // a row doesn't repeat what its group (or sub-group) already says: under "Drafts" no Draft chip, under "Needs your review" no review chip
  const props = shown.filter((p) => !impliedProps(implied, diff).includes(p));
  return (
    <button
      type="button"
      onClick={() => go({ page: "diff", key: diffKey(diff) })}
      className="group/row relative isolate -mx-2 flex h-11 w-[calc(100%+16px)] items-center gap-2 pr-[26px] pl-[42px] text-left before:absolute before:inset-x-2 before:inset-y-0 before:-z-10 before:rounded-lg hover:before:bg-(--ln-row-hover) max-[641px]:pr-[21px] max-[641px]:pl-[18px]"
    >
      <span
        aria-hidden
        className="absolute top-[15px] left-[19px] size-3.5 rounded-[3px] border border-(--ln-checkbox) opacity-0 group-hover/row:opacity-100 max-[641px]:hidden"
      />
      {/* a diff takes the priority of the issue it resolves */}
      {props.includes("priority") && (
        <span className="flex w-4 shrink-0 text-(--ln-text-muted)">
          <PriorityIcon priority={ISSUES.find((i) => i.id === diff.issue)?.priority ?? "none"} />
        </span>
      )}
      {props.includes("id") && (
        <span className="ln-tnum w-[42px] shrink-0 whitespace-nowrap text-[13px] font-[450] text-(--ln-text-muted) max-[641px]:hidden">
          #{diff.number}
        </span>
      )}
      {props.includes("state") && (
        <span className="flex w-4 shrink-0 justify-center">
          <DiffStateIcon state={diff.state} size={14} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-medium text-(--ln-text)">{diff.title}</span>
          {/* the diff's size, plain, right after its title */}
          {props.includes("size") && (
            <LineCounts
              additions={diff.files.reduce((n, f) => n + f.additions, 0)}
              deletions={diff.files.reduce((n, f) => n + f.deletions, 0)}
              className="text-xs max-[641px]:hidden"
            />
          )}
        </span>
        <DiffChips diff={diff} props={props} />
        {props.includes("author") ? <Avatar who={diff.author} size={18} /> : <span className="ml-auto" />}
      </span>
      {props.includes("created") && (
        <span className="w-10 shrink-0 whitespace-nowrap text-right text-xs font-[450] text-(--ln-text-muted) max-[769px]:hidden">
          {listDate(diff.age)}
        </span>
      )}
    </button>
  );
}

type ReviewsTab = "mine" | "created";

/** Reviews: the diffs that need you (For me) and the ones you opened (Created); a repo's Diffs tab lists the rest. */
export function ReviewsView() {
  const { route, go } = useApp();
  const tabs: { id: ReviewsTab; label: string }[] = [
    { id: "mine", label: "For me" },
    { id: "created", label: "Created" },
  ];
  const asked = route.page === "reviews" ? route.tab : undefined;
  const tab = tabs.find((t) => t.id === asked)?.id ?? tabs[0].id;
  // the tab's own groups are the list's Focus grouping, as My issues has it
  // For me shows the sections chosen in Settings › Reviews; the other tabs show all of theirs
  const [sections] = useFocusSections();
  const focus = REVIEW_GROUPS.filter((g) => g.tab === tab && (tab !== "mine" || sections.includes(g.id)));
  const base = DIFFS.filter((d) => focus.some((g) => g.match(d)));
  // grouped by focus: the sections say where each diff stands, so the rows don't repeat it
  const [view, setView] = useDiffView({ grouping: "focus", props: [...DEFAULT_PROPS, "repo"] });
  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        <h1>Reviews</h1>
      </PageHeader>
      <TabBar
        tabs={tabs}
        value={tab}
        onChange={(t) => go({ page: "reviews", tab: t })}
      >
        <ViewControls diffs={base} view={view} setView={setView} focus={focus} configure={tab === "mine" ? () => go({ page: "settings" }) : undefined} />
      </TabBar>
      <FilterBar diffs={base} view={view} setView={setView} />
      <DiffList diffs={base} view={view} setView={setView} focus={focus} />
    </div>
  );
}
