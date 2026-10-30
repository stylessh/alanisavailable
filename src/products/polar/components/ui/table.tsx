"use client";

import { useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightLucideIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
} from "../icons";
import { formatDateTime, formatWhen } from "../data";
import { IconButton } from "./button";
import { Inset } from "./card";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./menu";
import { PopoverGroup } from "./popover";
import { Select } from "./select";

// Polar's DataTable, as a card inside a card: the frame (16px corners, no
// border, just the tint) is gray-50 like the header row it holds, a 48px
// row of 550 black labels ("muted" ones, on Finance, 500 gray-500); under
// it the body is a white card of its own, raised with the contained shadow
// (shadow-sm) like a control on a track. Its corners follow the radius
// scale's nesting rule, a step (4px) less than the frame's for the 4px
// of tint between them: 16px around 12px.
// Cells are 16px, 14px/21px, a gray-200 rule between rows.
//
// A column that says what it sorts or filters by gets a header that opens a
// menu: two ways to order it, named for what they do ("Newest first"), and
// its values to filter by, each with how many rows have it, ticked several
// at once. The header shows what's applied: a chevron for the order, a
// count of values for a filter (a muted 16px circle, a step darker than the
// header's hover so it shows on it too); untouched, a faint up-down chevron (a
// select's) shows on hover, so it never reads as an order.
// The headers are one popover group: with one open, hovering another opens it.
export type Column<Row> = {
  key: string;
  header: string;
  /** column width as a share of the table (Orders: 200 / 250 / 250 / 175 / 100) */
  size: number;
  muted?: boolean;
  align?: "left" | "right";
  cell: (row: Row) => React.ReactNode;
  /** what it orders by; with it, the header can sort */
  sortBy?: (row: Row) => string | number;
  /** the two orders' names, ascending first ("Oldest first", "Newest first"); A to Z by default */
  sortLabels?: [string, string];
  /** each row's value to filter on, and how it reads; with it, the header lists the values */
  filterBy?: (row: Row) => { value: string; label: string };
};

export type Sort = { key: string; dir: "asc" | "desc" };

/**
 * The rows a table shows: filtered by every column's ticked values, then
 * ordered. Kept outside the table when the page needs the result too (a
 * count, totals); a table without one keeps its own.
 */
export function useTableView<Row>(columns: Column<Row>[], rows: Row[], initial?: Sort) {
  const [sort, setSort] = useState<Sort | null>(initial ?? null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const shown = useMemo(() => {
    const active = columns.filter((c) => c.filterBy && filters[c.key]?.length);
    const kept = rows.filter((r) => active.every((c) => filters[c.key].includes(c.filterBy!(r).value)));
    const by = columns.find((c) => c.key === sort?.key)?.sortBy;
    if (!sort || !by) return kept;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...kept].sort((a, b) => {
      const x = by(a);
      const y = by(b);
      return sign * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y)));
    });
  }, [columns, rows, filters, sort]);
  return { rows: shown, sort, setSort, filters, setFilters };
}

export type TableView<Row> = ReturnType<typeof useTableView<Row>>;

