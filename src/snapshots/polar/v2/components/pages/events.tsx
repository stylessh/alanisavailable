"use client";

import { useState } from "react";
import {
  CUSTOMERS,
  EVENTS,
  TODAY,
  formatDateTime,
  formatWhen,
  usd,
  type AppEvent,
  type EventDetail,
  type EventSource,
} from "../data";
import { AddIcon, CheckIcon, ChevronRightLucideIcon, CloseIcon, RefreshIcon } from "../icons";
import { Avatar } from "../ui/avatar";
import { Button, IconButton } from "../ui/button";
import { DateRangePicker, type DateRange } from "../ui/calendar";
import { Inset } from "../ui/card";
import { JsonBlock, type Json } from "../ui/code";
import { Combobox } from "../ui/combobox";
import { EmptyState } from "../ui/feedback";
import { Input, SearchInput } from "../ui/field";
import { Tooltip } from "../ui/overlay";
import { PageAction, PageCard, PageHeader } from "../ui/page";
import { Select } from "../ui/select";
import { Status, type Tone } from "../ui/status";
import { Pagination } from "../ui/table";
import { ORDER_STATUS } from "./sales";

// Analytics › Events, as Polar lays it out (EventsPage.tsx, measured live at
// 1440x900): a 320px card of filters beside the list, 8px apart. Built on the
// design system rather than copied: the filters are its fields, select and
// combobox; the list is one raised card (an Inset standing alone, since it
// has no header for a frame to hold) instead of a stack of bordered boxes,
// its rows ruled by hairlines and opening in place.

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
] as const;

const SOURCE: Record<EventSource, { label: string; title: string; tone: Tone }> = {
  user: { label: "User", title: "User Events", tone: "neutral" },
  system: { label: "System", title: "System Events", tone: "info" },
};

type Meta = { key: string; value: string };

/** A labelled group in the filter card: a 14px title 8px over its control */
function Filter({ title, end, children }: { title: string; end?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm leading-5 text-(--pl-text)">{title}</h3>
        {end}
      </div>
      {children}
    </section>
  );
}

/**
 * One source's event types, to tick several: a bordered list of 36px rows,
 * the 14px name and its 12px count, the ticked ones at full strength with
 * a check in the slot every row keeps for it.
 */
