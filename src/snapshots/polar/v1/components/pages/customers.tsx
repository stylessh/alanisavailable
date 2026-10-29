"use client";

import { useState } from "react";
import { CUSTOMERS, NEW_CUSTOMERS, RANGES, usd, type Customer, type Range } from "../data";
import { AddIcon, ArrowDownwardIcon, CoinsIcon, FilterIcon, MoreVertIcon, SearchMaterialIcon, ShieldCheckIcon } from "../icons";
import { IconButton } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { BarChart } from "../ui/chart";
import { EmptyState, PageCard } from "../ui/page";
import { Segmented } from "../ui/segmented";

// Customers is a master–detail page: a 320px list card beside the detail card,
// 8px apart.

function CustomerList({ selected, onSelect }: { selected?: string; onSelect: (c: Customer) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const customers = CUSTOMERS.filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  return (
    <PageCard className="w-80 flex-none max-lg:hidden">
      <div className="flex items-center justify-between gap-6 border-b border-(--pl-border) p-4">
        <span className="text-base leading-6 text-(--pl-text)">Customers</span>
        <div className="flex items-center gap-4">
          <IconButton label="Filter" size={24}>
            <FilterIcon />
          </IconButton>
          <IconButton label="Sort" size={24}>
            <ArrowDownwardIcon />
          </IconButton>
          <IconButton label="More" size={24}>
            <MoreVertIcon />
          </IconButton>
          <IconButton label="New Customer" size={24} variant="primary">
            <AddIcon />
          </IconButton>
        </div>
      </div>
      <div className="flex items-center gap-3 border-b border-(--pl-border) px-4 py-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--pl-shell) text-(--pl-text-muted)">
          <SearchMaterialIcon />
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Customers"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm leading-5 text-(--pl-text-input) outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      <div className="flex flex-col">
        {customers.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className={`flex cursor-pointer items-center gap-3 border-b border-(--pl-subtle) px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-(--pl-subtle) ${
              selected === c.id ? "bg-(--pl-subtle)" : ""
            }`}
          >
            <Avatar name={c.name} />
            <div className="flex min-w-0 flex-col">
              <div className="truncate text-sm leading-5 text-(--pl-text)">{c.name}</div>
              <div className="truncate text-xs leading-4 text-(--pl-text-muted)">{c.email}</div>
            </div>
          </button>
        ))}
      </div>
    </PageCard>
  );
}

const TABS = ["Overview", "Top Customers", "At Risk", "Cost Drivers"] as const;

/** A column under the chart: a ruled 16px heading with a gray subtitle */
function Column({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start gap-x-3 border-b border-(--pl-border) pb-4">
        <h2 className="text-base leading-6 text-(--pl-text-strong)">{title}</h2>
        <p className="text-base leading-6 text-(--pl-text-muted)">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Overview({ onSelect }: { onSelect: (c: Customer) => void }) {
  const [mode, setMode] = useState<"new" | "total">("new");
  const total = NEW_CUSTOMERS.reduce((s, p) => s + p.value, 0);
  let running = CUSTOMERS.length * 60;
  const points = mode === "new" ? NEW_CUSTOMERS : NEW_CUSTOMERS.map((p) => ({ ...p, value: (running += p.value) }));
  const top = [...CUSTOMERS].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-6 rounded-2xl border border-(--pl-border) p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm leading-[21px] text-(--pl-text-muted)">
              {mode === "new" ? "New Customers" : "Total Customers"}
            </p>
            <p className="text-2xl leading-[33px] font-normal text-(--pl-text-strong)">{mode === "new" ? total : running}</p>
          </div>
          <Segmented
            label="Customers chart"
            value={mode}
            onChange={setMode}
            options={[
              { id: "new", label: "New" },
              { id: "total", label: "Total" },
            ]}
          />
        </div>
        <BarChart points={points} />
      </div>
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,7fr)_minmax(0,6fr)_minmax(0,6fr)]">
        <Column title="Top Customers" subtitle="By net revenue">
          <ul className="-mx-3 flex flex-col">
            {top.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-(--pl-subtle)"
                >
                  <Avatar name={c.name} />
                  <p className="min-w-0 flex-1 truncate text-sm leading-[21px] text-(--pl-text-strong)">{c.name}</p>
                  <div className="flex shrink-0 flex-col items-end">
                    <p className="text-sm leading-[21px] text-(--pl-text-strong)">{usd(c.revenue)}</p>
                    <p className="text-xs leading-[16.5px] text-(--pl-text-muted)">
                      {c.orders} {c.orders === 1 ? "order" : "orders"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Column>
        <Column title="At Risk" subtitle="Past due & canceling">
          <EmptyState icon={<ShieldCheckIcon size={24} />} title="Nothing at risk">
            No payment issues or scheduled cancellations.
          </EmptyState>
        </Column>
        <Column title="Cost Drivers" subtitle="Ingested cost events">
          <EmptyState icon={<CoinsIcon size={24} />} title="No cost data">
            Costs come from _cost metadata on ingested events.
          </EmptyState>
        </Column>
      </div>
    </div>
  );
}

/** One customer, opened from the list: who they are and what they've bought */
function CustomerDetail({ customer }: { customer: Customer }) {
  const rows: [string, string][] = [
    ["Email", customer.email],
    [
      "Customer since",
      customer.created.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    ],
    ["Orders", String(customer.orders)],
    ["Net revenue", usd(customer.revenue)],
  ];
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-(--pl-border) p-6">
      <div className="flex items-center gap-4">
        <Avatar name={customer.name} size={40} />
        <div className="flex flex-col">
          <p className="text-base leading-6 text-(--pl-text-strong)">{customer.name}</p>
          <p className="text-sm leading-5 text-(--pl-text-muted)">{customer.email}</p>
        </div>
      </div>
      <dl className="flex flex-col">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border-t border-(--pl-border) py-3 text-sm leading-5">
            <dt className="text-(--pl-text-muted)">{k}</dt>
            <dd className="text-(--pl-text-strong)">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CustomersPage() {
  const [range, setRange] = useState<Range>("30d");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [selected, setSelected] = useState<Customer>();
  return (
    <>
      <CustomerList selected={selected?.id} onSelect={setSelected} />
      <PageCard className="px-8">
        <div className="flex flex-col">
          {/* a 32px row the 36px time range overhangs, so the tabs start 96px down, as in Polar */}
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-8 gap-y-4 py-8 [&>*]:-my-0.5">
            <h1 className="text-2xl leading-[33px] font-normal text-(--pl-text-strong)">
              {selected ? selected.name : "Customers"}
            </h1>
            {selected ? (
              <button
                type="button"
                onClick={() => setSelected(undefined)}
                className="cursor-pointer text-sm text-(--pl-text-muted) hover:text-(--pl-text-strong)"
              >
                Back to overview
              </button>
            ) : (
              <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
            )}
          </div>
          <div className="flex flex-col gap-8 pb-8">
            {selected ? (
              <CustomerDetail customer={selected} />
            ) : (
              <>
                <nav>
                  <ul className="flex flex-wrap gap-x-6 gap-y-2">
                    {TABS.map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          onClick={() => setTab(t)}
                          className={`cursor-pointer text-xl leading-[27.5px] font-normal transition-colors ${
                            t === tab ? "text-(--pl-text-strong)" : "text-(--pl-text-muted) hover:text-(--pl-text-strong)"
                          }`}
                        >
                          {t}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
                <Overview onSelect={setSelected} />
              </>
            )}
          </div>
        </div>
      </PageCard>
    </>
  );
}
