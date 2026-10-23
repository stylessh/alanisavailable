"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, BranchBadge, Elbow, IconButton } from "./chrome";
import { AttachIcon, BranchIcon, CommitIcon, FileIcon, LinkIcon, ReactionIcon, ResolveThreadIcon, SendIcon, type FileKind } from "./code-icons";
import { Highlight, Markdown } from "./code";
import { DIFFS, ISSUE_STATUS, ME, PEOPLE, dayOf, type Change, type Check, type Comment, type Diff, type DiffFile, type Event, type Line, type Person, type Session, type Thread } from "./code-data";
import { Sheet } from "./sheet";
import { STATUSES, type Label } from "./data";
import { CheckStateIcon, DiffStateIcon, StatusIcon, VerdictGlyph } from "./glyphs";
import { CaretIcon, ChevronDownIcon, MoreIcon } from "./icons";

// A diff's conversation, after Linear's own review page: the activity
// (events, comments, reviews with their code threads), the composer, and the
// merge card: where review, checks and the branch stand, and the merge
// button with its strategy. Menus use Linear's popover (Display options).

/** A verdict or requirement's state, as a 14px circle: done, blocked, waiting or pending. */
export function StateDot({ state, size = 14 }: { state: "ok" | "blocked" | "waiting" | "pending"; size?: number }) {
  const color = {
    ok: "var(--ln-check-passed)",
    blocked: "var(--ln-check-failed)",
    waiting: "lch(70 70 80)",
    pending: "var(--ln-text-muted)",
  }[state];
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0" style={{ color }}>
      {state === "ok" && (
        <>
          <circle cx="7" cy="7" r="7" fill="currentColor" />
          <path d="M4.25 7.25 6.1 9 9.75 5.25" stroke="var(--ln-card)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {state === "blocked" && (
        <>
          <circle cx="7" cy="7" r="7" fill="currentColor" />
          <path d="m4.75 4.75 4.5 4.5m0-4.5-4.5 4.5" stroke="var(--ln-card)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {state === "waiting" && (
        <>
          <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="7" cy="7" r="2.5" fill="currentColor" />
        </>
      )}
      {state === "pending" && (
        <>
          <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 4v3.25l2 1.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// The activity, measured off Linear's review page (live capture, dark):
// - events are one 12px/16.8 muted line beside an 18x17 chip in the page's
//   color, 4px into the column, the text 31px in; entries 14px apart, with
//   no line joining the chips (none on the issue page either)
// - comments and reviews are cards pulled 12px out past the column: 16px in,
//   an 18px avatar 9px from the name (13/500), a faint time, a verdict pill;
//   6px down to a 15/24 body, then a hairline and the reply row (11px/16px,
//   an 18px avatar, attach and a filled 24px send)
// A comment's body sits under its author's name, as on the issue page; a
// review's runs the card's full width, as on the review page.

const VERDICT = {
  approved: { pill: "Approved", tone: "ok" },
  changes: { pill: "Changes requested", tone: "blocked" },
  commented: { pill: "Reviewed", tone: "neutral" },
} as const;

/** Everyone a comment can mention, by name. */
const MENTIONABLE = [ME, ...Object.values(PEOPLE)];
const MENTION = new RegExp(`(\`[^\`]+\`|@(?:${MENTIONABLE.map((p) => p.name).join("|")}))`);

/** A comment's body at 15px, with `code` in the mono face and @mentions as Linear sets them. */
function Body({ text, small = false }: { text: string; small?: boolean }) {
  return (
    <p className={`${small ? "text-[13px] leading-5" : "text-[15px] leading-6"} font-[450] text-(--ln-text-strong)`}>
      {text.split(MENTION).map((part, i) => {
        if (part.startsWith("`"))
          return (
            <code key={i} className="ln-inline-code">
              {part.slice(1, -1)}
            </code>
          );
        const who = part.startsWith("@") && MENTIONABLE.find((p) => `@${p.name}` === part);
        // as Linear sets a mention in a comment: "@Name" in medium, a step brighter, nothing around it
        if (who)
          return (
            <span key={i} title={who.name} className="font-medium whitespace-nowrap text-(--ln-text)">
              @{who.name}
            </span>
          );
        return part;
      })}
    </p>
  );
}

/** Reactions as Linear shows them: filled pills, then a button to add one. */
function Reactions({ c }: { c: Comment }) {
  if (!c.reactions) return null;
  return (
    <div className="mt-2.5 flex items-center gap-1">
      {c.reactions.map((r) => (
        <button
          type="button"
          key={r.emoji}
          aria-label={`${r.emoji} ${r.count}`}
          className="flex h-6 items-center gap-1 rounded-full border-[0.5px] border-(--ln-chip-border) bg-(--ln-pill-neutral) px-2 text-xs font-[450] text-(--ln-text-muted) hover:text-(--ln-text)"
        >
          <span className="text-[12px] leading-none">{r.emoji}</span>
          {r.count}
        </button>
      ))}
      <IconButton label="Add reaction" className="size-6 text-(--ln-text-muted)">
        <ReactionIcon size={14} />
      </IconButton>
    </div>
  );
}

/** A card's actions, shown on hover over the card's top right: react, resolve, more. */
function CardActions({ resolvable }: { resolvable?: boolean }) {
  return (
    <span className="absolute top-2.5 right-2.5 flex text-(--ln-text-header) opacity-0 transition-opacity group-hover/card:opacity-100">
      <IconButton label="Add reaction">
        <ReactionIcon size={14} />
      </IconButton>
      {resolvable && (
        <IconButton label="Resolve thread">
          <ResolveThreadIcon size={14} />
        </IconButton>
      )}
      <IconButton label="Comment options">
        <MoreIcon size={14} />
      </IconButton>
    </span>
  );
}

/** A card's header: avatar, name, faint time and an optional pill, 18.5px tall. */
function CardHead({ who, age, pill }: { who: Comment["who"]; age: string; pill?: ReactNode }) {
  return (
    <div className="flex h-[18.5px] items-center">
      <Avatar who={who} size={18} />
      <span className="ml-[9px] text-[13px] font-medium text-(--ln-text)">{who.name}</span>
      <span className="ml-2 text-[13px] font-[450] text-(--ln-icon-faint)">{age} ago</span>
      {pill && <span className="ml-1.5 flex">{pill}</span>}
    </div>
  );
}

/**
 * One comment: its header, then the body. As in Linear, the comment that
 * starts a thread runs the full width of the card, and replies sit under
 * their author's name.
 */
function CommentBlock({ c, small = false, reply = false }: { c: Comment; small?: boolean; reply?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 p-4">
      <CardHead who={c.who} age={c.age} />
      <div className={reply ? "pl-[27px]" : undefined}>
        <Body text={c.body} small={small} />
        <Reactions c={c} />
      </div>
    </div>
  );
}

/** The send button: a filled 24px circle with a hairline ring. */
function SendButton() {
  return (
    <button
      type="button"
      aria-label="Submit comment"
      className="flex size-6 items-center justify-center rounded-full bg-(--ln-send) text-(--ln-text-strong) shadow-(--ln-send-ring)"
    >
      <SendIcon size={14} />
    </button>
  );
}

/** The bottom of a card or the page: your avatar, a placeholder, attach and send. */
function ReplyRow({ placeholder = "Leave a reply…", small = false }: { placeholder?: string; small?: boolean }) {
  return (
    <div className="flex items-center gap-[9px] px-4 py-[11px]">
      <Avatar who={ME} size={18} />
      <span className={`flex-1 font-[450] text-(--ln-icon-faint) ${small ? "text-[13px] leading-6" : "text-[15px] leading-6"}`}>{placeholder}</span>
      <span className="flex items-center gap-3">
        <IconButton label="Attach images, files, or videos" className="size-6 text-(--ln-text-strong)">
          <AttachIcon size={14} />
        </IconButton>
        <SendButton />
      </span>
    </div>
  );
}

/** A card in the timeline, 12px wider than the text column on each side. */
export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="group/card relative -mx-3 overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) shadow-(--ln-main-shadow)">
      {children}
    </div>
  );
}

/** A few lines of the file around a thread's line, the line itself last. */
function Snippet({ file, line }: { file?: DiffFile; line: number }) {
  if (!file) return null;
  const at = file.lines.findIndex((l) => (l.kind === "add" || l.kind === "ctx") && l.new === line);
  if (at < 0) return null;
  const lines = file.lines.slice(Math.max(0, at - 2), at + 1).filter((l) => l.kind !== "gap");
  const lang = file.kind === "css" ? "css" : file.kind === "markdown" ? "markdown" : "code";
  return (
    <div className="border-b-[0.5px] border-(--ln-card-border) py-1">
      {lines.map((l: Line, i) => (
        <div key={i} className={`flex ${l.kind === "add" ? "bg-(--ln-line-added)" : l.kind === "del" ? "bg-(--ln-line-removed)" : ""}`}>
          <span className="ln-mono w-[50px] shrink-0 pr-3 text-right text-xs leading-5 text-(--ln-line-number)">
            {l.kind === "del" ? l.old : l.new}
          </span>
          <code className="ln-mono min-w-0 flex-1 truncate pr-4 text-xs leading-5 whitespace-pre text-(--ln-syn-text)">
            <Highlight text={l.text} lang={lang} />
          </code>
        </div>
      ))}
    </div>
  );
}

/**
 * A conversation on a line. In a review card it's a bordered block with the
 * file, the lines it's about, its comments and a reply row; on the Diff tab
 * (`inline`) the code is already above it, so it's just the comments.
 */
export function ThreadCard({ thread, file, inline = false }: { thread: Thread; file?: DiffFile; inline?: boolean }) {
  const [open, setOpen] = useState(!thread.resolved);
  const name = thread.path.slice(thread.path.lastIndexOf("/") + 1);
  return (
    <div className="group/card relative overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card)">
      {!inline && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-9 w-full items-center gap-2 border-b-[0.5px] border-(--ln-card-border) px-3 text-left text-xs font-[450]"
        >
          {file && <FileIcon kind={file.kind} size={14} />}
          <span className="text-(--ln-text)">{name}</span>
          <span className="text-(--ln-text-muted)">line {thread.line}</span>
          {thread.resolved && (
            <span className="ml-auto flex items-center gap-1.5 text-(--ln-text-muted)">
              <VerdictGlyph verdict="approved" />
              Resolved
              <CaretIcon className={`transition-transform ${open ? "rotate-90" : ""}`} />
            </span>
          )}
        </button>
      )}
      {open && (
        <>
          {!inline && <Snippet file={file} line={thread.line} />}
          <div className="divide-y-[0.5px] divide-(--ln-card-border)">
            {thread.comments.map((c, i) => (
              <CommentBlock key={i} c={c} small reply={i > 0} />
            ))}
          </div>
          <div className="border-t-[0.5px] border-(--ln-card-border)">
            <ReplyRow small />
          </div>
        </>
      )}
    </div>
  );
}

