// A made-up organization for the replica: Acme, selling a developer tool on
// Polar. Nothing here is real customer data. "Today" is fixed so every chart,
// date range and relative time reads the same on every visit.
export const TODAY = new Date(2026, 9, 29); // Oct 29, 2026

export const ORG = {
  name: "Acme",
  slug: "acme",
  id: "4f1c2a9e-7b3d-4e8a-9c21-5d6e0b8a1f37",
  website: "https://acme.dev",
  email: "support@acme.dev",
  social: "https://x.com/acme",
};

const DAY = 86_400_000;

/** A small seeded random, so the charts never change between renders */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export type Point = { date: Date; value: number };

/** One value per day for the last `days` days, ending today */
function series(days: number, seed: number, f: (i: number, r: number) => number): Point[] {
  const rand = seeded(seed);
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(TODAY.getTime() - (days - 1 - i) * DAY),
    value: f(i, rand()),
  }));
}

export type Range = "all" | "12m" | "3m" | "30d" | "today";

export const RANGES: { id: Range; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "12m", label: "12m" },
  { id: "3m", label: "3m" },
  { id: "30d", label: "30d" },
  { id: "today", label: "Today" },
];

const RANGE_DAYS: Record<Range, number> = {
  all: 540,
  "12m": 365,
  "3m": 92,
  "30d": 30,
  today: 1,
};

export type Metric = {
  id: string;
  title: string;
  format: "currency" | "number" | "percent";
  /** how the headline is computed from the points: their sum, or the last one */
  total: "sum" | "last" | "mean";
  points: (range: Range) => Point[];
};

// Cents, as Polar's API returns them
const revenue = (range: Range) =>
  series(RANGE_DAYS[range], 7, (i, r) => Math.round((18_000 + i * 140 + r * 22_000) * (r > 0.9 ? 2.2 : 1)));
const mrr = (range: Range) => series(RANGE_DAYS[range], 11, (i, r) => Math.round(1_480_000 + i * 2_600 + r * 9_000));
const subscriptions = (range: Range) => series(RANGE_DAYS[range], 13, (i, r) => Math.round(512 + i * 0.9 + r * 4));
const orders = (range: Range) => series(RANGE_DAYS[range], 17, (_, r) => Math.round(4 + r * 9));
const conversion = (range: Range) => series(RANGE_DAYS[range], 19, (_, r) => 0.22 + r * 0.14);

export const METRICS: Record<string, Metric> = {
  revenue: {
    id: "revenue",
    title: "Revenue",
    format: "currency",
    total: "sum",
    points: revenue,
  },
  mrr: {
    id: "mrr",
    title: "Monthly Recurring Revenue",
    format: "currency",
    total: "last",
    points: mrr,
  },
  subscriptions: {
    id: "subscriptions",
    title: "Active Subscriptions",
    format: "number",
    total: "last",
    points: subscriptions,
  },
  orders: {
    id: "orders",
    title: "Orders",
    format: "number",
    total: "sum",
    points: orders,
  },
  conversion: {
    id: "conversion",
    title: "Checkouts Conversion Rate",
    format: "percent",
    total: "mean",
    points: conversion,
  },
  netRevenue: {
    id: "netRevenue",
    title: "Net Revenue",
    format: "currency",
    total: "sum",
    points: (range) => revenue(range).map((p) => ({ ...p, value: Math.round(p.value * 0.9) })),
  },
  cumulativeRevenue: {
    id: "cumulativeRevenue",
    title: "Cumulative Revenue",
    format: "currency",
    total: "last",
    points: (range) => {
      let sum = 0;
      return revenue(range).map((p) => ({ ...p, value: (sum += p.value) }));
    },
  },
};

export function metricTotal(metric: Metric, range: Range) {
  const values = metric.points(range).map((p) => p.value);
  if (metric.total === "last") return values.at(-1) ?? 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return metric.total === "mean" ? sum / Math.max(1, values.length) : sum;
}

/** "Sep 30 – Oct 29, 2026", the legend under each metric */
export function rangeLabel(range: Range) {
  const start = new Date(TODAY.getTime() - (RANGE_DAYS[range] - 1) * DAY);
  const md = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const year = TODAY.getFullYear();
  const startText = start.getFullYear() === year ? md(start) : `${md(start)}, ${start.getFullYear()}`;
  return range === "today" ? `${md(TODAY)}, ${year}` : `${startText} – ${md(TODAY)}, ${year}`;
}

export const usd = (cents: number, digits = 0) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function formatMetric(metric: Metric, value: number) {
  if (metric.format === "currency") return usd(value);
  if (metric.format === "percent") return `${(value * 100).toFixed(2)}%`;
  return Math.round(value).toLocaleString("en-US");
}

// Catalogue
export type Product = {
  id: string;
  name: string;
  description: string;
  /** cents */
  price: number;
  interval?: "month" | "year";
  archived?: boolean;
};

export const PRODUCTS: Product[] = [
  {
    id: "p-pro",
    name: "Acme Pro",
    description: "Everything you need to ship solo.",
    price: 2900,
    interval: "month",
  },
  {
    id: "p-pro-y",
    name: "Acme Pro (Yearly)",
    description: "Two months free, billed once a year.",
    price: 29000,
    interval: "year",
  },
  {
    id: "p-team",
    name: "Acme Team",
    description: "Shared workspaces and SSO for up to 25 seats.",
    price: 9900,
    interval: "month",
  },
  {
    id: "p-life",
    name: "Acme Lifetime",
    description: "Pay once, keep every update.",
    price: 24900,
  },
  {
    id: "p-credits",
    name: "Usage Credits",
    description: "1,000 build minutes, never expire.",
    price: 1000,
  },
  {
    id: "p-legacy",
    name: "Acme Basic",
    description: "The original plan.",
    price: 900,
    interval: "month",
    archived: true,
  },
];

