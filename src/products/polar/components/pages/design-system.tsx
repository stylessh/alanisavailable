"use client";

import { useState } from "react";
import { METRICS, NEW_CUSTOMERS, ORDERS, PRODUCTS, TODAY } from "../data";
import {
  AddIcon,
  ArrowOutwardIcon,
  BenefitIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  LinkIcon,
  MoreVertIcon,
  PackageIcon,
  SearchIcon,
  ShieldCheckIcon,
  TagIcon,
} from "../icons";
import { Avatar } from "../ui/avatar";
import { Button, IconButton, type ButtonVariant } from "../ui/button";
import { Calendar, DATE_PRESETS, DatePopover, DatePresets, DateRangePicker, type DateRange } from "../ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  IconTile,
  List,
  ListGroup,
  ListGroupItem,
  ListItem,
  Panel,
  SettingsGroup,
  SettingsItem,
  Well,
} from "../ui/card";
import { AreaChart, BarChart, ChartTooltip } from "../ui/chart";
import { Combobox, ComboboxPanel, type ComboboxGroup } from "../ui/combobox";
import { Checkbox, RadioCard, RadioGroup, Switch } from "../ui/controls";
import { Accordion, AccordionItem, OptionRow, ReorderRow } from "../ui/disclosure";
import { Alert, EmptyHero, EmptyState, Skeleton, Spinner } from "../ui/feedback";
import { CopyInput, Field, Input, SearchInput, TextArea } from "../ui/field";
import { Menu, MenuItem, MenuPanel, MenuSeparator } from "../ui/menu";
import { StatCard } from "../ui/metric";
import { Modal, ModalFooter, Sheet, Tooltip, TooltipBubble } from "../ui/overlay";
import { PageCard } from "../ui/page";
import { Segmented } from "../ui/segmented";
import { Select, SelectList } from "../ui/select";
import { Code, LegendDot, Pill, Status, StatusDot, StatusLabel, type Tone } from "../ui/status";
import { DataTable, Pagination } from "../ui/table";
import { Tabs } from "../ui/tabs";
import { ORDER_COLUMNS } from "./sales";

// The design system, v1: every primitive in components/ui, in each state the
// recording of Polar showed, built from Polar's own components (orbit and
// its shadcn layer) and checked against the live dashboard's DOM.

const GROUPS = [
  { id: "foundations", label: "Foundations" },
  { id: "buttons", label: "Buttons" },
  { id: "fields", label: "Fields" },
  { id: "pickers", label: "Pickers" },
  { id: "toggles", label: "Toggles" },
  { id: "navigation", label: "Navigation" },
  { id: "badges", label: "Badges" },
  { id: "surfaces", label: "Surfaces" },
  { id: "data", label: "Data" },
  { id: "feedback", label: "Feedback" },
  { id: "overlays", label: "Overlays" },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];

function Group({ id, title, children }: { id: GroupId; title: string; children: React.ReactNode }) {
  return (
    <section
      id={`ds-${id}`}
      className="flex scroll-mt-24 flex-col gap-6 border-t border-(--pl-border) pt-10 first:border-t-0 first:pt-0"
    >
      <h2 className="text-2xl leading-[33px] font-normal text-(--pl-text-strong)">{title}</h2>
      {children}
    </section>
  );
}

/** One specimen: a 12px gray-500 caption over the thing itself */
function Specimen({
  label,
  note,
  className = "",
  children,
}: {
  label: string;
  note?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-3 ${className}`}>
      <div className="flex flex-col">
        <span className="text-xs leading-4 font-medium text-(--pl-text)">{label}</span>
        {note && <span className="text-xs leading-4 text-(--pl-text-muted)">{note}</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-center gap-3 ${className}`}>{children}</div>;
}

/* ─── Foundations ─────────────────────────────────────────────────────────── */

const SWATCHES: { group: string; tokens: [string, string][] }[] = [
  {
    group: "Surfaces",
    tokens: [
      ["--pl-surface", "Surface · white"],
      ["--pl-subtle", "Subtle · gray-50"],
      ["--pl-shell", "Shell · gray-100"],
      ["--pl-border", "Border · gray-200"],
      ["--pl-rule", "Rule · gray-300"],
    ],
  },
  {
    group: "Text",
    tokens: [
      ["--pl-text-strong", "Strong · black"],
      ["--pl-text-input", "Input · gray-950"],
      ["--pl-text", "Text · gray-900"],
      ["--pl-text-soft", "Soft · gray-700"],
      ["--pl-text-dim", "Dim · gray-600"],
      ["--pl-text-muted", "Muted · gray-500"],
      ["--pl-text-faint", "Faint · gray-400"],
    ],
  },
  {
    group: "Accent and intent",
    tokens: [
      ["--pl-primary", "Primary · black"],
      ["--pl-accent", "Accent · blue-600"],
      ["--pl-legend", "Legend · blue-500"],
      ["--pl-field-focus", "Focus · blue-300"],
      ["--pl-field-ring", "Focus ring · blue-100"],
      ["--pl-destructive", "Destructive · red-500"],
      ["--pl-success", "Success · emerald-500"],
      ["--pl-warning", "Warning · yellow-500"],
      ["--pl-info", "Info · indigo-500"],
    ],
  },
];

