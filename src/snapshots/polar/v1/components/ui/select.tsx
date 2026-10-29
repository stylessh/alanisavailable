"use client";

import { useId, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "../icons";
import { FIELD } from "./field";
import { Floating, useDismiss, useFloating, useListNavigation, type Align } from "./popover";

// Polar's Select (orbit Select over Radix), measured on Products' status filter:
// trigger  a field, 40px (or 32px), 12px sides, 8px between value and a 16px
//          chevron at half strength; the border darkens to gray-300 on hover;
//          an empty value reads in gray-500
// list     white, 12px corners, no border, shadow-md, 4px padding, 4px under
//          the trigger and at least as wide as it
// option   32px, 14px gray-950 text, 32px in from the left where the selected
//          one's tick sits, 9.6px corners; the highlighted one turns blue-600
//          with white text
export type SelectOption<T extends string> = { id: T; label: React.ReactNode; disabled?: boolean };

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
}: {
  options: SelectOption<T>[];
  value: T;
  active: number;
  onPick: (value: T) => void;
  onHover?: (index: number) => void;
  listRef?: React.RefObject<HTMLDivElement | null>;
  id?: string;
  label: string;
}) {
  let index = -1;
  return (
    <div
      ref={listRef}
      id={id}
      role="listbox"
      aria-label={label}
      className="max-h-96 min-w-32 overflow-y-auto rounded-xl bg-(--pl-popover) p-1 text-(--pl-popover-text) shadow-(--pl-shadow-md)"
    >
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
            onPointerMove={() => !o.disabled && onHover?.(i)}
            className={`relative flex h-8 w-full cursor-pointer items-center rounded-[9.6px] py-1.5 pr-2 pl-8 text-sm leading-5 whitespace-nowrap outline-none select-none aria-disabled:pointer-events-none aria-disabled:opacity-50 ${
              highlighted ? "bg-(--pl-accent) text-(--pl-accent-fg)" : ""
            }`}
          >
            <span className="absolute left-2 flex size-3.5 items-center justify-center">{o.id === value && <CheckIcon />}</span>
            {o.label}
          </div>
        );
      })}
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
  const [open, setOpen] = useState(false);
  const id = useId();
  const { triggerRef, floatingRef, style, side } = useFloating<HTMLButtonElement>(open, { align, matchWidth: true });
  const selectable = options.filter((o) => !o.disabled);
  const { active, setActive, onKeyDown } = useListNavigation(
    open,
    floatingRef,
    "option",
    selectable.findIndex((o) => o.id === value),
  );
  useDismiss(open, () => setOpen(false), [triggerRef, floatingRef]);

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
        aria-label={label}
        aria-invalid={error || undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setOpen(true);
          } else if (open) onKeyDown(e);
        }}
        className={`flex cursor-pointer items-center justify-between gap-x-2 px-3 text-sm leading-5 text-(--pl-text-strong) transition-colors outline-none hover:border-(--pl-rule) focus-visible:border-(--pl-field-focus) focus-visible:ring-[3px] focus-visible:ring-(--pl-field-ring) disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-(--pl-error) ${
          size === "md" ? "h-10" : "h-8"
        } ${strong ? "font-medium tracking-[0.01em]" : ""} ${FIELD} ${className}`}
      >
        <span className={`truncate ${empty ? "text-(--pl-text-muted)" : ""}`}>{current?.label ?? placeholder}</span>
        <ChevronDownIcon className={`shrink-0 opacity-50 ${empty ? "text-(--pl-text-muted)" : ""}`} />
      </button>
      {open && (
        <Floating floatingRef={floatingRef} style={style} side={side} onKeyDown={onKeyDown}>
          <SelectList
            id={id}
            label={label}
            options={options}
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
