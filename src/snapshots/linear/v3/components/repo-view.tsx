"use client";

import { Avatar, Crumb, DetailLayout, IconButton, PageHeader, PanelRow, PanelSection, RefButton, TabBar } from "./chrome";
import { BookIcon, BranchIcon, CommitIcon, FileIcon, LinkIcon, StarIcon } from "./code-icons";
import { DIFFS, PEOPLE, diffKey, findRepo, type Repo } from "./code-data";
import { Markdown } from "./code";
import { TEAM } from "./data";
import { DiffStateIcon } from "./glyphs";
import { AsiaIcon, HeadphonesIcon, MoreIcon } from "./icons";
import { DiffRow } from "./reviews-view";
import { useApp } from "./router";

// A repository, laid out like a Linear project: Overview (the repo's name,
// what it is, its files and README) with a properties panel, and Diffs (its
// diffs, in the Reviews list's rows). Files and the README sit in the cards
// Linear's diff view uses for files.

function ProjectIcon({ repo }: { repo: Repo }) {
  if (!repo.project) return null;
  return repo.project.emoji ? (
    <span className="text-[12px] leading-none">{repo.project.emoji}</span>
  ) : (
    <HeadphonesIcon size={14} className="text-(--ln-project-icon)" />
  );
}

function Files({ repo }: { repo: Repo }) {
  const last = DIFFS.find((d) => d.repo === repo.slug && d.state === "merged");
  return (
    <div className="overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card)">
      <div className="flex h-10 items-center gap-3 border-b-[0.5px] border-(--ln-card-border) px-3 text-xs font-[450] text-(--ln-text-muted)">
        <span className="flex items-center gap-1.5 text-(--ln-text-header)">
          <BranchIcon size={14} />
          <span className="ln-mono">{repo.defaultBranch}</span>
        </span>
        <span>{repo.branches} branches</span>
        <span className="flex items-center gap-1">
          <CommitIcon size={14} />
          {repo.commits} commits
        </span>
        {last && (
          <span className="ml-auto flex min-w-0 items-center gap-1.5">
            <Avatar who={last.author} size={16} />
            <span className="truncate">{last.title}</span>
          </span>
        )}
      </div>
      {repo.tree.map((e) => (
        <div
          key={e.name}
          className="flex h-9 items-center gap-2.5 border-b-[0.5px] border-(--ln-card-border) px-3 last:border-b-0 hover:bg-(--ln-row-hover)"
        >
          <FileIcon kind={e.kind} />
          <span className={`w-44 shrink-0 truncate text-[13px] ${e.folder ? "font-medium text-(--ln-text)" : "font-[450] text-(--ln-text-header)"}`}>
            {e.name}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-[450] text-(--ln-text-muted)">{e.message}</span>
          <span className="shrink-0 text-xs font-[450] text-(--ln-text-muted)">{e.age}</span>
        </div>
      ))}
    </div>
  );
}

function Readme({ repo }: { repo: Repo }) {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card)">
      <div className="flex h-10 items-center gap-2 border-b-[0.5px] border-(--ln-card-border) px-3">
        <FileIcon kind="markdown" />
        <span className="text-xs font-[450] text-(--ln-text-header)">README.md</span>
      </div>
      <div className="px-6 py-5">
        <Markdown source={repo.readme} compact />
      </div>
    </div>
  );
}

function Panel({ repo }: { repo: Repo }) {
  const { go } = useApp();
  const open = DIFFS.filter((d) => d.repo === repo.slug && d.state !== "merged" && d.state !== "closed");
  return (
    <>
      <PanelSection label="Properties">
        <PanelRow icon={<BranchIcon size={14} />}>
          <span className="ln-mono text-xs">{repo.defaultBranch}</span>
        </PanelRow>
        <PanelRow icon={<BookIcon size={14} />}>{repo.visibility}</PanelRow>
        <PanelRow icon={<AsiaIcon size={14} style={{ color: TEAM.color }} />}>{TEAM.name}</PanelRow>
        {repo.project && <PanelRow icon={<ProjectIcon repo={repo} />}>{repo.project.name}</PanelRow>}
      </PanelSection>
      <PanelSection label="Languages">
        <div className="mt-1 flex h-1.5 overflow-hidden rounded-full">
          {repo.languages.map((l) => (
            <span key={l.name} style={{ width: `${l.share * 100}%`, background: l.color }} />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {repo.languages.map((l) => (
            <span key={l.name} className="flex items-center gap-1.5 text-xs font-[450] text-(--ln-text-header)">
              <span className="size-2 rounded-full" style={{ background: l.color }} />
              {l.name}
              <span className="text-(--ln-text-muted)">{Math.round(l.share * 100)}%</span>
            </span>
          ))}
        </div>
      </PanelSection>
      <PanelSection label={`Open diffs ${open.length}`}>
        {open.length === 0 && <PanelRow muted>No open diffs</PanelRow>}
        {open.map((d) => (
          <button key={diffKey(d)} type="button" className="block w-full text-left" onClick={() => go({ page: "diff", key: diffKey(d) })}>
            <PanelRow icon={<DiffStateIcon state={d.state} size={14} />}>{d.title}</PanelRow>
          </button>
        ))}
      </PanelSection>
      <PanelSection label="Contributors">
        <div className="flex gap-1.5">
          {[PEOPLE.maya, PEOPLE.priya, PEOPLE.jordan, PEOPLE.sam].map((p) => (
            <Avatar key={p.name} who={p} size={22} />
          ))}
        </div>
      </PanelSection>
    </>
  );
}

export function RepoView({ slug, rootCrumb }: { slug: string; rootCrumb: { label: string; onClick: () => void } }) {
  const { route, go } = useApp();
  const repo = findRepo(slug);
  if (!repo) return null;
  const tab = route.page === "repo" ? (route.tab ?? "overview") : "overview";
  const diffs = DIFFS.filter((d) => d.repo === slug);
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <>
            <RefButton icon={<BranchIcon size={14} />}>{repo.defaultBranch}</RefButton>
            <IconButton label="Copy clone URL">
              <LinkIcon size={14} />
            </IconButton>
          </>
        }
      >
        <Crumb onClick={rootCrumb.onClick}>{rootCrumb.label}</Crumb>
        <BookIcon size={14} className="mr-2 shrink-0 text-(--ln-text-muted)" />
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
      />
      {tab === "overview" ? (
        <DetailLayout panel={<Panel repo={repo} />}>
          <BookIcon size={24} className="mb-4 text-(--ln-text-muted)" />
          <h2 className="text-2xl leading-8 font-semibold text-(--ln-text)">{repo.slug}</h2>
          <p className="mt-1.5 text-[15px] leading-6 font-[450] text-(--ln-text-muted)">{repo.description}</p>
          <div className="mt-7">
            <Files repo={repo} />
            <Readme repo={repo} />
          </div>
        </DetailLayout>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {diffs.map((d) => (
            <DiffRow key={diffKey(d)} diff={d} />
          ))}
        </div>
      )}
    </div>
  );
}