const TYPE: { label: string; className: string; sample: string }[] = [
  { label: "Metric · 48/48 · 350", className: "text-5xl leading-none font-[350]", sample: "$4,182.60" },
  { label: "Page title · 24/32 · 500", className: "text-2xl leading-8 font-medium", sample: "Overview" },
  { label: "Section · 24/33 · 400", className: "text-2xl leading-[33px]", sample: "Revenue" },
  { label: "Subnav · 20/27.5 · 400", className: "text-xl leading-[27.5px]", sample: "Top Customers" },
  { label: "Sheet title · 20/28 · 400", className: "text-xl leading-7", sample: "Create Checkout Link" },
  { label: "Metric title · 18/28 · 450", className: "text-lg leading-7", sample: "Monthly Recurring Revenue" },
  { label: "Body · 16/24 · 450", className: "text-base leading-6", sample: "Start selling digital products today" },
  { label: "UI · 14/20 · 450", className: "text-sm leading-5", sample: "Customers will be able to apply discount codes" },
  { label: "Label · 14/14 · 500", className: "text-sm leading-none font-medium", sample: "Success URL" },
  { label: "Button · 14/20 · 550 · 0.01em", className: "text-sm leading-5 font-[550] tracking-[0.01em]", sample: "New Product" },
  { label: "Caption · 12/16 · 450", className: "text-xs leading-4", sample: "Helpful if you have multiple links" },
  { label: "Mono · Geist Mono 12/16", className: "font-mono text-xs leading-4", sample: "82d4d2fb-0925-464a-b607" },
];

function Foundations() {
  return (
    <Group id="foundations" title="Foundations">
      <div className="grid gap-8 xl:grid-cols-3">
        {SWATCHES.map((s) => (
          <Specimen key={s.group} label={s.group}>
            <div className="flex flex-col gap-2">
              {s.tokens.map(([token, name]) => (
                <div key={token} className="flex items-center gap-3">
                  <span
                    className="size-8 shrink-0 rounded-lg shadow-(--pl-avatar-ring)"
                    style={{ background: `var(${token})` }}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm leading-5">{name}</span>
                    <code className="font-mono text-xs leading-4 text-(--pl-text-muted)">{token}</code>
                  </div>
                </div>
              ))}
            </div>
          </Specimen>
        ))}
      </div>
      <Specimen label="Type" note="PP Neue Montreal, 0.24px tracking inherited from the body; Geist Mono for codes">
        <div className="flex flex-col divide-y divide-(--pl-border) rounded-2xl border border-(--pl-border)">
          {TYPE.map((t) => (
            <div key={t.label} className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 px-6 py-4">
              <span className={`${t.className} text-(--pl-text-strong)`}>{t.sample}</span>
              <span className="text-xs leading-4 text-(--pl-text-muted)">{t.label}</span>
            </div>
          ))}
        </div>
      </Specimen>
      <div className="grid gap-8 lg:grid-cols-3">
        <Specimen label="Radii" note="Polar's --radius is 0.6rem, so rounded-md is 7.6px and rounded-lg 9.6px">
          <Row>
            {[
              ["2", "2px"],
              ["7.6", "7.6px"],
              ["9.6", "9.6px"],
              ["12", "12px"],
              ["16", "16px"],
              ["24", "24px"],
              ["32", "32px"],
              ["full", "9999px"],
            ].map(([n, r]) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <span className="size-12 border border-(--pl-rule) bg-(--pl-subtle)" style={{ borderRadius: r }} />
                <span className="text-xs leading-4 text-(--pl-text-muted)">{n}</span>
              </div>
            ))}
          </Row>
        </Specimen>
        <Specimen
          label="Shadows"
          note="xs on fields and cards, sm on sheets, md on popovers, lg on menus and thumbs, xl on chart cards"
        >
          <Row className="gap-4">
            {["xs", "sm", "md", "lg", "xl"].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <span className="size-14 rounded-xl bg-(--pl-surface)" style={{ boxShadow: `var(--pl-shadow-${s})` }} />
                <span className="text-xs leading-4 text-(--pl-text-muted)">{s}</span>
              </div>
            ))}
          </Row>
        </Specimen>
        <Specimen label="Motion" note="orbit durations and curves">
          <div className="flex flex-col gap-1 text-sm leading-5">
            <span>fast 120ms · base 200ms · slow 320ms</span>
            <span className="text-(--pl-text-muted)">standard cubic-bezier(0.2, 0, 0, 1)</span>
            <span className="text-(--pl-text-muted)">decelerate (0, 0, 0, 1) · accelerate (0.3, 0, 1, 1)</span>
            <span className="text-(--pl-text-muted)">
              popovers 150ms from 95% · modal 100ms from 99% · sheet 320ms from the right
            </span>
          </div>
        </Specimen>
      </div>
    </Group>
  );
}

/* ─── Buttons ─────────────────────────────────────────────────────────────── */

// Each variant's hover, drawn without the pointer so the states sit side by side
const HOVER: Record<ButtonVariant, string> = {
  primary: "opacity-85",
  secondary: "bg-(--pl-secondary-hover)!",
  outline: "border-(--pl-border)! bg-(--pl-border)!",
  ghost: "bg-(--pl-ghost-hover)!",
  danger: "bg-(--pl-destructive-light)!",
  underline: "border-(--pl-text-strong)!",
  link: "underline",
};

