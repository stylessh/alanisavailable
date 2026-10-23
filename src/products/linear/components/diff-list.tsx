"use client";

import { useState, type ReactNode } from "react";
import { Avatar, IconButton } from "./chrome";
import { ME, PEOPLE, PROJECTS, REPOS, diffKey, type Diff, type FocusGlyph } from "./code-data";
import { ISSUES, LABELS, type Priority } from "./data";
import { Menu } from "./diff-conversation";
import { CheckStateIcon, DiffStateIcon, PriorityIcon, RepoIcon, ReviewStateIcon } from "./glyphs";
import { DisplayIcon, FilterIcon, PlusIcon } from "./icons";
import { GroupHeader } from "./issues-view";
import { ProjectGlyph } from "./person-card";
import { Check, IDLE, ROW } from "./reviewer-picker";
import { DiffRow } from "./reviews-view";

// A list of diffs with Linear's view controls, rebuilt off the desktop app
// (My issues, light, 2x): a Filter menu in the assignee menu's metrics, a
// property per row with its values in a submenu; the filters as segmented
// pills in a bar under the tabs; and Display options: grouping, sub-grouping
// and ordering selects, what to show, and the row's properties as pills.
// The fields are the ones a Git platform needs: a diff's state, where its
// review stands, its author and reviewers, the project and repository it
// belongs to, its labels, checks and priority (its issue's).

/* The fields */

export type Field = "focus" | "none" | "project" | "repo" | "state" | "review" | "author" | "reviewer" | "priority" | "label" | "checks";
export type Order = "created" | "title" | "priority" | "size" | "review" | "state";
export type Prop = "id" | "priority" | "state" | "labels" | "issue" | "review" | "repo" | "size" | "author" | "created";
export type Completed = "all" | "week" | "day" | "none";

/** One value a diff can have for a field: its key, how it reads, and its icon. */
type Value = { key: string; label: string; icon: ReactNode };

const PRIORITY_NAME: Record<Priority, string> = { high: "High", medium: "Medium", none: "No priority" };
const PRIORITIES: Priority[] = ["high", "medium", "none"];
const STATES: Diff["state"][] = ["open", "draft", "merged", "closed"];
const STATE_NAME: Record<Diff["state"], string> = { open: "Open", draft: "Draft", merged: "Merged", closed: "Closed" };
const REVIEWS: Diff["review"][] = ["requested", "reviewing", "changes", "approved", "waiting", "done"];
const REVIEW_NAME: Record<Diff["review"], string> = {
  requested: "Needs your review",
  reviewing: "You’re reviewing",
  changes: "Changes requested",
  approved: "Approved",
  waiting: "Waiting for review",
  done: "Reviewed",
};
const CHECKS = ["failed", "running", "passed"] as const;
const CHECK_NAME = { failed: "Failing", running: "Running", passed: "Passing" };

const priorityOf = (d: Diff): Priority => ISSUES.find((i) => i.id === d.issue)?.priority ?? "none";
const checksOf = (d: Diff) => (d.checks.some((c) => c.state === "failed") ? "failed" : d.checks.some((c) => c.state === "running") ? "running" : "passed");
const sizeOf = (d: Diff) => d.files.reduce((n, f) => n + f.additions + f.deletions, 0);
const PEOPLE_LIST = [ME, PEOPLE.maya, PEOPLE.jordan, PEOPLE.priya, PEOPLE.sam, PEOPLE.cursor, PEOPLE.linear];

