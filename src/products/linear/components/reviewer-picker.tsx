"use client";

import { Fragment, useEffect, useRef, useState, type Dispatch, type KeyboardEvent, type SetStateAction, type ReactNode } from "react";
import { AddButton, Avatar, Elbow, GoButton, PanelSection } from "./chrome";
import { ME, PEOPLE, type Diff, type Person, type Reviewer } from "./code-data";
import { Menu } from "./diff-conversation";
import { VerdictGlyph } from "./glyphs";
import { useApp } from "./router";
import { AskLinearIcon, CaretIcon } from "./icons";

// Reviewers, picked the way Linear assigns an issue: a ghost pill per
// reviewer opens a popover with a search field and its shortcut, people in
// sections with a check and a number key each, and an invite row at the
// end. Unlike an assignee, a diff takes several reviewers, so picking
// toggles and the menu stays open. As with Linear's delegation, your own
// review can be handed to an agent: a nested row under you, joined by a
// connector, with its own menu (No agent, Linear, Cursor).

const AGENTS = [PEOPLE.linear, PEOPLE.cursor];
const VERDICT_TEXT = { approved: "Approved", changes: "Requested changes", commented: "Commented" } as const;

/** A reviewer's verdict right after their name: a bare check, cross or bubble, its word on hover. */
function VerdictMark({ verdict, name }: { verdict: NonNullable<Reviewer["verdict"]>; name: string }) {
  return (
    <span role="img" aria-label={`${name}: ${VERDICT_TEXT[verdict]}`} title={VERDICT_TEXT[verdict]} className="flex">
      <VerdictGlyph verdict={verdict} />
    </span>
  );
}

// Measured off a native 2x capture of Linear's assignee menu (desktop app,
// dark): 206px wide with a 1px hairline; a 36px search row, text 14.5px in,
// an 18.5x17 key badge 12px from the right; rows 32px apart and 6.75px in
// from the outer edge, 8px corners, a 16px avatar centred 22.5px in and the
// name at 38.5px; 13px/450 names, 12px/500 section headers in 30px slots;
// the untitled first group numbered in the mono face.
// names sit a step down from full white and brighten on the highlighted row;
// each row gets one of the two colors, so neither has to win the cascade
export const ROW = "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-[450]";
export const IDLE = "text-(--ln-text-header) hover:bg-(--ln-menu-hover) hover:text-(--ln-text)";
export const HEAD = "flex h-[30px] items-center px-2 text-xs font-medium text-(--ln-text-muted)";

/** The elbow to a delegated agent: from 7.5px under the reviewer's avatar (28px pill, 4px gap) to the agent's, which sits 22px in. */
function Connector() {
  return <Elbow className="-top-[4.5px] left-[6.5px]" />;
}

/** The menu of agents a review can be handed to. */
function AgentMenu({ current, onPick, onClose, place }: { current?: Person; onPick: (a?: Person) => void; onClose: () => void; place: string }) {
  const options: { agent?: Person; label: string }[] = [{ label: "No agent" }, ...AGENTS.map((a) => ({ agent: a, label: a.name }))];
  return (
    <Menu onClose={onClose} place={place}>
      {options.map((o, i) => (
        <button
          key={o.label}
          type="button"
          role="menuitemradio"
          aria-checked={current?.name === o.agent?.name}
          onClick={() => {
            onPick(o.agent);
            onClose();
          }}
          className={`${ROW} ${IDLE}`}
        >
          {o.agent ? <Avatar who={o.agent} size={16} /> : <AskLinearIcon size={16} className="text-(--ln-text-muted)" />}
          <span className="flex-1">{o.label}</span>
          <span className="flex shrink-0 items-center gap-[7px] pr-1">
            {current?.name === o.agent?.name && <Check />}
            <span className="ln-mono w-2 text-right text-xs text-(--ln-text-muted)">{i}</span>
          </span>
        </button>
      ))}
    </Menu>
  );
}

/** The invite row's paper plane, drawn from Linear's (filled, pointing up-right, a fold down its middle). */
export function InviteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0 text-(--ln-text-muted)">
      <path
        fill="currentColor"
        d="M14.6 1.4a.6.6 0 0 0-.66-.13L1.75 6.15a.6.6 0 0 0 .02 1.12l4.6 1.69 1.69 4.6a.6.6 0 0 0 1.12.02l4.88-12.18a.6.6 0 0 0-.14-.65Zm-7.5 7.06 3.9-3.9-3.4 4.76-.5-.86Z"
      />
    </svg>
  );
}