const VARIANT_LABELS: [ButtonVariant, string][] = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["outline", "Outline"],
  ["ghost", "Ghost"],
  ["danger", "Danger"],
  ["underline", "Underline"],
  ["link", "Link"],
];

function Buttons() {
  const [loading, setLoading] = useState(false);
  return (
    <Group id="buttons" title="Buttons">
      <Specimen label="Variants × states" note="rest · hover · focus · disabled · loading">
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-x-4 border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs leading-4 font-normal text-(--pl-text-muted)">
                <th className="font-normal" />
                {["Rest", "Hover", "Focus", "Disabled", "Loading"].map((h) => (
                  <th key={h} className="font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VARIANT_LABELS.map(([v, label]) => (
                <tr key={v}>
                  <td className="pr-4 text-sm leading-5 text-(--pl-text-muted)">{label}</td>
                  <td>
                    <Button variant={v}>Save changes</Button>
                  </td>
                  <td>
                    <Button variant={v} className={HOVER[v]}>
                      Save changes
                    </Button>
                  </td>
                  <td>
                    <Button variant={v} className="ring-2 ring-(--pl-border) ring-offset-2">
                      Save changes
                    </Button>
                  </td>
                  <td>
                    <Button variant={v} disabled>
                      Save changes
                    </Button>
                  </td>
                  <td>
                    {v !== "underline" && v !== "link" && (
                      <Button variant={v} loading>
                        Save changes
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Specimen>
      <div className="grid gap-8 lg:grid-cols-3">
        <Specimen label="Sizes" note="sm 32 · md 40 · lg 48">
          <Row>
            <Button size="sm">Customize</Button>
            <Button size="md">New Product</Button>
            <Button size="lg">Create Product</Button>
          </Row>
        </Specimen>
        <Specimen label="With a glyph" note="16px, 8px from the label">
          <Row>
            <Button icon={<AddIcon />}>New Product</Button>
            <Button variant="secondary" size="sm" icon={<DownloadIcon />}>
              Export
            </Button>
            <Button
              variant={loading ? "secondary" : "primary"}
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1400);
              }}
            >
              Click to load
            </Button>
          </Row>
        </Specimen>
        <Specimen label="Icon buttons" note="24 · 32 · 40, ghost, secondary or primary">
          <Row>
            <IconButton label="More" size={24}>
              <MoreVertIcon />
            </IconButton>
            <IconButton label="Search" size={32}>
              <SearchIcon />
            </IconButton>
            <IconButton label="Open" size={40}>
              <ArrowOutwardIcon />
            </IconButton>
            <IconButton label="Add" variant="secondary">
              <AddIcon />
            </IconButton>
            <IconButton label="New" variant="primary" size={24}>
              <AddIcon size={14} />
            </IconButton>
            <IconButton label="Copy" variant="outline">
              <CopyIcon />
            </IconButton>
          </Row>
        </Specimen>
      </div>
    </Group>
  );
}

/* ─── Fields ──────────────────────────────────────────────────────────────── */

function Fields() {
  const [label, setLabel] = useState("");
  const [meta, setMeta] = useState("");
  return (
    <Group id="fields" title="Fields">
      <div className="grid gap-8 lg:grid-cols-3">
        <Specimen label="Input" note="rest · placeholder · filled">
          <div className="flex flex-col gap-3">
            <Input placeholder="https://example.com/return" />
            <Input defaultValue="Pane" aria-label="Organization name" />
            <Input prefix={<LinkIcon />} placeholder="With a leading glyph" />
          </div>
        </Specimen>
        <Specimen label="States" note="focused · invalid · disabled">
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Focused"
              className="border-(--pl-field-focus)! ring-[3px] ring-(--pl-field-ring)"
              aria-label="Focused example"
            />
            <Input placeholder="Invalid" aria-invalid aria-label="Invalid example" />
            <Input placeholder="Disabled" disabled aria-label="Disabled example" />
          </div>
        </Specimen>
        <Specimen label="Search, copy, mono">
          <div className="flex flex-col gap-3">
            <SearchInput placeholder="Search Products" aria-label="Search products" />
            <CopyInput label="Organization ID" value="82d4d2fb-0925-464a-b607-35d56e64f0e1" />
            <Input mono value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="key" aria-label="Metadata key" />
          </div>
        </Specimen>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Specimen label="Field" note="label · control · message · help, 8px apart">
          <div className="flex flex-col gap-6">
            <Field label="Label" description="Helpful if you have multiple links - internal & optional." small>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
            <Field
              label="Products"
              error="At least one product is required"
              description="The customer will be able to switch between these products at checkout."
            >
              <Select label="Products" placeholder="Select one or more products" options={[]} value="" onChange={() => {}} />
            </Field>
          </div>
        </Specimen>
        <Specimen label="TextArea" note="120px, 16px corners and padding">
          <Field label="Description" description="Markdown is supported.">
            <TextArea placeholder="Describe your product" />
          </Field>
        </Specimen>
      </div>
    </Group>
  );
}

/* ─── Pickers ─────────────────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

const COMBO_GROUPS: ComboboxGroup[] = [
  {
    id: "recurring",
    label: "Subscription",
    items: PRODUCTS.filter((p) => p.interval).map((p) => ({ id: p.id, label: p.name })),
  },
  {
    id: "one_time",
    label: "One-time purchase",
    items: PRODUCTS.filter((p) => !p.interval).map((p) => ({ id: p.id, label: p.name })),
  },
];

function Pickers() {
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState("name-asc");
  const [products, setProducts] = useState<string[]>([]);
  const [range, setRange] = useState<DateRange>({ from: new Date(2026, 8, 30), to: TODAY });
  const [query, setQuery] = useState("");
  return (
    <Group id="pickers" title="Pickers">
      <div className="grid gap-8 lg:grid-cols-3">
        <Specimen label="Select" note="try it: arrows, Enter, Escape">
          <Row>
            <Select label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
            <Select
              label="Sort"
              options={[
                { id: "name-asc", label: "Name A-Z" },
                { id: "name-desc", label: "Name Z-A" },
                { id: "newest", label: "Newest" },
                { id: "oldest", label: "Oldest" },
                { id: "price-asc", label: "Price: Low to High" },
                { id: "price-desc", label: "Price: High to Low" },
              ]}
              value={sort}
              onChange={setSort}
            />
            <Select label="Rows" size="sm" options={STATUS_OPTIONS} value="all" onChange={() => {}} disabled />
          </Row>
        </Specimen>
        <Specimen label="Select, open" note="tick on the chosen row, blue-600 on the highlighted one">
          <div className="w-32">
            <SelectList label="Status" options={STATUS_OPTIONS} value="active" active={2} onPick={() => {}} />
          </div>
        </Specimen>
        <Specimen label="Menu, open" note="gray-50 panel, a destructive item">
          <div className="w-40">
            <MenuPanel>
              <MenuItem>Copy Product ID</MenuItem>
              <MenuItem highlighted>Integrate Checkout</MenuItem>
              <MenuSeparator />
              <MenuItem>Edit Product</MenuItem>
              <MenuItem>Duplicate Product</MenuItem>
              <MenuSeparator />
              <MenuItem destructive>Archive Product</MenuItem>
            </MenuPanel>
          </div>
        </Specimen>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <Specimen label="Menu" note="click the ⋮">
          <Row>
            <Menu
              align="end"
              trigger={(p) => (
                <IconButton {...p} label="More" size={40}>
                  <MoreVertIcon />
                </IconButton>
              )}
            >
              <MenuItem icon={<DownloadIcon />}>Export</MenuItem>
              <MenuItem icon={<CopyIcon />}>Copy Product ID</MenuItem>
              <MenuSeparator />
              <MenuItem destructive>Archive Product</MenuItem>
            </Menu>
          </Row>
        </Specimen>
        <Specimen label="Combobox" note="search, groups, select all">
          <Combobox
            label="Products"
            allLabel="All products"
            placeholder="Search products…"
            groups={COMBO_GROUPS}
            selected={products}
            onChange={setProducts}
            className="w-full max-w-72"
          />
        </Specimen>
        <Specimen label="Date range" note="the glyph opens the calendar, the label the quick ranges">
          <DateRangePicker value={range} onChange={setRange} className="w-60" />
        </Specimen>
      </div>
      <div className="flex flex-wrap gap-8">
        <Specimen label="Combobox, open">
          <ComboboxPanel
            groups={COMBO_GROUPS}
            selected={["p-life"]}
            onToggle={() => {}}
            onToggleGroup={() => {}}
            placeholder="Search products…"
            query={query}
            onQuery={setQuery}
            active={0}
            autoFocus={false}
          />
        </Specimen>
        <Specimen label="Calendar">
          <DatePopover>
            <Calendar value={range} onChange={setRange} />
          </DatePopover>
        </Specimen>
        <Specimen label="Quick ranges">
          <DatePopover padded={false}>
            <DatePresets presets={DATE_PRESETS} onPick={() => {}} />
          </DatePopover>
        </Specimen>
      </div>
    </Group>
  );
}

/* ─── Toggles ─────────────────────────────────────────────────────────────── */

function Toggles() {
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [checks, setChecks] = useState([true, false]);
  const [price, setPrice] = useState("one_time");
  const [range, setRange] = useState("30d");
  const [kind, setKind] = useState("system");
  const [seg, setSeg] = useState("new");
  return (
    <Group id="toggles" title="Toggles">
      <div className="grid gap-8 lg:grid-cols-4">
        <Specimen label="Switch" note="on · off · disabled">
          <Row className="gap-4">
            <Switch checked={on} onChange={setOn} label="Allow discount codes" />
            <Switch checked={off} onChange={setOff} label="Require billing address" />
            <Switch checked disabled onChange={() => {}} label="Disabled" />
          </Row>
        </Specimen>
        <Specimen label="Checkbox" note="checked · unchecked · indeterminate · disabled">
          <Row className="gap-4">
            <Checkbox checked={checks[0]} onChange={(v) => setChecks([v, checks[1]])} />
            <Checkbox checked={checks[1]} onChange={(v) => setChecks([checks[0], v])} />
            <Checkbox checked="indeterminate" onChange={() => {}} />
            <Checkbox checked disabled onChange={() => {}} />
            <Checkbox checked={checks[1]} onChange={(v) => setChecks([checks[0], v])} label="With a label" />
          </Row>
        </Specimen>
        <Specimen label="Segmented" note="sm · md · lg">
          <div className="flex flex-col items-start gap-3">
            <Segmented
              label="Kind"
              size="sm"
              options={[
                { id: "system", label: "System" },
                { id: "all", label: "All" },
              ]}
              value={kind}
              onChange={setKind}
            />
            <Segmented
              label="Range"
              options={[
                { id: "all", label: "All Time" },
                { id: "12m", label: "12m" },
                { id: "3m", label: "3m" },
                { id: "30d", label: "30d" },
                { id: "today", label: "Today" },
              ]}
              value={range}
              onChange={setRange}
            />
            <Segmented
              label="Count"
              size="lg"
              options={[
                { id: "new", label: "New" },
                { id: "total", label: "Total" },
              ]}
              value={seg}
              onChange={setSeg}
            />
          </div>
        </Specimen>
        <Specimen label="Segmented, tabs" note="fills its row on gray-100">
          <Segmented
            label="Billing"
            variant="tabs"
            options={[
              { id: "new", label: "Monthly" },
              { id: "total", label: "Yearly" },
            ]}
            value={seg}
            onChange={setSeg}
          />
        </Specimen>
      </div>
      <Specimen label="Radio cards" note="Create Product's pricing">
        <RadioGroup label="Pricing" value={price} onChange={setPrice} className="max-w-2xl md:grid-cols-2">
          <RadioCard value="one_time">One-time purchase</RadioCard>
          <RadioCard value="recurring">Recurring subscription</RadioCard>
        </RadioGroup>
      </Specimen>
    </Group>
  );
}

/* ─── Navigation ──────────────────────────────────────────────────────────── */

function Navigation() {
  const [tab, setTab] = useState("overview");
  const [pill, setPill] = useState("overview");
  return (
    <Group id="navigation" title="Navigation">
      <div className="grid gap-8 lg:grid-cols-2">
        <Specimen label="Tabs, text" note="the page's sub-navigation">
          <Tabs
            label="Customers"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "top", label: "Top Customers" },
              { id: "risk", label: "At Risk" },
              { id: "cost", label: "Cost Drivers" },
            ]}
          />
        </Specimen>
        <Specimen label="Tabs, pill" note="orbit Tabs">
          <Tabs
            label="Product"
            variant="pill"
            value={pill}
            onChange={setPill}
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "metrics", label: "Metrics" },
              { id: "versions", label: "Versions" },
            ]}
          />
        </Specimen>
      </div>
    </Group>
  );
}

