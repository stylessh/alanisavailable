"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { BranchIcon } from "./code-icons";
import { DIFFS, type Repo } from "./code-data";
import { Menu } from "./diff-conversation";
import { DiffStateIcon } from "./glyphs";
import { ChevronDownIcon } from "./icons";
import { Check, HEAD, ROW } from "./reviewer-picker";

// The repo's branch switcher, shared by the overview's branch bar and the
// code view's file tree: the branch in a raised pill, opening the default
// branch and every open diff's branch.

/** A raised pill button, as Linear's toolbars use. */
function Pill({ children, onClick, expanded }: { children: ReactNode; onClick?: () => void; expanded?: boolean }) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onClick}
      className="ln-pill flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header)"
    >
      {children}
    </button>
  );
}

export function BranchPicker({ repo, branch, onBranch }: { repo: Repo; branch: string; onBranch: (b: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const all = [
    { name: repo.defaultBranch, diff: undefined as (typeof DIFFS)[number] | undefined },
    ...DIFFS.filter((d) => d.repo === repo.slug && d.state !== "merged" && d.state !== "closed").map((d) => ({ name: d.branch, diff: d })),
  ];
  const shown = all.filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase()));
  const close = () => {
    setOpen(false);
    setQ("");
    setActive(0);
  };
  const pick = (name: string) => {
    onBranch(name);
    close();
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % Math.max(1, shown.length));
    } else if (e.key === "Enter" && shown[active]) pick(shown[active].name);
  };
  return (
    // shrinks with its container, the branch name truncating, so a long branch never pushes past a narrow column
    <div className="relative max-w-full min-w-0">
      <Pill expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        <BranchIcon size={14} className="shrink-0" />
        <span className="ln-mono max-w-56 min-w-0 truncate font-[450]">{branch}</span>
        <ChevronDownIcon size={8} className="shrink-0 text-(--ln-text-muted)" />
      </Pill>
      {open && (
        // the assignee menu's shape: a 36px search row on a hairline, then the branches, the open one checked
        <Menu onClose={close} place="top-full left-0 mt-1.5 w-[320px] p-0">
          <div className="flex h-9 items-center border-b-[0.5px] border-(--ln-popover-border) pr-[11px] pl-[13.5px]">
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              placeholder="Switch branch…"
              className="ln-search min-w-0 flex-1 bg-transparent text-[13px] font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {shown.length === 0 && <p className="px-2 py-2 text-[13px] text-(--ln-text-muted)">No branch matches “{q}”</p>}
            {shown.map((b, i) => (
              <div key={b.name}>
                {/* the open diffs' branches under their own header, after the default */}
                {b.diff && !shown[i - 1]?.diff && <div className={HEAD}>Open diffs</div>}
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={b.name === branch}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(b.name)}
                  className={`${ROW} ${active === i ? "bg-(--ln-menu-hover) text-(--ln-text)" : "text-(--ln-text-header)"}`}
                >
                  {b.diff ? <DiffStateIcon state={b.diff.state} size={14} /> : <BranchIcon size={14} className="shrink-0 text-(--ln-text-muted)" />}
                  <span className="ln-mono min-w-0 truncate text-xs">{b.name}</span>
                  {b.name === repo.defaultBranch && <span className="shrink-0 text-xs text-(--ln-text-muted)">default</span>}
                  <span className="ml-auto flex shrink-0 items-center gap-2 pr-1">
                    {b.diff && <span className="text-xs text-(--ln-text-muted)">#{b.diff.number}</span>}
                    {b.name === branch && <Check />}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </Menu>
      )}
    </div>
  );
}
