"use client";

import { useId, useMemo, useState } from "react";
import { FIELD } from "./field";
import {
  Floating,
  POPOVER,
  PopoverEmpty,
  PopoverLabel,
  PopoverSearch,
  RowEnd,
  RowIcon,
  rowClass,
  useDismiss,
  matches,
  useFloating,
  useListNavigation,
  usePopoverOpen,
} from "./popover";

// Polar's searchable multi-select (ProductSelect: "All products", a checkout
// link's products, a discount picker), over cmdk in a shadcn Popover:
// trigger  a 40px field, 14px/500 label, half-strength chevron, gray-50 on hover
// panel    the shared popover, 288px (or the trigger's width if wider)
// search   a 36px row over a hairline: a muted 16px glyph, then the query
// group    a small muted label with "Select all N" (or "Deselect all") as
//          quiet text on its right, then the shared rows: an optional
//          glyph, the label, a check on the right when chosen; gray-100
//          under the pointer or keys
export type ComboboxGroup = { id: string; label: string; items: { id: string; label: string; icon?: React.ReactNode }[] };

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
  // when some items have a glyph, the rest keep its slot so every label lines up
  const glyphs = groups.some((g) => g.items.some((i) => i.icon));
  return (
    <div ref={listRef} className={`w-full overflow-hidden ${POPOVER} min-w-72! p-0!`}>
      <PopoverSearch value={query} onChange={onQuery} placeholder={placeholder} autoFocus={autoFocus} />
      <div id={listId} role="listbox" aria-multiselectable className="max-h-[300px] overflow-x-hidden overflow-y-auto p-1">
        {groups.every((g) => g.items.length === 0) && <PopoverEmpty>{empty}</PopoverEmpty>}
        {groups.map((g) => {
          if (!g.items.length) return null;
          const all = g.items.every((i) => selected.includes(i.id));
          return (
            <div key={g.id} role="group" aria-label={g.label}>
              <PopoverLabel
                end={
                  <button
                    type="button"
                    onClick={() => onToggleGroup(g)}
                    className="cursor-pointer text-xs leading-4 font-normal text-(--pl-text-muted) hover:text-(--pl-text)"
                  >
                    {all ? "Deselect all" : `Select all ${g.items.length}`}
                  </button>
                }
              >
                {g.label}
              </PopoverLabel>
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
                    className={rowClass(active === i)}
                  >
                    {glyphs && <RowIcon>{item.icon}</RowIcon>}
                    <span className="truncate">{item.label}</span>
                    <RowEnd checked={on} />
                  </div>
                );
              })}
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
  const { open, setOpen, onPointerEnter, instant } = usePopoverOpen();
  const [query, setQuery] = useState("");
  const listId = useId();
  const { triggerRef, floatingRef, style, side } = useFloating<HTMLButtonElement>(open, { matchWidth: true });
  const { active, setActive, onKeyDown } = useListNavigation(open, floatingRef, "option", 0);
  useDismiss(open, () => setOpen(false), [triggerRef, floatingRef]);

  const filtered = useMemo(
    () => groups.map((g) => ({ ...g, items: g.items.filter((i) => matches(i.label, query)) })),
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
        onClick={() => setOpen(!open)}
        onPointerEnter={onPointerEnter}
        className={`flex h-10 cursor-pointer items-center justify-between gap-x-2 px-3 py-2 text-sm leading-5 font-medium text-(--pl-text) transition-colors hover:bg-(--pl-subtle) ${FIELD} ${className}`}
      >
        <span className="truncate">{names.length === 0 ? allLabel : names.map((n) => n.label).join(", ")}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-2 shrink-0 opacity-50">
          <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" />
        </svg>
      </button>
      {open && (
        <Floating floatingRef={floatingRef} style={style} side={side} instant={instant} onKeyDown={onKeyDown}>
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
