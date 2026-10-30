"use client";

import { ChevronLeftIcon, ChevronRightLucideIcon, ChevronsLeftIcon, ChevronsRightIcon, SortDownIcon } from "../icons";
import { Select } from "./select";

// Polar's DataTable: a 16px-cornered gray-200 frame, a 48px gray-50 header
// row, and 16px cells set in 14px/21px with a gray-200 rule between rows.
// Sortable headers are 550 black buttons with a 16px arrow; plain ones keep
// the same weight, and "muted" ones (Finance) drop to 500 gray-500.
export type Column<Row> = {
  key: string;
  header: string;
  /** column width as a share of the table (Orders: 200 / 250 / 250 / 175 / 100) */
  size: number;
  sorted?: boolean;
  muted?: boolean;
  align?: "left" | "right";
  cell: (row: Row) => React.ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = "No Results",
  loading,
  fixed,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  empty?: string;
  /** the body is one 96px row reading "Loading...", as while Polar fetches */
  loading?: boolean;
  /** sizes are pixels and the table may run past its frame (Finance), rather than shares of the width */
  fixed?: boolean;
}) {
  const total = columns.reduce((sum, c) => sum + c.size, 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-(--pl-border)">
      <div className="overflow-x-auto">
        <table
          className={`table-fixed border-collapse text-sm ${fixed ? "" : "w-full min-w-[720px]"}`}
          style={fixed ? { width: total } : undefined}
        >
          <colgroup>
            {columns.map((c) => (
              <col key={c.key} style={{ width: fixed ? c.size : `${(c.size / total) * 100}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="h-12 border-b border-(--pl-border) bg-(--pl-subtle)">
              {columns.map((c) => (
                <th key={c.key} scope="col" className="px-4 font-normal">
                  <div className={`flex items-center ${c.align === "right" ? "justify-end" : ""}`}>
                    {c.sorted !== undefined ? (
                      <button
                        type="button"
                        className="flex h-10 cursor-pointer items-center gap-2 rounded-full leading-5 font-[550] tracking-[0.01em] text-(--pl-text-strong)"
                      >
                        {c.header}
                        {c.sorted && <SortDownIcon />}
                      </button>
                    ) : (
                      <span
                        className={`leading-5 ${c.muted ? "font-medium text-(--pl-text-muted)" : "font-[550] text-(--pl-text-strong)"}`}
                      >
                        {c.header}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading || rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-24 p-4 text-center leading-5 text-(--pl-text)">
                  {loading ? "Loading..." : empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick && (() => onRowClick(row))}
                  className={`border-b border-(--pl-border) transition-colors last:border-b-0 ${onRowClick ? "cursor-pointer hover:bg-(--pl-subtle)" : ""}`}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`p-4 leading-[21px] text-(--pl-text-strong) ${c.align === "right" ? "text-right" : ""}`}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PAGE_SIZES = ["10", "20", "50", "100"].map((n) => ({ id: n, label: n }));

/** Under a table: rows per page, a count, and four round page buttons */
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
    <div className="flex flex-wrap items-center justify-end gap-x-8 gap-y-2 px-2">
      <div className="flex items-center gap-2">
        <p className="text-sm leading-5 text-(--pl-text-soft)">Rows per page</p>
        <Select
          label="Rows per page"
          options={PAGE_SIZES}
          value={pageSize}
          onChange={onPageSize}
          size="sm"
          className="w-[75px]"
        />
      </div>
      <div className="w-40 text-sm leading-5 text-(--pl-text-soft)">
        {single ? `Viewing all ${count} records` : `Viewing 1–${pageSize} of ${count}`}
      </div>
      <div className="flex items-center gap-2">
        {nav.map(({ label, Icon }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            disabled={single}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-(--pl-shell) text-(--pl-text-strong) hover:bg-(--pl-shell) disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Icon />
          </button>
        ))}
      </div>
    </div>
  );
}
