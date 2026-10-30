"use client";

import { useSyncExternalStore } from "react";

// The checkout as a set of independent axes (STATES.md lists every value and
// where Polar decides it). The scenario lives in the hash, after #checkout,
// so any state can be linked to: #checkout?offer=trial&step=3ds. Values left
// at their default stay out of the URL.

export type Offer =
  | "one-time"
  | "monthly"
  | "yearly"
  | "trial"
  | "trial-used"
  | "free"
  | "pwyw"
  | "pwyw-free"
  | "seats"
  | "units"
  | "metered"
  | "switcher";
export type Discount = "none" | "button" | "entering" | "applying" | "invalid" | "code" | "automatic" | "temporary";
export type Tax = "included" | "added" | "pending";
export type Email = "empty" | "filled" | "known" | "invalid";
export type Address = "country" | "us" | "canada" | "full" | "full-errors";
export type Business = "off" | "on" | "typed" | "applied" | "invalid";
export type Fields = "none" | "all" | "errors";
export type Payment = "link" | "link-change" | "card" | "card-invalid" | "wallet" | "loading" | "load-failed";
export type Step =
  | "ready"
  | "updating"
  | "update-failed"
  | "processing"
  | "3ds"
  | "3ds-failed"
  | "declined"
  | "already"
  | "unavailable"
  | "test-mode"
  | "expired"
  | "confirming"
  | "confirm-action"
  | "failed"
  | "granting"
  | "success";
export type Viewport = "desktop" | "mobile";

export type Scenario = {
  offer: Offer;
  discount: Discount;
  tax: Tax;
  email: Email;
  address: Address;
  business: Business;
  fields: Fields;
  payment: Payment;
  step: Step;
  viewport: Viewport;
};

type Axis<K extends keyof Scenario> = {
  key: K;
  label: string;
  options: { id: Scenario[K]; label: string }[];
};

// The picker's axes, in the order the checkout reads top to bottom
export const AXES = [
  {
    key: "offer",
    label: "Offer",
    options: [
      { id: "one-time", label: "One-time" },
      { id: "monthly", label: "Subscription, monthly" },
      { id: "yearly", label: "Subscription, yearly" },
      { id: "trial", label: "Free trial" },
      { id: "trial-used", label: "Trial already used" },
      { id: "free", label: "Free product" },
      { id: "pwyw", label: "Pay what you want" },
      { id: "pwyw-free", label: "Pay what you want, free allowed" },
      { id: "seats", label: "Seats" },
      { id: "units", label: "Units" },
      { id: "metered", label: "Metered usage" },
      { id: "switcher", label: "Several products" },
    ],
  },
  {
    key: "discount",
    label: "Discount",
    options: [
      { id: "none", label: "Not offered" },
      { id: "button", label: "Add button" },
      { id: "entering", label: "Code typed" },
      { id: "applying", label: "Applying" },
      { id: "invalid", label: "Invalid code" },
      { id: "code", label: "Code applied, 20%" },
      { id: "automatic", label: "Automatic, no code" },
      { id: "temporary", label: "Limited-time, 3 months" },
    ],
  },
  {
    key: "tax",
    label: "Taxes",
    options: [
      { id: "included", label: "Included in the price" },
      { id: "added", label: "Added on top" },
      { id: "pending", label: "Not known yet" },
    ],
  },
  {
    key: "email",
    label: "Email",
    options: [
      { id: "empty", label: "Empty" },
      { id: "filled", label: "Filled" },
      { id: "known", label: "Known customer" },
      { id: "invalid", label: "Missing" },
    ],
  },
  {
    key: "payment",
    label: "Payment method",
    options: [
      { id: "link", label: "Link, saved card" },
      { id: "link-change", label: "Link, changing card" },
      { id: "card", label: "New card" },
      { id: "card-invalid", label: "New card, invalid" },
      { id: "wallet", label: "Apple Pay" },
      { id: "loading", label: "Loading" },
      { id: "load-failed", label: "Failed to load" },
    ],
  },
  {
    key: "address",
    label: "Billing address",
    options: [
      { id: "country", label: "Country only" },
      { id: "us", label: "United States" },
      { id: "canada", label: "Canada" },
      { id: "full", label: "Full address" },
      { id: "full-errors", label: "Full address, with errors" },
    ],
  },
  {
    key: "business",
    label: "Business purchase",
    options: [
      { id: "off", label: "Off" },
      { id: "on", label: "On" },
      { id: "typed", label: "Tax ID typed" },
      { id: "applied", label: "Tax ID applied" },
      { id: "invalid", label: "Tax ID invalid" },
    ],
  },
  {
    key: "fields",
    label: "Custom fields",
    options: [
      { id: "none", label: "None" },
      { id: "all", label: "One of each type" },
      { id: "errors", label: "With errors" },
    ],
  },
  {
    key: "step",
    label: "Moment",
    options: [
      { id: "ready", label: "Ready to pay" },
      { id: "test-mode", label: "Seller in test mode" },
      { id: "unavailable", label: "Payments unavailable" },
      { id: "updating", label: "Updating price" },
      { id: "update-failed", label: "Quantity update failed" },
      { id: "processing", label: "Processing" },
      { id: "3ds", label: "3-D Secure" },
      { id: "3ds-failed", label: "3-D Secure not completed" },
      { id: "declined", label: "Card declined" },
      { id: "already", label: "Already subscribed" },
      { id: "confirming", label: "Confirming order" },
      { id: "confirm-action", label: "Confirm payment" },
      { id: "failed", label: "Order failed" },
      { id: "granting", label: "Paid, granting benefits" },
      { id: "success", label: "Paid" },
      { id: "expired", label: "Checkout expired" },
    ],
  },
] as const satisfies Axis<keyof Scenario>[];