/** Every value a field can take, in the order Linear would list them. */
function allValues(field: Field): Value[] {
  switch (field) {
    case "project":
      return [
        ...PROJECTS.map((p) => ({ key: p.id, label: p.name, icon: <ProjectGlyph project={p} /> })),
        { key: "", label: "No project", icon: <span className="size-3.5 rounded-full border-[1.5px] border-dashed border-(--ln-icon-faint)" /> },
      ];
    case "repo":
      return REPOS.map((r) => ({ key: r.slug, label: r.slug, icon: <RepoIcon size={14} className="text-(--ln-text-muted)" /> }));
    case "state":
      return STATES.map((s) => ({ key: s, label: STATE_NAME[s], icon: <DiffStateIcon state={s} size={14} /> }));
    case "review":
      return REVIEWS.map((r) => ({
        key: r,
        label: REVIEW_NAME[r],
        icon: <ReviewStateIcon state={r === "done" ? "approved" : r} size={14} />,
      }));
    case "author":
    case "reviewer":
      return PEOPLE_LIST.map((p) => ({ key: p.name, label: p.name, icon: <Avatar who={p} size={14} /> }));
    case "priority":
      return PRIORITIES.map((p) => ({ key: p, label: PRIORITY_NAME[p], icon: <span className="flex text-(--ln-text-muted)"><PriorityIcon priority={p} /></span> }));
    case "label":
      return [
        ...Object.values(LABELS)
          .filter((l, i, all) => all.findIndex((x) => x.name === l.name) === i)
          .map((l) => ({ key: l.name, label: l.name, icon: <span className="size-[9px] rounded-full" style={{ background: l.color }} /> })),
        { key: "", label: "No label", icon: <span className="size-[9px] rounded-full border border-dashed border-(--ln-icon-faint)" /> },
      ];
    case "checks":
      return CHECKS.map((c) => ({ key: c, label: CHECK_NAME[c], icon: <CheckStateIcon state={c} /> }));
    default:
      return [];
  }
}

/** The keys a diff has for a field; labels and reviewers can be several. */
function keysOf(field: Field, d: Diff): string[] {
  switch (field) {
    case "project":
      return [d.project ?? ""];
    case "repo":
      return [d.repo];
    case "state":
      return [d.state];
    case "review":
      return [d.review];
    case "author":
      return [d.author.name];
    case "reviewer":
      return d.reviewers.map((r) => r.who.name);
    case "priority":
      return [priorityOf(d)];
    case "label":
      return d.labels.length ? d.labels.map((l) => l.name) : [""];
    case "checks":
      return [checksOf(d)];
    default:
      return [];
  }
}

const FIELD_NAME: Record<Field, string> = {
  focus: "Focus",
  none: "No grouping",
  project: "Project",
  repo: "Repository",
  state: "State",
  review: "Review",
  author: "Author",
  reviewer: "Reviewer",
  priority: "Priority",
  label: "Label",
  checks: "Checks",
};

/* The view */

export type Filter = { field: Field; not: boolean; values: string[] };
export type View = {
  grouping: Field;
  subGrouping: Field;
  ordering: Order;
  /** groups in reverse, as the arrows beside Grouping flip them */
  groupsReversed: boolean;
  descending: boolean;
  completed: Completed;
  drafts: boolean;
  emptyGroups: boolean;
  props: Prop[];
  filters: Filter[];
};

const ALL_PROPS: Prop[] = ["id", "priority", "state", "labels", "issue", "review", "repo", "size", "author", "created"];
const PROP_NAME: Record<Prop, string> = {
  id: "ID",
  priority: "Priority",
  state: "State",
  labels: "Labels",
  issue: "Issue",
  review: "Review",
  repo: "Repository",
  size: "Lines changed",
  author: "Author",
  created: "Created",
};

export function useDiffView(defaults: Partial<View>) {
  return useState<View>({
    grouping: "none",
    subGrouping: "none",
    ordering: "created",
    groupsReversed: false,
    descending: false,
    completed: "all",
    drafts: true,
    emptyGroups: false,
    props: ALL_PROPS.filter((p) => p !== "repo"),
    filters: [],
    ...defaults,
  });
}

const MINUTES = { m: 1, h: 60, d: 1440, w: 10080 } as const;
const ageMinutes = (age: string) => Number.parseInt(age) * (MINUTES[age.slice(-1) as keyof typeof MINUTES] ?? 1);

/** Applies the filters, then what Display options hides: completed diffs past their window, and drafts. */
function visible(diffs: Diff[], view: View) {
  const filtered = diffs.filter((d) =>
    view.filters.every((f) => {
      const hit = keysOf(f.field, d).some((k) => f.values.includes(k));
      return f.not ? !hit : hit;
    }),
  );
  const window = { all: Infinity, week: 7 * 1440, day: 1440, none: -1 }[view.completed];
  const shown = filtered.filter(
    (d) => (d.state !== "merged" && d.state !== "closed") || ageMinutes(d.age) <= window,
  ).filter((d) => view.drafts || d.state !== "draft");
  return { shown, byFilters: diffs.length - filtered.length, byDisplay: filtered.length - shown.length };
}

