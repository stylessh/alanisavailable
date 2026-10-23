"use client";

import { useState } from "react";
import { ISSUES, STATUSES, TEAM, VIEWS, type Issue, type Label, type Project, type Status } from "./data";
import { DueDateIcon, PriorityIcon, StatusIcon } from "./glyphs";
import { IconButton, PageHeader, TabBar } from "./chrome";
import {
  AsiaIcon,
  BellCheckIcon,
  CaretIcon,
  DisplayIcon,
  FilterIcon,
  GroupAddIcon,
  HeadphonesIcon,
  SidePanelIcon,
  UnassignedIcon,
} from "./icons";

// The issues list, measured from the reference (1512x945): a 44px header row
// with a hairline under it, a 44px row of view tabs, then the groups, inset
// 8px from the pane's sides. Group headers are 36px with a 4px gap above all
// but the first, and stick to the top of the list while their group scrolls
// under them (live: sticky, top 0, z-index 2); issue rows are 44px with
// every field centered on the row.
//
// A row is a strip of fixed columns (as the live app's grid): 42px in, the
// priority (16), the identifier (42, the widest key), the status (16), the
// title, which also holds the chips and the assignee, then the created date
// (40, right-aligned) and 26px of end padding. Columns are 8px apart. Like
// Linear, the date goes at 768px and below, and at 640px and below rows
// drop the identifier and labels and start 18px in. Hover is a rounded fill
// inset 8px, in line with the group headers, with the row's checkbox.
const DUE_SOON = "#f2763f";

/** Filter, display options and the details panel toggle, at the right of a tab bar. */
export function ViewActions() {
  return (
    <>
      <IconButton label="Filter" raised>
        <FilterIcon size={14} />
      </IconButton>
      <IconButton label="Display options" raised>
        <DisplayIcon size={14} />
      </IconButton>
      <IconButton label="Toggle details" raised>
        <SidePanelIcon size={14} />
      </IconButton>
    </>
  );
}

export function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`flex h-6 items-center overflow-hidden rounded-full border-[0.5px] border-(--ln-chip-border) bg-(--ln-chip) text-xs font-[450] text-(--ln-text-muted) ${className}`}
    >
      {children}
    </span>
  );
}

/** A label as a pill: capped at 112px in list rows, full width where there's room (the panel). */
export function LabelChip({ label, full = false }: { label: Label; full?: boolean }) {
  return (
    <Chip className={`${full ? "" : "max-w-28"} flex-none pr-2 pl-[11px]`}>
      <span className="size-[9px] shrink-0 rounded-full" style={{ background: label.color }} />
      <span className="ml-[8.5px] truncate">{label.name}</span>
    </Chip>
  );
}

export function ProjectChip({ project }: { project: Project }) {
  return (
    <Chip className="max-w-[290px] min-w-0 px-2">
      {project.emoji ? (
        <span className="flex size-3.5 shrink-0 items-center justify-center text-[13px] leading-none">{project.emoji}</span>
      ) : (
        <HeadphonesIcon size={14} className="shrink-0 text-(--ln-project-icon)" />
      )}
      <span className="ml-1.5 truncate">{project.name}</span>
    </Chip>
  );
}

/**
 * Labels, project and due date, right-aligned in the title column. As the
 * row narrows, this group gives way 1.5x as fast as the title, down to 90px
 * (live: flex 1 1.5 auto). Inside it the labels go first: their wrapper can
 * collapse to nothing while the chips themselves never shrink, so the
 * project chip slides over them, as it does in Linear; only then does the
 * project chip, whose wrapper barely shrinks, truncate its name.
 */
function Chips({ issue }: { issue: Issue }) {
  return (
    <span className="flex min-w-[90px] flex-[1_1.5_auto] items-center justify-between gap-1 overflow-hidden">
      <span className="min-w-0 flex-auto" />
      {issue.labels && (
        <span className="flex min-w-0 gap-1 max-[641px]:hidden">
          {issue.labels.map((l) => (
            <LabelChip key={l.name} label={l} />
          ))}
        </span>
      )}
      {issue.project && (
        <span className="flex min-w-0" style={{ flexShrink: 1e-6 }}>
          <ProjectChip project={issue.project} />
        </span>
      )}
      {issue.due && (
        <Chip className="flex-none px-2">
          <DueDateIcon color={DUE_SOON} />
          <span className="ml-1.5">{issue.due}</span>
        </Chip>
      )}
    </span>
  );
}