export const DEFAULT: Scenario = {
  offer: "one-time",
  discount: "button",
  tax: "included",
  email: "filled",
  address: "country",
  business: "off",
  fields: "none",
  payment: "link",
  step: "ready",
  viewport: "desktop",
};

const VALID: Record<string, readonly string[]> = {
  ...Object.fromEntries(AXES.map((a) => [a.key, a.options.map((o) => o.id as string)])),
  viewport: ["desktop", "mobile"],
};

export const CHECKOUT_HASH = "#checkout";

function parse(hash: string): Scenario {
  const query = new URLSearchParams(hash.split("?")[1] ?? "");
  const s = { ...DEFAULT } as Record<keyof Scenario, string>;
  for (const key of Object.keys(DEFAULT) as (keyof Scenario)[]) {
    const v = query.get(key);
    if (v && VALID[key].includes(v)) s[key] = v;
  }
  return s as Scenario;
}

function serialize(s: Scenario) {
  const query = new URLSearchParams();
  for (const key of Object.keys(DEFAULT) as (keyof Scenario)[]) if (s[key] !== DEFAULT[key]) query.set(key, s[key]);
  const q = query.toString();
  return q ? `${CHECKOUT_HASH}?${q}` : CHECKOUT_HASH;
}

// One store over the hash: the picker and the checkout's own controls both
// write to it, and replaceState keeps every change out of the back button.
const listeners = new Set<() => void>();
let cache: { hash: string; scenario: Scenario } | null = null;

function read() {
  const hash = window.location.hash;
  if (cache?.hash !== hash) cache = { hash, scenario: parse(hash) };
  return cache.scenario;
}

/** Move one axis on after a while, unless something else moved it first */
export function advance<K extends keyof Scenario>(key: K, from: Scenario[K], to: Scenario[K], ms: number) {
  setTimeout(() => {
    if (read()[key] === from) setScenario({ [key]: to } as Partial<Scenario>);
  }, ms);
}

export function setScenario(change: Partial<Scenario>) {
  const next = { ...read(), ...change };
  history.replaceState(null, "", serialize(next));
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener("hashchange", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("hashchange", l);
  };
};

export function useScenario() {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}

