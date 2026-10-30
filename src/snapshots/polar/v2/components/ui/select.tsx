"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "../icons";
import { FIELD, useFieldProps } from "./field";
import {
  Floating,
  POPOVER,
  PopoverEmpty,
  PopoverSearch,
  RowEnd,
  SEARCH_FROM,
  matches,
  RowIcon,
  rowClass,
  useDismiss,
  useFloating,
  useListNavigation,
  usePopoverOpen,
  type Align,
} from "./popover";

// Polar's Select (orbit Select over Radix), measured on Products' status filter:
// trigger  a field, 40px (or 32px), 12px sides, 8px between value and a 16px
//          chevron at half strength; gray-50 on hover, as a secondary button;
//          an empty value reads in gray-500
//          the trigger shows the chosen option's glyph too
// list     the shared popover (POPOVER), 4px under the trigger and at least
//          as wide as it
// option   the shared row: an optional 16px glyph, the label, and a check on
//          the right for the chosen one; gray-100 under the pointer or keys
// search   with SEARCH_FROM options or more, a search on top, focused as it
//          opens; typing narrows the options and highlights the first match
export type SelectOption<T extends string> = {
  id: T;
  label: React.ReactNode;
  /** a 16px glyph before the label (a status light, a theme's icon) */
  icon?: React.ReactNode;
  disabled?: boolean;
};

/** The open list on its own, for showing a select's list in place (the design-system page) */
export function SelectList<T extends string>({
  options,
  value,
  active,
  onPick,
  onHover,
  listRef,
  id,
  label,
  search,
}: {
  options: SelectOption<T>[];
  value: T;
  active: number;
  onPick: (value: T) => void;
  onHover?: (index: number) => void;
  listRef?: React.RefObject<HTMLDivElement | null>;
  id?: string;
  label: string;
  /** the search row on top; the options then scroll under it */
  search?: React.ReactNode;
}) {
  let index = -1;
  // when some options have a glyph, the rest keep its slot so every label lines up
  const glyphs = options.some((o) => o.icon);
  const list = (
    <div
      ref={listRef}
      id={id}
      role="listbox"
      aria-label={label}
      className={search ? "min-h-0 overflow-y-auto p-1" : `max-h-96 overflow-y-auto ${POPOVER}`}
    >
      {search && options.length === 0 && <PopoverEmpty />}
      {options.map((o) => {
        if (!o.disabled) index++;
        const i = index;
        const highlighted = !o.disabled && i === active;
        return (
          <div
            key={o.id}
            role="option"
            aria-selected={o.id === value}
            aria-disabled={o.disabled || undefined}
            onClick={() => !o.disabled && onPick(o.id)}
            // a click mustn't take focus from the search
            onMouseDown={(e) => e.preventDefault()}
            onPointerMove={() => !o.disabled && onHover?.(i)}
            className={rowClass(highlighted)}
          >
            {glyphs && <RowIcon>{o.icon}</RowIcon>}
            {o.label}
            <RowEnd checked={o.id === value} />
          </div>
        );
      })}
    </div>
  );
  if (!search) return list;
  return (
    <div className={`flex max-h-96 flex-col overflow-hidden ${POPOVER} p-0!`}>
      {search}
      {list}
    </div>
  );
}

export function Select<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder,
  className = "",
  size = "md",
  strong,
  error,
  disabled,
  align = "start",
}: {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** shown in gray-500 while nothing is chosen ("Select country") */
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
  /** "All products" is set a step heavier (500, 0.01em) than other selects */
  strong?: boolean;
  error?: boolean;
  disabled?: boolean;
  align?: Align;
}) {
  const { open, setOpen, onPointerEnter, instant } = usePopoverOpen();
  const id = useId();
  const { triggerRef, floatingRef, style, side } = useFloating<HTMLButtonElement>(open, { align, matchWidth: true });
  const searchable = options.length >= SEARCH_FROM;
  const [query, setQuery] = useState("");
  // each opening starts unfiltered
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery("");
  }
  const shown = query.trim() ? options.filter((o) => matches(typeof o.label === "string" ? o.label : o.id, query)) : options;
  const selectable = shown.filter((o) => !o.disabled);
  const { active, setActive, onKeyDown } = useListNavigation(
    open,
    floatingRef,
    "option",
    selectable.findIndex((o) => o.id === value),
  );
  useDismiss(open, () => setOpen(false), [triggerRef, floatingRef]);

  // inside a Field: its label, help and error describe this trigger
  const wired = useFieldProps({});
  const current = options.find((o) => o.id === value);
  const empty = !current;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        id={wired.id}
        aria-label={label}
        aria-describedby={wired["aria-describedby"]}
        aria-invalid={error || wired["aria-invalid"] || undefined}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onPointerEnter={onPointerEnter}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setOpen(true);
          } else if (open) onKeyDown(e);
        }}
        className={`flex cursor-pointer items-center justify-between gap-x-2 px-3 text-sm leading-5 text-(--pl-text) transition-colors hover:bg-(--pl-subtle) disabled:cursor-not-allowed disabled:opacity-50 ${
          size === "md" ? "h-10" : "h-8"
        } ${strong ? "font-medium tracking-[0.01em]" : ""} ${FIELD} ${className}`}
      >
        <span className={`flex min-w-0 items-center gap-2 ${empty ? "text-(--pl-text-muted)" : ""}`}>
          {current?.icon && <RowIcon>{current.icon}</RowIcon>}
          <span className="truncate">{current?.label ?? placeholder}</span>
        </span>
        <ChevronDownIcon className={`shrink-0 opacity-50 ${empty ? "text-(--pl-text-muted)" : ""}`} />
      </button>
      {open && (
        <Floating floatingRef={floatingRef} style={style} side={side} instant={instant} onKeyDown={onKeyDown}>
          <SelectList
            id={id}
            label={label}
            options={shown}
            search={
              searchable && (
                <PopoverSearch
                  value={query}
                  onChange={(q) => {
                    setQuery(q);
                    setActive(0);
                  }}
                />
              )
            }
            value={value}
            active={active}
            onHover={setActive}
            onPick={(v) => {
              onChange(v);
              setOpen(false);
              triggerRef.current?.focus();
            }}
          />
        </Floating>
      )}
    </>
  );
}
