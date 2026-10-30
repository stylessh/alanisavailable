"use client";

import { useId, useMemo, useState } from "react";
import { CheckIcon, SearchIcon } from "../icons";
import { FIELD } from "./field";
import { Floating, useDismiss, useFloating, useListNavigation } from "./popover";

// Polar's searchable multi-select (ProductSelect: "All products", a checkout
// link's products, a discount picker), over cmdk in a shadcn Popover:
// trigger  a 40px field, 14px/500 label, half-strength chevron, gray-300
//          border on hover
// panel    white, a gray-200 border, 7.6px corners, shadow-md, 288px (or the
//          trigger's width if wider)
// search   a 44px row ruled underneath: a 16px glyph at half strength, then
//          the 14px query
// group    4px padded; its first row is the group's name (500) with "Select
//          all N" at 70% on the right, then one row per item with a tick
//          when chosen. The keyboard row turns blue-600 with white text.
export type ComboboxGroup = { id: string; label: string; items: { id: string; label: string }[] };

export function ComboboxPanel({
  groups,
  selected,
  onToggle,
  onToggleGroup,
  placeholder = "Search…",
  query,
  onQuery,
  active,
  onHover,
  listRef,
  listId,
  autoFocus = true,
  empty = "No results",
}: {
  groups: ComboboxGroup[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleGroup: (group: ComboboxGroup) => void;
  placeholder?: string;
  query: string;
  onQuery: (q: string) => void;
  active: number;
  onHover?: (i: number) => void;
  listRef?: React.RefObject<HTMLDivElement | null>;
  listId?: string;
  /** the search takes focus when the panel opens */
  autoFocus?: boolean;
  empty?: string;
}) {
  let index = -1;
  const row = (on: boolean) =>
    `relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-xs px-2 text-sm leading-5 outline-none select-none ${
      on ? "bg-(--pl-accent) text-(--pl-accent-fg)" : "text-(--pl-text-strong)"
    }`;
  return (
    <div
      ref={listRef}
      className="w-full min-w-72 overflow-hidden rounded-[7.6px] border border-(--pl-border) bg-(--pl-popover) text-(--pl-popover-text) shadow-(--pl-shadow-md)"
    >
      <div className="flex items-center border-b border-(--pl-border) px-3">
        <SearchIcon className="mr-2 shrink-0 opacity-50" />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex h-11 w-full bg-transparent py-3 text-sm leading-5 outline-none placeholder:text-(--pl-text-muted)"
        />
      </div>
      <div id={listId} role="listbox" aria-multiselectable className="max-h-[300px] overflow-x-hidden overflow-y-auto">
        {groups.every((g) => g.items.length === 0) && <p className="py-6 text-center text-sm">{empty}</p>}
        {groups.map((g, gi) => {
          if (!g.items.length) return null;
          const all = g.items.every((i) => selected.includes(i.id));
          index++;
          const head = index;
          return (
            <div key={g.id}>
              {gi > 0 && <div className="-mx-1 h-px bg-(--pl-border)" />}
              <div className="p-1">
                <div
                  role="option"
                  aria-selected={all}
                  onClick={() => onToggleGroup(g)}
                  onPointerMove={() => onHover?.(head)}
                  className={`${row(active === head)} py-2`}
                >
                  <span className="font-medium">{g.label}</span>
                  <span className="text-xs leading-4 opacity-70">{all ? "Deselect all" : `Select all ${g.items.length}`}</span>
                </div>
                {g.items.map((item) => {
                  index++;
                  const i = index;
                  const on = selected.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      role="option"
                      aria-selected={on}
                      onClick={() => onToggle(item.id)}
                      onPointerMove={() => onHover?.(i)}
                      className={`${row(active === i)} py-1.5`}
                    >
                      {item.label}
                      <CheckIcon className={on ? "visible" : "invisible"} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Combobox({
  groups,
  selected,
  onChange,
  label,
  allLabel = "All items",
  placeholder,
  className = "",
}: {
  groups: ComboboxGroup[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label: string;
  /** what the trigger says when nothing is chosen ("All products") */
  allLabel?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const { triggerRef, floatingRef, style, side } = useFloating<HTMLButtonElement>(open, { matchWidth: true });
  const { active, setActive, onKeyDown } = useListNavigation(open, floatingRef, "option", 0);
  useDismiss(open, () => setOpen(false), [triggerRef, floatingRef]);

  const filtered = useMemo(
    () => groups.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase())) })),
    [groups, query],
  );
  const names = groups.flatMap((g) => g.items).filter((i) => selected.includes(i.id));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const toggleGroup = (g: ComboboxGroup) => {
    const ids = g.items.map((i) => i.id);
    const all = ids.every((id) => selected.includes(id));
    onChange(all ? selected.filter((s) => !ids.includes(s)) : [...new Set([...selected, ...ids])]);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 cursor-pointer items-center justify-between gap-x-2 px-3 py-2 text-sm leading-5 font-medium text-(--pl-text-strong) transition-colors outline-none hover:border-(--pl-rule) focus-visible:border-(--pl-field-focus) focus-visible:ring-[3px] focus-visible:ring-(--pl-field-ring) ${FIELD} ${className}`}
      >
        <span className="truncate">{names.length === 0 ? allLabel : names.map((n) => n.label).join(", ")}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-2 shrink-0 opacity-50">
          <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" />
        </svg>
      </button>
      {open && (
        <Floating floatingRef={floatingRef} style={style} side={side} onKeyDown={onKeyDown}>
          <ComboboxPanel
            groups={filtered}
            selected={selected}
            onToggle={toggle}
            onToggleGroup={toggleGroup}
            placeholder={placeholder}
            query={query}
            onQuery={(q) => {
              setQuery(q);
              setActive(0);
            }}
            active={active}
            onHover={setActive}
            listId={listId}
          />
        </Floating>
      )}
    </>
  );
}
