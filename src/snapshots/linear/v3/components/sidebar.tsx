"use client";

import { useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { IconButton } from "./chrome";
import { BookIcon } from "./code-icons";
import { DIFFS } from "./code-data";
import { TEAM, WORKSPACE } from "./data";
import { DiffStateIcon } from "./glyphs";
import {
  AsiaIcon,
  CaretIcon,
  ChevronDownIcon,
  ComposeIcon,
  CyclesIcon,
  GitHubIcon,
  InboxIcon,
  InitiativesIcon,
  MoreIcon,
  MyIssuesIcon,
  NotePadIcon,
  PlusIcon,
  ProjectIcon,
  SearchIcon,
  TeamIssuesIcon,
  ViewsIcon,
} from "./icons";
import { useApp, type Route } from "./router";

// The sidebar is 244px wide. Rows are 28px tall on a 29px pitch (30px under
// "Try"), inset 12px from each side, with a 14px icon 10px in and every label
// starting at x=42. A section's label sits 17-18px below the rows above it
// and 2px above its own.
type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** Reviews' glyph: the open diff, in the row's color. */
function ReviewsIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <span className={className}>
      <DiffStateIcon state="open" size={size} mono />
    </span>
  );
}

/** The diffs waiting on you, for the Reviews badge. */
const NEEDS_REVIEW = DIFFS.filter((d) => d.review === "requested").length;

/** Which part of the app a route belongs to, for the sidebar's selected row. */
function section(route: Route) {
  if (route.page === "repos" || route.page === "repo") return "repositories";
  if (route.page === "reviews" || route.page === "diff") return "reviews";
  return "issues";
}

function NavRow({
  icon: Icon,
  label,
  selected,
  inset = false,
  badge,
  onClick,
}: {
  icon: Icon;
  label: string;
  selected?: boolean;
  /** a team's own pages, indented under the team */
  inset?: boolean;
  /** a count at the row's right, like Inbox's */
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "page" : undefined}
      className={`flex h-7 items-center gap-1.5 rounded-lg text-left text-[13px] font-medium ${
        inset ? "mr-3 ml-[31px] pl-1.5" : "mx-3 pl-2.5"
      } ${
        selected
          ? "bg-(--ln-nav-selected) text-(--ln-text-nav-selected)"
          : "text-(--ln-text-nav) hover:bg-(--ln-nav-hover)"
      }`}
    >
      <Icon size={14} className="shrink-0" />
      <span className="truncate">{label}</span>
      {badge !== undefined && <span className="mr-2.5 ml-auto text-[11px] font-[450]">{badge}</span>}
    </button>
  );
}

function Section({
  label,
  children,
  className = "mt-[17px]",
  rowsClassName = "gap-px",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  rowsClassName?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="mx-3 mb-0.5 flex h-7 items-center rounded-lg pl-[9px] pr-2 text-xs font-medium text-(--ln-text-nav) hover:bg-(--ln-nav-hover)"
      >
        {label}
        <CaretIcon className={`ml-0.5 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className={`flex flex-col ${rowsClassName}`}>{children}</div>}
    </div>
  );
}

function Team({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="mx-3 flex h-7 items-center rounded-lg pl-[9px] text-[13px] font-medium text-(--ln-text-nav) hover:bg-(--ln-nav-hover)"
      >
        <AsiaIcon size={14} className="shrink-0" style={{ color: TEAM.color }} />
        <span className="ml-[7px]">{TEAM.name}</span>
        <CaretIcon className={`ml-1.5 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && children}
    </>
  );
}

/**
 * The sidebar. Below 800px it becomes a 330px drawer over the page (as
 * Linear's does), parked 346px off the left edge until the header's menu
 * button opens it.
 */
export function Sidebar({ open }: { open: boolean }) {
  const { route, go } = useApp();
  const at = section(route);
  return (
    <nav
      aria-label="Workspace"
      className={`relative flex h-full w-[244px] shrink-0 flex-col pt-4 max-[800px]:fixed max-[800px]:inset-y-0 max-[800px]:left-0 max-[800px]:z-30 max-[800px]:w-[330px] max-[800px]:bg-(--ln-sidebar) max-[800px]:shadow-(--ln-drawer-shadow) max-[800px]:transition-[translate,visibility] max-[800px]:duration-200 max-[800px]:ease-out ${
        open ? "" : "max-[800px]:invisible max-[800px]:-translate-x-[346px]"
      }`}
    >
      <div className="flex h-7 items-center pr-3 pl-[19px]">
        <button type="button" className="flex min-w-0 items-center rounded-md text-(--ln-text-strong)">
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded-[5px] text-[10px] font-semibold text-white"
            style={{ background: WORKSPACE.color }}
          >
            {WORKSPACE.initials}
          </span>
          <span className="ml-[7px] truncate text-[13px] leading-[23px] font-[550] tracking-[-0.1px]">{WORKSPACE.name}</span>
          <ChevronDownIcon size={8} className="ml-1.5 shrink-0" />
        </button>
        <IconButton label="Search" className="ml-auto text-(--ln-text-strong)">
          <SearchIcon size={14} />
        </IconButton>
        <IconButton label="Create new issue" raised className="ml-1 text-(--ln-text-strong)">
          <ComposeIcon size={14} />
        </IconButton>
      </div>

      <div className="mt-[16.5px] flex flex-col gap-px">
        <NavRow icon={InboxIcon} label="Inbox" />
        <NavRow icon={MyIssuesIcon} label="My issues" />
        <NavRow icon={NotePadIcon} label="Drafts" />
      </div>

      <Section label="Workspace">
        <NavRow icon={ProjectIcon} label="Projects" />
        <NavRow icon={ViewsIcon} label="Views" />
        <NavRow icon={MoreIcon} label="More" />
      </Section>

      <Section label="Your teams" className="mt-[18px]">
        <Team>
          <NavRow icon={TeamIssuesIcon} label="Issues" inset selected={at === "issues"} onClick={() => go({ page: "issues" })} />
          {/* Team tab: a team owns its repositories and their diffs, the way it owns its issues */}
          <NavRow icon={BookIcon} label="Code" inset selected={at === "repositories"} onClick={() => go({ page: "repos" })} />
          <NavRow
            icon={ReviewsIcon}
            label="Diffs"
            inset
            badge={NEEDS_REVIEW}
            selected={at === "reviews"}
            onClick={() => go({ page: "reviews", tab: "open" })}
          />
          <NavRow icon={ProjectIcon} label="Projects" inset />
          <NavRow icon={ViewsIcon} label="Views" inset />
        </Team>
      </Section>

      <Section label="Try" className="mt-6" rowsClassName="gap-0.5">
        <NavRow icon={TeamIssuesIcon} label="Import issues" />
        <NavRow icon={PlusIcon} label="Invite people" />
        <NavRow icon={InitiativesIcon} label="Initiatives" />
        <NavRow icon={CyclesIcon} label="Cycles" />
        <NavRow icon={GitHubIcon} label="Import from GitHub" />
      </Section>
    </nav>
  );
}
