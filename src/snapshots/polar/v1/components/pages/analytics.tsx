"use client";

import { useState } from "react";
import { METRICS, PRODUCTS, rangeLabel } from "../data";
import { AddIcon, MoreVertIcon } from "../icons";
import { IconButton } from "../ui/button";
import { DateRangeField } from "../ui/field";
import { Select } from "../ui/select";
import { MetricBox, MetricCell, MetricGrid } from "../ui/metric";
import { Page, Section } from "../ui/page";

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
  return (
    <Page
      title="Metrics"
      actions={
        // the filters and the two buttons sit 24px apart here, not the usual 16
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select label="Interval" options={INTERVALS} value={interval} onChange={setInterval} />
            <DateRangeField label={rangeLabel(range).replace(/, \d{4}$/, "")} />
            <Select label="Product" options={PRODUCT_FILTER} value={product} onChange={setProduct} strong className="w-[226px]" />
          </div>
          <div className="flex items-center gap-2">
            <IconButton label="Add metric" variant="secondary">
              <AddIcon />
            </IconButton>
            <IconButton label="More" variant="secondary">
              <MoreVertIcon />
            </IconButton>
          </div>
        </div>
      }
    >
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
    </Page>
  );
}