function TypeList({
  types,
  ticked,
  onToggle,
}: {
  types: { label: string; count: number }[];
  ticked: string[];
  onToggle: (label: string) => void;
}) {
  return (
    <ul className="overflow-hidden rounded-(--pl-radius-md) border border-(--pl-border)">
      {types.map((t) => {
        const on = ticked.includes(t.label);
        return (
          <li key={t.label} className="shadow-[inset_0_-0.5px_0_var(--pl-hairline)] last:shadow-none">
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(t.label)}
              className={`flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm leading-5 transition-colors hover:bg-(--pl-subtle) hover:text-(--pl-text) ${
                on ? "text-(--pl-text)" : "text-(--pl-text-secondary)"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{t.label}</span>
              <span className="text-xs text-(--pl-text-muted) tabular-nums">{t.count}</span>
              <span className="flex size-3.5 shrink-0 items-center justify-center">{on && <CheckIcon size={14} />}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** One fact about the opened event: a 12px muted label over its 14px value */
function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <dt className="text-xs leading-4 text-(--pl-text-muted)">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-sm leading-5 text-(--pl-text)">{children}</dd>
    </div>
  );
}

/** The facts the event's kind carries, in words (the payload has the rest) */
function KindProperties({ detail }: { detail: EventDetail }) {
  const money = (cents: number) => <span className="tabular-nums">{usd(cents, 2)}</span>;
  switch (detail.kind) {
    case "checkout":
      return (
        <>
          <Property label="Product">{detail.product.name}</Property>
          <Property label="Amount">{money(detail.amount)}</Property>
          <Property label="Status">
            <Status tone="neutral" size="sm">
              Open
            </Status>
          </Property>
        </>
      );
    case "order":
      return (
        <>
          <Property label="Product">
            {detail.product.name}
            <span className="text-(--pl-text-muted)">{detail.product.interval ? "Subscription" : "One-time"}</span>
          </Property>
          <Property label="Amount">{money(detail.amount)}</Property>
          <Property label="Status">
            <Status tone={ORDER_STATUS[detail.status].tone} size="sm">
              {ORDER_STATUS[detail.status].label}
            </Status>
          </Property>
        </>
      );
    case "benefit":
      return (
        <>
          <Property label="Benefit">{detail.benefit}</Property>
          <Property label="From">{detail.product.name}</Property>
          <Property label="Status">
            <Status tone="success" size="sm">
              Granted
            </Status>
          </Property>
        </>
      );
    case "customer":
      return <Property label="Change">{detail.changed ? `${detail.changed} changed` : "New customer"}</Property>;
    case "credit":
      return <Property label="Credited">{money(detail.amount)}</Property>;
    case "usage":
      return null;
  }
}

/**
 * A row, 56px: a 24px chevron that opens it, the event's name, its source,
 * when (said naturally), and on the right what it brought in and who it
 * was, all in sans. Opened, the space under it holds the
 * event's facts, label over value, four across, and under them its
 * payload at full width, 24px apart, with room around both.
 */
function EventRow({ event: e, open, onToggle }: { event: AppEvent; open: boolean; onToggle: () => void }) {
  const stop = (ev: React.SyntheticEvent) => ev.stopPropagation();
  return (
    <li className="shadow-[inset_0_-0.5px_0_var(--pl-hairline)] last:shadow-none">
      <div
        onClick={onToggle}
        className="flex h-14 cursor-pointer items-center gap-4 px-4 transition-colors hover:bg-(--pl-subtle)"
      >
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${open ? "Close" : "Open"} ${e.label}`}
          onClick={(ev) => {
            stop(ev);
            onToggle();
          }}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-(--pl-radius-sm) bg-(--pl-fill) text-(--pl-text-muted) transition-colors hover:text-(--pl-text)"
        >
          <ChevronRightLucideIcon size={14} className={`transition-transform duration-(--pl-fast) ${open ? "rotate-90" : ""}`} />
        </button>
        <span className="min-w-0 truncate text-sm leading-5 font-medium text-(--pl-text)">{e.label}</span>
        <Status tone={SOURCE[e.source].tone} size="sm">
          {SOURCE[e.source].label}
        </Status>
        <time
          dateTime={e.date.toISOString()}
          title={formatDateTime(e.date)}
          className="text-sm leading-5 whitespace-nowrap text-(--pl-text-muted)"
        >
          {formatWhen(e.date)}
        </time>
        <div className="ml-auto flex shrink-0 items-center gap-4" onClick={stop}>
          {open ? (
            <Button variant="secondary" size="sm">
              View event
            </Button>
          ) : (
            <>
              {e.amount !== undefined && (
                <span className="text-sm leading-5 text-(--pl-text) tabular-nums">{usd(e.amount, 2)}</span>
              )}
              <Tooltip content={`${e.customer.name} · ${e.customer.email}`}>
                <span tabIndex={0} className="flex rounded-full">
                  <Avatar name={e.customer.name} size={24} />
                </span>
              </Tooltip>
            </>
          )}
        </div>
      </div>
      {/* opened: under the name (56px in), the facts across, then the payload at full width */}
      {open && (
        <div className="flex flex-col gap-6 pt-2 pr-6 pb-6 pl-14">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4">
            <Property label="Customer">
              <Avatar name={e.customer.name} size={16} />
              <span className="truncate">{e.customer.name}</span>
            </Property>
            <Property label="Email">
              <span className="truncate">{e.customer.email}</span>
            </Property>
            <Property label="Occurred">
              <span className="truncate" title={formatDateTime(e.date)}>
                {e.date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </Property>
            <Property label="Cost">
              {e.cost === undefined ? (
                <span className="text-(--pl-text-muted)">None recorded</span>
              ) : (
                <span className="tabular-nums">{usd(e.cost, 2)}</span>
              )}
            </Property>
            <KindProperties detail={e.detail} />
          </dl>
          <JsonBlock value={e.payload as Json} />
        </div>
      )}
    </li>
  );
}

const ALL_TIME: DateRange = { from: new Date(TODAY.getTime() - 365 * 86_400_000), to: new Date(TODAY.getTime() + 86_400_000) };

/** Analytics › Events: filters on the left, every event on the right */
export function EventsPage() {
  const [query, setQuery] = useState("");
  const [dates, setDates] = useState<DateRange>(ALL_TIME);
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("newest");
  const [types, setTypes] = useState<string[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [meta, setMeta] = useState<Meta[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState("20");

  const reset = () => {
    setQuery("");
    setDates(ALL_TIME);
    setSort("newest");
    setTypes([]);
    setCustomers([]);
    setMeta([]);
  };

  const q = query.trim().toLowerCase();
  const filled = meta.filter((m) => m.key.trim());
  const shown = EVENTS.filter(
    (e) =>
      (!q || e.label.toLowerCase().includes(q) || e.customer.email.includes(q) || e.customer.name.toLowerCase().includes(q)) &&
      e.date >= dates.from &&
      e.date <= dates.to &&
      (!types.length || types.includes(e.label)) &&
      (!customers.length || customers.includes(e.customer.id)) &&
      filled.every((m) => e.detail.kind === "usage" && e.detail.metadata[m.key.trim()] === m.value.trim()),
  ).sort((a, b) => (sort === "newest" ? 1 : -1) * (b.date.getTime() - a.date.getTime()));

  // each source's event types and how often they happened (user events first, as Polar orders them)
  const bySource = (["user", "system"] as const).map((source) => {
    const counts = new Map<string, number>();
    for (const e of EVENTS) if (e.source === source) counts.set(e.label, (counts.get(e.label) ?? 0) + 1);
    return {
      source,
      types: [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => a.label.localeCompare(b.label)),
    };
  });
  const toggleType = (label: string) => setTypes((t) => (t.includes(label) ? t.filter((x) => x !== label) : [...t, label]));

  return (
    <>
      <PageCard className="w-80 flex-none max-lg:hidden">
        {/* the sub-sidebar's header, as on Customers: a ghost search the card's width, its actions inside it, ruled off below */}
        <SearchInput
          variant="ghost"
          placeholder="Search events"
          aria-label="Search events"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-14 shrink-0 shadow-[inset_0_-0.5px_0_var(--pl-hairline)]"
          actions={
            <>
              <PageAction ghost label="Reset filters" onClick={reset}>
                <RefreshIcon />
              </PageAction>
              <PageAction ghost label="Create event">
                <AddIcon />
              </PageAction>
            </>
          }
        />
        <div className="flex flex-col gap-6 p-4">
          <Filter title="Timeline">
            <DateRangePicker value={dates} onChange={(r) => setDates(r)} preset="All Time" className="w-full" />
          </Filter>
          <Filter title="Sorting">
            <Select label="Sorting" options={[...SORTS]} value={sort} onChange={setSort} />
          </Filter>
          {bySource.map(
            ({ source, types: list }) =>
              list.length > 0 && (
                <Filter key={source} title={SOURCE[source].title}>
                  <TypeList types={list} ticked={types} onToggle={toggleType} />
                </Filter>
              ),
          )}
          <Filter title="Customers">
            <Combobox
              label="Customers"
              allLabel="All customers"
              placeholder="Search customers…"
              groups={[
                {
                  id: "customers",
                  label: "Customers",
                  items: CUSTOMERS.map((c) => ({ id: c.id, label: c.name, icon: <Avatar name={c.name} size={16} /> })),
                },
              ]}
              selected={customers}
              onChange={setCustomers}
              className="w-full"
            />
          </Filter>
          <Filter
            title="Metadata"
            end={
              <IconButton label="Add metadata filter" size={24} onClick={() => setMeta((m) => [...m, { key: "", value: "" }])}>
                <AddIcon />
              </IconButton>
            }
          >
            {meta.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="key"
                  aria-label="Metadata key"
                  value={m.key}
                  onChange={(e) => setMeta((all) => all.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                />
                <Input
                  placeholder="value"
                  aria-label="Metadata value"
                  value={m.value}
                  onChange={(e) => setMeta((all) => all.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                />
                <IconButton label="Remove" size={32} onClick={() => setMeta((all) => all.filter((_, j) => j !== i))}>
                  <CloseIcon className="text-(--pl-text-faint)" />
                </IconButton>
              </div>
            ))}
          </Filter>
        </div>
      </PageCard>
      <PageCard className="px-8">
        <div className="flex flex-col gap-8 py-8">
          <PageHeader
            title="Events"
            filters={
              <span className="text-xl leading-7 text-(--pl-text-muted)">
                {shown.length} {shown.length === 1 ? "Event" : "Events"}
              </span>
            }
          />
          {shown.length ? (
            <div className="flex flex-col gap-6">
              {/* no header to frame, so no tinted frame: the raised list stands on the page alone */}
              <Inset outer>
                <ul>
                  {shown.slice(0, Number(pageSize)).map((e) => (
                    <EventRow
                      key={e.id}
                      event={e}
                      open={open === e.id}
                      onToggle={() => setOpen((o) => (o === e.id ? null : e.id))}
                    />
                  ))}
                </ul>
              </Inset>
              <Pagination count={shown.length} pageSize={pageSize} onPageSize={setPageSize} />
            </div>
          ) : (
            <EmptyState title="No events found">There are no events matching your current filters.</EmptyState>
          )}
        </div>
      </PageCard>
    </>
  );
}