function ordered(diffs: Diff[], view: View) {
  const rank = (d: Diff): number | string => {
    switch (view.ordering) {
      case "title":
        return d.title.toLowerCase();
      case "priority":
        return PRIORITIES.indexOf(priorityOf(d));
      case "size":
        return -sizeOf(d);
      case "review":
        return REVIEWS.indexOf(d.review);
      case "state":
        return STATES.indexOf(d.state);
      default:
        return ageMinutes(d.age);
    }
  };
  const sorted = [...diffs].sort((a, b) => {
    const x = rank(a);
    const y = rank(b);
    return x < y ? -1 : x > y ? 1 : 0;
  });
  return view.descending ? sorted.reverse() : sorted;
}

type Group = { key: string; name: string; icon: ReactNode; diffs: Diff[] };

/** Splits diffs by a field, in the field's own order; `focus` uses the page's groups. */
function groupBy(diffs: Diff[], field: Field, view: View, focus?: FocusGroup[]): Group[] {
  // in focus a diff sits in the first group that takes it, so the groups' order is their priority
  if (field === "focus" && focus)
    return focus.map((g) => ({ key: g.id, name: g.name, icon: <FocusIcon glyph={g.glyph} />, diffs: diffs.filter((d) => focus.find((f) => f.match(d)) === g) }));
  const values = allValues(field);
  const groups = values.map((v) => ({ key: v.key, name: v.label, icon: v.icon, diffs: diffs.filter((d) => keysOf(field, d).includes(v.key)) }));
  return view.groupsReversed ? groups.reverse() : groups;
}

export type FocusGroup = { id: string; name: string; glyph: FocusGlyph; match: (d: Diff) => boolean };

/** A focus group's icon: the review ring for where a review stands, the diff's state icon for drafts and the rest. */
export function FocusIcon({ glyph }: { glyph: FocusGlyph }) {
  if (glyph === "draft" || glyph === "open" || glyph === "merged" || glyph === "closed") return <DiffStateIcon state={glyph} size={14} />;
  return <ReviewStateIcon state={glyph} size={14} />;
}

/* Shared pieces */

/** Linear's select (2x): a 115x24 bordered button with the value in 12px and a chevron, opening a 118px menu of 23.5px rows in 12px. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative flex shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="ln-pill flex h-6 w-[115px] items-center justify-between rounded-md pr-2 pl-2 text-xs font-[450] text-(--ln-text) disabled:text-(--ln-icon-faint)"
      >
        <span className="truncate">{options.find((o) => o.id === value)?.label}</span>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden className="shrink-0">
          <path d="M1.25 2.75 4 5.5l2.75-2.75" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <Menu onClose={() => setOpen(false)} place="top-full right-0 mt-1 min-w-[118px] p-1">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitemradio"
              aria-checked={o.id === value}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              className="flex h-[23.5px] w-full items-center justify-between gap-3 rounded-md px-2 text-left text-xs font-[450] whitespace-nowrap text-(--ln-text) hover:bg-(--ln-menu-hover)"
            >
              {o.label}
              {o.id === value && <Check />}
            </button>
          ))}
        </Menu>
      )}
    </span>
  );
}

/** Linear's switch: a pill track with a knob, in the accent when on. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-3.5 w-[22px] shrink-0 rounded-full transition-colors ${on ? "bg-(--ln-accent)" : "bg-(--ln-pill-neutral) ring-[0.5px] ring-(--ln-chip-border) ring-inset"}`}
    >
      <span className={`absolute top-[1.5px] size-[11px] rounded-full bg-white shadow-sm transition-[left] ${on ? "left-[9.5px]" : "left-[1.5px]"}`} />
    </button>
  );
}

/** A row of Display options: a muted label, then (for Grouping and Ordering) the direction button 5px before the control. */
export function OptionRow({ label, children, action }: { label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex h-8 items-center">
      <span className="flex-1 text-xs font-[450] text-(--ln-text-muted)">{label}</span>
      {action && <span className="mr-[5px] flex">{action}</span>}
      {children}
    </div>
  );
}