/* ─── Badges ──────────────────────────────────────────────────────────────── */

const TONES: [Tone, string][] = [
  ["success", "Paid"],
  ["warning", "Pending"],
  ["danger", "Failed"],
  ["info", "Trialing"],
  ["purple", "Scheduled"],
  ["neutral", "Refunded"],
];

function Badges() {
  return (
    <Group id="badges" title="Badges and lights">
      <div className="grid gap-8 lg:grid-cols-3">
        <Specimen label="Status" note="14px and 12px, padding in em">
          <div className="flex flex-col gap-3">
            <Row>
              {TONES.map(([t, l]) => (
                <Status key={t} tone={t}>
                  {l}
                </Status>
              ))}
            </Row>
            <Row>
              {TONES.map(([t, l]) => (
                <Status key={t} tone={t} size="sm">
                  {l}
                </Status>
              ))}
            </Row>
          </div>
        </Specimen>
        <Specimen label="Pill and code" note="orbit Pill; a discount code in Geist Mono">
          <Row>
            <Pill color="blue">One-time Product</Pill>
            <Pill color="green">Active</Pill>
            <Pill color="gray">Archived</Pill>
            <Pill color="purple">Beta</Pill>
            <Pill color="yellow">Draft</Pill>
            <Pill color="red">Revoked</Pill>
            <span className="flex items-center gap-2 text-xs text-(--pl-text-muted)">
              Code: <Code>PANETEST</Code>
            </span>
          </Row>
        </Specimen>
        <Specimen label="Status lights" note="8px; a live one breathes">
          <div className="flex flex-col gap-2">
            <Row className="gap-5">
              {TONES.map(([t]) => (
                <StatusDot key={t} tone={t} label={t} />
              ))}
            </Row>
            <Row className="gap-5">
              <StatusLabel tone="success" live>
                Webhook delivering
              </StatusLabel>
              <StatusLabel tone="warning">Retrying</StatusLabel>
              <StatusLabel tone="danger">Endpoint down</StatusLabel>
            </Row>
          </div>
        </Specimen>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Specimen label="Legend" note="a metric's 12px ring; a tooltip's 10px dot">
          <Row className="gap-6">
            <span className="flex items-center gap-2 text-sm text-(--pl-text-muted)">
              <LegendDot /> Sep 30 – Oct 29, 2026
            </span>
            <span className="flex items-center gap-2 text-xs text-(--pl-text-muted)">
              <LegendDot variant="dot" color="var(--pl-chart)" /> Current
            </span>
          </Row>
        </Specimen>
        <Specimen label="Avatar" note="initials in gray-700 on gray-50, a 10% ring inside">
          <Row>
            <Avatar name="Ada Lovelace" size={24} />
            <Avatar name="Ada Lovelace" size={32} />
            <Avatar name="grace@example.com" size={40} />
            <Avatar name="Acme" size={64} />
          </Row>
        </Specimen>
      </div>
    </Group>
  );
}

