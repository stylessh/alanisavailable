"use client";

import { useId, useState } from "react";
import { ChevronDownIcon, GripIcon, XIcon } from "../icons";

// Things that open and close in place, measured on Home's Customize modal
// (2x frames of the recording, 1px = 0.5 CSS px).

/** A stack of accordion groups, 8px apart; one or many open */
export function Accordion({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-2 ${className}`}>{children}</div>;
}

/**
 * A group: a 36px gray-100 bar with 12px corners, 16px sides, a 14px label
 * and a 16px chevron that flips when open. Its content runs under it with
 * 8px above.
 */
export function AccordionItem({
  title,
  defaultOpen,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const id = useId();
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full cursor-pointer items-center justify-between rounded-xl bg-(--pl-shell) px-4 text-left text-sm leading-5 text-(--pl-text-input) transition-colors hover:bg-(--pl-border)"
      >
        {title}
        <ChevronDownIcon className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={id} hidden={!open} className="flex flex-col pt-2">
        {children}
      </div>
    </div>
  );
}

/**
 * A choice inside a group: a 14px gray-500 title over a 12px gray-500 line,
 * 24px in; hovering lifts it onto gray-50 and darkens the title.
 */
export function OptionRow({
  title,
  description,
  onSelect,
  selected,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  onSelect?: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="group/opt flex w-full cursor-pointer flex-col gap-0.5 rounded-xl px-6 py-2 text-left transition-colors hover:bg-(--pl-subtle)"
    >
      <span
        className={`text-sm leading-5 transition-colors group-hover/opt:text-(--pl-text-strong) ${selected ? "text-(--pl-text-strong)" : "text-(--pl-text-muted)"}`}
      >
        {title}
      </span>
      {description && <span className="text-xs leading-4 text-(--pl-text-muted)">{description}</span>}
    </button>
  );
}

/** A chosen item you can reorder or drop ("Selected" in Customize): 40px gray-100, 12px corners, a grip, the name, a remove */
export function ReorderRow({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <div className="flex h-10 items-center gap-3 rounded-xl bg-(--pl-shell) px-4 text-sm leading-5 text-(--pl-text-strong)">
      <GripIcon className="shrink-0 cursor-grab text-(--pl-text-faint)" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {onRemove && (
        <button type="button" aria-label="Remove" onClick={onRemove} className="cursor-pointer">
          <XIcon />
        </button>
      )}
    </div>
  );
}
