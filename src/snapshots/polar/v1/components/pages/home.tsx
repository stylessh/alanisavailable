"use client";

import { useState } from "react";
import { BALANCE, METRICS, MONTHLY_REVENUE, RANGES, TIMELINE, usd, type Range } from "../data";
import { BenefitIcon, ChevronRightIcon, KeyboardArrowUpIcon, PersonIcon, RemoveIcon, SalesIcon, TuneIcon } from "../icons";
import { useApp } from "../router";
import { Button } from "../ui/button";
import { MetricBox, MetricCell, MetricGrid } from "../ui/metric";
import { PageCard } from "../ui/page";
import { Segmented } from "../ui/segmented";

// Home's widgets row (components/Widgets): three bordered cells, each at most
// 384px tall, with an 18px title row 24px in and a scrolling body under it.
function Widget({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex max-h-96 flex-col gap-6 overflow-hidden border-r border-b border-(--pl-border)">
      <div className="flex shrink-0 items-center justify-between px-6 pt-6">
        <h3 className="text-lg leading-7 text-(--pl-text)">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="pl-scroll flex flex-1 flex-col overflow-y-auto px-6">{children}</div>
    </div>
  );
}

function RevenueWidget() {
  const max = Math.max(1, ...MONTHLY_REVENUE.map((m) => m.value));
  return (
    <Widget title="Revenue" action={<span className="text-(--pl-text-muted)">Last 3 Months</span>}>
      <div className="grid flex-1 grid-cols-3 gap-4 pb-6">
        {MONTHLY_REVENUE.map((m, i, all) => {
          const previous = all[i - 1]?.value;
          const up = previous !== undefined && m.value > previous;
          return (
            <div key={m.month} className="flex flex-col gap-y-2">
              <div
                className="pl-hatch relative min-h-48 flex-1 overflow-hidden rounded-[9.6px]"
                title={`${usd(m.value)} in ${m.month}`}
              >
                <div
                  className={`absolute bottom-0 w-full rounded-[9.6px] ${i === all.length - 1 ? "bg-(--pl-bar-current)" : "bg-(--pl-bar)"}`}
                  style={{ height: `${(m.value / max) * 100}%` }}
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm leading-5">{m.month}</span>
                <div className="flex items-center justify-between gap-x-2">
                  <span className="text-sm leading-5 text-(--pl-text-muted)">{usd(m.value)}</span>
                  {previous === undefined ? (
                    <span className="flex items-center rounded-xs bg-(--pl-shell) p-0.5 text-xs text-(--pl-text-muted)">
                      <RemoveIcon size={12} />
                    </span>
                  ) : (
                    <span
                      className={`flex items-center rounded-xs p-0.5 text-xs ${up ? "bg-(--pl-success-bg) text-(--pl-success)" : "bg-(--pl-danger-bg) text-(--pl-danger)"}`}
                    >
                      <KeyboardArrowUpIcon size={12} className={up ? "" : "rotate-180"} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

const TIMELINE_ICONS = {
  benefit: BenefitIcon,
  order: SalesIcon,
  customer: PersonIcon,
};

function TimelineWidget() {
  const [scope, setScope] = useState<"system" | "all">("system");
  return (
    <Widget
      title="Timeline"
      action={
        <Segmented
          label="Events"
          size="sm"
          value={scope}
          onChange={setScope}
          options={[
            { id: "system", label: "System" },
            { id: "all", label: "All" },
          ]}
        />
      }
    >
      <div className="flex flex-col pb-6">
        <div className="-mx-3 flex flex-col gap-1">
          {TIMELINE.map((e, i) =>
            e.kind === "collapsed" ? (
              <button
                key={i}
                type="button"
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-(--pl-subtle)"
              >
                <span className="flex w-8 justify-center text-(--pl-text-muted)">
                  <ChevronRightIcon />
                </span>
                <p className="text-sm leading-[21px] text-(--pl-text-muted)">
                  {e.count} collapsed {e.count === 1 ? "event" : "events"}
                </p>
              </button>
            ) : (
              <a
                key={i}
                href="#"
                onClick={(ev) => ev.preventDefault()}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-(--pl-subtle)"
              >
                {(() => {
                  const Icon = TIMELINE_ICONS[e.icon];
                  return (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--pl-shell) text-(--pl-text-strong)">
                      <Icon size={14} />
                    </div>
                  );
                })()}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm leading-[21px] font-medium text-(--pl-text-strong)">{e.title}</p>
                    <p className="shrink-0 text-xs leading-[16.5px] text-(--pl-text-muted)">{e.ago}</p>
                  </div>
                  <p className="truncate text-xs leading-[16.5px] text-(--pl-text-muted)">{e.detail}</p>
                </div>
              </a>
            ),
          )}
        </div>
      </div>
    </Widget>
  );
}

function BalanceWidget() {
  return (
    <Widget title="Available balance" action={<h2 className="text-lg leading-7 text-(--pl-text)">{usd(BALANCE, 2)}</h2>}>
      <div className="mb-6 flex min-h-[283px] flex-1 flex-col items-center justify-center gap-2 rounded-[9.6px] bg-(--pl-subtle) p-8 text-center">
        <h3 className="text-base leading-6 text-(--pl-text)">No payouts yet</h3>
        <p className="text-sm leading-5 text-(--pl-text-muted)">You may only withdraw funds above $10.</p>
      </div>
    </Widget>
  );
}

/**
 * Home ("Overview"): a time range and Customize over the key metrics, Revenue
 * across the top, then Revenue by month, the Timeline and the balance.
 */
export function HomePage() {
  const { go } = useApp();
  const [range, setRange] = useState<Range>("30d");
  const open = () => go({ section: "analytics", sub: "metrics" });
  return (
    <PageCard className="px-8">
      <div className="flex flex-col gap-16 pt-8 pb-8">
        <div className="flex flex-col gap-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl leading-8 font-medium text-(--pl-text)">Overview</h2>
            <div className="flex flex-wrap items-center gap-4">
              <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
              <Button variant="secondary" size="sm" icon={<TuneIcon />}>
                Customize
              </Button>
            </div>
          </header>
          <MetricGrid>
            <MetricCell wide>
              <MetricBox metric={METRICS.revenue} range={range} onOpen={open} />
            </MetricCell>
            {[METRICS.mrr, METRICS.subscriptions, METRICS.orders, METRICS.conversion].map((m) => (
              <MetricCell key={m.id}>
                <MetricBox metric={m} range={range} onOpen={open} />
              </MetricCell>
            ))}
          </MetricGrid>
        </div>
        <div className="overflow-hidden rounded-2xl border border-(--pl-border)">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <RevenueWidget />
            <TimelineWidget />
            <BalanceWidget />
          </div>
        </div>
      </div>
    </PageCard>
  );
}
