"use client";

import { useState, type ReactNode } from "react";
import { AddButton, Avatar, Crumb, DetailLayout, IconButton, PageHeader, PanelRow, PanelSection, TabBar } from "./chrome";
import { BranchIcon, CodeBlockIcon, CommitIcon, CopyPathIcon, FileIcon, LinkIcon, StarIcon } from "./code-icons";
import { DIFFS, ISSUE_STATUS, PEOPLE, diffKey, findProject, findRepo, type Diff, type Repo } from "./code-data";
import { DiffList, FilterBar, ViewControls, useDiffView } from "./diff-list";
import { Markdown } from "./code";
import { STATUSES, TEAM } from "./data";
import { Card, EventRow, Menu, Ref } from "./diff-conversation";
import { CheckStateIcon, DiffStateIcon, RepoIcon, StatusIcon } from "./glyphs";
import { AsiaIcon, ChevronDownIcon, ComposeIcon, MoreIcon, PlusIcon, SearchIcon } from "./icons";
import { AddPeople, Facepile, HoverCard, ProjectCard, ProjectGlyph, type Member } from "./person-card";
import { Check, HEAD, IDLE, ROW } from "./reviewer-picker";
import { BranchPicker } from "./branch-switcher";
import { CodeView } from "./code-view";
import { useApp } from "./router";

// A repository's overview, on the issue page's layout (the centred column
// and the 34.7% panel) and with its pieces: Linear's toolbar on the tab row;
// in the column the branch bar with Clone, the file explorer as a timeline
// card, the README as a document and the repo's activity in the timeline's
// rows; in the panel what the repo is (its name and description, then its
// properties as hover pills with a › to their page), the projects being
// worked on here (Linear is a private host, so projects stand where an
// open-source host shows topics), releases and contributors. The Diffs tab
// groups the repo's diffs by project.

const CLONE_NAME = { cli: "Linear CLI", https: "HTTPS", ssh: "SSH" } as const;

const CLONE = {
  https: (slug: string) => `https://code.linear.app/as-mobbin/${slug}.git`,
  ssh: (slug: string) => `git@code.linear.app:as-mobbin/${slug}.git`,
  cli: (slug: string) => `linear repo clone as-mobbin/${slug}`,
};

const AGENTS_HERE = [
  { who: PEOPLE.linear, title: "Ask Linear", detail: "Works on a branch and opens a diff" },
  { who: PEOPLE.cursor, title: "Start a Cursor agent", detail: "Runs in the background, then opens a diff" },
];

/**
 * The repo's Code menu, agents first: hand the repo to Linear or Cursor with
 * a sentence (the menu turns into a small composer, then confirms the session
 * started); then cloning,
 * the command or URL for the Linear CLI, HTTPS or SSH in a field with copy.
 * Built from the assignee menu's parts: 12/500 headers in 30px slots, 32px
 * rows 6px in, 13px names.
 */