/** The verdict beside the reviewer's name: the bare glyph and its word in gray, no capsule. */
function VerdictPill({ verdict }: { verdict: keyof typeof VERDICT }) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-(--ln-text-muted)">
      <VerdictGlyph verdict={verdict} />
      {VERDICT[verdict].pill}
    </span>
  );
}

/* Composing changes into sentences, as Linear's activity does. */

/** "A", "A and B", "A, B and C"; `serial` puts a comma before the last "and", for lists of phrases that hold lists of their own. */
function list(items: ReactNode[], serial = false): ReactNode {
  return items.map((it, i) => (
    <Fragment key={i}>
      {i > 0 && (i === items.length - 1 ? (serial ? ", and " : " and ") : ", ")}
      {it}
    </Fragment>
  ));
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The label changes in a group, by their net effect: added, removed, or added and removed. */
function labelPhrases(changes: Change[]): ReactNode[] {
  const ops = changes.filter((c): c is Extract<Change, { type: "label" }> => c.type === "label");
  if (!ops.length) return [];
  const byName = new Map<string, { label: Label; ops: boolean[] }>();
  for (const o of ops) {
    const entry = byName.get(o.label.name) ?? { label: o.label, ops: [] };
    entry.ops.push(!o.removed);
    byName.set(o.label.name, entry);
  }
  const added = [...byName.values()].filter((e) => e.ops.at(-1) && !(e.ops.length > 1 && !e.ops[0]));
  const removed = [...byName.values()].filter((e) => !e.ops.at(-1) && !e.ops[0]);
  const toggled = [...byName.values()].filter((e) => e.ops[0] && !e.ops.at(-1));
  const name = (e: { label: Label }) => <LabelName key={e.label.name} label={e.label} />;
  // many changes read as a count and where they ended up
  if (ops.length > 3) {
    const kept = [...byName.values()].filter((e) => e.ops.at(-1));
    return [
      <>
        changed labels {ops.length} times
        {kept.length ? <>, leaving {list(kept.map(name))}</> : " and removed them"}
      </>,
    ];
  }
  const out: ReactNode[] = [];
  if (added.length) out.push(<>added {added.length === 1 ? "label" : "labels"} {list(added.map(name))}</>);
  if (removed.length) out.push(<>removed {removed.length === 1 ? "label" : "labels"} {list(removed.map(name))}</>);
  if (toggled.length) out.push(<>added and removed {toggled.length === 1 ? "label" : "labels"} {list(toggled.map(name))}</>);
  return out;
}

/** A label in a sentence: the list rows' label pill, compacted to 18px inside the line's 20px. */
function LabelName({ label }: { label: Label }) {
  return (
    <span className="relative top-px mx-px inline-flex h-[18px] items-center gap-[5px] rounded-full border-[0.5px] border-(--ln-chip-border) bg-(--ln-chip) pr-1.5 pl-[7px] align-top whitespace-nowrap text-(--ln-text-muted)">
      <span className="inline-block size-[7px] shrink-0 rounded-full" style={{ background: label.color }} />
      {label.name}
    </span>
  );
}

/**
 * Something named in an event (a file, a check, an issue, a branch, a link),
 * as a small tinted chip with its icon, 18px inside the 20px line, so it reads
 * as a thing rather than as words.
 */
export function Ref({ icon, children, mono = false }: { icon?: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <span
      className={`relative top-px mx-px inline-flex h-[18px] max-w-[220px] items-center gap-1 rounded-[5px] bg-(--ln-pill-neutral) px-1 align-top whitespace-nowrap text-(--ln-text-header) ${mono ? "ln-mono text-[11px]" : ""}`}
    >
      {icon && <span className="flex shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** A commit's short sha: faint mono text, quieter than the message it follows. */
function Sha({ children }: { children: string }) {
  return <span className="ln-mono shrink-0 text-[11px] text-(--ln-icon-faint)">{children}</span>;
}

const fileKindOf = (name: string): FileKind =>
  name.endsWith(".tsx") ? "react-ts" : name.endsWith(".ts") ? "typescript" : name.endsWith(".css") ? "css" : name.endsWith(".md") ? "markdown" : name.endsWith(".py") ? "python" : "file";

/**
 * A person named in a sentence. Only the one who did it ("Drafted by …")
 * carries an avatar; people the action names (a reviewer, a delegate) are
 * just their names, so a busy activity doesn't turn into a row of faces.
 */
function Mention({ who, avatar = false }: { who: Person; avatar?: boolean }) {
  return (
    // held to the line's own 20px, so a mention never makes its row taller
    <span className="inline-flex h-5 items-center gap-1 align-top whitespace-nowrap text-(--ln-text-header)">
      {avatar && <Avatar who={who} size={12} />}
      {who.name}
    </span>
  );
}

/** Review requests, with a request taken back read as "requested and removed". */
function requestPhrases(changes: Change[]): ReactNode[] {
  const asked = changes.flatMap((c) => (c.type === "requested" ? [c.who] : []));
  const dropped = changes.flatMap((c) => (c.type === "unrequested" ? [c.who] : []));
  const has = (people: Person[], p: Person) => people.some((x) => x.name === p.name);
  const both = asked.filter((p) => has(dropped, p));
  const out: ReactNode[] = [];
  const mentions = (people: Person[]) => list(people.map((p) => <Mention key={p.name} who={p} />));
  const onlyAsked = asked.filter((p) => !has(both, p));
  const onlyDropped = dropped.filter((p) => !has(both, p));
  if (onlyAsked.length) out.push(<>requested review from {mentions(onlyAsked)}</>);
  if (onlyDropped.length) out.push(<>removed the review request for {mentions(onlyDropped)}</>);
  if (both.length) out.push(<>requested and removed review from {mentions(both)}</>);
  return out;
}

/** A group of changes by one person at one time, as one entry of the timeline. */
type Group = { kind: "group"; who: Person; age: string; changes: Change[] };

/**
 * Folds consecutive changes by the same person at the same time into groups.
 * Commits always make a group of their own (a push is its own line, never
 * part of a sentence about reviewers or labels), and back-to-back commits
 * share one.
 */
function groups(activity: Event[]): (Group | Exclude<Event, { kind: "change" }>)[] {
  const out: (Group | Exclude<Event, { kind: "change" }>)[] = [];
  const isCommit = (c: Change) => c.type === "commit";
  for (const e of activity) {
    if (e.kind !== "change") {
      out.push(e);
      continue;
    }
    const last = out.at(-1);
    const sameKind = last?.kind === "group" && last.changes.every(isCommit) === isCommit(e.change);
    if (last?.kind === "group" && sameKind && last.who.name === e.who.name && last.age === e.age) last.changes.push(e.change);
    else out.push({ kind: "group", who: e.who, age: e.age, changes: [e.change] });
  }
  return out;
}

/** An event: an 18x17 chip with its glyph, then one muted line; commits can open beneath it. */
export function EventRow({ icon, children, below }: { icon: ReactNode; children: ReactNode; below?: ReactNode }) {
  return (
    <div className="text-xs leading-5 font-[450] text-(--ln-text-muted)">
      <div className="flex items-start">
        <span className="mt-[1.5px] ml-1 flex h-[17px] w-[18px] shrink-0 items-center justify-center rounded-[4px] bg-(--ln-main)">{icon}</span>
        <span className="ml-[9px] min-w-0">{children}</span>
      </div>
      {below}
    </div>
  );
}

/** A group's glyph: the diff's state for opening, merging and closing; a commit mark for pushes; otherwise who did it. */
function groupIcon(g: Group) {
  const types = new Set(g.changes.map((c) => c.type));
  const opened = g.changes.find((c): c is Extract<Change, { type: "opened" }> => c.type === "opened");
  if (opened) return <DiffStateIcon state={opened.draft ? "draft" : "open"} size={14} />;
  if (types.has("merged")) return <DiffStateIcon state="merged" size={14} />;
  if (types.has("closed")) return <DiffStateIcon state="closed" size={14} mono />;
  if (types.has("reopened")) return <DiffStateIcon state="open" size={14} />;
  if (types.has("check-failed")) return <CheckStateIcon state="failed" size={14} />;
  if ([...types].every((t) => t === "commit")) return <CommitIcon size={14} />;
  return <Avatar who={g.who} size={14} />;
}

/** One group as a sentence, with a push's commits listed beneath. */
function GroupRow({ g }: { g: Group }) {
  const [showCommits, setShowCommits] = useState(false);
  const commits = g.changes.filter((c): c is Extract<Change, { type: "commit" }> => c.type === "commit");
  const opened = g.changes.find((c): c is Extract<Change, { type: "opened" }> => c.type === "opened");

  const phrases: ReactNode[] = [];
  // commits read as "committed <message> <sha>" alone, and as a count with the list beneath when there are several;
  // the message leads and the sha trails in faint mono, so a push reads as words rather than a row of boxes
  if (commits.length) {
    phrases.push(
      commits.length === 1 ? (
        <>
          committed <span className="text-(--ln-text-header)">{commits[0].message}</span> <Sha>{commits[0].sha}</Sha>
        </>
      ) : (
        <>pushed {plural(commits.length, "commit")}</>
      ),
    );
  }
  for (const c of g.changes) {
    if (c.type === "linked")
      phrases.push(
        <>
          linked{" "}
          <Ref icon={<StatusIcon status={STATUSES.find((s) => s.id === ISSUE_STATUS[c.issue]) ?? STATUSES[1]} size={12} />}>
            <span className="ln-tnum">{c.issue}</span>
          </Ref>
        </>,
      );
    if (c.type === "delegated")
      phrases.push(
        <>
          delegated the review to <Mention who={c.to} />
        </>,
      );
    if (c.type === "deployed")
      phrases.push(
        <>
          deployed a preview to <Ref icon={<LinkIcon size={12} className="text-(--ln-text-muted)" />}>{c.url}</Ref>
        </>,
      );
    if (c.type === "check-failed")
      phrases.push(
        <>
          reported <Ref icon={<CheckStateIcon state="failed" size={12} />}>{c.check}</Ref> failed
          {c.file && (
            <>
              {" "}
              on <Ref icon={<FileIcon kind={fileKindOf(c.file)} size={12} />}>{c.file}</Ref>
            </>
          )}
        </>,
      );
    if (c.type === "ready") phrases.push(<>marked the diff ready for review</>);
    if (c.type === "updated")
      phrases.push(
        <>
          updated the branch with {plural(c.commits, "commit")} from <Ref icon={<BranchIcon size={12} className="text-(--ln-text-muted)" />}>main</Ref>
        </>,
      );
  }
  const requests = requestPhrases(g.changes);
  const labels = labelPhrases(g.changes);
  phrases.push(...requests, ...labels);
  // an earlier phrase that lists people makes the sentence's own "and" ambiguous without a comma (labels come last, so theirs can't)
  const nested = labels.length > 0 && g.changes.filter((c) => c.type === "requested" || c.type === "unrequested").length > 1;

  // opening, merging and closing lead with the state, as Linear's review page does ("Opened by Alan Daniel with 1 commit")
  const merged = g.changes.find((c): c is Extract<Change, { type: "merged" }> => c.type === "merged");
  let lead: ReactNode;
  if (opened)
    lead = (
      <>
        {opened.draft ? "Drafted" : "Opened"} by <Mention who={g.who} avatar />
        {opened.onBehalfOf && (
          <>
            {" "}
            on behalf of <Mention who={opened.onBehalfOf} />
          </>
        )}

      </>
    );
  else if (merged)
    lead = (
      <>
        Merged into {merged.into} by <Mention who={g.who} avatar />
      </>
    );
  else if (g.changes.some((c) => c.type === "closed"))
    lead = (
      <>
        Closed by <Mention who={g.who} avatar />
      </>
    );
  else if (g.changes.some((c) => c.type === "reopened"))
    lead = (
      <>
        Reopened by <Mention who={g.who} avatar />
      </>
    );

  return (
    <EventRow
      icon={groupIcon(g)}
      below={
        // a push lists its commits under the sentence, the first three always, the rest a click away
        commits.length > 1 && (
          <ul className="mt-1 ml-[31px] flex flex-col">
            {(showCommits ? commits : commits.slice(0, 3)).map((c) => (
              <li key={c.sha} className="flex h-6 min-w-0 items-center gap-2">
                <span className="min-w-0 truncate">{c.message}</span>
                <Sha>{c.sha}</Sha>
              </li>
            ))}
            {!showCommits && commits.length > 3 && (
              <li className="flex h-6 items-center text-(--ln-icon-faint)">
                <button type="button" onClick={() => setShowCommits(true)} className="hover:text-(--ln-text-header)">
                  Show {commits.length - 3} more
                </button>
              </li>
            )}
          </ul>
        )
      }
    >
      {lead ? (
        <>
          {lead}
          {phrases.length > 0 && <>{phrases.length > 1 ? ", " : " and "}{list(phrases, true)}</>}
        </>
      ) : (
        <>
          <span className="text-(--ln-text-header)">{g.who.name}</span> {list(phrases, phrases.length > 2 || nested)}
        </>
      )}{" "}
      · {g.age} ago
    </EventRow>
  );
}

/** A review in the timeline: the reviewer, the verdict pill and the review itself, then its threads and a reply row. */
function ReviewCard({ e, files }: { e: Extract<Event, { kind: "review" }>; files: DiffFile[] }) {
  return (
    <Card>
      <div className="flex flex-col gap-1.5 p-4">
        <CardHead who={e.who} age={e.age} pill={<VerdictPill verdict={e.verdict} />} />
        {e.body && <Body text={e.body} />}
        {e.threads.length > 0 && (
          <div className="mt-2.5 flex flex-col gap-2">
            {e.threads.map((t) => (
              <ThreadCard key={`${t.path}:${t.line}`} thread={t} file={files.find((f) => f.path === t.path)} />
            ))}
          </div>
        )}
      </div>
      <CardActions resolvable={e.threads.length > 0} />
      <div className="border-t-[0.5px] border-(--ln-card-border)">
        <ReplyRow />
      </div>
    </Card>
  );
}

/** A comment in the timeline: the comment and its replies, then a reply row. */
function CommentCard({ e }: { e: Extract<Event, { kind: "comment" }> }) {
  return (
    <Card>
      <div className="divide-y-[0.5px] divide-(--ln-card-border)">
        <CommentBlock c={e} />
        {e.replies?.map((r, i) => (
          <CommentBlock key={i} c={r} reply />
        ))}
      </div>
      <CardActions />
      <div className="border-t-[0.5px] border-(--ln-card-border)">
        <ReplyRow />
      </div>
    </Card>
  );
}

/* The timeline's rhythm, from Linear's issue page loosened a touch: events on
   20px lines, 16px apart; 20px between an event and a card. Runs of minor
   events (labels, review requests, links, delegation) fold into one "Show N
   events" row. */

const MINOR: Change["type"][] = ["label", "requested", "unrequested", "linked", "delegated"];
const isMinor = (g: Group) => g.changes.every((c) => MINOR.includes(c.type));

type Item = Group | Exclude<Event, { kind: "change" }> | { kind: "run"; groups: Group[] };

/** Folds runs of two or more minor groups into one collapsible row. */
function items(activity: Event[]): Item[] {
  const out: Item[] = [];
  for (const g of groups(activity)) {
    const last = out.at(-1);
    if (g.kind === "group" && isMinor(g) && sameDay(last, g)) {
      if (last?.kind === "run") {
        last.groups.push(g);
        continue;
      }
      if (last?.kind === "group" && isMinor(last)) {
        out[out.length - 1] = { kind: "run", groups: [last, g] };
        continue;
      }
    }
    out.push(g);
  }
  return out;
}

/** When an item happened; a folded run counts from its first event. */
const ageOf = (i: Item) => (i.kind === "run" ? i.groups[0].age : i.age);
const sameDay = (a: Item | undefined, b: Item) => !!a && dayOf(ageOf(a)).key === dayOf(ageOf(b)).key;

const isEvent = (i?: Item) => i?.kind === "group" || i?.kind === "run";

/** What a folded run did, as Linear summarizes it: "requested review, added labels, and linked an issue". */
function runSummary(run: Group[]) {
  const kinds = new Set(run.flatMap((g) => g.changes.map((c) => c.type)));
  const parts = [
    (kinds.has("requested") || kinds.has("unrequested")) && "changed reviewers",
    kinds.has("label") && "changed labels",
    kinds.has("linked") && "linked issues",
    kinds.has("delegated") && "delegated the review",
  ].filter(Boolean) as string[];
  if (parts.length < 3) return parts.join(" and ");
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function UpDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M4.5 5.25 7 2.75l2.5 2.5M4.5 8.75 7 11.25l2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A folded run: "Show N events: …" until opened, then the events themselves. */
function Run({ run }: { run: Group[] }) {
  const [open, setOpen] = useState(false);
  if (open)
    return (
      <div className="flex flex-col gap-4">
        {run.map((g, i) => (
          <GroupRow key={i} g={g} />
        ))}
      </div>
    );
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full text-left hover:[&_span]:text-(--ln-text-header)">
        <EventRow icon={<span className="text-(--ln-text-muted)"><UpDownIcon /></span>}>
          <span className="truncate">
            Show {run.length} events: {runSummary(run)}...
          </span>
        </EventRow>
      </button>
    </>
  );
}

/** Four dots in a diamond: an agent session, as Linear marks it. */
function SessionGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <circle cx="7" cy="3.5" r="1.1" />
      <circle cx="3.5" cy="7" r="1.1" />
      <circle cx="10.5" cy="7" r="1.1" />
      <circle cx="7" cy="10.5" r="1.1" />
    </svg>
  );
}

/**
 * An agent's session, measured off Linear's (2x): a card of two 40px rows, an
 * 18px avatar 16px in and "Cursor started by Alan Daniel 4mo" in 13px, then
 * how it ended, the output's first line faint and cut off, the diff it
 * touched as a pill, and a › 26px from the edge. The row opens the output in
 * a sheet, and the card keeps an accent ring while it's open.
 */
function SessionCard({ e }: { e: Session }) {
  const [open, setOpen] = useState(false);
  const diff = e.diff ? DIFFS.find((d) => d.number === e.diff) : undefined;
  const firstLine = e.output.split("\n").find((l) => l.trim())?.replace(/[*`]/g, "") ?? "";
  const lead = (t: string) => t.split(" ").slice(0, 3).join(" ").toLowerCase();
  const summary = lead(firstLine) === lead(e.title) ? e.title : `${e.title} ${firstLine}`;
  return (
    <>
      <div className={`-mx-3 overflow-hidden rounded-lg border-[0.5px] bg-(--ln-card) shadow-(--ln-main-shadow) ${open ? "border-(--ln-accent) ring-[0.5px] ring-(--ln-accent)" : "border-(--ln-card-border)"}`}>
        <div className="flex h-10 items-center px-4 text-[13px] font-[450] text-(--ln-text-muted)">
          <Avatar who={e.agent} size={18} />
          <span className="ml-2.5 truncate">
            <span className="font-medium text-(--ln-text)">{e.agent.name}</span> started by <span className="font-medium text-(--ln-text)">{e.by.name}</span>
          </span>
          <span className="ml-2.5 shrink-0 text-(--ln-icon-faint)">{e.age}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 w-full items-center border-t-[0.5px] border-(--ln-card-border) pr-[20px] pl-4 text-left text-[13px] font-[450] hover:bg-(--ln-item-hover)"
        >
          <span className="flex w-[18px] shrink-0 justify-center text-(--ln-text-muted)">
            <SessionGlyph />
          </span>
          <span className="ml-2.5 shrink-0 text-(--ln-text-header)">{e.status === "finished" ? "Finished" : "Working"}</span>
          <span className="ml-2 min-w-0 flex-1 truncate text-(--ln-icon-faint)">
            {summary}
          </span>
          {diff && (
            <span className="ml-3 flex h-[22px] shrink-0 items-center gap-1.5 rounded-full border-[0.5px] border-(--ln-chip-border) px-2 text-[13px] text-(--ln-text-header)">
              <DiffStateIcon state={diff.state} size={14} />#{diff.number}
            </span>
          )}
          {/* Linear's › here is 5.5x9.5 (2x) */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className="ml-3 shrink-0 text-(--ln-text-muted)">
            <path d="M3.25 1.25 7 5 3.25 8.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open && (
        <Sheet icon={<Avatar who={e.agent} size={18} />} title={e.title} onClose={() => setOpen(false)} placeholder={`Tell ${e.agent.name} what to do next...`}>
          <div className="pt-1">
            <Markdown source={e.output} compact small />
          </div>
          <p className="mt-5 text-sm leading-6 font-[450]">
            {diff && <span className="text-(--ln-accent)">View diff</span>}
            {diff && <span className="text-(--ln-text-muted)"> · </span>}
            <span className="text-(--ln-accent)">Open in {e.agent.name}</span>
            <span className="text-(--ln-text-muted)"> · </span>
            <span className="text-(--ln-accent)">Open in Web</span>
          </p>
          <span className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-full px-1.5 text-[13px] font-medium text-(--ln-text-muted)">
            {e.agent.name}
            <ExternalIcon />
          </span>
        </Sheet>
      )}
    </>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M7 1.75h3.25V5M10 2 5.5 6.5M9 7.5v1.75A1 1 0 0 1 8 10.25H2.75a1 1 0 0 1-1-1V4A1 1 0 0 1 2.75 3H4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The activity: changes composed into sentences (minor runs folded), comments, reviews and agent sessions as cards. */
/**
 * A day heading, after the month headings in a project's activity ("July
 * 2024") but sized under the page's "Activity" title (15px): the day in
 * 13/500, its date in muted regular after it, 32px of air above it and 16px
 * down to the day's first event.
 */
function DayHeading({ age, first }: { age: string; first: boolean }) {
  const day = dayOf(age);
  return (
    <li className={`${first ? "" : "mt-8"} mb-4 flex items-baseline gap-1.5 text-[13px] leading-5`}>
      <h4 className="font-medium text-(--ln-text)">{day.label}</h4>
      <span className="text-(--ln-text-muted)">{day.detail}</span>
    </li>
  );
}

export function Timeline({ diff, children }: { diff: Diff; children?: ReactNode }) {
  const all = items(diff.activity);
  // headings only earn their place once the activity spans more than one day
  const days = new Set(all.map((it) => dayOf(ageOf(it)).key)).size > 1;
  return (
    <ol className="flex flex-col">
      {all.map((it, i) => {
        const prev = all[i - 1];
        const heading = days && !sameDay(prev, it);
        const gap = i === 0 || heading ? "" : isEvent(it) && isEvent(prev) ? "mt-4" : "mt-5";
        return (
          <Fragment key={i}>
            {heading && <DayHeading age={ageOf(it)} first={i === 0} />}
            <li className={gap}>
              {it.kind === "run" ? (
                <Run run={it.groups} />
              ) : it.kind === "group" ? (
                <GroupRow g={it} />
              ) : it.kind === "review" ? (
                <ReviewCard e={it} files={diff.files} />
              ) : it.kind === "session" ? (
                <SessionCard e={it} />
              ) : (
                <CommentCard e={it} />
              )}
            </li>
          </Fragment>
        );
      })}
      {children}
    </ol>
  );
}

/** The page's composer: one card with your avatar, a placeholder, attach and send. */
export function Composer() {
  return (
    <div className="-mx-3 rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) shadow-(--ln-main-shadow)">
      <ReplyRow placeholder="Leave a comment…" />
    </div>
  );
}

/** How many commits a diff has, from its activity. */
export function commitCount(diff: Diff) {
  return diff.activity.filter((e) => e.kind === "change" && e.change.type === "commit").length || 1;
}

/** Every line thread in a diff's reviews, for the Diff tab. */
export function threadsOf(diff: Diff): Thread[] {
  return diff.activity.flatMap((e) => (e.kind === "review" ? e.threads : []));
}

/** Conversations on the diff: comments, replies and review threads. */
export function commentCount(diff: Diff) {
  return diff.activity.reduce(
    (n, e) =>
      n +
      (e.kind === "comment" ? 1 + (e.replies?.length ?? 0) : 0) +
      (e.kind === "review" ? e.threads.reduce((m, t) => m + t.comments.length, 0) : 0),
    0,
  );
}

const STRATEGIES = [
  { id: "squash", label: "Squash and merge", verb: "squash and merge", detail: (n: number, base: string) => `Combine ${n} commits into one on ${base}` },
  { id: "merge", label: "Create a merge commit", verb: "merge with a merge commit", detail: (n: number) => `Keep all ${n} commits, joined by a merge commit` },
  { id: "rebase", label: "Rebase and merge", verb: "rebase and merge", detail: (n: number, base: string) => `Replay ${n} commits on top of ${base}` },
] as const;

/** A popover menu in Linear's style, closed by a click outside or Escape; `place` positions it against its anchor. */
export function Menu({
  onClose,
  children,
  place = "bottom-full left-0 mb-1.5 w-80",
}: {
  onClose: () => void;
  children: ReactNode;
  place?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", outside, { capture: true });
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", outside, { capture: true });
      window.removeEventListener("keydown", escape);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="menu"
      // a placement that sets its own padding replaces the default, rather than racing it in the cascade
      className={`absolute z-30 rounded-xl border-[0.5px] border-(--ln-popover-border) bg-(--ln-popover) shadow-(--ln-popover-shadow) ${/(^|\s)p-/.test(place) ? "" : "p-1"} ${place}`}
    >
      {children}
    </div>
  );
}

function Requirement({
  state,
  title,
  detail,
  action,
  children,
  icon,
}: {
  state: "ok" | "blocked" | "waiting" | "pending";
  title: string;
  detail: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  /** replaces the state's dot, as a spinner while checks run */
  icon?: ReactNode;
}) {
  return (
    <div className="border-b-[0.5px] border-(--ln-card-border) px-4 py-4">
      <div className="flex items-center gap-3">
        {icon ?? <StateDot state={state} />}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-(--ln-text)">{title}</div>
          <div className="truncate text-xs font-[450] text-(--ln-text-muted)">{detail}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}


/**
 * A diff's checks, opened under the checks requirement: failures first, then
 * what's still running, then what passed, each a 32px row under the
 * requirement's title with its icon, name, what happened and how long it
 * took. The whole row opens the check's log; it lights up on hover rather
 * than carrying buttons of its own.
 */
function CheckList({ checks }: { checks: Check[] }) {
  const order = { failed: 0, running: 1, skipped: 2, passed: 3 } as const;
  const sorted = [...checks].sort((a, b) => order[a.state] - order[b.state]);
  const fallback = { failed: "Failed", running: "Running", skipped: "Skipped", passed: "Passed" } as const;
  return (
    <ul className="mt-1.5 ml-[26px] flex flex-col">
      {sorted.map((c) => (
        <li key={c.name}>
          <button
            type="button"
            aria-label={`${c.name}: ${c.detail ?? fallback[c.state]}, open log`}
            className="-mx-2 flex h-8 w-[calc(100%+16px)] items-center gap-2.5 rounded-lg px-2 text-left text-xs font-[450] hover:bg-(--ln-item-hover)"
          >
            <CheckStateIcon state={c.state} />
            <span className="shrink-0 text-[13px] font-medium text-(--ln-text-header)">{c.name}</span>
            <span className={`min-w-0 truncate ${c.state === "failed" ? "text-(--ln-text-header)" : "text-(--ln-text-muted)"}`}>
              {c.detail ?? fallback[c.state]}
            </span>
            <span className="ln-tnum ml-auto shrink-0 pl-2 text-(--ln-icon-faint)">{c.duration}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The reviewers, opened under the review requirement as the sidebar lists
 * them: avatar and name with their verdict mark 4px after it, an agent they
 * handed the review to on a row of its own under an elbow, and, on the right,
 * when they last reviewed. Whoever's blocking comes first.
 */
function ReviewerList({ diff }: { diff: Diff }) {
  const order = { changes: 0, waiting: 1, commented: 2, approved: 3 } as const;
  const rows = diff.reviewers
    .map((r) => {
      const stand: keyof typeof order = r.verdict ?? "waiting";
      // when they last reviewed, from the activity
      const last = diff.activity.findLast((e) => e.kind === "review" && e.who.name === r.who.name);
      return { ...r, stand, age: last?.kind === "review" ? last.age : undefined };
    })
    .sort((a, b) => order[a.stand] - order[b.stand]);
  const row = "-mx-2 flex h-8 w-[calc(100%+16px)] items-center gap-2 rounded-lg px-2 text-left text-[13px] font-medium text-(--ln-text-header) hover:bg-(--ln-item-hover)";
  return (
    <ul className="mt-1.5 ml-[26px] flex flex-col">
      {rows.map((r) => (
        <li key={r.who.name}>
          <button type="button" className={row}>
            <Avatar who={r.who} size={14} />
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate">{r.who.name}</span>
              {r.verdict && (
                <span role="img" aria-label={VERDICT[r.verdict].pill} title={VERDICT[r.verdict].pill} className="flex">
                  <VerdictGlyph verdict={r.verdict} />
                </span>
              )}
            </span>
            {r.age && <span className="ln-tnum ml-auto shrink-0 pl-2 text-xs font-[450] text-(--ln-icon-faint)">{r.age} ago</span>}
          </button>
          {r.delegate && (
            // the sidebar's elbow, from 7.5px under the reviewer's avatar (32px rows, no gap) to the agent's, 22px in
            <div className="relative pl-[22px]">
              <Elbow className="-top-[2.5px] left-[6.5px]" />
              <button type="button" className={row}>
                <Avatar who={r.delegate} size={14} />
                <span className="truncate">{r.delegate.name}</span>
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The chevron that opens a requirement's list: down while open, right while folded. */
function Disclosure({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={`${open ? "Hide" : "Show"} ${label}`}
      aria-expanded={open}
      onClick={onToggle}
      className="flex size-7 items-center justify-center rounded-full text-(--ln-text-muted) hover:bg-(--ln-ghost-hover) hover:text-(--ln-text-header)"
    >
      <ChevronDownIcon size={10} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
    </button>
  );
}

/** "1 failed, 1 running and 4 passed": a check run, counted. */
function checkSummary(checks: Check[]) {
  const counts = (["failed", "running", "skipped", "passed"] as const)
    .map((state) => [checks.filter((c) => c.state === state).length, state] as const)
    .filter(([n]) => n > 0)
    .map(([n, state]) => `${n} ${state}`);
  return counts.length > 1 ? `${counts.slice(0, -1).join(", ")} and ${counts.at(-1)}` : (counts[0] ?? "No checks");
}

/** A row in the merge menu: a mark column, the label and, under it, what it does. */
function MergeMenuItem({ mark, label, detail, onClick, checked }: { mark?: ReactNode; label: string; detail?: string; onClick: () => void; checked?: boolean }) {
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-[7px] text-left hover:bg-(--ln-menu-hover)"
    >
      <span className="mt-[3px] flex size-3.5 shrink-0 items-center justify-center">{mark}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-(--ln-text)">{label}</span>
        {detail && <span className="block text-xs font-[450] text-(--ln-text-muted)">{detail}</span>}
      </span>
    </button>
  );
}

/**
 * The merge card: where review, checks and the branch stand, then one split
 * button on the right. The button does the one thing that makes sense now
 * (merge with the chosen method; while blocked, merge as soon as it's
 * ready; for a draft, mark it ready for review), and its menu holds the rest:
 * the merge method, converting to a draft and closing the diff. What the
 * button will do is spelled out on the footer's left.
 */
export function MergeCard({ diff, base = "main" }: { diff: Diff; base?: string }) {
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]["id"]>("squash");
  const [menu, setMenu] = useState(false);
  const [behind, setBehind] = useState(diff.behind ?? 0);
  const [auto, setAuto] = useState(false);
  const [merged, setMerged] = useState(diff.state === "merged");
  const [closed, setClosed] = useState(diff.state === "closed");
  const [draft, setDraft] = useState(diff.state === "draft");
  const failing = diff.checks.some((c) => c.state === "failed" || c.state === "running");
  const [showChecks, setShowChecks] = useState(failing);
  // the reviewers open on their own while someone's asked for changes, as the checks do on a failure
  const [showReviewers, setShowReviewers] = useState(diff.reviewers.some((r) => r.verdict === "changes"));
  const commits = commitCount(diff);

  if (merged) {
    return (
      // a faint wash of the merged purple from the glyph's side, and a hairline tinted to match
      <div
        className="relative z-[1] -mx-3 flex items-center gap-3 rounded-lg border-[0.5px] px-4 py-3 shadow-(--ln-main-shadow)"
        style={{
          borderColor: "color-mix(in lch, var(--ln-diff-merged) 22%, var(--ln-card-border))",
          background:
            "radial-gradient(90% 160% at 0% 50%, color-mix(in lch, var(--ln-diff-merged) 9%, transparent), transparent 70%), var(--ln-card)",
        }}
      >
        <DiffStateIcon state="merged" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-(--ln-text)">Merged into {base}</div>
          <div className="text-xs font-[450] text-(--ln-text-muted)">
            <span className="flex items-center gap-1.5">
              {commits} {commits === 1 ? "commit" : "commits"} from <BranchBadge name={diff.branch} />
            </span>
          </div>
        </div>
        <button type="button" className="ln-pill h-7 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header)">
          Revert
        </button>
      </div>
    );
  }
  if (closed) {
    return (
      <div className="relative z-[1] -mx-3 flex items-center gap-3 rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) px-4 py-3 shadow-(--ln-main-shadow)">
        <DiffStateIcon state="closed" />
        <div className="flex-1 text-[13px] font-medium text-(--ln-text)">Closed without merging</div>
        <button type="button" onClick={() => setClosed(false)} className="ln-pill h-7 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header)">
          Reopen
        </button>
      </div>
    );
  }

  const approvals = diff.reviewers.filter((r) => r.verdict === "approved");
  const changes = diff.reviewers.filter((r) => r.verdict === "changes");
  const failed = diff.checks.filter((c) => c.state === "failed");
  const running = diff.checks.filter((c) => c.state === "running");
  const reviewOk = approvals.length > 0 && changes.length === 0;
  const checksOk = failed.length === 0 && running.length === 0;
  const ready = reviewOk && checksOk && !diff.conflicts && !draft;
  const chosen = STRATEGIES.find((s) => s.id === strategy)!;
  const names = (people: { who: { name: string } }[]) => people.map((p) => p.who.name).join(" and ");

  // what's left before it can merge, for the footer's "once …"
  const waiting = [
    !reviewOk && (changes.length ? "the requested changes are approved" : "it's approved"),
    !checksOk && (failed.length ? "checks pass" : "checks finish"),
    diff.conflicts && "the conflicts are resolved",
  ].filter((w): w is string => !!w);
  const once = waiting.length > 1 ? `${waiting.slice(0, -1).join(", ")} and ${waiting.at(-1)}` : waiting[0];

  const primary = draft
    ? { label: "Ready for review", act: () => setDraft(false) }
    : ready
      ? { label: chosen.label, act: () => setMerged(true) }
      : auto
        ? { label: "Cancel auto-merge", act: () => setAuto(false) }
        : { label: "Merge when ready", act: () => setAuto(true) };
  const note = draft
    ? "Drafts can't be merged until they're marked ready for review"
    : ready
      ? "Deletes the branch after merging"
      : auto
        ? `Will ${chosen.verb} once ${once}`
        : `Can merge once ${once}`;
  // merging is the page's one filled button, in the merged purple (a draft's "Ready for review" takes the accent,
  // as "Mark as ready" does); once auto-merge is on, the button only cancels it, so it steps back to a neutral pill
  const neutral = auto && !ready && !draft;
  const fill = neutral
    ? "ln-pill text-(--ln-text-muted)"
    : draft
      ? "bg-(--ln-accent) text-white hover:brightness-110"
      : "bg-(--ln-merge) text-white hover:bg-(--ln-merge-hover)";
  const pick = (act: () => void) => () => {
    act();
    setMenu(false);
  };

  return (
    <div className="relative z-[1] -mx-3 rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) shadow-(--ln-main-shadow)">
      <div className="flex items-center gap-3 border-b-[0.5px] border-(--ln-card-border) px-4 py-4">
        <DiffStateIcon state={draft ? "draft" : "open"} />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-(--ln-text)">
            {draft ? "This diff is a draft" : ready ? "Ready to merge" : "Merging is blocked"}
          </div>
          <div className="truncate text-xs font-[450] text-(--ln-text-muted)">
            <span className="flex items-center gap-1.5">
              Into <BranchBadge name={base} /> from <BranchBadge name={diff.branch} />
            </span>
          </div>
        </div>
      </div>

      <Requirement
        state={changes.length ? "blocked" : reviewOk ? "ok" : "pending"}
        title={changes.length ? "Changes requested" : reviewOk ? "Approved" : "Review required"}
        detail={
          changes.length
            ? `${names(changes)} requested changes${approvals.length ? `; ${names(approvals)} approved` : ""}`
            : reviewOk
              ? `${names(approvals)} approved`
              : diff.reviewers.length
                ? `Waiting on ${names(diff.reviewers)}`
                : "Add a reviewer to get an approval"
        }
        action={diff.reviewers.length > 0 ? <Disclosure open={showReviewers} onToggle={() => setShowReviewers(!showReviewers)} label="reviewers" /> : undefined}
      >
        {showReviewers && diff.reviewers.length > 0 && <ReviewerList diff={diff} />}
      </Requirement>
      <Requirement
        state={failed.length ? "blocked" : running.length ? "waiting" : "ok"}
        icon={!failed.length && running.length ? <CheckStateIcon state="running" /> : undefined}
        title={
          failed.length
            ? `${failed.length} failing ${failed.length === 1 ? "check" : "checks"}`
            : running.length
              ? "Checks running"
              : "All checks passed"
        }
        detail={checkSummary(diff.checks)}
        action={<Disclosure open={showChecks} onToggle={() => setShowChecks(!showChecks)} label="checks" />}
      >
        {showChecks && <CheckList checks={diff.checks} />}
      </Requirement>
      <Requirement
        state={diff.conflicts ? "blocked" : behind ? "waiting" : "ok"}
        title={diff.conflicts ? `Conflicts with ${base}` : behind ? `${behind} ${behind === 1 ? "commit" : "commits"} behind ${base}` : `No conflicts with ${base}`}
        detail={diff.conflicts ? "Resolve them before merging" : behind ? `Update the branch to test against the latest ${base}` : `Up to date with ${base}`}
        action={
          behind > 0 && !diff.conflicts ? (
            <button
              type="button"
              onClick={() => setBehind(0)}
              className="ln-pill h-7 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header)"
            >
              Update branch
            </button>
          ) : undefined
        }
      />

      {/* what the button will do on the left, the one button on the right */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-xs font-[450] text-(--ln-text-muted)">{note}</span>
        {/* one raised pill holding both halves, a hairline between them, as the toolbar's review button */}
        <div className="relative flex shrink-0">
          <div className={`flex h-7 items-center rounded-full ${fill}`}>
            <button type="button" onClick={primary.act} className="h-7 rounded-l-full pr-2.5 pl-3 text-xs font-medium">
              {primary.label}
            </button>
            <span className={`h-3.5 w-px ${neutral ? "bg-(--ln-chip-border)" : "bg-white/25"}`} />
            <button
              type="button"
              aria-label="More merge options"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
              className="flex h-7 items-center rounded-r-full pr-2.5 pl-2"
            >
              <ChevronDownIcon size={8} />
            </button>
          </div>
          {menu && (
            <Menu onClose={() => setMenu(false)} place="bottom-full right-0 mb-1.5 w-[328px] p-1">
              {!draft && (
                <>
                  <div className="flex h-[30px] items-center px-2.5 text-xs font-medium text-(--ln-text-muted)">Merge method</div>
                  {STRATEGIES.map((s) => (
                    <MergeMenuItem
                      key={s.id}
                      checked={s.id === strategy}
                      mark={s.id === strategy && <StateDot state="ok" size={12} />}
                      label={s.label}
                      detail={s.detail(commits, base)}
                      onClick={pick(() => setStrategy(s.id))}
                    />
                  ))}
                  <div className="-mx-1 my-1 border-t-[0.5px] border-(--ln-popover-border)" />
                  <MergeMenuItem
                    mark={<DiffStateIcon state="draft" size={14} />}
                    label="Convert to draft"
                    detail="Pause reviews until it's ready again"
                    onClick={pick(() => {
                      setDraft(true);
                      setAuto(false);
                    })}
                  />
                </>
              )}
              <MergeMenuItem mark={<DiffStateIcon state="closed" size={14} />} label="Close diff" detail="Keep the branch, without merging" onClick={pick(() => setClosed(true))} />
            </Menu>
          )}
        </div>
      </div>
    </div>
  );
}
