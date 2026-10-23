"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AddButton, Avatar } from "./chrome";
import { DIFFS, ME, PEOPLE, PROFILES, type CodeProject, type Person } from "./code-data";
import { DiffStateIcon } from "./glyphs";
import { Menu } from "./diff-conversation";
import { HeadphonesIcon, ProjectIcon, TeamIssuesIcon } from "./icons";
import { Check, HEAD, IDLE, InviteIcon, ROW } from "./reviewer-picker";

// People in the panel, as Linear shows them: a hover card with who someone
// is, a facepile that opens one per face, and a menu to add people with a
// role each.

/*
 * The hover card, measured off Linear's (issue panel, 2x): 196.5px wide, the
 * popover's fill and hairline with 8px corners; a 32px avatar 12px in, the
 * name at 13/500 and the handle at 12/450 under it; a hairline inset 12px,
 * 12px below; then rows 26px apart (12/450, a 14px icon 10.5px before the
 * text) with 8px above and below. It opens 8px beside its trigger, centred
 * on it.
 */

function StatusDot({ status }: { status: "online" | "away" | "offline" }) {
  const color = status === "online" ? "lch(73 50 145)" : status === "away" ? "lch(80 90 85)" : "var(--ln-icon-faint)";
  return (
    <span className="flex size-3.5 items-center justify-center rounded-full" style={{ background: `color-mix(in lch, ${color} 14%, transparent)` }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 4v3.25l2 1.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TeamCardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1.75" y="1.75" width="10.5" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="5.75" r="1.75" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.25 10.25c.5-1.25 1.5-1.9 2.75-1.9s2.25.65 2.75 1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CardRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-[26px] items-center gap-[9px] px-[13px] text-xs font-[450] text-(--ln-text-header)">
      <span className="flex size-3.5 shrink-0 items-center justify-center text-(--ln-text-muted)">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

/** Who someone is: their avatar, name and handle, then whether they're around, their time, teams and projects. */
export function PersonCard({ who }: { who: Person }) {
  const p = PROFILES[who.name];
  return (
    <div className="w-[196.5px] rounded-lg border-[0.5px] border-(--ln-popover-border) bg-(--ln-popover) shadow-(--ln-popover-shadow)">
      {/* an agent's card is its header alone, so it pads evenly */}
      <div className={`flex items-center gap-2.5 px-3 pb-[10px] ${who.agent ? "pt-[10px]" : "pt-[7px]"}`}>
        <Avatar who={who} size={32} />
        <div className="min-w-0">
          <div className="truncate text-[13px] leading-[18.5px] font-medium text-(--ln-text)">{who.name}</div>
          <div className="flex min-w-0 items-center gap-1.5 text-xs leading-[18.5px] font-[450] text-(--ln-text-muted)">
            <span className="truncate">{p?.handle ?? who.name.toLowerCase()}</span>
            {/* as Linear marks an agent: an outlined badge after its handle */}
            {who.agent && (
              <span className="flex h-[18px] shrink-0 items-center rounded-full border-[0.5px] border-(--ln-chip-border) px-1.5 leading-none text-(--ln-text-muted)">
                Agent
              </span>
            )}
          </div>
        </div>
      </div>
      {/* an agent is neither online nor in a timezone, so its card ends at its name */}
      {!who.agent && (
        <>
          <div className="mx-3 border-t-[0.5px] border-(--ln-popover-border)" />
          <div className="pt-2 pb-[6.5px]">
            <CardRow icon={<StatusDot status={p?.status ?? "offline"} />}>
              {p?.status === "online" ? "Online" : p?.status === "away" ? "Away" : "Offline"}
            </CardRow>
            {p?.time && (
              <CardRow icon={<ClockIcon />}>
                {p.time} <span className="text-(--ln-text-muted)">local time</span>
              </CardRow>
            )}
            {p && p.teams.length > 0 && <CardRow icon={<TeamCardIcon />}>{p.teams.join(", ")}</CardRow>}
            {p && p.projects.length > 0 && <CardRow icon={<ProjectIcon size={14} />}>{p.projects.join(", ")}</CardRow>}
          </div>
        </>
      )}
    </div>
  );
}

/** Opens a card beside its trigger after a short hover, and keeps it while the pointer moves onto it. */
export function HoverCard({ card, children, side = "left" }: { card: ReactNode; children: ReactNode; side?: "left" | "right" }) {
  const [at, setAt] = useState<{ top: number; x: number } | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const later = (open: boolean, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = anchor.current?.getBoundingClientRect();
      setAt(open && r ? { top: r.top + r.height / 2, x: side === "left" ? window.innerWidth - r.left + 8 : r.right + 8 } : null);
    }, ms);
  };
  // the card lives at the top of the product's tree, beside its trigger, so a panel that scrolls on its own can't clip it
  const host = typeof document === "undefined" ? null : document.querySelector(".linear");
  return (
    <span ref={anchor} className="relative flex" onMouseEnter={() => later(true, 350)} onMouseLeave={() => later(false, 120)}>
      {children}
      {at &&
        host &&
        createPortal(
          <span
            onMouseEnter={() => later(true, 0)}
            onMouseLeave={() => later(false, 120)}
            className="fixed z-50 -translate-y-1/2"
            style={side === "left" ? { top: at.top, right: at.x } : { top: at.top, left: at.x }}
          >
            {card}
          </span>,
          host,
        )}
    </span>
  );
}

export function PersonHover({ who, children, side = "left" }: { who: Person; children: ReactNode; side?: "left" | "right" }) {
  return (
    <HoverCard card={<PersonCard who={who} />} side={side}>
      {children}
    </HoverCard>
  );
}

/* Projects, as a repo's panel lists them. */

/** A project's glyph: its emoji, or one of Linear's icons. */
export function ProjectGlyph({ project, size = 14 }: { project: CodeProject; size?: number }) {
  return project.emoji ? (
    <span className="flex items-center justify-center leading-none" style={{ width: size, height: size, fontSize: size - 2 }}>
      {project.emoji}
    </span>
  ) : (
    <HeadphonesIcon size={size} className="text-(--ln-project-icon)" />
  );
}

/** A project's progress as Linear draws it: a ring, filled clockwise as a pie. */
export function ProgressPie({ value, size = 14 }: { value: number; size?: number }) {
  const a = Math.min(value, 0.999) * 2 * Math.PI;
  const x = 7 + 3.5 * Math.sin(a);
  const y = 7 - 3.5 * Math.cos(a);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden className={value >= 1 ? "text-(--ln-check-passed)" : "text-(--ln-check-running)"}>
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      {value > 0 && <path d={`M7 7V3.5A3.5 3.5 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`} fill="currentColor" />}
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1.75" y="2.75" width="10.5" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.75 5.75h10.5M4.75 1.5v2.5M9.25 1.5v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** What a project is in this repo: its lead, how far along it is, when it's due, its issues and the diffs here. */
export function ProjectCard({ project, repo }: { project: CodeProject; repo: string }) {
  const diffs = DIFFS.filter((d) => d.repo === repo && d.project === project.id);
  const open = diffs.filter((d) => d.state === "open" || d.state === "draft").length;
  return (
    <div className="w-[236px] rounded-lg border-[0.5px] border-(--ln-popover-border) bg-(--ln-popover) shadow-(--ln-popover-shadow)">
      <div className="flex items-center gap-2.5 px-3 pt-[7px] pb-[10px]">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-(--ln-pill-neutral)">
          <ProjectGlyph project={project} size={18} />
        </span>
        <div className="min-w-0">
          <div className="line-clamp-2 text-[13px] leading-[18.5px] font-medium text-(--ln-text)">{project.name}</div>
          <div className="truncate text-xs leading-[18.5px] font-[450] text-(--ln-text-muted)">Lead · {project.lead.name}</div>
        </div>
      </div>
      <div className="mx-3 border-t-[0.5px] border-(--ln-popover-border)" />
      <div className="pt-2 pb-[6.5px]">
        <CardRow icon={<ProgressPie value={project.progress} />}>
          {Math.round(project.progress * 100)}% <span className="text-(--ln-text-muted)">complete</span>
        </CardRow>
        {project.target && (
          <CardRow icon={<CalendarIcon />}>
            {project.target} <span className="text-(--ln-text-muted)">target</span>
          </CardRow>
        )}
        <CardRow icon={<TeamIssuesIcon size={14} />}>
          {project.issues} <span className="text-(--ln-text-muted)">issues</span>
        </CardRow>
        <CardRow icon={<DiffStateIcon state="open" size={14} mono />}>
          {diffs.length} <span className="text-(--ln-text-muted)">{diffs.length === 1 ? "diff" : "diffs"} here{open ? `, ${open} open` : ""}</span>
        </CardRow>
      </div>
    </div>
  );
}

/**
 * Overlapping avatars, as Linear stacks subscribers: each a seventh over the
 * one before, cut out of it by a 1.5px ring in the page's color; hovering a
 * face opens that person's card.
 */
export function Facepile({ people, size = 20, max = 20 }: { people: Person[]; size?: number; max?: number }) {
  // up to `max` faces; past that, how many more instead of a count of everyone
  const rest = people.length - max;
  return (
    <span className="flex items-center">
      {people.slice(0, max).map((p, i) => (
        <span key={p.name} className="flex" style={{ marginLeft: i === 0 ? 0 : -Math.round(size * 0.15) - 3 }}>
          <PersonHover who={p}>
            <button type="button" aria-label={p.name} className="flex rounded-full bg-(--ln-main) p-[1.5px]">
              <Avatar who={p} size={size} />
            </button>
          </PersonHover>
        </span>
      ))}
      {rest > 0 && <span className="ml-1.5 text-[13px] font-[450] whitespace-nowrap text-(--ln-text-muted)">{rest} more</span>}
    </span>
  );
}

/* Adding people to a repository, each with a role. */

export type Role = "Admin" | "Write" | "Read";
const ROLES: { id: Role; detail: string }[] = [
  { id: "Admin", detail: "Settings, members and branch rules" },
  { id: "Write", detail: "Push branches, open and merge diffs" },
  { id: "Read", detail: "Clone, browse and comment" },
];
export type Member = { who: Person; role: Role };

/** A member's role as a small menu button; the menu itself opens beside the whole people menu, so the list never clips it. */
function RoleButton({ role, open, onOpen }: { role: Role; open: boolean; onOpen: (top: number) => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(e.currentTarget.getBoundingClientRect().top);
      }}
      className="ml-auto flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-(--ln-text-muted) hover:bg-(--ln-menu-hover) hover:text-(--ln-text) aria-expanded:bg-(--ln-menu-hover) aria-expanded:text-(--ln-text)"
    >
      {role}
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
        <path d="m1.75 3 2.25 2.25L6.25 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** The roles with what each allows, the current one checked, then removal. */
function RoleMenu({ role, onRole, onRemove }: { role: Role; onRole: (r: Role) => void; onRemove: () => void }) {
  return (
    <>
      {ROLES.map((r) => (
        <button
          key={r.id}
          type="button"
          role="menuitemradio"
          aria-checked={r.id === role}
          onClick={() => onRole(r.id)}
          className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-(--ln-menu-hover)"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium text-(--ln-text)">{r.id}</span>
            <span className="block text-xs font-[450] text-(--ln-text-muted)">{r.detail}</span>
          </span>
          <span className="mt-1 flex w-3 justify-end">{r.id === role && <Check />}</span>
        </button>
      ))}
      <div className="my-1 border-t-[0.5px] border-(--ln-popover-border)" />
      <button
        type="button"
        onClick={onRemove}
        className="flex h-8 w-full items-center rounded-lg px-2 text-left text-[13px] font-[450] text-(--ln-check-failed) hover:bg-(--ln-menu-hover)"
      >
        Remove from repository
      </button>
    </>
  );
}

/**
 * The + after the contributors: a menu in the reviewer picker's metrics, with
 * a search, the members and their roles, then everyone else in the workspace
 * and its agents to add (as Write), and an invite row at the end.
 */
export function AddPeople({ members, onChange }: { members: Member[]; onChange: (m: Member[]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  // the member whose role menu is open, and where their row sits in the menu
  const [editing, setEditing] = useState<{ name: string; top: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const everyone: Person[] = [ME, PEOPLE.maya, PEOPLE.jordan, PEOPLE.priya, PEOPLE.sam, PEOPLE.cursor, PEOPLE.linear];
  const match = (p: Person) => p.name.toLowerCase().includes(q.trim().toLowerCase());
  const isMember = (p: Person) => members.some((m) => m.who.name === p.name);
  const shown = members.filter((m) => match(m.who));
  const people = everyone.filter((p) => !p.agent && !isMember(p) && match(p));
  const agents = everyone.filter((p) => p.agent && !isMember(p) && match(p));
  const add = (p: Person) => onChange([...members, { who: p, role: "Write" }]);
  const editingMember = editing ? members.find((m) => m.who.name === editing.name) : undefined;

  return (
    <span className="relative flex">
      <AddButton label="Add people" onClick={() => setOpen(!open)} />
      {open && (
        // the panel's last section sits low on the page, so the menu opens upward
        <Menu
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          place="bottom-full right-0 mb-1 w-[260px] p-0"
        >
          <div ref={root} className="relative">
            <div className="flex h-9 items-center border-b-[0.5px] border-(--ln-popover-border) pr-[11px] pl-[13.5px]">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  const first = people[0] ?? agents[0];
                  if (e.key === "Enter" && first) add(first);
                }}
                placeholder="Add people..."
                className="ln-search min-w-0 flex-1 bg-transparent text-[13px] font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-1.5">
              {shown.length > 0 && <div className={HEAD}>Members</div>}
              {shown.map((m) => (
                <div key={m.who.name} className={`${ROW} text-(--ln-text-header) hover:bg-(--ln-menu-hover)`}>
                  <Avatar who={m.who} size={16} />
                  <span className="truncate">{m.who.name}</span>
                  <RoleButton
                    role={m.role}
                    open={editing?.name === m.who.name}
                    onOpen={(top) => setEditing(editing?.name === m.who.name ? null : { name: m.who.name, top: top - (root.current?.getBoundingClientRect().top ?? 0) })}
                  />
                </div>
              ))}
              {people.length > 0 && <div className={HEAD}>Workspace</div>}
              {people.map((p) => (
                <button key={p.name} type="button" onClick={() => add(p)} className={`${ROW} ${IDLE}`}>
                  <Avatar who={p} size={16} />
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-xs font-[450] text-(--ln-text-muted)">Add</span>
                </button>
              ))}
              {agents.length > 0 && <div className={HEAD}>Agents</div>}
              {agents.map((p) => (
                <button key={p.name} type="button" onClick={() => add(p)} className={`${ROW} ${IDLE}`}>
                  <Avatar who={p} size={16} />
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-xs font-[450] text-(--ln-text-muted)">Add</span>
                </button>
              ))}
              <div className={HEAD}>New user</div>
              <button type="button" className={`${ROW} ${IDLE}`}>
                <InviteIcon />
                Invite by email...
              </button>
            </div>
            {editingMember && (
              <div
                className="absolute right-[calc(100%+10px)] z-10 w-[272px] rounded-xl border-[0.5px] border-(--ln-popover-border) bg-(--ln-popover) p-1.5 shadow-(--ln-popover-shadow)"
                style={{ top: Math.max(0, editing!.top - 6) }}
              >
                <RoleMenu
                  role={editingMember.role}
                  onRole={(role) => {
                    onChange(members.map((x) => (x.who.name === editingMember.who.name ? { ...x, role } : x)));
                    setEditing(null);
                  }}
                  onRemove={() => {
                    onChange(members.filter((x) => x.who.name !== editingMember.who.name));
                    setEditing(null);
                  }}
                />
              </div>
            )}
          </div>
        </Menu>
      )}
    </span>
  );
}