function CloneMenu({ repo }: { repo: Repo }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<keyof typeof CLONE>("cli");
  const [methods, setMethods] = useState(false);
  const [copied, setCopied] = useState(false);
  const [agent, setAgent] = useState<(typeof AGENTS_HERE)[number] | null>(null);
  const [task, setTask] = useState("");
  const [started, setStarted] = useState(false);
  const url = CLONE[method](repo.slug);
  const close = () => {
    setOpen(false);
    setAgent(null);
    setTask("");
    setStarted(false);
  };
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="ln-pill flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-(--ln-text)"
      >
        <CodeBlockIcon size={14} />
        Code
        <ChevronDownIcon size={8} />
      </button>
      {open && (
        <Menu onClose={close} place="top-full right-0 mt-1.5 w-[340px] p-0">
          {agent ? (
            // handing the repo to an agent: one sentence, the branch it starts from, and go
            <div className="p-1.5">
              <div className="flex h-[30px] items-center gap-2 px-2 text-xs font-medium text-(--ln-text-muted)">
                <Avatar who={agent.who} size={16} />
                {agent.title}
                <span className="ml-auto flex items-center gap-1 font-[450]">
                  from <span className="ln-mono text-(--ln-text-header)">{repo.defaultBranch}</span>
                </span>
              </div>
              {started ? (
                <p className="flex items-center gap-2 px-2 py-3 text-[13px] font-[450] text-(--ln-text)">
                  <CheckStateIcon state="running" />
                  {agent.who.name} is on it. You’ll get a diff to review when it’s done.
                </p>
              ) : (
                <>
                  <textarea
                    autoFocus
                    rows={3}
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder={`What should ${agent.who.name} do in ${repo.slug}?`}
                    className="ln-search w-full resize-none bg-transparent px-2 py-1.5 text-[13px] leading-5 font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
                  />
                  <div className="flex items-center gap-1.5 pb-0.5 pl-2">
                    <span className="text-xs font-[450] text-(--ln-text-muted)">
                      Follows <span className="ln-mono text-(--ln-text-header)">AGENTS.md</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAgent(null)}
                      className="ml-auto h-7 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header) hover:bg-(--ln-ghost-hover)"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!task.trim()}
                      onClick={() => setStarted(true)}
                      className="ln-pill h-7 rounded-full px-3 text-xs font-medium text-(--ln-text) disabled:opacity-45"
                    >
                      Start session
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="p-1.5">
                <div className={HEAD}>Work with an agent</div>
                {AGENTS_HERE.map((a) => (
                  <button key={a.who.name} type="button" onClick={() => setAgent(a)} className={`${ROW} ${IDLE} h-auto items-start py-[7px]`}>
                    <span className="mt-0.5 flex">
                      <Avatar who={a.who} size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-(--ln-text)">{a.title}</span>
                      <span className="block truncate text-xs text-(--ln-text-muted)">{a.detail}</span>
                    </span>
                  </button>
                ))}
                {/* more agents come from Linear's integrations directory, so the list ends with a way there */}
                <a href="https://linear.app/integrations/agents" target="_blank" rel="noreferrer" className={`${ROW} ${IDLE} text-(--ln-text-muted)`}>
                  <span className="flex size-4 items-center justify-center text-(--ln-text-muted)">
                    <PlusIcon size={14} />
                  </span>
                  Add an agent
                  <span className="ml-auto pr-1 text-xs text-(--ln-icon-faint)">Integrations ↗</span>
                </a>
              </div>
              <div className="border-t-[0.5px] border-(--ln-popover-border) px-3.5 pt-3 pb-4">
                <div className="mb-2 text-xs font-medium text-(--ln-text-muted)">Clone</div>
                {/* Linear's own copy field (Settings › Security's invite link) with its prefixed input
                    (the workspace URL's muted "linear.app/"): a hairline input whose muted prefix here picks the
                    method, the command or URL in the text color, and a raised Copy button beside it */}
                <div className="flex items-center gap-1.5">
                  <div className="relative flex h-8 min-w-0 flex-1 items-center rounded-lg border-[0.5px] border-(--ln-chip-border) pr-2.5 text-[13px] font-[450]">
                    <button
                      type="button"
                      aria-label="Clone with"
                      aria-expanded={methods}
                      onClick={() => setMethods(!methods)}
                      className="flex h-full shrink-0 items-center gap-1 rounded-l-lg pr-1.5 pl-2.5 text-(--ln-text-muted) hover:text-(--ln-text-header)"
                    >
                      {method === "cli" ? "CLI" : CLONE_NAME[method]}
                      <ChevronDownIcon size={8} />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-(--ln-text-header)">{url}</span>
                    {methods && (
                      <Menu onClose={() => setMethods(false)} place="top-full left-0 mt-1 w-[180px] p-1">
                        {(["cli", "https", "ssh"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            role="menuitemradio"
                            aria-checked={method === m}
                            onClick={() => {
                              setMethod(m);
                              setCopied(false);
                              setMethods(false);
                            }}
                            className={`${ROW} ${IDLE} h-7 text-xs`}
                          >
                            {CLONE_NAME[m]}
                            <span className="ml-auto flex pr-1">{method === m && <Check />}</span>
                          </button>
                        ))}
                      </Menu>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(url).catch(() => {});
                      setCopied(true);
                    }}
                    className="ln-pill flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-(--ln-text-header)"
                  >
                    {copied ? <Check /> : <CopyPathIcon size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </>
          )}
        </Menu>
      )}
    </div>
  );
}

