"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** A palette entry. `icon` sits before the title: a glyph, or a program's badge. */
export type Command = { id: string; group: string; title: string; shortcut?: string; icon?: React.ReactNode; run: () => void };

/** Rex's command palette (⌘K or ⇧⌘P): every action, searchable, on the window's glass. It appears and goes at once. */
export function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return commands.filter((c) => words.every((w) => `${c.group} ${c.title}`.toLowerCase().includes(w)));
  }, [commands, query]);
  const selected = Math.min(index, Math.max(0, matches.length - 1));

  // Arrowing through the list keeps the selection in view, with its group's
  // heading when it's the first of its group.
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    list.current?.children[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") setIndex((selected + 1) % Math.max(1, matches.length));
    else if (e.key === "ArrowUp") setIndex((selected - 1 + matches.length) % Math.max(1, matches.length));
    else if (e.key === "Enter") matches[selected]?.run();
    else return;
    e.preventDefault();
  };

  return (
    // The layer catches clicks outside the panel (they close it).
    <div className="absolute inset-0" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      {/* centered in the window, whatever its size (full screen included) */}
      <div
        role="dialog"
        aria-label="Command palette"
        className="rex-ui absolute top-[52px] left-1/2 -ml-[230px] w-[460px] overflow-hidden rounded-[12px]"
        style={{
          background: "var(--rex-beam), var(--rex-popover-bg)",
          backdropFilter: "blur(30px) saturate(1.8)",
          WebkitBackdropFilter: "blur(30px) saturate(1.8)",
          boxShadow: "var(--rex-popover-shadow)",
        }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search actions…"
          aria-label="Search actions"
          className="h-[40px] w-full border-b border-[var(--rex-popover-rule)] bg-transparent px-[14px] text-[13px] text-[var(--rex-ink)] outline-none placeholder:text-[var(--rex-ink-faint)]"
        />
        <ul ref={list} role="listbox" className="max-h-[330px] overflow-y-auto p-[5px]">
          {matches.map((c, i) => {
            const header = c.group !== matches[i - 1]?.group;
            return (
              <li key={c.id}>
                {header && (
                  <div className="px-[9px] pt-[7px] pb-[3px] text-[10.5px] font-semibold text-[var(--rex-ink-muted)]">{c.group}</div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === selected}
                  tabIndex={-1}
                  onPointerMove={() => setIndex(i)}
                  onClick={c.run}
                  className="flex h-[28px] w-full cursor-default items-center justify-between rounded-[7px] px-[9px] text-left text-[12.5px] text-[var(--rex-ink)]"
                  style={{ background: i === selected ? "var(--rex-hover)" : undefined }}
                >
                  <span className="flex min-w-0 items-center">
                    {/* every title starts at the same x, clear of the widest badge stack */}
                    <span className="flex w-[40px] shrink-0 items-center text-[var(--rex-ink-muted)]">
                      {c.icon && <span className="flex min-w-[20px] justify-center">{c.icon}</span>}
                    </span>
                    <span className="truncate">{c.title}</span>
                  </span>
                  {c.shortcut && (
                    <kbd className="ml-[12px] shrink-0 font-sans text-[11.5px] tracking-[0.06em] text-[var(--rex-ink-muted)]">{c.shortcut}</kbd>
                  )}
                </button>
              </li>
            );
          })}
          {!matches.length && <li className="px-[9px] py-[8px] text-[12.5px] text-[var(--rex-ink-muted)]">No matching actions</li>}
        </ul>
      </div>
    </div>
  );
}
