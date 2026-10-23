"use client";

import { useState } from "react";
import { Avatar, IconButton } from "./chrome";
import { CommitIcon, CopyPathIcon, FileIcon } from "./code-icons";
import { ISSUE_STATUS, type Person, type Repo, type TreeEntry } from "./code-data";
import { fileContent, langOf } from "./code-files";
import { Highlight, Markdown } from "./code";
import { STATUSES } from "./data";
import { Ref } from "./diff-conversation";
import { StatusIcon } from "./glyphs";
import { ChevronDownIcon, SearchIcon } from "./icons";
import { BranchPicker } from "./branch-switcher";
import { Check } from "./reviewer-picker";
import { useApp } from "./router";

// A repository's code view, after GitHub's: the file tree in a sidebar on the
// left (the branch, a filter, then folders that open in place), and on the
// right the path as a breadcrumb, the commit that last touched what's open,
// then a folder's entries or a file's contents, in the diff view's line style
// (12px mono on 20px lines, numbers in a 50px gutter), a README or other
// markdown rendered with a Preview / Code switch.

/** The entries along a path, from the root down; undefined if the path doesn't exist. */
function walk(repo: Repo, path: string[]): TreeEntry[] | undefined {
  const out: TreeEntry[] = [];
  let level = repo.tree;
  for (const name of path) {
    const e = level.find((x) => x.name === name);
    if (!e) return undefined;
    out.push(e);
    level = e.children ?? [];
  }
  return out;
}

const sorted = (entries: TreeEntry[]) => [...entries].sort((a, b) => Number(!!b.folder) - Number(!!a.folder) || a.name.localeCompare(b.name));

/** Who made the commit that last touched an entry: the repo's last committer for that commit, else a contributor by the message. */
function authorOf(repo: Repo, entry: TreeEntry): Person {
  if (entry.message === repo.lastCommit.message) return repo.lastCommit.who;
  const people = repo.contributors.filter((p) => !p.agent);
  const n = [...entry.message].reduce((h, c) => h + c.charCodeAt(0), 0);
  return people[n % people.length];
}

/** One row of the tree: indented 12px a level, a chevron for folders, the entry's icon and name. */
function TreeRow({
  repo,
  entry,
  path,
  depth,
  open,
  current,
  onToggle,
}: {
  repo: Repo;
  entry: TreeEntry;
  path: string[];
  depth: number;
  open: Set<string>;
  current: string;
  onToggle: (key: string) => void;
}) {
  const { go } = useApp();
  const key = path.join("/");
  const expanded = open.has(key);
  const here = key === current;
  return (
    <>
      <button
        type="button"
        aria-current={here ? "page" : undefined}
        aria-expanded={entry.folder ? expanded : undefined}
        onClick={() => {
          if (entry.folder && !expanded) onToggle(key);
          go({ page: "repo", slug: repo.slug, path: key });
        }}
        className={`flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left text-[13px] font-[450] ${
          here ? "bg-(--ln-item-hover) text-(--ln-text)" : "text-(--ln-text-header) hover:bg-(--ln-item-hover)"
        }`}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        <span
          // the chevron toggles a folder without opening it, as GitHub's does
          onClick={(e) => {
            if (!entry.folder) return;
            e.stopPropagation();
            onToggle(key);
          }}
          className="flex size-4 shrink-0 items-center justify-center text-(--ln-text-muted)"
        >
          {entry.folder && <ChevronDownIcon size={8} className={`transition-transform ${expanded ? "" : "-rotate-90"}`} />}
        </span>
        <FileIcon kind={entry.kind} />
        <span className="min-w-0 truncate">{entry.name}</span>
      </button>
      {entry.folder &&
        expanded &&
        sorted(entry.children ?? []).map((c) => (
          <TreeRow key={c.name} repo={repo} entry={c} path={[...path, c.name]} depth={depth + 1} open={open} current={current} onToggle={onToggle} />
        ))}
    </>
  );
}

/** Every file under a level whose path contains the filter, for the tree's search. */
function matches(entries: TreeEntry[], q: string, at: string[] = []): string[][] {
  return entries.flatMap((e) => {
    const path = [...at, e.name];
    if (e.folder) return matches(e.children ?? [], q, path);
    return path.join("/").toLowerCase().includes(q) ? [path] : [];
  });
}

