"use client";

import { formatMetric, metricTotal, rangeLabel, type Metric, type Range } from "../data";
import { ArrowOutwardIcon, CopyIcon, DownloadIcon, MoreVertIcon } from "../icons";
import { IconButton } from "./button";
import { AreaChart } from "./chart";
import { Menu, MenuItem } from "./menu";

// A metric with its chart (Polar's MetricChartBox), as measured on Home and
// Analytics: a header 32px in from the sides and 24px from the top, holding
// the 18px title, the 48px/350 value and a legend (a 12px blue-500 ring and
// the date range), with two 40px actions that appear on hover; then a 200px
// chart, 16px under it, whose plot runs to the cell's edges while its dates
// keep to the header's 32px.
export function MetricBox({ metric, range, onOpen }: { metric: Metric; range: Range; onOpen?: () => void }) {
  return (
    <div className="group flex flex-col pb-2">
      <div className="flex items-start justify-between gap-6 px-8 pt-6 pb-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg leading-7 text-(--pl-text)">{metric.title}</h3>
          </div>
          <h2 className="text-5xl leading-none font-[350] text-(--pl-text)">
            {formatMetric(metric, metricTotal(metric, range))}
          </h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full border-2 border-(--pl-legend)" />
              <span className="text-sm leading-5 text-(--pl-text-muted)">{rangeLabel(range)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <IconButton label="Open in Analytics" size={40} onClick={onOpen}>
            <ArrowOutwardIcon />
          </IconButton>
          <Menu
            align="end"
            trigger={(t) => (
              <IconButton {...t} label="More" size={40}>
                <MoreVertIcon />
              </IconButton>
            )}
          >
            <MenuItem icon={<DownloadIcon />}>Export</MenuItem>
            <MenuItem icon={<CopyIcon />}>Copy link</MenuItem>
          </Menu>
        </div>
      </div>
      <AreaChart points={metric.points(range)} format={(v) => formatMetric(metric, v)} inset={32} />
    </div>
  );
}

/**
 * Metrics in a bordered two-column grid, each cell ruled on its right and
 * bottom; the first one can span the full width. The grid runs 1px past the
 * frame on the right and bottom, so the last column's and last row's rules
 * are clipped under the frame's own border instead of doubling it.
 */
export function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-(--pl-radius-lg) border border-(--pl-border)">
      <div className="-mr-px -mb-px grid grid-cols-1 lg:grid-cols-2">{children}</div>
    </div>
  );
}

export function MetricCell({ wide, children }: { wide?: boolean; children: React.ReactNode }) {
  return <div className={`flex flex-col border-r border-b border-(--pl-border) ${wide ? "lg:col-span-2" : ""}`}>{children}</div>;
}

/** The gray stat tiles above a table (Orders: Orders, Revenue, Average Order Value) */
export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-(--pl-radius-lg) border border-transparent bg-(--pl-fill)">
      <div className="flex flex-col px-6 pt-6 pb-2">
        <span className="text-base leading-6 text-(--pl-text-muted)">{label}</span>
      </div>
      <div className="px-6 pb-6">
        <h3 className="text-2xl leading-8 text-(--pl-text)">{value}</h3>
      </div>
    </div>
  );
}
