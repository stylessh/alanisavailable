"use client";

import { useState } from "react";
import { CUSTOMERS, NEW_CUSTOMERS, RANGES, TODAY, usd, type Customer, type Range } from "../data";
import { AddIcon, ArrowBackIcon, CoinsIcon, DownloadIcon, ShieldCheckIcon, TuneIcon } from "../icons";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "../ui/menu";
import { PopoverGroup } from "../ui/popover";
import { Sheet } from "../ui/overlay";
import { BarChart } from "../ui/chart";
import { FramedCard } from "../ui/card";
import { Field, Input, SearchInput } from "../ui/field";
import { EmptyState, PageAction, PageCard, PageHeader } from "../ui/page";
import { Segmented } from "../ui/segmented";
import { StatusDot } from "../ui/status";

// Customers is a master–detail page: a 320px list card beside the detail card,
// 8px apart.

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active", tone: "success" },
  { id: "inactive", label: "Inactive", tone: "neutral" },
] as const;

const SORTS = [
  { id: "newest", label: "Newest", by: (a: Customer, b: Customer) => b.created.getTime() - a.created.getTime() },
  { id: "oldest", label: "Oldest", by: (a: Customer, b: Customer) => a.created.getTime() - b.created.getTime() },
  { id: "name", label: "Name", by: (a: Customer, b: Customer) => (a.name || a.email).localeCompare(b.name || b.email) },
  { id: "revenue", label: "Revenue", by: (a: Customer, b: Customer) => b.revenue - a.revenue },
] as const;

/** a customer without a name goes by their email */
const nameOf = (c: Customer) => c.name || c.email;

/**
 * The list card. Its header is a toolbar rather than a second "Customers"
 * title beside the page's: one ghost search across the card, its text lined
 * up with the names below, with the view menu (show and sort, as Linear's
 * display options) and New Customer inside its right end. A hairline under
 * it, then the customers.
 */