function BranchBar({ repo, branch, onBranch }: { repo: Repo; branch: string; onBranch: (b: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <BranchPicker repo={repo} branch={branch} onBranch={onBranch} />
      <button type="button" className="flex h-7 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-(--ln-text-muted) hover:bg-(--ln-ghost-hover)">
        <BranchIcon size={14} />
        {repo.branches} branches
      </button>
      <button type="button" className="flex h-7 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-(--ln-text-muted) hover:bg-(--ln-ghost-hover)">
        <TagIcon />
        {repo.tags} tags
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          className="ln-pill flex h-7 w-44 items-center gap-2 rounded-full px-2.5 text-xs font-[450] text-(--ln-text-muted)"
        >
          <SearchIcon size={14} />
          Go to file
          <kbd className="ml-auto flex h-[17px] w-[18.5px] items-center justify-center rounded-[4px] border-[0.5px] border-(--ln-popover-border) font-sans text-[11px]">
            T
          </kbd>
        </button>
        <CloneMenu repo={repo} />
      </div>
    </div>
  );
}

/** A tag, beside the branches count: a label shape with its hole, at the branch glyph's 14px and weight. */
function TagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1.75 2.75v3.6c0 .27.1.52.3.71l5.2 5.2a1 1 0 0 0 1.42 0l3.6-3.6a1 1 0 0 0 0-1.42l-5.2-5.2a1 1 0 0 0-.71-.29h-3.6a1 1 0 0 0-1 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="4.75" cy="4.75" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * The file explorer as a timeline card (12px out past the column, 16px in):
 * the branch's last commit on top, read like an activity event, then each
 * entry with the commit that last touched it; any entry opens the code view.
 */
function Explorer({ repo }: { repo: Repo }) {
  const { go } = useApp();
  const sorted = [...repo.tree].sort((a, b) => Number(!!b.folder) - Number(!!a.folder));
  const last = repo.lastCommit;
  return (
    <Card>
      <div className="flex h-11 items-center gap-[9px] border-b-[0.5px] border-(--ln-card-border) px-4 text-[13px]">
        <Avatar who={last.who} size={18} />
        <span className="min-w-0 truncate font-[450] text-(--ln-text-muted)">
          <span className="font-medium text-(--ln-text)">{last.who.name}</span> {last.message}
          {last.issue && (
            <>
              {" "}
              <Ref icon={<StatusIcon status={STATUSES.find((s) => s.id === ISSUE_STATUS[last.issue!]) ?? STATUSES[1]} size={12} />}>
                <span className="ln-tnum">{last.issue}</span>
              </Ref>
            </>
          )}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1 text-xs font-[450] text-(--ln-text-muted)">
          <span className="mr-1">{last.age} ago</span>
          <button type="button" className="flex h-7 items-center gap-1.5 rounded-full px-2 font-medium hover:bg-(--ln-ghost-hover)">
            <CommitIcon size={14} />
            {repo.commits}
          </button>
        </span>
      </div>
      {sorted.map((e) => (
        <button
          key={e.name}
          type="button"
          // any entry opens the code view: the tree on the left, the folder or file on the right
          onClick={() => go({ page: "repo", slug: repo.slug, path: e.name })}
          className="flex h-9 w-full items-center gap-[9px] border-b-[0.5px] border-(--ln-card-border) px-4 text-left last:border-b-0 hover:bg-(--ln-item-hover)"
        >
          <FileIcon kind={e.kind} />
          <span className={`w-40 shrink-0 truncate text-[13px] ${e.folder ? "font-medium text-(--ln-text)" : "font-[450] text-(--ln-text-header)"}`}>
            {e.name}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-[450] text-(--ln-text-muted)">{e.message}</span>
          <span className="w-8 shrink-0 text-right text-xs font-[450] text-(--ln-text-muted)">{e.age}</span>
        </button>
      ))}
    </Card>
  );
}

/** The README as a document, the way Linear sets a project's description. */
function Readme({ repo }: { repo: Repo }) {
  return <Markdown source={repo.readme} compact />;
}

const MINUTES = { m: 1, h: 60, d: 1440, w: 10080 } as const;
/** "2d" as minutes, to order events from different sources. */
const ago = (age: string) => Number.parseInt(age) * (MINUTES[age.slice(-1) as keyof typeof MINUTES] ?? 1);

/** A release's diamond, as Linear draws milestones; the latest in the open color. */
function ReleaseGlyph({ latest }: { latest?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className={latest ? "text-(--ln-diff-open)" : "text-(--ln-icon-faint)"}>
      <path d="M7 1.5 12.5 7 7 12.5 1.5 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The repo's recent activity, in the diff timeline's rows: diffs opened and
 * merged, and releases published, newest last as Linear orders activity.
 */
function Activity({ repo }: { repo: Repo }) {
  const { go } = useApp();
  const diffLink = (d: Diff) => (
    <button type="button" onClick={() => go({ page: "diff", key: diffKey(d) })} className="text-(--ln-text-header) hover:underline">
      #{d.number} {d.title}
    </button>
  );
  const events: { age: string; icon: ReactNode; text: ReactNode }[] = [
    ...DIFFS.filter((d) => d.repo === repo.slug).map((d) =>
      d.state === "merged"
        ? { age: d.age, icon: <DiffStateIcon state="merged" size={14} />, text: <>{d.author.name} merged {diffLink(d)} into {repo.defaultBranch}</> }
        : d.state === "closed"
          ? { age: d.age, icon: <DiffStateIcon state="closed" size={14} mono />, text: <>{d.author.name} closed {diffLink(d)}</> }
          : { age: d.age, icon: <DiffStateIcon state={d.state} size={14} />, text: <>{d.author.name} {d.state === "draft" ? "drafted" : "opened"} {diffLink(d)}</> },
    ),
    ...repo.releases.map((r, i) => ({
      age: r.age,
      icon: <ReleaseGlyph latest={i === 0} />,
      text: (
        <>
          Linear published <span className="ln-mono text-(--ln-text-header)">{r.tag}</span> {r.title}
        </>
      ),
    })),
  ]
    .sort((a, b) => ago(b.age) - ago(a.age))
    .slice(-6);
  return (
    <ol className="flex flex-col gap-3.5">
      {events.map((e, i) => (
        <li key={i}>
          <EventRow icon={e.icon}>
            {e.text} · {e.age} ago
          </EventRow>
        </li>
      ))}
    </ol>
  );
}

type Section = "readme" | "activity";

/**
 * What sits under the file explorer, folded so the page stays compact: a row
 * of tabs in the page's pill style (README.md when the repo has one, then
 * Activity), all closed to begin with. A tab opens its panel under the row;
 * the open tab closes it again. The open panel's own action (edit the
 * README, watch the repo) sits at the row's right.
 */
function Sections({ repo }: { repo: Repo }) {
  const [open, setOpen] = useState<Section | null>(null);
  const tabs: { id: Section; label: string; icon: ReactNode }[] = [
    ...(repo.readme ? [{ id: "readme" as const, label: "README.md", icon: <FileIcon kind="markdown" /> }] : []),
    { id: "activity", label: "Activity", icon: <ActivityIcon /> },
  ];
  return (
    <section className="mt-6">
      <div className="flex items-center gap-[7px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-expanded={open === t.id}
            onClick={() => setOpen(open === t.id ? null : t.id)}
            className={`ln-pill flex h-7 items-center gap-1.5 rounded-full pr-[10.5px] pl-2 text-xs font-medium ${open === t.id ? "text-(--ln-text)" : "text-(--ln-text-muted)"}`}
          >
            <span className="flex">{t.icon}</span>
            {t.label}
            <ChevronDownIcon size={8} className={`ml-0.5 transition-transform ${open === t.id ? "rotate-180" : ""}`} />
          </button>
        ))}
        {open === "readme" && (
          <IconButton label="Edit README" className="ml-auto size-7 text-(--ln-text-muted)">
            <ComposeIcon size={14} />
          </IconButton>
        )}
        {open === "activity" && (
          <button type="button" className="ml-auto h-7 rounded-full px-2.5 text-xs font-medium text-(--ln-text-muted) hover:bg-(--ln-ghost-hover) hover:text-(--ln-text)">
            Watch
          </button>
        )}
      </div>
      {open && <div className="mt-5">{open === "readme" ? <Readme repo={repo} /> : <Activity repo={repo} />}</div>}
    </section>
  );
}

