"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightLucideIcon } from "../icons";
import { DateRangeField } from "./field";
import { Floating, POPOVER, RowEnd, rowClass, useDismiss, useFloating, usePopoverOpen } from "./popover";

// Analytics' date range (react-day-picker in a shadcn Popover), from 2x
// frames of the recording:
// popover  the shared popover (POPOVER), 288px wide, around a 12px-padded calendar
// caption  "October 2026" in 14px/500, centered between two 28px ghost
//          arrows, muted until hovered onto gray-100
// grid     36px cells; weekday initials in 12.8px gray-500; rows 8px apart
// days     grayscale, like the rest of the popovers: the range's first and
//          last days filled with the text color under white numbers, the
//          days between on a gray-100 band whose row ends round 8px; outside
//          the month gray-500; gray-100 under the pointer
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
    "flex size-7 cursor-pointer items-center justify-center rounded-(--pl-radius-sm) text-(--pl-text-muted) transition-colors hover:bg-(--pl-highlight) hover:text-(--pl-text)";

  return (
    <div className="p-3 text-(--pl-text)">
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
                const end = !!value && (day(d) === day(value.from) || day(d) === day(value.to));
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
                      className={`size-9 cursor-pointer leading-5 font-normal transition-colors ${roundL ? "rounded-l-(--pl-radius-sm)" : ""} ${
                        roundR ? "rounded-r-(--pl-radius-sm)" : ""
                      } ${
                        end
                          ? "rounded-(--pl-radius-sm) bg-(--pl-primary) text-(--pl-primary-fg)"
                          : sel
                            ? `bg-(--pl-highlight) ${outside ? "text-(--pl-text-muted)" : "text-(--pl-text)"}`
                            : `rounded-(--pl-radius-sm) hover:bg-(--pl-highlight) ${
                                outside ? "text-(--pl-text-muted)" : "text-(--pl-text)"
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

/** The quick ranges under the field's label: the shared rows, a check on the one in use */
export function DatePresets({
  presets,
  current,
  onPick,
}: {
  presets: string[];
  current?: string | null;
  onPick: (preset: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="flex flex-col" role="listbox" aria-label="Quick ranges" onPointerLeave={() => setHover(null)}>
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          role="option"
          aria-selected={p === current}
          onClick={() => onPick(p)}
          onPointerMove={() => setHover(p)}
          className={rowClass(hover === p)}
        >
          {p}
          <RowEnd checked={p === current} />
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

/** The popover both pickers share: the shared popover, 288px wide */
export function DatePopover({ children }: { children: React.ReactNode }) {
  return <div className={`w-72 ${POPOVER}`}>{children}</div>;
}

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * The date range field with both of its pickers: the calendar glyph opens a
 * calendar, the label opens the quick ranges. The two halves are a group of
 * their own: with one open, hovering the other swaps the panel at once.
 */
export function DateRangePicker({
  value,
  onChange,
  preset = null,
  className = "",
}: {
  value: DateRange;
  onChange: (range: DateRange, preset?: string) => void;
  /** a quick range to start on, its name shown instead of the dates ("All Time") */
  preset?: string | null;
  className?: string;
}) {
  const pop = usePopoverOpen();
  const [mode, setMode] = useState<"calendar" | "presets">("calendar");
  const open = pop.open ? mode : null;
  const [label, setLabel] = useState<string | null>(preset);
  const { triggerRef, floatingRef, style, side } = useFloating<HTMLDivElement>(pop.open);
  useDismiss(pop.open, () => pop.setOpen(false), [triggerRef, floatingRef]);
  const toggle = (m: typeof mode) => {
    setMode(m);
    pop.setOpen(!(pop.open && mode === m));
  };
  const hover = (m: typeof mode) => (e: React.PointerEvent<HTMLElement>) => {
    if (pop.open) setMode(m);
    else if (pop.live) {
      setMode(m);
      pop.onPointerEnter(e);
    }
  };

  return (
    <>
      <DateRangeField
        triggerRef={triggerRef}
        label={label ?? `${fmt(value.from)} – ${fmt(value.to)}`}
        expanded={!!open}
        onClick={() => toggle("calendar")}
        onLabelClick={() => toggle("presets")}
        onPointerEnter={hover("calendar")}
        onLabelPointerEnter={hover("presets")}
        className={className}
      />
      {open && (
        <Floating floatingRef={floatingRef} style={style} side={side} instant={pop.instant}>
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
            <DatePopover>
              <DatePresets
                presets={DATE_PRESETS}
                current={label}
                onPick={(p) => {
                  setLabel(p);
                  onChange(value, p);
                  pop.setOpen(false);
                }}
              />
            </DatePopover>
          )}
        </Floating>
      )}
    </>
  );
}
