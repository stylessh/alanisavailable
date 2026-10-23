"use client";

import { useState, type KeyboardEvent } from "react";
import { BranchIcon } from "./code-icons";
import { DIFFS, type Diff } from "./code-data";
import { Menu } from "./diff-conversation";
import { ChevronDownIcon } from "./icons";
import { Check, HEAD, ROW } from "./reviewer-picker";

// The target branch under a diff's title, as a picker: the branch badge with
// a chevron on its right, opening the assignee menu's shape (a 36px search
// row, 32px rows, 12/500 group headers) with the long-lived branches first
// and the repo's other branches after.

const LONG_LIVED = ["main", "release/0.5", "staging", "develop"];

export function BaseBranchPicker({ diff, base, onPick }: { diff: Diff; base: string; onPick: (branch: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  // the repo's other open work, which a diff can be stacked on
  const others = DIFFS.filter((d) => d.repo === diff.repo && d.branch !== diff.branch && d.state !== "merged" && d.state !== "closed").map((d) => d.branch);
  const options = [...LONG_LIVED.map((b) => ({ branch: b, group: "" })), ...others.map((b) => ({ branch: b, group: "Open branches" }))].filter((o) =>
    o.branch.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const close = () => {
    setOpen(false);
    setQ("");
    setActive(0);
  };
  const choose = (branch: string) => {
    onPick(branch);
    close();
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % Math.max(1, options.length));
    } else if (e.key === "Enter" && options[active]) choose(options[active].branch);
  };

  let group: string | null = null;
  return (
    <span className="relative flex shrink-0">
      <button
        type="button"
        aria-label={`Merging into ${base}, change the target branch`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="ln-mono inline-flex h-5 items-center gap-1.5 rounded-[5px] bg-(--ln-pill-neutral) pr-[7px] pl-1.5 text-[11.5px] font-[450] text-(--ln-text-header) hover:bg-(--ln-ghost-hover) aria-expanded:bg-(--ln-ghost-hover)"
      >
        {base}
        <ChevronDownIcon size={8} className="text-(--ln-text-muted)" />
      </button>
      {open && (
        <Menu onClose={close} place="top-full left-0 mt-1 w-[260px] p-0">
          <div className="flex h-9 items-center border-b-[0.5px] border-(--ln-popover-border) pr-[11px] pl-[13.5px]">
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              placeholder="Merge into…"
              className="ln-search min-w-0 flex-1 bg-transparent text-[13px] font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {options.length === 0 && <p className="px-2 py-2 text-[13px] text-(--ln-text-muted)">No branch matches “{q}”</p>}
            {options.map((o, i) => {
              const head = o.group !== group ? (group = o.group) : null;
              return (
                <div key={o.branch}>
                  {head && <div className={HEAD}>{head}</div>}
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={o.branch === base}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o.branch)}
                    className={`${ROW} ${active === i ? "bg-(--ln-menu-hover) text-(--ln-text)" : "text-(--ln-text-header)"}`}
                  >
                    <BranchIcon size={14} className="shrink-0 text-(--ln-text-muted)" />
                    <span className="ln-mono truncate text-xs">{o.branch}</span>
                    {o.branch === "main" && <span className="shrink-0 text-xs text-(--ln-text-muted)">default</span>}
                    <span className="ml-auto flex shrink-0 pr-1">{o.branch === base && <Check />}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </Menu>
      )}
    </span>
  );
}