/** The arrows beside Grouping and Ordering, flipping the direction. */
export function DirectionButton({ on, onClick, label, kind }: { on: boolean; onClick: () => void; label: string; kind: "groups" | "order" }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-md text-(--ln-text-header) hover:bg-(--ln-menu-hover)"
    >
      {kind === "groups" ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className={on ? "rotate-180" : ""}>
          <path d="M4.25 1.75v10.5M1.5 4.5l2.75-2.75L7 4.5M9.75 12.25V1.75m2.75 7.75-2.75 2.75L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className={on ? "-scale-y-100" : ""}>
          <path d="M3.75 12.25V1.75M1 4.5l2.75-2.75L6.5 4.5M8 3h4.5M8 6.75h3.25M8 10.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/* Display options */

const GROUPINGS: Field[] = ["none", "project", "repo", "state", "review", "author", "priority", "label", "checks"];
const ORDERS: { id: Order; label: string }[] = [
  { id: "created", label: "Created" },
  { id: "title", label: "Title" },
  { id: "priority", label: "Priority" },
  { id: "state", label: "State" },
  { id: "review", label: "Review" },
  { id: "size", label: "Lines changed" },
];

/**
 * Display options, measured off Linear's popover (2x): about 300px wide, 16px
 * in; List and Board on top; then 32px rows with a muted 13px label and a
 * 116px select, 18px under List and Board; hairline breaks between
 * sections; a bold "List options" heading; and the row's properties as
 * 24.5px pills in 13px, 5px apart, filled when shown, outlined when hidden.
 */
function DisplayOptions({ view, setView, focus, configure }: { view: View; setView: (v: View) => void; focus?: FocusGroup[]; configure?: () => void }) {
  const set = (patch: Partial<View>) => setView({ ...view, ...patch });
  const groupings = (focus ? (["focus", ...GROUPINGS] as Field[]) : GROUPINGS).map((f) => ({ id: f, label: FIELD_NAME[f] }));
  return (
    <div className="w-[299px] pt-4 pb-3">
      <div className="ln-switch mx-[18px] mb-[15.5px] flex gap-1">
        <button type="button" aria-current="page" className="ln-pill flex h-[27px] flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium text-(--ln-text)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M2 3.25h10M2 7h10M2 10.75h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          List
        </button>
        <button type="button" aria-disabled className="ln-pill flex h-[27px] flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium text-(--ln-text-muted)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
            <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" />
            <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" />
            <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" />
            <rect x="8" y="8" width="4.5" height="4.5" rx="1" />
          </svg>
          Board
        </button>
      </div>
      <div className="px-4">
        <OptionRow
          label="Grouping"
          action={<DirectionButton kind="groups" label="Reverse groups" on={view.groupsReversed} onClick={() => set({ groupsReversed: !view.groupsReversed })} />}
        >
          <Select value={view.grouping} options={groupings} onChange={(grouping) => set({ grouping })} />
        </OptionRow>
        {/* which sections Focus shows lives in Settings, so it holds across visits */}
        {configure && view.grouping === "focus" && (
          <OptionRow label="Focus sections">
            <button type="button" onClick={configure} className="ln-pill flex h-6 w-[115px] items-center justify-between rounded-md px-2 text-xs font-[450] text-(--ln-text)">
              Customize
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                <path d="M2.6.85 5.4 4 2.6 7.15" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </OptionRow>
        )}
        <OptionRow label="Sub-grouping">
          <Select
            value={view.subGrouping}
            options={GROUPINGS.filter((f) => f !== view.grouping || f === "none").map((f) => ({ id: f, label: FIELD_NAME[f] }))}
            onChange={(subGrouping) => set({ subGrouping })}
          />
        </OptionRow>
        <OptionRow
          label="Ordering"
          action={<DirectionButton kind="order" label="Reverse order" on={view.descending} onClick={() => set({ descending: !view.descending })} />}
        >
          <Select value={view.ordering} options={ORDERS} onChange={(ordering) => set({ ordering })} />
        </OptionRow>
      </div>
      <div className="my-2 border-t-[0.5px] border-(--ln-popover-border)" />
      <div className="px-4">
        <OptionRow label="Merged and closed">
          <Select
            value={view.completed}
            options={[
              { id: "all", label: "All" },
              { id: "week", label: "Past week" },
              { id: "day", label: "Past day" },
              { id: "none", label: "None" },
            ]}
            onChange={(completed) => set({ completed })}
          />
        </OptionRow>
        <OptionRow label="Show drafts">
          <Switch label="Show drafts" on={view.drafts} onChange={(drafts) => set({ drafts })} />
        </OptionRow>
      </div>
      <div className="my-2 border-t-[0.5px] border-(--ln-popover-border)" />
      <div className="px-4">
        <div className="flex h-8 items-center text-xs font-semibold text-(--ln-text)">List options</div>
        <OptionRow label="Show empty groups">
          <Switch label="Show empty groups" on={view.emptyGroups} onChange={(emptyGroups) => set({ emptyGroups })} />
        </OptionRow>
        <div className="flex h-8 items-center text-xs font-[450] text-(--ln-text-muted)">Display properties</div>
        <div className="mt-1 flex flex-wrap gap-[5px]">
          {ALL_PROPS.map((p) => {
            const on = view.props.includes(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => set({ props: on ? view.props.filter((x) => x !== p) : [...view.props, p] })}
                className={`flex h-[24.5px] items-center rounded-full px-2 text-[13px] font-medium ${
                  on ? "bg-(--ln-pill-neutral) text-(--ln-text)" : "text-(--ln-text-muted) ring-[0.5px] ring-(--ln-chip-border) ring-inset"
                }`}
              >
                {PROP_NAME[p]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* Filters */

const FILTER_FIELDS: { field: Field; icon: ReactNode }[] = [
  { field: "state", icon: <DiffStateIcon state="open" size={14} mono /> },
  { field: "review", icon: <RingIcon inner="dot" /> },
  { field: "author", icon: <PersonIcon /> },
  { field: "reviewer", icon: <PersonIcon /> },
  { field: "priority", icon: <PriorityIcon priority="high" /> },
  { field: "label", icon: <LabelIcon /> },
  { field: "checks", icon: <RingIcon inner="check" /> },
  { field: "project", icon: <ProjectIconSmall /> },
  { field: "repo", icon: <RepoIcon size={14} /> },
];
const FILTER_SECTIONS: Field[][] = [
  ["state", "review", "author", "reviewer", "priority", "label", "checks"],
  ["project", "repo"],
];

/** A monochrome ring with a dot or a check, as the Filter menu draws every property in gray. */
function RingIcon({ inner }: { inner: "dot" | "check" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.75" stroke="currentColor" strokeWidth="1.4" />
      {inner === "dot" ? (
        <circle cx="7" cy="7" r="2" fill="currentColor" />
      ) : (
        <path d="m4.75 7.1 1.5 1.5 3-3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="4.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.75 12c.6-2.2 2.2-3.4 4.25-3.4s3.65 1.2 4.25 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function LabelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h5.6a1.5 1.5 0 0 1 1.1.48l2 2.17a1.5 1.5 0 0 1 0 2.04l-2 2.17a1.5 1.5 0 0 1-1.1.48H3.5A1.5 1.5 0 0 1 2 8.84Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ProjectIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.75 12 4.5v5L7 12.25 2 9.5v-5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M2.25 4.6 7 7.25l4.75-2.65M7 7.25v4.75" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

const fieldIcon = (field: Field) => FILTER_FIELDS.find((f) => f.field === field)?.icon;

/** The values of one field, with a checkbox each and how many diffs have it, as Linear's filter submenu lists them. */
function ValueMenu({ field, diffs, filter, onToggle }: { field: Field; diffs: Diff[]; filter?: Filter; onToggle: (key: string) => void }) {
  const [q, setQ] = useState("");
  const values = allValues(field).filter((v) => v.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <div className="flex h-9 items-center border-b-[0.5px] border-(--ln-popover-border) pr-[11px] pl-[13.5px]">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter..."
          className="ln-search min-w-0 flex-1 bg-transparent text-[13px] font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
        />
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-1.5">
        {values.map((v) => {
          const on = !!filter?.values.includes(v.key);
          const count = diffs.filter((d) => keysOf(field, d).includes(v.key)).length;
          return (
            <button key={v.key || "none"} type="button" role="menuitemcheckbox" aria-checked={on} onClick={() => onToggle(v.key)} className={`group/v ${ROW} ${IDLE}`}>
              <span
                className={`flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border border-(--ln-checkbox) ${on ? "border-(--ln-accent) bg-(--ln-accent) text-white" : "opacity-0 group-hover/v:opacity-100"}`}
              >
                {on && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <path d="m2.25 5.25 1.75 1.75 3.75-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="flex size-4 shrink-0 items-center justify-center">{v.icon}</span>
              <span className="truncate">{v.label}</span>
              {count > 0 && <span className="ml-auto shrink-0 text-xs font-[450] text-(--ln-icon-faint)">{count === 1 ? "1 diff" : `${count} diffs`}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}

/**
 * The Filter menu, measured off Linear's (2x): the assignee menu's metrics
 * (206px, a 36px search row with its F badge, 32px rows, the icon at 14.5px
 * and the name at 38.5px), sections split by a hairline with 6px either side,
 * and a ▸ on each property, whose values open in a submenu beside it.
 */
function FilterMenu({ diffs, view, setView, onClose }: { diffs: Diff[]; view: View; setView: (v: View) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [field, setField] = useState<Field | null>(null);
  const toggle = (f: Field, key: string) => {
    const existing = view.filters.find((x) => x.field === f);
    const values = existing ? (existing.values.includes(key) ? existing.values.filter((v) => v !== key) : [...existing.values, key]) : [key];
    const filters = view.filters.filter((x) => x.field !== f);
    setView({ ...view, filters: values.length ? [...filters, { field: f, not: existing?.not ?? false, values }] : filters });
  };
  const match = (f: Field) => FIELD_NAME[f].toLowerCase().includes(q.trim().toLowerCase());
  return (
    <Menu onClose={onClose} place="top-full right-0 mt-1 w-[206px] p-0">
      <div className="flex h-9 items-center gap-2 border-b-[0.5px] border-(--ln-popover-border) pr-[11px] pl-[13.5px]">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Add Filter..."
          className="ln-search min-w-0 flex-1 bg-transparent text-[13px] font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
        />
        <kbd className="flex h-[17px] w-[18.5px] shrink-0 items-center justify-center rounded-[4px] border-[0.5px] border-(--ln-popover-border) font-sans text-[11px] font-medium text-(--ln-text-muted)">
          F
        </kbd>
      </div>
      {FILTER_SECTIONS.map((section, i) => {
        const fields = section.filter(match);
        if (!fields.length) return null;
        return (
          <div key={i} className={`p-1.5 ${i > 0 ? "border-t-[0.5px] border-(--ln-popover-border)" : ""}`}>
            {fields.map((f) => (
              // a property's values open on hover, as Linear's do, and stay while the pointer moves into them
              <div key={f} className="relative" onMouseEnter={() => setField(f)}>
                <button
                  type="button"
                  aria-expanded={field === f}
                  onClick={() => setField(f)}
                  className={`${ROW} ${field === f ? "bg-(--ln-menu-hover) text-(--ln-text)" : IDLE}`}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center text-(--ln-text-muted)">{fieldIcon(f)}</span>
                  {FIELD_NAME[f]}
                  {/* Linear's ▸ (2x): 4.5x5, 19px in from the menu's right edge */}
                  <svg width="5" height="5" viewBox="0 0 5 5" fill="currentColor" aria-hidden className="mr-[3px] ml-auto text-(--ln-icon-faint)">
                    <path d="M.6.55v3.9c0 .35.38.55.66.36l3.05-1.95a.43.43 0 0 0 0-.72L1.26.19C.98 0 .6.2.6.55Z" />
                  </svg>
                </button>
                {field === f && (
                  <div className="absolute top-[-42px] right-[calc(100%+6.5px)] z-10 w-[203px] rounded-xl border-[0.5px] border-(--ln-popover-border) bg-(--ln-popover) shadow-(--ln-popover-shadow)">
                    <ValueMenu field={f} diffs={diffs} filter={view.filters.find((x) => x.field === f)} onToggle={(key) => toggle(f, key)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </Menu>
  );
}

/** The Filter and Display buttons for the tab row, each opening its popover. */
export function ViewControls({
  diffs,
  view,
  setView,
  focus,
  configure,
}: {
  diffs: Diff[];
  view: View;
  setView: (v: View) => void;
  focus?: FocusGroup[];
  /** opens the settings for Focus's sections */
  configure?: () => void;
}) {
  const [open, setOpen] = useState<"filter" | "display" | null>(null);
  return (
    <span className="relative flex items-center gap-1.5 text-(--ln-text-muted)">
      <IconButton label="Filter" raised onClick={() => setOpen(open === "filter" ? null : "filter")}>
        <FilterIcon size={14} />
      </IconButton>
      <IconButton label="Display options" raised onClick={() => setOpen(open === "display" ? null : "display")}>
        <DisplayIcon size={14} />
      </IconButton>
      {open === "filter" && <FilterMenu diffs={diffs} view={view} setView={setView} onClose={() => setOpen(null)} />}
      {open === "display" && (
        <Menu onClose={() => setOpen(null)} place="top-full right-0 mt-3 p-0">
          <DisplayOptions view={view} setView={setView} focus={focus} configure={configure} />
        </Menu>
      )}
    </span>
  );
}

/** One filter as Linear's segmented pill: the field, is or is not, the values, and a × to remove it. */
function FilterPill({ filter, view, setView }: { filter: Filter; view: View; setView: (v: View) => void }) {
  const [opMenu, setOpMenu] = useState(false);
  const values = allValues(filter.field).filter((v) => filter.values.includes(v.key));
  const update = (patch: Partial<Filter>) => setView({ ...view, filters: view.filters.map((f) => (f === filter ? { ...f, ...patch } : f)) });
  // segments 7px in, their icons 12px (Linear's filter pill, measured at 1.25x)
  const seg = "flex h-full items-center gap-1 px-[7px] border-l-[0.5px] border-(--ln-chip-border) first:border-l-0 [&_svg]:size-3";
  return (
    <span className="relative flex h-[23px] items-center rounded-md border-[0.5px] border-(--ln-chip-border) bg-(--ln-chip) text-xs font-[450] text-(--ln-text-header)">
      <span className={seg}>
        <span className="flex text-(--ln-text-muted)">{fieldIcon(filter.field)}</span>
        {FIELD_NAME[filter.field]}
      </span>
      <button type="button" onClick={() => setOpMenu(!opMenu)} className={`${seg} text-(--ln-text-muted) hover:text-(--ln-text)`}>
        {filter.not ? (values.length > 1 ? "is not any of" : "is not") : values.length > 1 ? "is any of" : "is"}
      </button>
      <span className={seg}>
        {values.slice(0, 3).map((v) => (
          <span key={v.key} className="flex">
            {v.icon}
          </span>
        ))}
        {values.length === 1 ? values[0].label : `${values.length} ${FIELD_NAME[filter.field].toLowerCase()}s`}
      </span>
      <button
        type="button"
        aria-label="Remove filter"
        onClick={() => setView({ ...view, filters: view.filters.filter((f) => f !== filter) })}
        className={`${seg} px-[5px] text-(--ln-text-muted) hover:text-(--ln-text)`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="m2.5 2.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
      {opMenu && (
        <Menu onClose={() => setOpMenu(false)} place="top-full left-0 mt-1 w-[180px] p-1.5">
          {[false, true].map((not) => (
            <button
              key={String(not)}
              type="button"
              onClick={() => {
                update({ not });
                setOpMenu(false);
              }}
              className={`${ROW} ${IDLE}`}
            >
              {not ? "is not" : "is"}
            </button>
          ))}
        </Menu>
      )}
    </span>
  );
}

/** The filters in force, in a bar under the tabs (measured off Linear's, 2x): their segmented pills, + to add one, then Clear and Save on the right. */
export function FilterBar({ diffs, view, setView }: { diffs: Diff[]; view: View; setView: (v: View) => void }) {
  const [adding, setAdding] = useState(false);
  if (!view.filters.length) return null;
  return (
    // a 40px band in its own gray, as Linear sets the filters apart from the list
    <div className="mx-2 mb-1 flex min-h-10 flex-wrap items-center gap-1 rounded-lg bg-(--ln-filter-bar) px-2 py-2">
      {view.filters.map((f) => (
        <FilterPill key={f.field} filter={f} view={view} setView={setView} />
      ))}
      <span className="relative flex">
        <IconButton label="Add filter" className="size-6 text-(--ln-text-muted)" onClick={() => setAdding(!adding)}>
          <PlusIcon size={14} />
        </IconButton>
        {adding && (
          <span className="absolute top-0 left-0">
            <FilterMenu diffs={diffs} view={view} setView={setView} onClose={() => setAdding(false)} />
          </span>
        )}
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <button type="button" onClick={() => setView({ ...view, filters: [] })} className="h-6 rounded-md px-2 text-xs font-medium text-(--ln-text-header) hover:bg-(--ln-ghost-hover)">
          Clear
        </button>
        <button type="button" className="ln-pill h-6 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header)">
          Save
        </button>
      </span>
    </div>
  );
}

/* The list */

function Rows({ diffs, view, implied = [] }: { diffs: Diff[]; view: View; implied?: Field[] }) {
  return (
    <>
      {ordered(diffs, view).map((d) => (
        <DiffRow key={diffKey(d)} diff={d} props={view.props} implied={implied} />
      ))}
    </>
  );
}

function GroupSection({ group, view, focus, depth, implied }: { group: Group; view: View; focus?: FocusGroup[]; depth: number; implied: Field[] }) {
  const [open, setOpen] = useState(true);
  const sub =
    depth === 0 && view.subGrouping !== "none" ? groupBy(group.diffs, view.subGrouping, view, focus).filter((g) => g.diffs.length || view.emptyGroups) : null;
  // a sub-grouping that splits nothing (every diff in one sub-group) adds a header that only repeats its group's, so the rows sit straight under it
  const split = sub && (sub.length > 1 || view.emptyGroups);
  const within: Field[] = sub ? [...implied, view.subGrouping] : implied;
  return (
    <section className="mt-1 first:mt-0">
      {/* a sub-group's header steps in; its rows keep the list's columns */}
      <div className={depth > 0 ? "pl-6" : ""}>
        <GroupHeader icon={group.icon} name={group.name} count={group.diffs.length} open={open} onToggle={() => setOpen(!open)} hue={[282, 272]} tint={[0, 0]} />
      </div>
      {open &&
        (split ? (
          sub.map((g) => <GroupSection key={g.key || "none"} group={g} view={view} focus={focus} depth={1} implied={within} />)
        ) : (
          <Rows diffs={group.diffs} view={view} implied={within} />
        ))}
    </section>
  );
}

/**
 * The diffs as the view says: filtered, grouped (and sub-grouped), ordered,
 * with the row's properties chosen in Display options, then a footer, as
 * Linear's lists have, saying how many are hidden and by what.
 */
export function DiffList({ diffs, view, setView, focus }: { diffs: Diff[]; view: View; setView: (v: View) => void; focus?: FocusGroup[] }) {
  const { shown, byFilters, byDisplay } = visible(diffs, view);
  const groups = view.grouping === "none" ? null : groupBy(shown, view.grouping, view, focus).filter((g) => g.diffs.length || view.emptyGroups);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      {groups ? (
        groups.map((g) => <GroupSection key={g.key || "none"} group={g} view={view} focus={focus} depth={0} implied={[view.grouping]} />)
      ) : (
        <Rows diffs={shown} view={view} />
      )}
      {/* the footer, measured off Linear's (2x): 12px, 18px between a count and its action, 34.5px between the two */}
      {(byDisplay > 0 || byFilters > 0) && (
        <p className="flex h-14 items-center justify-center gap-[34.5px] text-xs font-[450] text-(--ln-text-muted)">
          {byDisplay > 0 && (
            <span className="flex items-center gap-[18px]">
              <span>
                <span className="font-medium text-(--ln-text-header)">{byDisplay === 1 ? "1 diff" : `${byDisplay} diffs`}</span> hidden by display options
              </span>
              <button type="button" onClick={() => setView({ ...view, completed: "all", drafts: true })} className="font-medium text-(--ln-text-header)">
                Show options
              </button>
            </span>
          )}
          {byFilters > 0 && (
            <span className="flex items-center gap-[18px]">
              <span>
                <span className="font-medium text-(--ln-text-header)">{byDisplay > 0 ? byFilters : byFilters === 1 ? "1 diff" : `${byFilters} diffs`}</span>{" "}
                {byDisplay > 0 ? "more " : ""}hidden by filters
              </span>
              <button type="button" onClick={() => setView({ ...view, filters: [] })} className="flex items-center gap-[9px] font-medium text-(--ln-text-header)">
                Clear Filters
                <svg width="7" height="7" viewBox="0 0 7 7" fill="none" aria-hidden>
                  <path d="m.75.75 5.5 5.5m0-5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          )}
        </p>
      )}
      {shown.length === 0 && byFilters === 0 && byDisplay === 0 && (
        <p className="py-10 text-center text-[13px] font-[450] text-(--ln-text-muted)">No diffs</p>
      )}
    </div>
  );
}