// ——— What Acme sells ———————————————————————————————————————————————

export const SELLER = { name: "Acme", returnUrl: "acme.dev/pricing" };

export type Interval = "month" | "year" | null;

export type Product = {
  id: string;
  name: string;
  description: string;
  interval: Interval;
  /** the price in cents: per seat or per unit for those, the floor for pay what you want */
  price: number;
};

const PRO_COPY =
  "The command line for shipping: preview every branch, roll back in one keystroke, and keep secrets out of your repo. Includes priority support and every update while you're subscribed.";

export const PRODUCTS = {
  lifetime: {
    id: "lifetime",
    name: "Acme Lifetime",
    description:
      "Acme Pro, paid once. Every feature, a year of updates, and the version you have is yours to keep. Use it on up to 3 machines.",
    interval: null,
    price: 24900,
  },
  monthly: { id: "monthly", name: "Acme Pro", description: PRO_COPY, interval: "month", price: 2900 },
  yearly: { id: "yearly", name: "Acme Pro (Yearly)", description: PRO_COPY, interval: "year", price: 29000 },
  hobby: {
    id: "hobby",
    name: "Acme Hobby",
    description: "For side projects: one workspace, three previews at a time, and community support. Free for as long as you like.",
    interval: null,
    price: 0,
  },
  sponsor: {
    id: "sponsor",
    name: "Sponsor Acme",
    description: "Acme's CLI is open source. Pay what it's worth to you; every sponsor gets their name in the release notes.",
    interval: null,
    price: 500,
  },
  sponsorFree: {
    id: "sponsor-free",
    name: "Acme Field Guide",
    description: "The 140-page guide to shipping with Acme, as a PDF and an EPUB. Free, or pay what you like.",
    interval: null,
    price: 0,
  },
  team: {
    id: "team",
    name: "Acme Team",
    description: "Acme Pro for everyone on your team, with shared environments, audit logs and SSO. You claim the first seat.",
    interval: "month",
    price: 1200,
  },
  credits: {
    id: "credits",
    name: "Usage Credits",
    description: "Prepaid build minutes, 1,000 to a pack. They never expire and work across every Acme workspace.",
    interval: null,
    price: 1000,
  },
} satisfies Record<string, Product>;

/** The base fee under the team plan's per-seat price */
export const TEAM_BASE = 4900;
export const SEATS = { min: 2, max: 50, initial: 5 };
export const UNITS = { min: 1, max: 100, initial: 3, label: "pack", plural: "packs" };
export const PWYW_INITIAL = { pwyw: 2000, "pwyw-free": 0 };

/** The metered prices under Acme Pro on the metered offer */
export const METERS = [
  {
    name: "API requests",
    included: "10,000 requests",
    rate: "$0.40 / 1,000 requests",
  },
  {
    name: "Build minutes",
    rate: "From $0.006 / minute",
    tiers: [
      { range: "1–1,000", rate: "$0.010" },
      { range: "1,001–10,000", rate: "$0.008" },
      { range: "10,001+", rate: "$0.006" },
    ],
    volume: true,
  },
];

/** The offer's products: one, or the switcher's three */
export function productsFor(offer: Offer): Product[] {
  switch (offer) {
    case "one-time":
      return [PRODUCTS.lifetime];
    case "monthly":
    case "trial":
    case "trial-used":
    case "metered":
      return [PRODUCTS.monthly];
    case "yearly":
      return [PRODUCTS.yearly];
    case "free":
      return [PRODUCTS.hobby];
    case "pwyw":
      return [PRODUCTS.sponsor];
    case "pwyw-free":
      return [PRODUCTS.sponsorFree];
    case "seats":
      return [PRODUCTS.team];
    case "units":
      return [PRODUCTS.credits];
    case "switcher":
      return [PRODUCTS.monthly, PRODUCTS.yearly, PRODUCTS.lifetime];
  }
}

export const isPwyw = (offer: Offer) => offer === "pwyw" || offer === "pwyw-free";
export const hasTrial = (offer: Offer) => offer === "trial";

