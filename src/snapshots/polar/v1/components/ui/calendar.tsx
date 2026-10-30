"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightLucideIcon } from "../icons";
import { DateRangeField } from "./field";
import { Floating, useDismiss, useFloating } from "./popover";

// Analytics' date range (react-day-picker in a shadcn Popover), from 2x
// frames of the recording:
// popover  white, a gray-200 border, 7.6px corners, shadow-md, 288px wide,
//          16px padded around a 12px-padded calendar
// caption  "October 2026" in 14px/500, centered between two 28px outline
//          buttons (half strength until hovered, blue-600 when focused)
// grid     36px cells; weekday initials in 12.8px gray-500; rows 8px apart
// days     14px black; outside the month gray-500; in the range blue-600
//          with white text, the range's row ends rounded 7.6px; outside days
//          in the range at half strength with dark text
export type DateRange = { from: Date; to: Date };

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const weeks = Math.ceil((first.getDay() + last.getDate()) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      return date;
    }),
  );
}

export function Calendar({
  value,
  onChange,
  defaultMonth,
}: {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  defaultMonth?: Date;
}) {
  const [month, setMonth] = useState(() => {
    const m = defaultMonth ?? value?.to ?? new Date();
    return new Date(m.getFullYear(), m.getMonth(), 1);
  });
  // the first click starts a range; the second ends it
  const [anchor, setAnchor] = useState<Date | null>(null);
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const inRange = (d: Date) => !!value && day(d) >= day(value.from) && day(d) <= day(value.to);
  const nav =
    "flex size-7 cursor-pointer items-center justify-center rounded-[7.6px] border border-(--pl-border) bg-(--pl-surface) opacity-50 transition-[opacity,background-color,color] hover:opacity-100 focus-visible:bg-(--pl-accent) focus-visible:text-(--pl-accent-fg) focus-visible:opacity-100 focus-visible:outline-none";

  return (
    <div className="p-3 text-(--pl-popover-text)">
      <div className="relative flex items-center justify-center pt-1">
        <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className={`${nav} absolute left-1`}>
          <ChevronLeftIcon />
        </button>
        <span className="text-sm leading-5 font-medium" aria-live="polite">
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button type="button" aria-label="Next month" onClick={() => shift(1)} className={`${nav} absolute right-1`}>
          <ChevronRightLucideIcon />
        </button>
      </div>
      <table role="grid" className="mt-4 w-full border-collapse">
        <thead>
          <tr className="flex">
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col" className="w-9 text-[0.8rem] leading-5 font-medium text-(--pl-text-muted)">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week, wi) => (
            <tr key={wi} className="mt-2 flex w-full">
              {week.map((d) => {
                const outside = d.getMonth() !== month.getMonth();
                const sel = inRange(d);
                const prev = new Date(d);
                prev.setDate(d.getDate() - 1);
                const next = new Date(d);
                next.setDate(d.getDate() + 1);
                const roundL = sel && (d.getDay() === 0 || !inRange(prev));
                const roundR = sel && (d.getDay() === 6 || !inRange(next));
                return (
                  <td key={d.toISOString()} className="relative size-9 p-0 text-center text-sm">
                    <button
                      type="button"
                      aria-pressed={sel}
                      onClick={() => {
                        if (!anchor) {
                          setAnchor(d);
                          onChange?.({ from: d, to: d });
                        } else {
                          const [from, to] = day(d) < day(anchor) ? [d, anchor] : [anchor, d];
                          setAnchor(null);
                          onChange?.({ from, to });
                        }
                      }}
                      className={`size-9 cursor-pointer leading-5 font-normal transition-colors ${roundL ? "rounded-l-[7.6px]" : ""} ${
                        roundR ? "rounded-r-[7.6px]" : ""
                      } ${
                        sel
                          ? outside
                            ? "bg-(--pl-accent-soft) text-(--pl-text-strong)"
                            : "bg-(--pl-accent) text-(--pl-accent-fg)"
                          : `rounded-[7.6px] hover:bg-(--pl-accent) hover:text-(--pl-accent-fg) ${
                              outside ? "text-(--pl-text-muted)" : "text-(--pl-text-strong)"
                            }`
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The quick ranges under the field's label: 42px rows, 14px gray-500, gray-100 on hover */
export function DatePresets({ presets, onPick }: { presets: string[]; onPick: (preset: string) => void }) {
  return (
    <div className="flex flex-col">
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className="flex h-[42px] cursor-pointer items-center rounded-[9.6px] px-4 text-left text-sm leading-5 text-(--pl-text-muted) transition-colors hover:bg-(--pl-shell) hover:text-(--pl-text-strong)"
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export const DATE_PRESETS = [
  "Today",
  "Yesterday",
  "This Week",
  "This Month",
  "Last Month",
  "Last 3 Months",
  "This Year",
  "Last Year",
  "All Time",
];

/** The popover both pickers share: white, bordered, 7.6px corners, shadow-md */
export function DatePopover({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <div
      className={`w-72 rounded-[7.6px] border border-(--pl-border) bg-(--pl-popover) shadow-(--pl-shadow-md) ${padded ? "p-4" : "p-1"}`}
    >
      {children}
    </div>
  );
}

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * The date range field with both of its pickers: the calendar glyph opens a
 * calendar, the label opens the quick ranges.
 */
export function DateRangePicker({
  value,
  onChange,
  className = "",
}: {
  value: DateRange;
  onChange: (range: DateRange, preset?: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState<"calendar" | "presets" | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const { triggerRef, floatingRef, style, side } = useFloating<HTMLDivElement>(!!open);
  useDismiss(!!open, () => setOpen(null), [triggerRef, floatingRef]);

  return (
    <>
      <DateRangeField
        triggerRef={triggerRef}
        label={label ?? `${fmt(value.from)} – ${fmt(value.to)}`}
        expanded={!!open}
        onClick={() => setOpen((o) => (o === "calendar" ? null : "calendar"))}
        onLabelClick={() => setOpen((o) => (o === "presets" ? null : "presets"))}
        className={className}
      />
      {open && (
        <Floating floatingRef={floatingRef} style={style} side={side}>
          {open === "calendar" ? (
            <DatePopover>
              <Calendar
                value={value}
                onChange={(r) => {
                  setLabel(null);
                  onChange(r);
                }}
              />
            </DatePopover>
          ) : (
            <DatePopover padded={false}>
              <DatePresets
                presets={DATE_PRESETS}
                onPick={(p) => {
                  setLabel(p);
                  onChange(value, p);
                  setOpen(null);
                }}
              />
            </DatePopover>
          )}
        </Floating>
      )}
    </>
  );
}