/** Activity's tab glyph: a pulse line, as Linear draws activity. */
function ActivityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1.75 7h2.5l1.5-3.5 2.5 7 1.5-3.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** What the repo is: its name and description, then its properties as the issue page lists them. */
function About({ repo }: { repo: Repo }) {
  const { go } = useApp();
  return (
    <>
      <section className="group/about mb-7">
        <div className="flex h-6 items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-(--ln-text)">{repo.slug}</h2>
          <IconButton label="Edit details" className="size-6 text-(--ln-text-muted) opacity-0 group-hover/about:opacity-100">
            <ComposeIcon size={14} />
          </IconButton>
        </div>
        <p className="mt-1 text-[13px] leading-5 font-[450] text-(--ln-text-muted)">{repo.description}</p>
      </section>
      {/* as a Linear project's panel has them: each value with its name on the left, since "Private" or a person alone doesn't say what they are */}
      <PanelSection label="Properties">
        <Labeled label="Visibility">
          <PanelRow icon={<VisibilityIcon />}>{repo.visibility}</PanelRow>
        </Labeled>
        <Labeled label="Lead">
          <PanelRow icon={<Avatar who={repo.lead} size={14} />} onClick={() => {}} onGo={() => {}} goLabel="Open profile">
            {repo.lead.name}
          </PanelRow>
        </Labeled>
        <Labeled label="Team">
          <PanelRow icon={<AsiaIcon size={14} style={{ color: TEAM.color }} />} onClick={() => go({ page: "issues" })} onGo={() => go({ page: "issues" })} goLabel="Open team">
            {TEAM.name}
          </PanelRow>
        </Labeled>
        <Labeled label="Default branch">
          <PanelRow icon={<BranchIcon size={14} className="text-(--ln-text-muted)" />}>
            <span className="ln-mono text-xs">{repo.defaultBranch}</span>
          </PanelRow>
        </Labeled>
      </PanelSection>
      <Projects repo={repo} />
    </>
  );
}