function IssueRow({ issue, status }: { issue: Issue; status: Status }) {
  const chips = !!(issue.labels || issue.project || issue.due);
  return (
    <a
      href={`#${issue.id}`}
      className="group/row relative isolate -mx-2 flex h-11 items-center gap-2 pr-[26px] pl-[42px] before:absolute before:inset-x-2 before:inset-y-0 before:-z-10 before:rounded-lg hover:before:bg-(--ln-row-hover) max-[641px]:pr-[21px] max-[641px]:pl-[18px]"
    >
      <span
        aria-hidden
        className="absolute top-[15px] left-[19px] size-3.5 rounded-[3px] border border-(--ln-checkbox) opacity-0 group-hover/row:opacity-100 max-[641px]:hidden"
      />
      <span className="flex w-4 shrink-0 text-(--ln-text-muted)">
        <PriorityIcon priority={issue.priority} />
      </span>
      <span className="ln-tnum w-[42px] shrink-0 whitespace-nowrap text-[13px] font-[450] text-(--ln-text-muted) max-[641px]:hidden">
        {issue.id}
      </span>
      <span className="flex w-4 shrink-0 justify-center">
        <StatusIcon status={status} />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <span className="flex min-w-0">
          <span className="truncate text-[13px] font-medium text-(--ln-text)">{issue.title}</span>
        </span>
        {chips && <Chips issue={issue} />}
        <UnassignedIcon
          size={18}
          aria-label="No assignee"
          className={`shrink-0 text-(--ln-icon-faint) ${chips ? "" : "ml-auto"}`}
        />
      </span>
      <span className="w-10 shrink-0 whitespace-nowrap text-right text-xs font-[450] text-(--ln-text-muted) max-[769px]:hidden">
        {issue.created}
      </span>
    </a>
  );
}

/**
 * A group's banner: 36px, rounded, sticky at the top of the list while its
 * rows scroll under it, tinted with the group's hue (an lch hue and the
 * chroma of its left edge, per theme).
 */
export function GroupHeader({
  icon,
  name,
  count,
  open,
  onToggle,
  hue,
  tint,
}: {
  icon: React.ReactNode;
  name: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  hue: [number, number];
  tint: [number, number];
}) {
  return (
    <div
      className="ln-group sticky top-0 z-[2] flex h-9 items-center rounded-lg pr-2"
      style={
        {
          "--hue-light": hue[0],
          "--hue-dark": hue[1],
          "--tint-light": tint[0],
          "--tint-dark": tint[1],
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
        onClick={onToggle}
        className="ml-2.5 flex size-4 items-center justify-center text-(--group-caret)"
      >
        <CaretIcon className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
      </button>
      <span className="ml-[11px] flex">{icon}</span>
      <h2 className="ml-[9px] text-[13px] font-medium text-(--ln-text-strong)">{name}</h2>
      <span className="ml-2 text-[13px] font-[450] text-(--group-ink)">{count}</span>
      <button
        type="button"
        aria-label={`New in ${name}`}
        className="ml-auto flex size-6 items-center justify-center rounded-full text-(--group-ink) hover:bg-(--ln-ghost-hover)"
      >
        <GroupAddIcon size={14} />
      </button>
    </div>
  );
}

function Group({ status, issues, first }: { status: Status; issues: Issue[]; first: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={first ? "" : "mt-1"}>
      <GroupHeader
        icon={<StatusIcon status={status} />}
        name={status.name}
        count={issues.length}
        open={open}
        onToggle={() => setOpen(!open)}
        hue={status.hue}
        tint={status.tint}
      />
      {open && issues.map((issue) => <IssueRow key={issue.id} issue={issue} status={status} />)}
    </section>
  );
}

export function IssuesView() {
  const [view, setView] = useState("all");
  const shown = VIEWS.find((v) => v.id === view)?.statuses;
  const groups = STATUSES.filter((s) => !shown || shown.includes(s.id))
    .map((status) => ({ status, issues: ISSUES.filter((i) => i.status === status.id) }))
    .filter((g) => g.issues.length > 0);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <IconButton label="Notifications">
            <BellCheckIcon size={13.3} />
          </IconButton>
        }
      >
        <AsiaIcon size={14} style={{ color: TEAM.color }} />
        <h1 className="ml-2.5">{TEAM.name}</h1>
      </PageHeader>
      <TabBar tabs={VIEWS.map((v) => ({ id: v.id, label: v.name }))} value={view} onChange={setView} addView>
        <ViewActions />
      </TabBar>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.map((g, i) => (
          <Group key={g.status.id} status={g.status} issues={g.issues} first={i === 0} />
        ))}
      </div>
    </div>
  );
}