/** A column's header: its menu when it sorts or filters, the label alone when not */
function Header<Row>({ column: c, rows, view }: { column: Column<Row>; rows: Row[]; view: TableView<Row> }) {
  const label = c.muted ? "font-medium text-(--pl-text-muted)" : "font-[550] tracking-[0.01em] text-(--pl-text)";
  if (!c.sortBy && !c.filterBy) return <span className={`leading-5 ${label}`}>{c.header}</span>;

  const dir = view.sort?.key === c.key ? view.sort.dir : null;
  const ticked = view.filters[c.key] ?? [];
  // the values present, in the order they first appear, and how many rows have each
  const values = new Map<string, { label: string; count: number }>();
  if (c.filterBy)
    for (const r of rows) {
      const { value, label } = c.filterBy(r);
      const v = values.get(value);
      if (v) v.count++;
      else values.set(value, { label, count: 1 });
    }
  const toggle = (value: string) =>
    view.setFilters((f) => {
      const now = f[c.key] ?? [];
      return { ...f, [c.key]: now.includes(value) ? now.filter((v) => v !== value) : [...now, value] };
    });
  const [asc, desc] = c.sortLabels ?? ["A to Z", "Z to A"];

  return (
    <Menu
      align={c.align === "right" ? "end" : "start"}
      trigger={(t) => (
        <button
          {...t}
          type="button"
          className={`group/h flex h-8 cursor-pointer items-center gap-1.5 rounded-(--pl-radius-sm) px-2 leading-5 transition-colors hover:bg-(--pl-ghost-hover) aria-expanded:bg-(--pl-ghost-hover) ${
            c.align === "right" ? "-mr-2" : "-ml-2"
          } ${label}`}
        >
          {c.header}
          {ticked.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-(--pl-rule) px-1 text-[10px] leading-none font-medium text-(--pl-text-secondary) tabular-nums">
              {ticked.length}
            </span>
          )}
          {dir ? (
            <span className="text-(--pl-text-muted)">
              {dir === "asc" ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
            </span>
          ) : (
            <ChevronsUpDownIcon
              size={14}
              className="text-(--pl-text-faint) opacity-0 transition-opacity group-hover/h:opacity-100 group-aria-expanded/h:opacity-100"
            />
          )}
        </button>
      )}
    >
      {c.sortBy && (
        <>
          <MenuLabel>Sort</MenuLabel>
          <MenuItem checked={dir === "asc"} onSelect={() => view.setSort({ key: c.key, dir: "asc" })}>
            {asc}
          </MenuItem>
          <MenuItem checked={dir === "desc"} onSelect={() => view.setSort({ key: c.key, dir: "desc" })}>
            {desc}
          </MenuItem>
        </>
      )}
      {c.sortBy && c.filterBy && <MenuSeparator />}
      {c.filterBy && (
        <>
          <MenuLabel
            end={
              ticked.length > 0 && (
                <button
                  type="button"
                  onClick={() => view.setFilters((f) => ({ ...f, [c.key]: [] }))}
                  className="cursor-pointer text-(--pl-text-muted) transition-colors hover:text-(--pl-text)"
                >
                  Clear
                </button>
              )
            }
          >
            Filter
          </MenuLabel>
          {[...values].map(([value, v]) => (
            <MenuItem
              key={value}
              keepOpen
              checked={ticked.includes(value)}
              end={<span className="text-xs text-(--pl-text-muted) tabular-nums">{v.count}</span>}
              onSelect={() => toggle(value)}
            >
              {v.label}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  view: outside,
  defaultSort,
  empty = "No Results",
  loading,
  fixed,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  /** the page's own view (useTableView), when it needs the filtered rows too */
  view?: TableView<Row>;
  /** how a table without its own view starts ordered */
  defaultSort?: Sort;
  empty?: string;
  /** the body is one 96px row reading "Loading...", as while Polar fetches */
  loading?: boolean;
  /** sizes are pixels and the table may run past its frame (Finance), rather than shares of the width */
  fixed?: boolean;
}) {
  const own = useTableView(columns, rows, defaultSort);
  const view = outside ?? own;
  const total = columns.reduce((sum, c) => sum + c.size, 0);
  // the header and the body are two tables (the body has to be a box of its
  // own), given the same columns and the same 4px inset, so they line up
  const cols = (
    <colgroup>
      {columns.map((c) => (
        <col key={c.key} style={{ width: fixed ? c.size : `${(c.size / total) * 100}%` }} />
      ))}
    </colgroup>
  );
  const table = `w-full table-fixed border-collapse text-sm`;
  const filtered = Object.values(view.filters).some((v) => v.length);
  return (
    <div className="overflow-hidden rounded-(--pl-radius-lg) bg-(--pl-subtle)">
      {/* one scroller for both, so a wide table (Finance) moves as one */}
      <div className="overflow-x-auto">
        {/* at least the columns' width (fixed) or 720px, and the frame's whole width when there's more room */}
        <div className="w-full px-1 pb-1" style={{ minWidth: fixed ? total + 8 : 720 }}>
          <PopoverGroup>
            <table className={table}>
              {cols}
              <thead>
                <tr className="h-12">
                  {columns.map((c) => (
                    <th key={c.key} scope="col" className="px-4 font-normal">
                      <div className={`flex items-center ${c.align === "right" ? "justify-end" : ""}`}>
                        <Header column={c} rows={rows} view={view} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </PopoverGroup>
          <Inset>
            <table className={table}>
              {cols}
              <tbody>
                {loading || view.rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-24 p-4 text-center leading-5 text-(--pl-text)">
                      {loading ? "Loading..." : filtered ? "Nothing matches these filters" : empty}
                    </td>
                  </tr>
                ) : (
                  view.rows.map((row) => (
                    <tr
                      key={rowKey(row)}
                      onClick={onRowClick && (() => onRowClick(row))}
                      className={`border-b border-(--pl-border) transition-colors last:border-b-0 ${onRowClick ? "cursor-pointer hover:bg-(--pl-subtle)" : ""}`}
                    >
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={`p-4 leading-[21px] text-(--pl-text) ${c.align === "right" ? "text-right" : ""}`}
                        >
                          {c.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Inset>
        </div>
      </div>
    </div>
  );
}

/** A date in a cell, said naturally ("Yesterday, 9:41 AM"), the whole of it on hover */
export function TableDate({ date }: { date: Date }) {
  return (
    <time dateTime={date.toISOString()} title={formatDateTime(date)} className="whitespace-nowrap">
      {formatWhen(date)}
    </time>
  );
}

const PAGE_SIZES = ["10", "20", "50", "100"].map((n) => ({ id: n, label: n }));

/**
 * Under a table, on three lines of sight: rows per page on the left, under
 * the table's edge; the four round page buttons (secondary, 32px) in the
 * middle; how many are showing on the right.
 */
export function Pagination({
  count,
  pageSize,
  onPageSize,
}: {
  count: number;
  pageSize: string;
  onPageSize: (size: string) => void;
}) {
  const single = count <= Number(pageSize);
  const nav = [
    { label: "Go to first page", Icon: ChevronsLeftIcon },
    { label: "Go to previous page", Icon: ChevronLeftIcon },
    { label: "Go to next page", Icon: ChevronRightLucideIcon },
    { label: "Go to last page", Icon: ChevronsRightIcon },
  ];
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4">
      <div className="flex items-center gap-2 justify-self-start">
        <p className="text-sm leading-5 text-(--pl-text-secondary)">Rows per page</p>
        <Select
          label="Rows per page"
          options={PAGE_SIZES}
          value={pageSize}
          onChange={onPageSize}
          size="sm"
          className="w-[75px]"
        />
      </div>
      <nav aria-label="Pages" className="flex items-center gap-2">
        {nav.map(({ label, Icon }) => (
          <IconButton key={label} label={label} variant="secondary" disabled={single}>
            <Icon />
          </IconButton>
        ))}
      </nav>
      <p className="justify-self-end text-right text-sm leading-5 text-(--pl-text-secondary)">
        {single ? `Viewing all ${count} records` : `Viewing 1–${pageSize} of ${count}`}
      </p>
    </div>
  );
}
