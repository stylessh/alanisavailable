"use client";

import { useState } from "react";
import { ArrowBackIcon, ChevronDownIcon, MinusIcon, PlusIcon, XIcon } from "../icons";
import { Avatar } from "../ui/avatar";
import { Button, IconButton } from "../ui/button";
import { Radio, RadioGroup } from "../ui/controls";
import { Field, Input } from "../ui/field";
import { Spinner } from "../ui/feedback";
import { Code } from "../ui/status";
import { ActionInput, Frame } from "./bits";
import {
  advance,
  isPwyw,
  METERS,
  money,
  per,
  productsFor,
  SEATS,
  SELLER,
  setScenario,
  TYPED_CODE,
  UNITS,
  type Pricing,
  type Product,
  type Scenario,
} from "./scenario";

// The left column: who's selling, what, and what it adds up to. Read from
// Polar's CheckoutOrderSummary and the pieces it lays out, top to bottom.

export type Local = {
  product: Product;
  setProduct: (p: Product) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  amount: number;
  setAmount: (cents: number) => void;
};

/** The seller, 24px avatar and name, after a back arrow to where the buyer came from */
export function SellerHeader() {
  return (
    <div className="flex items-center gap-3">
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        aria-label={`Back to ${SELLER.returnUrl}`}
        className="flex size-6 items-center justify-center rounded-(--pl-radius-full) text-(--pl-text-muted) transition-colors hover:text-(--pl-text)"
      >
        <ArrowBackIcon size={18} />
      </a>
      <span className="flex items-center gap-2 text-sm leading-5 text-(--pl-text)">
        <Avatar name={SELLER.name} size={24} />
        {SELLER.name}
      </span>
    </div>
  );
}

/** The amount, pulsing while an update that changes it is in flight */
function Amount({ children, pending }: { children: React.ReactNode; pending?: boolean }) {
  return <span className={`tabular-nums ${pending ? "pl-pulse" : ""}`}>{children}</span>;
}

/** CheckoutHeroPrice, or CheckoutTrialHeroPrice with a trial */
function Hero({ p, pending }: { p: Pricing; pending: boolean }) {
  if (p.trial)
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[32px] leading-10 font-[450] tracking-[-0.01em] text-(--pl-text)">{p.trial.days} days free</span>
        <span className="text-sm leading-5 text-(--pl-text-muted)">
          {p.temporaryDiscount ? (
            `Free until ${p.trial.until}`
          ) : (
            <>
              Then{" "}
              <strong className="font-semibold text-(--pl-text-secondary)">
                <Amount pending={pending}>{p.trial.then}</Amount>
              </strong>{" "}
              starting {p.trial.until}
            </>
          )}
        </span>
      </div>
    );
  return (
    <span className="text-[32px] leading-10 font-[450] tracking-[-0.01em] text-(--pl-text)">
      <Amount pending={pending}>{p.hero}</Amount>
    </span>
  );
}