export const priceLabel = (p: Product) => `${usd(p.price)}${p.interval ? ` / ${p.interval === "month" ? "mo" : "yr"}` : ""}`;

// Customers
export type Customer = {
  id: string;
  name: string;
  email: string;
  revenue: number;
  orders: number;
  created: Date;
};

const customer = (id: string, name: string, email: string, revenue: number, orders: number, daysAgo: number): Customer => ({
  id,
  name,
  email,
  revenue,
  orders,
  created: new Date(TODAY.getTime() - daysAgo * DAY),
});

export const CUSTOMERS: Customer[] = [
  customer("c1", "Maya Lindqvist", "maya@example.com", 34800, 12, 1),
  customer("c2", "Theo Okafor", "theo.okafor@example.org", 118800, 12, 2),
  customer("c3", "Priya Raman", "priya@example.net", 24900, 1, 3),
  customer("c4", "Jonas Weber", "jonas.weber@example.com", 8700, 3, 5),
  customer("c5", "Lucía Moreno", "lucia@example.org", 29000, 1, 8),
  customer("c6", "Kenji Sato", "kenji.sato@example.com", 5800, 2, 11),
  customer("c7", "Amara Diallo", "amara@example.net", 99000, 10, 14),
  customer("c8", "Oliver Brandt", "oliver@example.com", 2900, 1, 21),
];

/** New customers per day for the Customers overview's bar chart */
export const NEW_CUSTOMERS = series(30, 23, (i, r) => (i > 24 ? Math.round(r * 4) : Math.round(r * 2.4)));

// Orders
export type OrderStatus = "paid" | "refunded" | "partially_refunded" | "pending";
export type Order = {
  id: string;
  date: Date;
  customer: Customer;
  product: Product;
  status: OrderStatus;
  amount: number;
};

const at = (daysAgo: number, h: number, m: number) => {
  const d = new Date(TODAY.getTime() - daysAgo * DAY);
  d.setHours(h, m);
  return d;
};

const find = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id)!;

export const ORDERS: Order[] = [
  ["o1", at(0, 14, 9), "c1", "p-pro", "paid", 2900],
  ["o2", at(0, 9, 41), "c2", "p-team", "paid", 9900],
  ["o3", at(1, 23, 23), "c3", "p-life", "paid", 24900],
  ["o4", at(1, 17, 2), "c4", "p-pro", "paid", 2900],
  ["o5", at(2, 11, 18), "c5", "p-pro-y", "paid", 29000],
  ["o6", at(3, 20, 54), "c6", "p-credits", "refunded", 1000],
  ["o7", at(4, 8, 12), "c7", "p-team", "paid", 9900],
  ["o8", at(5, 15, 37), "c8", "p-pro", "paid", 2900],
  ["o9", at(6, 19, 3), "c1", "p-pro", "paid", 2900],
  ["o10", at(8, 12, 26), "c2", "p-team", "partially_refunded", 9900],
].map(([id, date, c, p, status, amount]) => ({
  id: id as string,
  date: date as Date,
  customer: find(CUSTOMERS, c as string),
  product: find(PRODUCTS, p as string),
  status: status as OrderStatus,
  amount: amount as number,
}));

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/**
 * A moment as you'd say it, from the dashboard's today: "Today, 2:09 PM",
 * "Yesterday, 9:41 AM", the weekday within the week ("Monday, 11:18 PM"),
 * the month and day this year ("Oct 21, 12:26 PM"), the year only before it.
 */
export function formatWhen(d: Date) {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(TODAY) - day(d)) / DAY);
  if (days === 0) return `Today, ${clock(d)}`;
  if (days === 1) return `Yesterday, ${clock(d)}`;
  if (days > 1 && days < 7) return `${d.toLocaleDateString("en-US", { weekday: "long" })}, ${clock(d)}`;
  if (d.getFullYear() === TODAY.getFullYear())
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${clock(d)}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** the whole date and time, for a tooltip on a natural one ("Thursday, October 29, 2026 at 2:09 PM") */
export const formatDateTime = (d: Date) => d.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

// Home timeline
export type TimelineEvent =
  | { kind: "collapsed"; count: number }
  | {
      kind: "event";
      title: string;
      detail: string;
      ago: string;
      icon: "benefit" | "order" | "customer";
    };

export const TIMELINE: TimelineEvent[] = [
  {
    kind: "event",
    title: "Order Paid",
    detail: "$29",
    ago: "2h ago",
    icon: "order",
  },
  { kind: "collapsed", count: 1 },
  {
    kind: "event",
    title: "Benefit Granted",
    detail: "License Keys",
    ago: "5h ago",
    icon: "benefit",
  },
  {
    kind: "event",
    title: "Customer Created",
    detail: "theo.okafor@example.org",
    ago: "9h ago",
    icon: "customer",
  },
  { kind: "collapsed", count: 4 },
  {
    kind: "event",
    title: "Order Paid",
    detail: "$249",
    ago: "1d ago",
    icon: "order",
  },
  {
    kind: "event",
    title: "Benefit Granted",
    detail: "GitHub Repository Access",
    ago: "1d ago",
    icon: "benefit",
  },
];

/** The Revenue widget's last three months, in cents */
export const MONTHLY_REVENUE = [
  { month: "August", value: 612_400 },
  { month: "September", value: 748_900 },
  { month: "October", value: 693_100 },
];

export const BALANCE = 418_260;