export function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className="text-(--ln-text)">
      <path d="M1.75 6.4 4.6 9.25l5.65-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Option = { who: Person; group: string };

/** The popover: search, then people by section, each toggled by click, Enter or its number. */
function ReviewerMenu({
  author,
  reviewers,
  onToggle,
  onDelegate,
  onClose,
}: {
  author: Person;
  reviewers: Reviewer[];
  onToggle: (p: Person) => void;
  onDelegate: (a?: Person) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [agents, setAgents] = useState(false);
  const agentsTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(agentsTimer.current), []);
  const hoverAgents = (open: boolean) => {
    clearTimeout(agentsTimer.current);
    if (open) setAgents(true);
    else agentsTimer.current = setTimeout(() => setAgents(false), 150);
  };
  // the first group has no title, as Linear's has "No assignee" and you; here, you and the code owner
  const all: Option[] = [
    { who: ME, group: "" },
    { who: PEOPLE.maya, group: "" },
    { who: PEOPLE.jordan, group: "Team members" },
    { who: PEOPLE.priya, group: "Team members" },
    { who: PEOPLE.sam, group: "Team members" },
    ...AGENTS.map((a) => ({ who: a, group: "Agents" })),
  ].filter((o) => o.who.name !== author.name);
  const shown = all.filter((o) => o.who.name.toLowerCase().includes(q.trim().toLowerCase()));
  const keyed = shown.filter((o) => !o.group);
  const picked = (p: Person) => reviewers.some((r) => r.who.name === p.name);
  const mine = reviewers.find((r) => r.who.name === ME.name);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % Math.max(1, shown.length));
    } else if (e.key === "Enter" && shown[active]) {
      e.preventDefault();
      onToggle(shown[active].who);
    } else if (!q && /^[1-9]$/.test(e.key) && keyed[Number(e.key) - 1]) {
      e.preventDefault();
      onToggle(keyed[Number(e.key) - 1].who);
    }
  };

  let group: string | null = null;
  return (
    <Menu onClose={onClose} place="top-full left-0 mt-1 w-[206.5px] p-0">
      <div className="flex h-9 items-center gap-2 border-b-[0.5px] border-(--ln-popover-border) pr-[11px] pl-[13.5px]">
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
          placeholder="Request review from..."
          className="ln-search min-w-0 flex-1 bg-transparent text-[13px] font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
        />
        <kbd className="flex h-[17px] w-[18.5px] shrink-0 items-center justify-center rounded-[4px] border-[0.5px] border-(--ln-popover-border) font-sans text-[11px] font-medium text-(--ln-text-muted)">
          R
        </kbd>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-1.5">
        {shown.length === 0 && <p className="px-2 py-2 text-[13px] text-(--ln-text-muted)">No one matches “{q}”</p>}
        {shown.map((o, i) => {
          const head = o.group !== group ? (group = o.group) : null;
          const on = picked(o.who);
          const key = keyed.indexOf(o);
          return (
            <div key={o.who.name}>
              {head && <div className={HEAD}>{head}</div>}
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                onMouseEnter={() => setActive(i)}
                onClick={() => onToggle(o.who)}
                className={`${ROW} ${active === i ? "bg-(--ln-menu-hover) text-(--ln-text)" : "text-(--ln-text-header)"}`}
              >
                <Avatar who={o.who} size={16} />
                <span className="truncate">{o.who.name}</span>
                <span className="ml-auto flex shrink-0 items-center gap-[7px] pr-1">
                  {on && <Check />}
                  {key >= 0 && <span className="ln-mono w-2 text-right text-xs text-(--ln-text-muted)">{key + 1}</span>}
                </span>
              </button>
              {/* your own review can go to an agent, under you as in Linear's assignee menu */}
              {o.who.name === ME.name && mine && (
                // the agents open on hover; leaving closes them after a beat, so the pointer can cross to the flyout
                <div className="relative ml-4 pl-3.5" onMouseEnter={() => hoverAgents(true)} onMouseLeave={() => hoverAgents(false)}>
                  <Connector />
                  <button type="button" aria-expanded={agents} onClick={() => setAgents(true)} className={`${ROW} ${IDLE}`}>
                    {mine.delegate ? <Avatar who={mine.delegate} size={16} /> : <AskLinearIcon size={16} className="text-(--ln-text-muted)" />}
                    <span className="truncate">{mine.delegate?.name ?? "Delegate to agent"}</span>
                    <CaretIcon className="ml-auto shrink-0 text-(--ln-text-muted)" />
                  </button>
                  {agents && (
                    <AgentMenu
                      current={mine.delegate}
                      onPick={onDelegate}
                      onClose={() => setAgents(false)}
                      place="top-0 left-[calc(100%+12px)] w-[206px] p-1.5"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className={HEAD}>New user</div>
        <button type="button" className={`${ROW} ${IDLE}`}>
          <InviteIcon />
          Invite and request...
        </button>
      </div>
    </Menu>
  );
}

/** A reviewer in the panel: a ghost pill that hugs its content and opens the picker. */
function Pill({ children, open, onClick }: { children: ReactNode; open?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className="-mx-1.5 flex h-7 w-fit max-w-[calc(100%+12px)] items-center gap-2 rounded-full px-1.5 text-[13px] font-medium text-(--ln-text-header) group-hover/row:bg-(--ln-item-hover) hover:bg-(--ln-item-hover) aria-expanded:bg-(--ln-item-hover)"
    >
      {children}
    </button>
  );
}

/** The panel's Reviewers section, with the picker and agent delegation. */
export function Reviewers({ diff, setReviewers }: { diff: Diff; setReviewers: Dispatch<SetStateAction<Reviewer[]>> }) {
  const { go } = useApp();
  // the page holds the reviewers, so a review submitted from the toolbar shows here too
  const reviewers = diff.reviewers;
  // the pill that opened the picker (a reviewer's name, or "add"), so only it shows as pressed
  const [picker, setPicker] = useState<string | null>(null);
  const [agentMenu, setAgentMenu] = useState(false);

  const toggle = (p: Person) =>
    setReviewers((rs) => (rs.some((r) => r.who.name === p.name) ? rs.filter((r) => r.who.name !== p.name) : [...rs, { who: p }]));
  const delegate = (a?: Person) => setReviewers((rs) => rs.map((r) => (r.who.name === ME.name ? { ...r, delegate: a } : r)));

  return (
    <PanelSection label="Reviewers">
      <div className="relative">
        {reviewers.length === 0 && (
          <Pill open={picker === "add"} onClick={() => setPicker("add")}>
            <span className="text-(--ln-text-muted)">Request reviewers</span>
          </Pill>
        )}
        {/* rows 32px apart, as in the panel's other sections and between a reviewer and their agent in Linear */}
        <div className="flex flex-col gap-1">
          {reviewers.map((r) => (
            <Fragment key={r.who.name}>
              {/* as the panel's other rows: the pill, then the round › on hover */}
              <div className="group/row flex w-fit max-w-full items-center gap-2.5">
                <Pill open={picker === r.who.name} onClick={() => setPicker(r.who.name)}>
                  <Avatar who={r.who} size={14} />
                  {/* the verdict sits 4px after the name, closer than the pill's own gaps */}
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="truncate">{r.who.name}</span>
                    {r.verdict && <VerdictMark verdict={r.verdict} name={r.who.name} />}
                  </span>
                </Pill>
                <GoButton label={`Open ${r.who.name}'s reviews`} onClick={() => go({ page: "reviews", tab: "mine" })} />
              </div>
              {r.delegate && (
                <div className="group/row relative flex w-fit max-w-full items-center gap-2.5 pl-[22px]">
                  <Connector />
                  <Pill open={agentMenu} onClick={() => setAgentMenu(true)}>
                    <Avatar who={r.delegate} size={14} />
                    {r.delegate.name}
                  </Pill>
                  <GoButton label={`Open ${r.delegate.name}'s session`} onClick={() => go({ page: "reviews", tab: "mine" })} />
                  {agentMenu && (
                    <AgentMenu current={r.delegate} onPick={delegate} onClose={() => setAgentMenu(false)} place="top-full left-2 mt-1 w-[206px] p-1.5" />
                  )}
                </div>
              )}
            </Fragment>
          ))}
          {reviewers.length > 0 && <AddButton label="Add reviewer" onClick={() => setPicker("add")} />}
        </div>
        {picker && (
          <ReviewerMenu author={diff.author} reviewers={reviewers} onToggle={toggle} onDelegate={delegate} onClose={() => setPicker(null)} />
        )}
      </div>
    </PanelSection>
  );
}