/* ─── Surfaces ────────────────────────────────────────────────────────────── */

function Surfaces() {
  const [checked, setChecked] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);
  const [theme, setTheme] = useState("system");
  return (
    <Group id="surfaces" title="Surfaces">
      <div className="grid gap-8 lg:grid-cols-3">
        <Specimen label="Panel" note="white, gray-200, 16px corners">
          <Panel className="p-6 text-sm leading-5">A bordered panel holds grids, tables and charts.</Panel>
        </Specimen>
        <Specimen label="Card" note="gray-100, 32px corners">
          <Card>
            <CardHeader>
              <h3 className="text-lg leading-7">Pro</h3>
              <p className="text-sm leading-5 text-(--pl-text-muted)">For entrepreneurs & early teams.</p>
            </CardHeader>
            <CardContent>
              <Button size="sm">Change plan</Button>
            </CardContent>
          </Card>
        </Specimen>
        <Specimen label="Stat card and well">
          <div className="flex flex-col gap-3">
            <StatCard label="Average Order Value" value="$41.83" />
            <Well className="p-6! text-center text-sm leading-5 text-(--pl-text-muted)">A gray-50 well for quiet content</Well>
          </div>
        </Specimen>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Specimen label="List" note="hover a row: its checkbox appears">
          <List>
            {PRODUCTS.slice(0, 3).map((p) => (
              <ListItem
                key={p.id}
                checked={checked.includes(p.id)}
                onCheckedChange={(v) => setChecked((c) => (v ? [...c, p.id] : c.filter((x) => x !== p.id)))}
              >
                <div className="flex flex-1 items-center gap-4 pl-2">
                  <IconTile size={40}>
                    <PackageIcon />
                  </IconTile>
                  <span className="text-sm leading-5">{p.name}</span>
                </div>
                <span className="text-sm leading-5">${(p.price / 100).toFixed(0)}</span>
              </ListItem>
            ))}
          </List>
        </Specimen>
        <Specimen label="List, small" note="discounts and benefits">
          <List size="small">
            <ListItem size="small">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <IconTile>
                  <TagIcon />
                </IconTile>
                <div className="flex flex-col">
                  <span className="text-sm leading-5">Internal test (100%)</span>
                  <span className="flex items-center gap-2 text-xs leading-4 text-(--pl-text-muted)">
                    Code: <Code>PANETEST</Code>
                  </span>
                </div>
              </div>
              <span className="text-sm leading-5">-100%</span>
            </ListItem>
            <ListItem size="small">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <IconTile>
                  <TagIcon />
                </IconTile>
                <div className="flex flex-col">
                  <span className="text-sm leading-5">Launch price</span>
                  <span className="text-xs leading-4 text-(--pl-text-muted)">No code</span>
                </div>
              </div>
              <span className="text-sm leading-5">-$10</span>
            </ListItem>
            <ListItem size="small" onSelect={() => {}}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <IconTile>
                  <BenefitIcon />
                </IconTile>
                <div className="flex flex-col">
                  <span className="text-sm leading-5">Pane license key</span>
                  <span className="text-xs leading-4 text-(--pl-text-muted)">License Keys</span>
                </div>
              </div>
              <ChevronRightIcon className="text-(--pl-text-muted)" />
            </ListItem>
          </List>
        </Specimen>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Specimen label="Settings group" note="split, inline and danger rows">
          <SettingsGroup title="Emails" description="Changes here only apply to you.">
            <SettingsItem
              title="New One-Time Purchases"
              description="Receive a notification when a one-time purchase is made"
              layout="inline"
            >
              <Switch checked={notify} onChange={setNotify} label="New One-Time Purchases" />
            </SettingsItem>
            <SettingsItem title="Theme" description="Override your browser's preferred theme settings" layout="inline">
              <Select
                label="Theme"
                size="sm"
                align="end"
                options={[
                  { id: "system", label: "System" },
                  { id: "light", label: "Light" },
                  { id: "dark", label: "Dark" },
                ]}
                value={theme}
                onChange={setTheme}
              />
            </SettingsItem>
            <SettingsItem
              title="Delete Account"
              description="Permanently delete your account and all associated data. This action cannot be undone."
              layout="inline"
            >
              <Button variant="danger" size="sm">
                Delete
              </Button>
            </SettingsItem>
          </SettingsGroup>
        </Specimen>
        <Specimen label="List group" note="orbit ListGroup">
          <ListGroup>
            <ListGroupItem>
              <div className="flex items-center justify-between gap-4 text-sm leading-5">
                <div className="flex flex-col">
                  <span>temp-agent-setup</span>
                  <span className="text-xs leading-4 text-(--pl-danger)">Expired on October 28, 2026</span>
                </div>
                <Row className="gap-2">
                  <Button size="sm">Update</Button>
                  <Button size="sm" variant="danger">
                    Revoke
                  </Button>
                </Row>
              </div>
            </ListGroupItem>
            <ListGroupItem>
              <div className="flex items-center justify-between gap-4 text-sm leading-5">
                <div className="flex flex-col">
                  <span>app-prod</span>
                  <span className="text-xs leading-4 text-(--pl-text-muted)">Never expires</span>
                </div>
                <Row className="gap-2">
                  <Button size="sm">Update</Button>
                  <Button size="sm" variant="danger">
                    Revoke
                  </Button>
                </Row>
              </div>
            </ListGroupItem>
          </ListGroup>
        </Specimen>
      </div>
    </Group>
  );
}