function Sidebar({ repo, path }: { repo: Repo; path: string[] }) {
  const { go } = useApp();
  // the folders on the way to what's open start expanded
  const [open, setOpen] = useState(() => new Set(path.map((_, i) => path.slice(0, i + 1).join("/"))));
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState(repo.defaultBranch);
  const toggle = (key: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const found = q.trim() ? matches(repo.tree, q.trim().toLowerCase()) : null;
  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r-[0.5px] border-(--ln-header-rule) max-[900px]:hidden">
      <div className="flex flex-col gap-2 px-3 pt-3 pb-2">
        {/* the branch the tree shows, switchable as on the overview */}
        <div className="flex h-7 items-center gap-1.5 text-xs font-medium text-(--ln-text-muted)">
          <span className="shrink-0">Files</span>
          <span className="ml-auto flex min-w-0">
            <BranchPicker repo={repo} branch={branch} onBranch={setBranch} />
          </span>
        </div>
        <label className="flex h-7 items-center gap-2 rounded-lg border-[0.5px] border-(--ln-chip-border) px-2 text-xs text-(--ln-text-muted)">
          <SearchIcon size={13} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Go to file"
            className="ln-search min-w-0 flex-1 bg-transparent text-xs font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
          />
        </label>
      </div>
      <nav aria-label="Files" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {found
          ? found.map((p) => (
              <button
                key={p.join("/")}
                type="button"
                onClick={() => go({ page: "repo", slug: repo.slug, path: p.join("/") })}
                className="flex h-7 w-full items-center gap-1.5 rounded-md px-1.5 text-left text-[13px] font-[450] text-(--ln-text-header) hover:bg-(--ln-item-hover)"
              >
                <FileIcon kind={walk(repo, p)!.at(-1)!.kind} />
                <span className="truncate">{p.at(-1)}</span>
                <span className="min-w-0 truncate text-xs text-(--ln-text-muted)">{p.slice(0, -1).join("/")}</span>
              </button>
            ))
          : sorted(repo.tree).map((e) => (
              <TreeRow key={e.name} repo={repo} entry={e} path={[e.name]} depth={0} open={open} current={path.join("/")} onToggle={toggle} />
            ))}
        {found?.length === 0 && <p className="px-2 py-2 text-xs text-(--ln-text-muted)">No file matches “{q}”</p>}
      </nav>
    </aside>
  );
}

/** The path as a breadcrumb: the repo, then each folder, each a way back up; the open entry last, then copy. */
function Breadcrumb({ repo, path }: { repo: Repo; path: string[] }) {
  const { go } = useApp();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-h-7 flex-wrap items-center gap-1 text-[13px] font-medium">
      <button type="button" onClick={() => go({ page: "repo", slug: repo.slug })} className="text-(--ln-accent) hover:underline">
        {repo.slug}
      </button>
      {path.map((name, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-(--ln-icon-faint)">/</span>
          {i === path.length - 1 ? (
            <span className="text-(--ln-text)">{name}</span>
          ) : (
            <button type="button" onClick={() => go({ page: "repo", slug: repo.slug, path: path.slice(0, i + 1).join("/") })} className="text-(--ln-accent) hover:underline">
              {name}
            </button>
          )}
        </span>
      ))}
      <IconButton
        label={copied ? "Copied" : "Copy path"}
        className="ml-1 size-6 text-(--ln-text-muted)"
        onClick={() => {
          navigator.clipboard?.writeText(path.join("/")).catch(() => {});
          setCopied(true);
        }}
      >
        {copied ? <Check /> : <CopyPathIcon size={13} />}
      </IconButton>
    </div>
  );
}

/** The commit that last touched what's open, in the explorer header's shape: who and what, the issue, when, and the history. */
function CommitBar({ repo, entry }: { repo: Repo; entry: TreeEntry | null }) {
  const who = entry ? authorOf(repo, entry) : repo.lastCommit.who;
  const message = entry?.message ?? repo.lastCommit.message;
  const issue = entry ? entry.issue : repo.lastCommit.issue;
  const age = entry?.age ?? repo.lastCommit.age;
  const status = issue ? (STATUSES.find((s) => s.id === ISSUE_STATUS[issue]) ?? STATUSES[1]) : undefined;
  return (
    <div className="flex h-11 items-center gap-[9px] px-4 text-[13px]">
      <Avatar who={who} size={18} />
      <span className="min-w-0 truncate font-[450] text-(--ln-text-muted)">
        <span className="font-medium text-(--ln-text)">{who.name}</span> {message}
        {issue && status && (
          <>
            {" "}
            <Ref icon={<StatusIcon status={status} size={12} />}>
              <span className="ln-tnum">{issue}</span>
            </Ref>
          </>
        )}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1 text-xs font-[450] text-(--ln-text-muted)">
        <span className="mr-1">{age} ago</span>
        <button type="button" className="flex h-7 items-center gap-1.5 rounded-full px-2 font-medium hover:bg-(--ln-ghost-hover)">
          <CommitIcon size={14} />
          History
        </button>
      </span>
    </div>
  );
}