/** CheckoutProductSwitcher: a radio row per product, its billing under its name and its price on the right */
function Switcher({ local }: { local: Local }) {
  const products = productsFor("switcher");
  return (
    <Frame>
      <RadioGroup
        label="Plan"
        value={local.product.id}
        onChange={(id) => local.setProduct(products.find((p) => p.id === id) ?? local.product)}
        className="gap-0!"
      >
        {products.map((product, i) => {
          const on = product.id === local.product.id;
          return (
            <label
              key={product.id}
              className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                i ? "shadow-[inset_0_0.5px_0_var(--pl-hairline)]" : ""
              } ${on ? "bg-(--pl-subtle)" : "hover:bg-(--pl-subtle)"}`}
            >
              <Radio value={product.id} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm leading-5 font-medium text-(--pl-text)">{product.name}</span>
                <span className="text-xs leading-4 text-(--pl-text-muted)">
                  {product.interval ? `Billed ${product.interval}ly` : "One-time purchase"}
                </span>
              </span>
              <span className="text-sm leading-5 text-(--pl-text) tabular-nums">
                {money(product.price)}
                {per(product.interval)}
              </span>
            </label>
          );
        })}
      </RadioGroup>
    </Frame>
  );
}

/** CheckoutPWYWForm: "Name a fair price", with the minimum beside the label and the rule checked as you leave the field */
function PayWhatYouWant({ s, local }: { s: Scenario; local: Local }) {
  const minimum = local.product.price;
  const [text, setText] = useState((local.amount / 100).toString());
  const [error, setError] = useState<string | null>(null);
  const check = (cents: number) => {
    if (minimum === 0 && cents > 0 && cents < 50) return `Amount must be ${money(0)} or at least ${money(50)}`;
    if (cents < minimum) return `Amount must be at least ${money(minimum)}`;
    return null;
  };
  return (
    <Field
      label={
        <>
          Name a fair price
          {minimum > 0 && <span className="font-normal text-(--pl-text-muted)"> · {money(minimum)} minimum</span>}
        </>
      }
      error={error}
      description={s.offer === "pwyw-free" && !error ? "Enter $0 to get it for free." : undefined}
    >
      <Input
        inputMode="decimal"
        prefix={<span className="text-sm">$</span>}
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ""))}
        onBlur={() => {
          const cents = Math.round((parseFloat(text) || 0) * 100);
          const problem = check(cents);
          setError(problem);
          if (!problem) local.setAmount(cents);
        }}
      />
    </Field>
  );
}

/** CheckoutSeatSelector and CheckoutUnitSelector: − n +, the number editable, its limits under it */
function Quantity({ s, local, pending }: { s: Scenario; local: Local; pending: boolean }) {
  const seats = s.offer === "seats";
  const { min, max } = seats ? SEATS : UNITS;
  const [editing, setEditing] = useState<string | null>(null);
  const n = local.quantity;
  const commit = () => {
    const v = parseInt(editing ?? "", 10);
    if (!isNaN(v) && v >= min && v <= max) local.setQuantity(v);
    setEditing(null);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <span className="flex flex-col">
          <span className="text-sm leading-5 font-medium text-(--pl-text)">{seats ? "Seats" : "Number of packs"}</span>
          <span className="text-xs leading-4 text-(--pl-text-muted)">
            {seats ? `${min} - ${max} seats` : `${money(local.product.price)} per ${UNITS.label} · 1,000 minutes each`}
          </span>
        </span>
        <div className="flex h-10 items-center gap-1 rounded-(--pl-radius-full) bg-(--pl-field) p-1 shadow-(--pl-shadow-sm)">
          <IconButton
            size={32}
            label={seats ? "Remove a seat" : "Remove a pack"}
            disabled={n <= min || pending}
            onClick={() => local.setQuantity(n - 1)}
          >
            <MinusIcon />
          </IconButton>
          {editing !== null ? (
            <input
              autoFocus
              inputMode="numeric"
              aria-label={seats ? "Number of seats" : "Number of packs"}
              value={editing}
              onChange={(e) => /^\d*$/.test(e.target.value) && setEditing(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditing(null);
              }}
              className="h-8 w-10 rounded-(--pl-radius-sm) bg-transparent text-center text-sm leading-5 text-(--pl-text) tabular-nums"
            />
          ) : (
            <button
              type="button"
              title="Click to edit"
              aria-label={`${n} ${seats ? "seats" : "packs"}, click to edit`}
              onClick={() => setEditing(String(n))}
              className="h-8 w-10 cursor-text rounded-(--pl-radius-sm) text-center text-sm leading-5 text-(--pl-text) tabular-nums"
            >
              {pending ? <Spinner size={14} className="mx-auto text-(--pl-text-muted)" /> : n}
            </button>
          )}
          <IconButton
            size={32}
            label={seats ? "Add a seat" : "Add a pack"}
            disabled={n >= max || pending}
            onClick={() => local.setQuantity(n + 1)}
          >
            <PlusIcon />
          </IconButton>
        </div>
      </div>
      {s.step === "update-failed" && (
        <p role="alert" className="text-sm leading-5 font-medium text-(--pl-error)">
          {seats ? "Failed to update seats" : "Failed to update units"}. Try again in a moment.
        </p>
      )}
    </div>
  );
}

/** CheckoutPricingBreakdown: the rows on the raised card, the total on the frame under it */
function Breakdown({ p, pending }: { p: Pricing; pending: boolean }) {
  return (
    <Frame
      footer={
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-4 text-sm leading-5">
            <span className="font-medium text-(--pl-text)">
              {p.total.label}
              {p.total.detail && <span className="font-normal text-(--pl-text-muted)"> · {p.total.detail}</span>}
            </span>
            <span className={`font-medium ${p.dueToday ? "text-(--pl-text-secondary)" : "text-(--pl-text)"}`}>
              <Amount pending={pending}>{p.total.amount}</Amount>
            </span>
          </div>
          {p.dueToday && (
            <div className="flex items-baseline justify-between gap-4 text-sm leading-5 font-medium text-(--pl-text)">
              <span>Due today</span>
              <span className="tabular-nums">{p.dueToday}</span>
            </div>
          )}
        </div>
      }
    >
      <dl className="flex flex-col gap-2 px-4 py-3.5">
        {p.rows.map((row) => (
          <div key={row.label} className="flex min-h-5 items-start justify-between gap-4 text-sm leading-5">
            <dt className="flex min-w-0 flex-col text-(--pl-text-secondary)">
              <span className="flex flex-wrap items-center gap-x-1.5">
                {row.label}
                {row.code && <Code>{row.code}</Code>}
                {row.removable && (
                  <IconButton size={24} label={`Remove ${row.code}`} onClick={() => setScenario({ discount: "button" })} className="-my-1 -ml-0.5">
                    <XIcon size={14} />
                  </IconButton>
                )}
                {row.detail && !row.code && <span className="text-(--pl-text-muted)">{row.detail}</span>}
              </span>
              {row.detail && row.code && <span className="text-xs leading-4 text-(--pl-text-muted)">{row.detail}</span>}
            </dt>
            <dd className="shrink-0 text-(--pl-text-secondary)">
              <Amount pending={pending}>{row.amount}</Amount>
            </dd>
          </div>
        ))}
      </dl>
    </Frame>
  );
}

/**
 * CheckoutDiscountInput, collapsible: a quiet button until asked for, then a
 * field with Apply inside it. Applying checks the code (LAUNCH20 and
 * WELCOME50 exist); an applied code moves into the breakdown as a chip with
 * its own remove, so the field never sits empty and locked.
 */
function DiscountControl({ s }: { s: Scenario }) {
  const [code, setCode] = useState(TYPED_CODE);
  if (s.discount === "none" || s.discount === "code" || s.discount === "automatic" || s.discount === "temporary") return null;
  if (s.discount === "button")
    return (
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setScenario({ discount: "entering" })}>
          Add discount code
        </Button>
      </div>
    );
  const applying = s.discount === "applying";
  const apply = () => {
    const known = code.trim().toUpperCase();
    setScenario({ discount: "applying" });
    advance("discount", "applying", known === "LAUNCH20" ? "code" : known === "WELCOME50" ? "temporary" : "invalid", 700);
  };
  return (
    <Field error={s.discount === "invalid" ? `${code.trim().toUpperCase() || TYPED_CODE} isn't a valid code for this order.` : undefined}>
      <ActionInput
        label="Discount code"
        placeholder="Discount code"
        mono={!!code}
        value={code}
        onChange={(v) => {
          setCode(v);
          if (s.discount === "invalid") setScenario({ discount: "entering" });
        }}
        onEnter={apply}
        action={
          <span className="flex items-center gap-1">
            {code && (
              <Button variant="secondary" size="sm" loading={applying} onClick={apply}>
                Apply
              </Button>
            )}
            <IconButton size={32} label="Close discount code" onClick={() => setScenario({ discount: "button" })}>
              <XIcon size={14} />
            </IconButton>
          </span>
        }
      />
    </Field>
  );
}

/** MeteredChargesDetails: what usage costs on top, folded under one line until opened */
function Metered() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-fit cursor-pointer items-center gap-1 rounded-(--pl-radius-sm) text-sm leading-5 text-(--pl-text-secondary) transition-colors hover:text-(--pl-text)"
      >
        Additional metered charges may apply
        <ChevronDownIcon className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <Frame>
          <div className="flex flex-col">
            {METERS.map((m, i) => (
              <div key={m.name} className={`flex flex-col gap-2 px-4 py-3 ${i ? "shadow-[inset_0_0.5px_0_var(--pl-hairline)]" : ""}`}>
                <div className="flex items-baseline justify-between gap-4 text-sm leading-5">
                  <span className="font-medium text-(--pl-text)">{m.name}</span>
                  <span className="text-(--pl-text-secondary)">{m.rate}</span>
                </div>
                {m.included && <span className="text-xs leading-4 text-(--pl-text-muted)">{m.included} included every month</span>}
                {m.tiers && (
                  <>
                    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-(--pl-radius-sm) bg-(--pl-subtle) px-3 py-2 text-xs leading-4">
                      {m.tiers.map((t) => (
                        <div key={t.range} className="contents">
                          <dt className="text-(--pl-text-muted) tabular-nums">{t.range}</dt>
                          <dd className="text-right text-(--pl-text-secondary) tabular-nums">{t.rate}</dd>
                        </div>
                      ))}
                    </dl>
                    {m.volume && (
                      <span className="text-xs leading-4 text-(--pl-text-muted)">
                        All usage is billed at the rate for the range it falls in
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </Frame>
      )}
    </div>
  );
}

/** CheckoutProductDescription: clamped to four lines on a phone, with Read more */
function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1 border-t border-(--pl-border) pt-6">
      <p
        className={`text-[15px] leading-6 text-pretty text-(--pl-text-secondary) ${open ? "" : "line-clamp-3 @3xl:line-clamp-none"}`}
      >
        {text}
      </p>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-fit cursor-pointer rounded-(--pl-radius-sm) text-sm leading-5 font-medium text-(--pl-text) @3xl:hidden"
        >
          Read more
        </button>
      )}
    </div>
  );
}

/** The whole summary: product, price, its controls, the breakdown and the description */
export function OrderSummary({ s, p, local, pending }: { s: Scenario; p: Pricing; local: Local; pending: boolean }) {
  const quantity = s.offer === "seats" || s.offer === "units";
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-sm leading-5 font-medium text-(--pl-text)">{p.product.name}</span>
        <Hero p={p} pending={pending} />
        {s.offer === "metered" && <Metered />}
      </div>
      {s.offer === "switcher" && <Switcher local={local} />}
      {isPwyw(s.offer) && <PayWhatYouWant s={s} local={local} />}
      {!p.freeProduct && (
        <div className="flex flex-col gap-4">
          {quantity && <Quantity s={s} local={local} pending={pending} />}
          <Breakdown p={p} pending={pending} />
          {!isPwyw(s.offer) && <DiscountControl s={s} />}
        </div>
      )}
      <Description text={p.product.description} />
    </div>
  );
}

/**
 * CheckoutCollapsibleOrderSummary: on a phone, a single fixed-price product
 * folds its summary under a full-width bar with the price on it.
 */
export function CollapsibleSummary({ p, children }: { p: Pricing; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="-mx-4 flex cursor-pointer items-center justify-between gap-4 border-y border-(--pl-border) bg-(--pl-subtle) px-4 py-3 text-sm leading-5 font-medium text-(--pl-text) @3xl:hidden"
      >
        <span className="flex items-center gap-1">
          Order summary
          <ChevronDownIcon className={`translate-y-px transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
        <span className="flex flex-col items-end text-right">
          {p.trial ? (
            <>
              <span>{p.trial.days} days free</span>
              <span className="text-xs leading-4 font-normal text-(--pl-text-muted)">Then {p.trial.then}</span>
            </>
          ) : (
            p.hero
          )}
        </span>
      </button>
      <div className={`pt-8 pb-8 @3xl:pt-0 @3xl:pb-0 ${open ? "flex flex-col" : "hidden @3xl:flex @3xl:flex-col"}`}>{children}</div>
    </div>
  );
}
