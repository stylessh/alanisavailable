"use client";

import type { ReactNode } from "react";
import { IconButton, PageHeader, TabBar } from "./chrome";
import { BookIcon } from "./code-icons";
import { DIFFS, REPOS, type Repo } from "./code-data";
import { DiffStateIcon } from "./glyphs";
import { PlusIcon } from "./icons";
import { ProjectChip, ViewActions } from "./issues-view";
import { useApp } from "./router";

// Repositories, laid out like Linear's Projects list: a row of column
// labels, then one 44px row per repository with its name and description,
// the project it belongs to, its open diffs, main language and last push.
// Columns drop from the right as the window narrows, as Linear's do.

const COLUMNS = "grid grid-cols-[minmax(0,1fr)_250px_72px_112px_64px] max-[1100px]:grid-cols-[minmax(0,1fr)_72px_112px_64px] max-[769px]:grid-cols-[minmax(0,1fr)_72px]";

/** A repository's main language: its color dot and name. */
export function LanguageDot({ repo }: { repo: Repo }) {
  const lang = repo.languages[0];
  return (
    <span className="flex items-center gap-1.5 text-xs font-[450] text-(--ln-text-muted)">
      <span className="size-2 rounded-full" style={{ background: lang.color }} />
      {lang.name}
    </span>
  );
}

function RepoRow({ repo }: { repo: Repo }) {
  const { go } = useApp();
  const open = DIFFS.filter((d) => d.repo === repo.slug && (d.state === "open" || d.state === "draft")).length;
  return (
    <button
      type="button"
      onClick={() => go({ page: "repo", slug: repo.slug })}
      className={`${COLUMNS} group/row relative isolate -mx-2 h-11 w-[calc(100%+16px)] items-center gap-x-4 pr-[26px] pl-[30px] text-left before:absolute before:inset-x-2 before:inset-y-0 before:-z-10 before:rounded-lg hover:before:bg-(--ln-row-hover)`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <BookIcon size={14} className="shrink-0 text-(--ln-text-muted)" />
        <span className="shrink-0 text-[13px] font-medium text-(--ln-text)">{repo.slug}</span>
        <span className="truncate text-[13px] font-[450] text-(--ln-text-muted)">{repo.description}</span>
      </span>
      <span className="flex min-w-0 max-[1100px]:hidden">{repo.project && <ProjectChip project={repo.project} />}</span>
      <span className="flex items-center gap-1.5 text-xs font-[450] text-(--ln-text-muted)">
        {open > 0 ? (
          <>
            <DiffStateIcon state="open" size={14} />
            {open}
          </>
        ) : (
          "–"
        )}
      </span>
      <span className="max-[769px]:hidden">
        <LanguageDot repo={repo} />
      </span>
      <span className="text-right text-xs font-[450] whitespace-nowrap text-(--ln-text-muted) max-[769px]:hidden">
        {repo.updated.replace(" ago", "")}
      </span>
    </button>
  );
}

function ColumnLabel({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <span className={`text-xs font-[450] text-(--ln-text-muted) ${className}`}>{children}</span>;
}

export function ReposView({ title = "Repositories", crumb }: { title?: string; crumb?: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <IconButton label="New repository">
            <PlusIcon size={14} />
          </IconButton>
        }
      >
        {crumb}
        <h1>{title}</h1>
      </PageHeader>
      <TabBar tabs={[{ id: "all", label: "All repositories" }]} value="all" onChange={() => {}} addView>
        <ViewActions />
      </TabBar>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className={`${COLUMNS} h-8 items-center gap-x-4 pr-[18px] pl-[22px]`}>
          <ColumnLabel className="pl-6">Name</ColumnLabel>
          <ColumnLabel className="max-[1100px]:hidden">Project</ColumnLabel>
          <ColumnLabel>Diffs</ColumnLabel>
          <ColumnLabel className="max-[769px]:hidden">Language</ColumnLabel>
          <ColumnLabel className="text-right max-[769px]:hidden">Updated</ColumnLabel>
        </div>
        {REPOS.map((r) => (
          <RepoRow key={r.slug} repo={r} />
        ))}
      </div>
    </div>
  );
}