/** A property with its name in a muted 112px column (room for "Default branch"), as Linear's project panel lays out Status, Lead and Teams. */
function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center">
      <span className="w-28 shrink-0 text-[13px] font-[450] text-(--ln-text-muted)">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * The projects being worked on in the repo, where an open-source host would
 * show topics: each a pill (hover for its lead, progress and the diffs here;
 * click for those diffs), with + after the last, as Labels has it.
 */
function Projects({ repo }: { repo: Repo }) {
  const { go } = useApp();
  const projects = repo.projects.map(findProject).filter((p) => !!p);
  return (
    <PanelSection label="Projects">
      {projects.map((p) => (
        <HoverCard key={p.id} card={<ProjectCard project={p} repo={repo.slug} />}>
          <PanelRow icon={<ProjectGlyph project={p} />} onClick={() => go({ page: "repo", slug: repo.slug, tab: "diffs" })}>
            {p.name}
          </PanelRow>
        </HoverCard>
      ))}
      <AddButton label="Add project" />
    </PanelSection>
  );
}

/** Private or internal, as a padlock or a building. */
function VisibilityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="text-(--ln-text-muted)">
      <rect x="2.75" y="6.25" width="8.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.75 6.25V4.5a2.25 2.25 0 0 1 4.5 0v1.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Releases as panel items: a diamond, the tag and title, Latest on the newest, and a › to the release. */