/* ─── Data ────────────────────────────────────────────────────────────────── */

function Data() {
  const [pageSize, setPageSize] = useState("10");
  const revenue = METRICS.revenue;
  return (
    <Group id="data" title="Data">
      <Specimen label="Table" note="48px gray-50 header, 16px cells, hover a row">
        <div className="flex flex-col gap-6">
          <DataTable columns={ORDER_COLUMNS} rows={ORDERS.slice(0, 4)} rowKey={(o) => o.id} onRowClick={() => {}} />
          <Pagination count={4} pageSize={pageSize} onPageSize={setPageSize} />
        </div>
      </Specimen>
      <div className="grid gap-8 lg:grid-cols-2">
        <Specimen label="Table, loading">
          <DataTable columns={ORDER_COLUMNS.slice(0, 3)} rows={[]} rowKey={(o) => o.id} loading />
        </Specimen>
        <Specimen label="Table, empty">
          <DataTable columns={ORDER_COLUMNS.slice(0, 3)} rows={[]} rowKey={(o) => o.id} />
        </Specimen>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Specimen label="Area chart" note="hover it: cursor line, active dot, card">
          <Panel>
            <AreaChart points={revenue.points("30d")} format={(v) => `$${(v / 100).toFixed(2)}`} />
          </Panel>
        </Specimen>
        <Specimen label="Bar chart">
          <Panel>
            <BarChart points={NEW_CUSTOMERS} height={200} />
          </Panel>
        </Specimen>
      </div>
      <Specimen label="Chart tooltip">
        <div className="w-fit">
          <ChartTooltip label="Oct 15" rows={[{ name: "Current", value: "$412.00" }]} />
        </div>
      </Specimen>
    </Group>
  );
}