function CustomerList({
  customers: all,
  selected,
  onSelect,
  onNew,
}: {
  customers: Customer[];
  selected?: string;
  onSelect: (c: Customer) => void;
  onNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("newest");
  const q = query.trim().toLowerCase();
  const customers = all
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    // active: has paid for something
    .filter((c) => filter === "all" || (filter === "active") === c.revenue > 0)
    .sort(SORTS.find((x) => x.id === sort)!.by);
  return (
    <PageCard className="w-80 flex-none max-lg:hidden">
      <SearchInput
        variant="ghost"
        placeholder="Search customers"
        aria-label="Search customers"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-14 shrink-0 shadow-[inset_0_-0.5px_0_var(--pl-hairline)]"
        actions={
          <PopoverGroup>
            <Menu
              align="end"
              trigger={(t) => (
                <PageAction {...t} ghost label="View options">
                  <TuneIcon />
                </PageAction>
              )}
            >
              <MenuLabel>Show</MenuLabel>
              {FILTERS.map((f) => (
                <MenuItem
                  key={f.id}
                  icon={"tone" in f ? <StatusDot tone={f.tone} /> : undefined}
                  checked={filter === f.id}
                  onSelect={() => setFilter(f.id)}
                >
                  {f.label}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuLabel>Sort by</MenuLabel>
              {SORTS.map((x) => (
                <MenuItem key={x.id} checked={sort === x.id} onSelect={() => setSort(x.id)}>
                  {x.label}
                </MenuItem>
              ))}
            </Menu>
            <PageAction ghost label="New Customer" onClick={onNew}>
              <AddIcon />
            </PageAction>
          </PopoverGroup>
        }
      />
      <div className="flex flex-col">
        {customers.length === 0 && (
          <p className="px-4 py-6 text-center text-sm leading-5 text-(--pl-text-muted)">No customers match</p>
        )}
        {customers.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            aria-current={selected === c.id || undefined}
            className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-left shadow-[inset_0_-0.5px_0_var(--pl-hairline)] transition-colors last:shadow-none hover:bg-(--pl-subtle) ${
              selected === c.id ? "bg-(--pl-subtle)" : ""
            }`}
          >
            <Avatar name={nameOf(c)} />
            <div className="flex min-w-0 flex-col">
              <div className="truncate text-sm leading-5 text-(--pl-text)">{nameOf(c)}</div>
              <div className="truncate text-xs leading-4 text-(--pl-text-muted)">{c.email}</div>
            </div>
          </button>
        ))}
      </div>
    </PageCard>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * New Customer, in the sheet Polar creates things in: an email (required,
 * checked as you leave it and on create, and against the customers already
 * here), a name and your own ID for them. Creating takes a moment, adds the
 * customer to the top of the list and opens them.
 */
function NewCustomerSheet({
  open,
  onClose,
  existing,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  existing: Customer[];
  onCreate: (c: Customer) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const clean = email.trim().toLowerCase();
  const error = !clean
    ? "Email is required"
    : !EMAIL.test(clean)
      ? "Enter a valid email address"
      : existing.some((c) => c.email.toLowerCase() === clean)
        ? "A customer with this email already exists"
        : null;

  const close = () => {
    setEmail("");
    setName("");
    setExternalId("");
    setTouched(false);
    setSaving(false);
    onClose();
  };
  const create = () => {
    setTouched(true);
    if (error) return;
    setSaving(true);
    setTimeout(() => {
      onCreate({ id: `c-${Date.now()}`, name: name.trim(), email: clean, revenue: 0, orders: 0, created: TODAY });
      close();
    }, 700);
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="New Customer"
      footer={
        <>
          <Button loading={saving} onClick={create}>
            Create Customer
          </Button>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <Field label="Email" error={touched ? error : undefined} description="Receipts and the customer portal go here.">
          <Input
            type="email"
            autoComplete="off"
            placeholder="customer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => email && setTouched(true)}
            autoFocus
          />
        </Field>
        <Field label="Name" description="Optional. Shown in the dashboard and on receipts.">
          <Input placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="External ID" description="Optional. Your own ID for this customer, to find them by later." small>
          <Input mono placeholder="usr_1337" value={externalId} onChange={(e) => setExternalId(e.target.value)} />
        </Field>
        {/* Enter submits */}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

const TABS = ["Overview", "Top Customers", "At Risk", "Cost Drivers"] as const;

function Overview({ onSelect }: { onSelect: (c: Customer) => void }) {
  const [mode, setMode] = useState<"new" | "total">("new");
  const total = NEW_CUSTOMERS.reduce((s, p) => s + p.value, 0);
  let running = CUSTOMERS.length * 60;
  const points = mode === "new" ? NEW_CUSTOMERS : NEW_CUSTOMERS.map((p) => ({ ...p, value: (running += p.value) }));
  const top = [...CUSTOMERS].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-6 rounded-(--pl-radius-lg) border border-(--pl-border) p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm leading-[21px] text-(--pl-text-muted)">
              {mode === "new" ? "New Customers" : "Total Customers"}
            </p>
            <p className="text-2xl leading-[33px] font-normal text-(--pl-text)">{mode === "new" ? total : running}</p>
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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,6fr)_minmax(0,6fr)]">
        {/* framed cards, titled small, so they never read as the tabs above */}
        <FramedCard title="Top Customers" description="By net revenue">
          <ul className="flex flex-col p-1">
            {top.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-(--pl-radius-sm) px-3 py-2 text-left hover:bg-(--pl-subtle)"
                >
                  <Avatar name={c.name} />
                  <p className="min-w-0 flex-1 truncate text-sm leading-[21px] text-(--pl-text)">{c.name}</p>
                  <div className="flex shrink-0 flex-col items-end">
                    <p className="text-sm leading-[21px] text-(--pl-text)">{usd(c.revenue)}</p>
                    <p className="text-xs leading-[16.5px] text-(--pl-text-muted)">
                      {c.orders} {c.orders === 1 ? "order" : "orders"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </FramedCard>
        <FramedCard title="At Risk" description="Past due & canceling">
          <EmptyState bare fill icon={<ShieldCheckIcon size={24} />} title="Nothing at risk">
            No payment issues or scheduled cancellations.
          </EmptyState>
        </FramedCard>
        <FramedCard title="Cost Drivers" description="Ingested cost events">
          <EmptyState bare fill icon={<CoinsIcon size={24} />} title="No cost data">
            Costs come from _cost metadata on ingested events.
          </EmptyState>
        </FramedCard>
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
    <div className="flex flex-col gap-6 rounded-(--pl-radius-lg) border border-(--pl-border) p-6">
      <div className="flex items-center gap-4">
        <Avatar name={nameOf(customer)} size={40} />
        <div className="flex flex-col">
          <p className="text-base leading-6 text-(--pl-text)">{nameOf(customer)}</p>
          <p className="text-sm leading-5 text-(--pl-text-muted)">{customer.email}</p>
        </div>
      </div>
      <dl className="flex flex-col">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border-t border-(--pl-border) py-3 text-sm leading-5">
            <dt className="text-(--pl-text-muted)">{k}</dt>
            <dd className="text-(--pl-text)">{v}</dd>
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
  const [customers, setCustomers] = useState(CUSTOMERS);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <CustomerList customers={customers} selected={selected?.id} onSelect={setSelected} onNew={() => setCreating(true)} />
      <NewCustomerSheet
        open={creating}
        onClose={() => setCreating(false)}
        existing={customers}
        onCreate={(c) => {
          setCustomers((list) => [c, ...list]);
          setSelected(c);
        }}
      />
      <PageCard className="px-8">
        <div className="flex flex-col">
          <div className="pt-8 pb-8">
            <PageHeader
              title={selected ? nameOf(selected) : "Customers"}
              filters={selected ? undefined : <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />}
              actions={
                selected ? (
                  <PageAction label="Back to overview" onClick={() => setSelected(undefined)}>
                    <ArrowBackIcon />
                  </PageAction>
                ) : (
                  <PageAction label="Export customers" size={36}>
                    <DownloadIcon />
                  </PageAction>
                )
              }
            />
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
                            t === tab ? "text-(--pl-text)" : "text-(--pl-text-muted) hover:text-(--pl-text)"
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