/** A folder's entries, as the overview's explorer lists them. */
function FolderList({ repo, path, entries }: { repo: Repo; path: string[]; entries: TreeEntry[] }) {
  const { go } = useApp();
  return (
    <>
      {path.length > 0 && (
        <button
          type="button"
          onClick={() => go({ page: "repo", slug: repo.slug, path: path.slice(0, -1).join("/") || undefined })}
          className="flex h-9 w-full items-center gap-[9px] border-t-[0.5px] border-(--ln-card-border) px-4 text-left text-[13px] font-medium text-(--ln-text-muted) hover:bg-(--ln-item-hover)"
        >
          <span className="w-4 text-center">..</span>
        </button>
      )}
      {sorted(entries).map((e) => (
        <button
          key={e.name}
          type="button"
          onClick={() => go({ page: "repo", slug: repo.slug, path: [...path, e.name].join("/") })}
          className="flex h-9 w-full items-center gap-[9px] border-t-[0.5px] border-(--ln-card-border) px-4 text-left hover:bg-(--ln-item-hover)"
        >
          <FileIcon kind={e.kind} />
          <span className={`w-48 shrink-0 truncate text-[13px] ${e.folder ? "font-medium text-(--ln-text)" : "font-[450] text-(--ln-text-header)"}`}>{e.name}</span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-[450] text-(--ln-text-muted)">{e.message}</span>
          <span className="w-8 shrink-0 text-right text-xs font-[450] text-(--ln-text-muted)">{e.age}</span>
        </button>
      ))}
    </>
  );
}

/** A file: its size on the left of a bar (and, for markdown, Preview / Code), copy on the right, then its lines. */
function FileBody({ repo, path, entry }: { repo: Repo; path: string[]; entry: TreeEntry }) {
  const text = fileContent(repo, path, entry);
  const lang = langOf(entry.name);
  const [preview, setPreview] = useState(lang === "markdown");
  const [copied, setCopied] = useState(false);
  const lines = text.split("\n");
  const bytes = new TextEncoder().encode(text).length;
  const size = bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`;
  return (
    <>
      <div className="flex h-10 items-center gap-3 border-t-[0.5px] border-(--ln-card-border) pr-2 pl-4 text-xs font-[450] text-(--ln-text-muted)">
        {lang === "markdown" && (
          <span className="flex gap-0.5">
            {(["Preview", "Code"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={preview === (m === "Preview")}
                onClick={() => setPreview(m === "Preview")}
                className={`h-6 rounded-md px-2 font-medium ${preview === (m === "Preview") ? "bg-(--ln-pill-neutral) text-(--ln-text)" : "hover:text-(--ln-text-header)"}`}
              >
                {m}
              </button>
            ))}
          </span>
        )}
        <span className="ln-tnum">
          {lines.length} {lines.length === 1 ? "line" : "lines"} · {size}
        </span>
        <IconButton
          label={copied ? "Copied" : "Copy file"}
          className="ml-auto size-7"
          onClick={() => {
            navigator.clipboard?.writeText(text).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? <Check /> : <CopyPathIcon size={14} />}
        </IconButton>
      </div>
      <div className="border-t-[0.5px] border-(--ln-card-border)">
        {preview ? (
          <div className="px-8 py-6">
            <Markdown source={text} compact />
          </div>
        ) : (
          <div className="overflow-x-auto py-2">
            {lines.map((l, i) => (
              <div key={i} className="flex min-h-5">
                <span className="ln-mono w-[50px] shrink-0 pr-3 text-right text-xs leading-5 text-(--ln-line-number) select-none">{i + 1}</span>
                <code className="ln-mono min-w-0 flex-1 pr-4 text-xs leading-5 whitespace-pre text-(--ln-syn-text)">
                  <Highlight text={l} lang={lang} />
                </code>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * The code view for a path in the repo: the tree on the left, and on the
 * right what the path is (a folder's entries or a file's contents) under the
 * breadcrumb and its last commit, in one card as the overview's explorer.
 */
export function CodeView({ repo, path }: { repo: Repo; path: string[] }) {
  const trail = walk(repo, path);
  const entry = trail?.at(-1) ?? null;
  return (
    // a hairline under the tab bar, meeting the tree's own on the left, so the two panes read as a frame
    <div className="flex min-h-0 flex-1 border-t-[0.5px] border-(--ln-header-rule)">
      <Sidebar key={repo.slug} repo={repo} path={path} />
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1080px] px-6 pt-4 pb-16">
          <Breadcrumb repo={repo} path={path} />
          <div className="mt-3 overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) shadow-(--ln-main-shadow)">
              <CommitBar repo={repo} entry={entry} />
              {!trail ? (
                <p className="border-t-[0.5px] border-(--ln-card-border) px-4 py-6 text-[13px] text-(--ln-text-muted)">This path doesn’t exist on {repo.defaultBranch}.</p>
              ) : entry?.folder || !entry ? (
                <FolderList repo={repo} path={path} entries={entry?.children ?? repo.tree} />
              ) : (
                <FileBody key={path.join("/")} repo={repo} path={path} entry={entry} />
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