function Releases({ repo }: { repo: Repo }) {
  return (
    <PanelSection label="Releases">
      {repo.releases.length === 0 && (
        <PanelRow muted icon={<ReleaseGlyph />}>
          No releases yet
        </PanelRow>
      )}
      {repo.releases.map((r, i) => (
        <PanelRow
          key={r.tag}
          icon={<ReleaseGlyph latest={i === 0} />}
          onClick={() => {}}
          onGo={() => {}}
          goLabel="Open release"
        >
          <span className="ln-mono text-xs">{r.tag}</span> <span className="font-[450] text-(--ln-text-muted)">{r.title}</span>
          {i === 0 && (
            <span className="ml-2 rounded-[5px] border-[0.5px] border-(--ln-chip-border) px-1 text-[11px] leading-4 font-medium text-(--ln-text-muted)">
              Latest
            </span>
          )}
        </PanelRow>
      ))}
    </PanelSection>
  );
}

/** Contributors as a facepile (hover a face for who they are), then the + to add people with a role. */
function Contributors({ repo }: { repo: Repo }) {
  const [members, setMembers] = useState<Member[]>(() =>
    repo.contributors.map((who) => ({ who, role: who.name === repo.lead.name ? "Admin" : "Write" })),
  );
  return (
    <PanelSection label="Contributors">
      <div className="flex items-center gap-1.5">
        <span className="-ml-[1.5px] flex">
          <Facepile people={members.map((m) => m.who)} />
        </span>
      </div>
      <AddPeople members={members} onChange={setMembers} />
    </PanelSection>
  );
}

function Overview({ repo }: { repo: Repo }) {
  const [branch, setBranch] = useState(repo.defaultBranch);
  return (
    <DetailLayout
      panel={
        <>
          <About repo={repo} />
          <Releases repo={repo} />
          <Contributors repo={repo} />
        </>
      }
    >
      <BranchBar repo={repo} branch={branch} onBranch={setBranch} />
      <div className="mt-4">
        <Explorer key={branch} repo={repo} />
      </div>
      <Sections repo={repo} />
    </DetailLayout>
  );
}

/** The toolbar under the header, as on the issue page: copy the repo's link and its clone URL. */
function Toolbar({ repo }: { repo: Repo }) {
  const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => {});
  return (
    <div className="flex items-center gap-1.5 text-(--ln-text-muted)">
      <IconButton label="Copy link" raised onClick={() => copy(`https://linear.app/as-mobbin/repo/${repo.slug}`)}>
        <LinkIcon size={14} />
      </IconButton>
      <IconButton label="Copy clone URL" raised onClick={() => copy(CLONE.https(repo.slug))}>
        <CopyPathIcon size={14} />
      </IconButton>
    </div>
  );
}

export function RepoView({ slug, rootCrumb }: { slug: string; rootCrumb: { label: string; onClick: () => void } }) {
  const { route, go } = useApp();
  // the Diffs tab's view: open diffs (drafts included) grouped by project, the
  // repository's own chip hidden; merged and closed ones are a Display option away,
  // as Linear keeps completed issues out of a list by default
  const [view, setView] = useDiffView({ grouping: "project", completed: "none" });
  const repo = findRepo(slug);
  if (!repo) return null;
  const tab = route.page === "repo" ? (route.tab ?? "overview") : "overview";
  const diffs = DIFFS.filter((d) => d.repo === slug);
  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        <Crumb onClick={rootCrumb.onClick}>{rootCrumb.label}</Crumb>
        <RepoIcon size={14} className="mr-2 shrink-0 text-(--ln-text-muted)" />
        <h1 className="truncate">{repo.slug}</h1>
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
          { id: "diffs", label: "Diffs", count: diffs.length },
        ]}
        value={tab}
        onChange={(t) => go({ page: "repo", slug, tab: t })}
        className="pr-[15px] pl-2"
      >
        {tab === "overview" ? <Toolbar repo={repo} /> : <ViewControls diffs={diffs} view={view} setView={setView} />}
      </TabBar>
      {tab === "overview" && route.page === "repo" && route.path !== undefined ? (
        <CodeView key={route.path} repo={repo} path={route.path.split("/").filter(Boolean)} />
      ) : tab === "overview" ? (
        <Overview repo={repo} />
      ) : (
        <>
          <FilterBar diffs={diffs} view={view} setView={setView} />
          <DiffList diffs={diffs} view={view} setView={setView} />
        </>
      )}
    </div>
  );
}