/* ─── Feedback ────────────────────────────────────────────────────────────── */

function Feedback() {
  const [shown, setShown] = useState(true);
  return (
    <Group id="feedback" title="Feedback">
      <div className="grid gap-4 lg:grid-cols-2">
        <Alert
          title="These are your personal notifications"
          description="Changes here only apply to you. Other members of this organization keep their own settings."
        />
        <Alert variant="success" title="Identity verified" description="Your identity has been successfully verified." />
        <Alert
          variant="warning"
          title="Payouts are paused"
          description="Finish your account review to resume payouts."
          actions={[{ label: "Continue" }, { label: "Later" }]}
        />
        {shown ? (
          <Alert
            variant="danger"
            title="Webhook endpoint failing"
            description="Last 5 deliveries returned 500."
            onDismiss={() => setShown(false)}
          />
        ) : (
          <Alert variant="info" loading title="Checking the endpoint again…" />
        )}
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <Specimen label="Spinner and skeleton">
          <div className="flex flex-col gap-4">
            <Row className="gap-4 text-(--pl-text-muted)">
              <Spinner />
              <Spinner size={16} />
              <Button loading>Save</Button>
            </Row>
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton width={24} height={24} radius={999} />
                  <Skeleton width="45%" height={12} />
                  <Skeleton width={40} height={12} className="ml-auto" />
                </div>
              ))}
              <Skeleton height={96} radius={16} />
            </div>
          </div>
        </Specimen>
        <Specimen label="Empty state" note="framed, inside a column">
          <EmptyState icon={<ShieldCheckIcon />} title="Nothing at risk">
            No payment issues or scheduled cancellations.
          </EmptyState>
        </Specimen>
        <Specimen label="Empty page" note="no frame, one action">
          <Panel>
            <div className="[&>div]:py-10!">
              <EmptyHero icon={<LinkIcon />} title="No Checkout Links" action={<Button>Create Checkout Link</Button>}>
                Create a new checkout link to share with your customers
              </EmptyHero>
            </div>
          </Panel>
        </Specimen>
      </div>
    </Group>
  );
}

/* ─── Overlays ────────────────────────────────────────────────────────────── */

const METRIC_GROUPS = [
  {
    title: "Revenue",
    options: [
      ["Net Revenue", "Revenue after deducting Polar fees and payment processing costs."],
      ["Cumulative Revenue", "Running total of gross revenue over the selected period."],
      ["Average Order Value", "Mean gross value per completed order."],
    ],
  },
  {
    title: "Orders",
    options: [
      ["One-Time Products", "Number of one-time product purchases completed."],
      ["One-Time Products Revenue", "Gross revenue from one-time product sales."],
    ],
  },
  { title: "Subscriptions", options: [["Active Subscriptions", "Subscriptions active at the end of the period."]] },
];

