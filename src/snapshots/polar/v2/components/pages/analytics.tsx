"use client";

import { useState } from "react";
import { METRICS, PRODUCTS, TODAY } from "../data";
import { AddIcon, MoreVertIcon } from "../icons";
import { DateRangePicker, type DateRange } from "../ui/calendar";
import { Select } from "../ui/select";
import { MetricBox, MetricCell, MetricGrid } from "../ui/metric";
import { Page, PageAction, Section } from "../ui/page";
import { PopoverGroup } from "../ui/popover";

const INTERVALS = [
  { id: "hour", label: "Hourly" },
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

const PRODUCT_FILTER = [{ id: "all", label: "All products" }, ...PRODUCTS.map((p) => ({ id: p.id, label: p.name }))];

const SECTIONS = [
  {
    title: "Revenue",
    metrics: [METRICS.revenue, METRICS.netRevenue, METRICS.cumulativeRevenue],
  },
  { title: "Orders", metrics: [METRICS.orders, METRICS.conversion] },
  { title: "Subscriptions", metrics: [METRICS.mrr, METRICS.subscriptions] },
];

/** Analytics › Metrics: interval, dates and product over every metric, grouped */
export function MetricsPage() {
  const [interval, setInterval] = useState("day");
  const [product, setProduct] = useState("all");
  const range = "30d";
  // the last 30 days, to today
  const [dates, setDates] = useState<DateRange>(() => ({ from: new Date(TODAY.getTime() - 29 * 86_400_000), to: TODAY }));
  return (
    <Page
      title="Metrics"
      filters={
        <>
          <Select label="Interval" options={INTERVALS} value={interval} onChange={setInterval} />
          <DateRangePicker value={dates} onChange={setDates} />
          <Select label="Product" options={PRODUCT_FILTER} value={product} onChange={setProduct} strong className="w-[226px]" />
        </>
      }
      actions={
        <>
          <PageAction primary label="Add metric">
            <AddIcon />
          </PageAction>
          <PageAction label="More">
            <MoreVertIcon />
          </PageAction>
        </>
      }
    >
      <PopoverGroup>
        <div className="flex flex-col gap-16">
          {SECTIONS.map((s) => (
            <Section key={s.title} title={s.title} large>
              <MetricGrid>
                {s.metrics.map((m, i) => (
                  <MetricCell key={m.id} wide={i === 0 && s.metrics.length % 2 === 1}>
                    <MetricBox metric={m} range={range} />
                  </MetricCell>
                ))}
              </MetricGrid>
            </Section>
          ))}
        </div>
      </PopoverGroup>
    </Page>
  );
}