// ——— Discounts ————————————————————————————————————————————————————

type DiscountDef = { name: string; code: string | null; percent?: number; amount?: number; months?: number };

export const DISCOUNTS = {
  code: { name: "Launch week", code: "LAUNCH20", percent: 20 },
  automatic: { name: "Launch price", code: null, amount: 1000 },
  temporary: { name: "Welcome offer", code: "WELCOME50", percent: 50, months: 3 },
} satisfies Record<string, DiscountDef>;

export const TYPED_CODE = "SPRING";

const appliedDiscount = (d: Discount): DiscountDef | null =>
  d === "code" || d === "automatic" || d === "temporary" ? DISCOUNTS[d] : null;

// ——— Taxes, by the billing address's country ————————————————————————

export const COUNTRIES = [
  { id: "NL", label: "Netherlands", rate: 0.21 },
  { id: "US", label: "United States", rate: 0.08875 },
  { id: "CA", label: "Canada", rate: 0.13 },
  { id: "DE", label: "Germany", rate: 0.19 },
  { id: "FR", label: "France", rate: 0.2 },
  { id: "GB", label: "United Kingdom", rate: 0.2 },
  { id: "ES", label: "Spain", rate: 0.21 },
  { id: "SE", label: "Sweden", rate: 0.25 },
  { id: "JP", label: "Japan", rate: 0.1 },
  { id: "AU", label: "Australia", rate: 0.1 },
  { id: "BR", label: "Brazil", rate: 0 },
  { id: "IN", label: "India", rate: 0.18 },
];

export const countryFor = (a: Address) => (a === "us" || a === "full" || a === "full-errors" ? "US" : a === "canada" ? "CA" : "NL");

// ——— The price, worked out ——————————————————————————————————————————

export type Row = { label: string; detail?: string; amount: string; code?: string | null; removable?: boolean };

export type Pricing = {
  product: Product;
  interval: Interval;
  /** nothing to pay: no payment form, "Get for free" */
  free: boolean;
  /** no breakdown at all (a free product) */
  freeProduct: boolean;
  hero: string;
  rows: Row[];
  total: { label: string; detail?: string; amount: string };
  dueToday?: string;
  trial?: { days: number; then: string; until: string };
  temporaryDiscount: boolean;
  cta: string;
};

const dollars = (cents: number) => {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
};

export const money = (cents: number) => (cents < 0 ? `−${dollars(-cents)}` : dollars(cents));

const SHORT = { month: "mo", year: "yr" } as const;
export const per = (interval: Interval) => (interval ? ` / ${SHORT[interval]}` : "");

const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
const addMonths = (d: Date, months: number) => new Date(d.getFullYear(), d.getMonth() + months, d.getDate());

export const longDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const shortDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });

export const TRIAL_DAYS = 14;