function Overlays() {
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState(["Revenue", "Monthly Recurring Revenue", "Active Subscriptions", "Orders"]);
  const [discounts, setDiscounts] = useState(true);
  const [billing, setBilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  return (
    <Group id="overlays" title="Overlays">
      <div className="grid gap-8 lg:grid-cols-3">
        <Specimen label="Modal" note="70% scrim, gray-100 frame, white card">
          <Row>
            <Button variant="secondary" size="sm" onClick={() => setModal(true)}>
              Customize
            </Button>
          </Row>
        </Specimen>
        <Specimen label="Sheet" note="540px from the right">
          <Row>
            <Button onClick={() => setSheet(true)}>Create Checkout Link</Button>
          </Row>
        </Specimen>
        <Specimen label="Tooltip" note="hover or focus; 150ms delay">
          <Row className="gap-6">
            <Tooltip content="Share Chart">
              <IconButton label="Share chart" size={40}>
                <ArrowOutwardIcon />
              </IconButton>
            </Tooltip>
            <Tooltip content="Export Customers" side="bottom">
              <IconButton label="Export customers" size={24}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <TooltipBubble>Share Chart</TooltipBubble>
          </Row>
        </Specimen>
      </div>
      <Specimen label="Accordion" note="Customize's metric groups">
        <div className="grid max-w-3xl gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            {selected.map((s) => (
              <ReorderRow key={s} onRemove={() => setSelected((x) => x.filter((y) => y !== s))}>
                {s}
              </ReorderRow>
            ))}
          </div>
          <Accordion>
            {METRIC_GROUPS.map((g, i) => (
              <AccordionItem key={g.title} title={g.title} defaultOpen={i === 0}>
                {g.options.map(([t, d]) => (
                  <OptionRow
                    key={t}
                    title={t}
                    description={d}
                    selected={selected.includes(t)}
                    onSelect={() => setSelected((x) => (x.includes(t) ? x : [...x, t]))}
                  />
                ))}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Specimen>

      <Modal open={modal} onClose={() => setModal(false)} title="Customize Overview Metrics">
        <div className="grid gap-8 p-6 md:grid-cols-2 md:divide-x md:divide-(--pl-border)">
          <div className="flex flex-col gap-4 md:pr-6">
            <div className="flex items-center justify-between text-sm leading-5">
              <span>Selected</span>
              <span>{selected.length}/5</span>
            </div>
            <div className="flex flex-col gap-2">
              {selected.map((s) => (
                <ReorderRow key={s} onRemove={() => setSelected((x) => x.filter((y) => y !== s))}>
                  {s}
                </ReorderRow>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <span className="text-sm leading-5">Metrics</span>
            <Accordion>
              {METRIC_GROUPS.map((g, i) => (
                <AccordionItem key={g.title} title={g.title} defaultOpen={i === 0}>
                  {g.options.map(([t, d]) => (
                    <OptionRow
                      key={t}
                      title={t}
                      description={d}
                      selected={selected.includes(t)}
                      onSelect={() => setSelected((x) => (x.includes(t) || x.length >= 5 ? x : [...x, t]))}
                    />
                  ))}
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
        <ModalFooter>
          <Button
            loading={saving}
            onClick={() => {
              setSaving(true);
              setTimeout(() => {
                setSaving(false);
                setModal(false);
              }, 900);
            }}
          >
            Save
          </Button>
        </ModalFooter>
      </Modal>

      <Sheet
        open={sheet}
        onClose={() => {
          setSheet(false);
          setTried(false);
        }}
        title="Create Checkout Link"
      >
        <Field label="Label" description="Helpful if you have multiple links - internal & optional." small>
          <Input />
        </Field>
        <Field
          label="Products"
          error={tried ? "At least one product is required" : undefined}
          description="The customer will be able to switch between these products at checkout."
        >
          <Select label="Products" placeholder="Select one or more products" options={[]} value="" onChange={() => {}} />
        </Field>
        <Field label="Success URL" description="Include {CHECKOUT_ID} to receive the Checkout ID on success." small>
          <Input placeholder="https://example.com/success?checkout_id={CHECKOUT_ID}" />
        </Field>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm leading-none font-medium">Allow discount codes</span>
            <span className="text-xs leading-4 text-(--pl-text-muted)">
              {discounts
                ? "Customers will be able to apply discount codes at checkout."
                : "Customers won't be able to apply discount codes at checkout."}
            </span>
          </div>
          <Switch checked={discounts} onChange={setDiscounts} label="Allow discount codes" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm leading-none font-medium">Require billing address</span>
            <span className="text-xs leading-4 text-(--pl-text-muted)">
              Customers will just need to provide their country at checkout.
            </span>
          </div>
          <Switch checked={billing} onChange={setBilling} label="Require billing address" />
        </div>
        <div>
          <Button onClick={() => setTried(true)}>Create Link</Button>
        </div>
      </Sheet>
    </Group>
  );
}

/** components/ui laid out with each state: the design system, v1 */
export function DesignSystemPage() {
  const [current, setCurrent] = useState<GroupId>("foundations");
  return (
    <PageCard className="px-8">
      <div className="flex w-full flex-col pt-8">
        <header className="sticky top-0 z-10 -mx-8 flex flex-col gap-4 bg-(--pl-surface) px-8 pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h1 className="text-2xl leading-8 font-medium text-(--pl-text)">Design System</h1>
            <span className="text-sm leading-5 text-(--pl-text-muted)">v1 · light theme</span>
          </div>
          <div className="overflow-x-auto">
            <Tabs
              label="Sections"
              variant="pill"
              size="small"
              value={current}
              onChange={(id) => {
                setCurrent(id);
                document.getElementById(`ds-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              tabs={GROUPS.map((g) => ({ id: g.id, label: g.label }))}
            />
          </div>
        </header>
        <div className="flex flex-col gap-10 pt-6 pb-16">
          <Foundations />
          <Buttons />
          <Fields />
          <Pickers />
          <Toggles />
          <Navigation />
          <Badges />
          <Surfaces />
          <Data />
          <Feedback />
          <Overlays />
        </div>
      </div>
    </PageCard>
  );
}
