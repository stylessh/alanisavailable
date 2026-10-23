"use client";

import { useState, useSyncExternalStore } from "react";
import { IconButton } from "./chrome";
import type { DiffFile } from "./code-data";
import { Menu } from "./diff-conversation";
import { DirectionButton, OptionRow, Select, Switch } from "./diff-list";

// How a diff reads, after the Display options popover on Linear's diff and
// session pages (a recording of the live app, Oct 2026): Split | Unified on
// top; Structural highlighting, Wrap lines and Show changed lines per file;
// then Grouping and Ordering; Hide generated and Hide reviewed;
// and the code theme. It's a reader's preference, kept in the browser and
// shared by every diff and session page.

export type DiffOptions = {
  layout: "split" | "unified";
  highlight: boolean;
  wrap: boolean;
  counts: boolean;
  grouping: "none" | "directory" | "change";
  ordering: "path" | "size";
  descending: boolean;
  hideGenerated: boolean;
  hideReviewed: boolean;
};

const DEFAULTS: DiffOptions = {
  layout: "unified",
  highlight: true,
  wrap: false,
  counts: true,
  grouping: "none",
  ordering: "path",
  descending: false,
  hideGenerated: false,
  hideReviewed: false,
};

const KEY = "linear:diff-options";
const listeners = new Set<() => void>();
let current: DiffOptions | null = null;

function read(): DiffOptions {
  if (current) return current;
  try {
    current = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    current = DEFAULTS;
  }
  return current!;
}

function write(o: DiffOptions) {
  current = o;
  try {
    localStorage.setItem(KEY, JSON.stringify(o));
  } catch {
    // blocked storage keeps the choice for this visit only
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useDiffOptions(): [DiffOptions, (patch: Partial<DiffOptions>) => void] {
  const o = useSyncExternalStore(subscribe, read, () => DEFAULTS);
  return [o, (patch) => write({ ...read(), ...patch })];
}

/** Lockfiles, snapshots and build output: what "Hide generated" hides. */
export const generated = (path: string) => /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$|\.snap$|(^|\/)(dist|generated)\//.test(path);

const CHANGE_GROUP = { added: "New", deleted: "Deleted", renamed: "Renamed" } as const;

/** The files as the options order and filter them, each with the heading it starts under when grouped. */
export function arrange(files: DiffFile[], o: DiffOptions, reviewed: Set<string>) {
  const shown = files.filter((f) => !(o.hideGenerated && generated(f.path)) && !(o.hideReviewed && reviewed.has(f.path)));
  const key = (f: DiffFile) => (o.ordering === "size" ? -(f.additions + f.deletions) : 0);
  const sorted = [...shown].sort((a, b) => key(a) - key(b) || a.path.localeCompare(b.path));
  if (o.descending) sorted.reverse();
  const group = (f: DiffFile) =>
    o.grouping === "directory" ? f.path.slice(0, f.path.lastIndexOf("/") + 1) || "/" : o.grouping === "change" ? (f.change ? CHANGE_GROUP[f.change] : "Modified") : "";
  const groups = o.grouping === "none" ? sorted : [...sorted].sort((a, b) => group(a).localeCompare(group(b)));
  return groups.map((f, i) => ({ file: f, heading: o.grouping !== "none" && (i === 0 || group(groups[i - 1]) !== group(f)) ? group(f) : undefined }));
}

function SplitGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1.75" y="2.25" width="10.5" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M7 2.25v9.5M3.75 7h1.5M8.75 7h1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function UnifiedGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1.75" y="2.25" width="10.5" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5.5 5.25h3M7 3.75v3M5.5 9h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

/** The sliders glyph the Files bar opens Display options with. */
export function SlidersIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1.75 4h10.5M1.75 10h10.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="5" cy="4" r="1.6" fill="var(--ln-card)" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="9" cy="10" r="1.6" fill="var(--ln-card)" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function Panel({ o, set }: { o: DiffOptions; set: (patch: Partial<DiffOptions>) => void }) {
  const side = (id: DiffOptions["layout"], label: string, glyph: React.ReactNode) => (
    <button
      type="button"
      aria-pressed={o.layout === id}
      onClick={() => set({ layout: id })}
      className={`ln-pill flex h-[27px] flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium ${o.layout === id ? "text-(--ln-text)" : "text-(--ln-text-muted)"}`}
    >
      {glyph}
      {label}
    </button>
  );
  const toggle = (label: string, on: boolean, patch: (v: boolean) => Partial<DiffOptions>) => (
    <OptionRow label={label}>
      <Switch label={label} on={on} onChange={(v) => set(patch(v))} />
    </OptionRow>
  );
  return (
    <div className="w-[299px] pt-4 pb-2">
      <div className="ln-switch mx-[18px] mb-[11.5px] flex gap-1">
        {side("split", "Split", <SplitGlyph />)}
        {side("unified", "Unified", <UnifiedGlyph />)}
      </div>
      <div className="px-4">
        {toggle("Structural highlighting", o.highlight, (highlight) => ({ highlight }))}
        {toggle("Wrap lines", o.wrap, (wrap) => ({ wrap }))}
        {toggle("Show changed lines per file", o.counts, (counts) => ({ counts }))}
      </div>
      <div className="my-2 border-t-[0.5px] border-(--ln-popover-border)" />
      <div className="px-4">
        <OptionRow label="Grouping">
          <Select
            value={o.grouping}
            options={[
              { id: "none", label: "No grouping" },
              { id: "directory", label: "Directory" },
              { id: "change", label: "Change type" },
            ]}
            onChange={(grouping) => set({ grouping })}
          />
        </OptionRow>
        <OptionRow label="Ordering" action={<DirectionButton kind="order" label="Reverse order" on={o.descending} onClick={() => set({ descending: !o.descending })} />}>
          <Select
            value={o.ordering}
            options={[
              { id: "path", label: "Path" },
              { id: "size", label: "Lines changed" },
            ]}
            onChange={(ordering) => set({ ordering })}
          />
        </OptionRow>
        {toggle("Hide generated", o.hideGenerated, (hideGenerated) => ({ hideGenerated }))}
        {toggle("Hide reviewed", o.hideReviewed, (hideReviewed) => ({ hideReviewed }))}
      </div>
      <div className="my-2 border-t-[0.5px] border-(--ln-popover-border)" />
      <div className="px-4">
        <OptionRow label="Code theme">
          <span className="pr-1 text-xs font-medium text-(--ln-text)">Linear</span>
        </OptionRow>
      </div>
    </div>
  );
}

/** The Files bar's sliders button and the popover it opens. */
export function DiffOptionsButton() {
  const [open, setOpen] = useState(false);
  const [o, set] = useDiffOptions();
  return (
    <span className="relative flex">
      <IconButton label="Display options" className="size-6 text-(--ln-text-muted)" onClick={() => setOpen(!open)}>
        <SlidersIcon />
      </IconButton>
      {open && (
        <Menu onClose={() => setOpen(false)} place="top-full right-0 mt-2 p-0">
          <Panel o={o} set={set} />
        </Menu>
      )}
    </span>
  );
}