export function price(
  s: Scenario,
  local: { product: Product; quantity: number; amount: number },
): Pricing {
  const { product } = local;
  const interval = product.interval;
  const today = new Date();
  const trial = hasTrial(s.offer);
  const trialEnd = addDays(today, TRIAL_DAYS);
  const freeProduct = s.offer === "free";
  const pwyw = isPwyw(s.offer);

  // the subtotal and the rows that add up to it
  const rows: Row[] = [];
  let subtotal = product.price;
  if (s.offer === "seats") {
    subtotal = TEAM_BASE + product.price * local.quantity;
    rows.push({ label: "Base price", amount: money(TEAM_BASE) + per(interval) });
    rows.push({ label: `${local.quantity} seats × ${money(product.price)}`, amount: money(product.price * local.quantity) + per(interval) });
  } else if (s.offer === "units") {
    subtotal = product.price * local.quantity;
    rows.push({
      label: `${local.quantity} ${local.quantity === 1 ? UNITS.label : UNITS.plural} × ${money(product.price)}`,
      amount: money(subtotal),
    });
  } else if (pwyw) subtotal = local.amount;
  rows.push({ label: "Subtotal", amount: money(subtotal) + per(interval) });

  // discounts don't apply to free or pay-what-you-want prices
  const discount = freeProduct || pwyw ? null : appliedDiscount(s.discount);
  const temporaryDiscount = !!discount?.months && !!interval;
  let net = subtotal;
  if (discount) {
    const off = discount.percent ? Math.round((subtotal * discount.percent) / 100) : Math.min(discount.amount ?? 0, subtotal);
    net = subtotal - off;
    const until = discount.months && interval ? `Until ${shortDate(addMonths(trial ? trialEnd : today, discount.months))}` : "";
    rows.push({
      label: discount.name,
      detail: [discount.percent ? `(${discount.percent}%)` : "", until].filter(Boolean).join(" ") || undefined,
      amount: money(-off),
      code: discount.code,
      removable: !!discount.code,
    });
    rows.push({ label: "Taxable amount", amount: money(net) });
  }

  // taxes: a valid tax ID reverse-charges them
  const rate = COUNTRIES.find((c) => c.id === countryFor(s.address))?.rate ?? 0;
  const reverse = s.business === "applied";
  const included = s.tax === "included";
  let tax: number | null = null;
  if (s.tax !== "pending" || reverse) tax = reverse ? 0 : included ? Math.round(net - net / (1 + rate)) : Math.round(net * rate);
  rows.push({
    label: included ? "Taxes (included)" : "Taxes",
    detail: reverse ? "Reverse charge" : undefined,
    amount: tax === null ? "—" : money(tax),
  });
  const total = included || tax === null ? net : net + tax;

  const free = freeProduct || total === 0 || (pwyw && local.amount === 0);
  const totalLabel =
    temporaryDiscount ? (trial ? "Total after trial" : "First payment") : interval === "month" ? "Monthly" : interval === "year" ? "Yearly" : "Total";

  return {
    product,
    interval,
    free,
    freeProduct,
    hero: freeProduct ? "Free" : money(total) + per(interval),
    rows,
    total: {
      label: totalLabel,
      detail: temporaryDiscount && trial ? shortDate(trialEnd) : undefined,
      amount: money(total) + (temporaryDiscount ? "" : per(interval)),
    },
    dueToday: trial ? money(0) : undefined,
    trial: trial
      ? { days: TRIAL_DAYS, then: `${money(total)}/${interval}`, until: longDate(trialEnd) }
      : undefined,
    temporaryDiscount,
    cta: trial ? "Start trial" : free ? "Get for free" : interval ? "Subscribe now" : "Pay now",
  };
}

/** Polar's mandate under the button (MandateText.tsx), split around the Buyer Terms link */
export function mandate(p: Pricing): [string, string] | [string] {
  const by = `By clicking "${p.cta}," you authorize Polar Software, Inc., our online reseller and merchant of record, to`;
  if (p.free)
    return [
      "This order is processed by our online reseller & Merchant of Record, Polar, who also handles order-related inquiries and returns.",
    ];
  if (p.trial)
    return p.temporaryDiscount
      ? [
          `${by} charge your selected payment method the discounted amount shown above at the end of your trial period, and the regular price on each billing date after your discount ends, until you cancel, and agree to the `,
          ". You may cancel at any time before the end of your trial to avoid being charged.",
        ]
      : [
          `${by} charge your selected payment method in the amount shown above at the end of your trial period and on each subsequent billing date until you cancel, and agree to the `,
          ". You may cancel at any time before the end of your trial to avoid being charged.",
        ];
  if (p.interval)
    return p.temporaryDiscount
      ? [
          `${by} immediately charge your selected payment method the discounted amount shown above, and the regular price on each billing date after your discount ends, until you cancel, and agree to the `,
          ".",
        ]
      : [
          `${by} immediately charge your selected payment method in the amount shown above and to charge the same amount on each subsequent billing date until you cancel, and agree to the `,
          ".",
        ];
  return [`${by} charge your selected payment method the amount shown above, and agree to the `, ". This is a one-time charge."];
}
