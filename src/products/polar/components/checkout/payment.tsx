"use client";

import { useState } from "react";
import { ChevronRightIcon, LockIcon, MoreVertIcon, PlusIcon } from "../icons";
import { Button, IconButton } from "../ui/button";
import { Radio, RadioGroup } from "../ui/controls";
import { Field, Input } from "../ui/field";
import { Alert, Skeleton } from "../ui/feedback";
import { CardBrand, Frame, LinkMark } from "./bits";
import { setScenario, type Scenario } from "./scenario";

// Where Stripe's Payment Element sits, drawn in Polar's own parts: Link's
// saved card (the screenshot), Link's card list, a new card, a wallet, and
// the element loading or failing to.

const LINK_EMAIL = "maya.lin@example.com";

const SAVED = [
  { id: "visa", brand: "visa", name: "Visa Credit", last4: "4242", expires: "08/29" },
  { id: "mastercard", brand: "mastercard", name: "Mastercard Debit", last4: "4444", expires: "02/28" },
] as const;

/** Link: the account on the frame, the card it will charge raised under it, and a way to change it */
function LinkWallet({ changing }: { changing: boolean }) {
  const [card, setCard] = useState<string>("visa");
  return (
    <Frame
      title={
        <>
          <LinkMark />
          <span className="truncate font-normal text-(--pl-text-secondary)">{LINK_EMAIL}</span>
        </>
      }
      end={
        <IconButton size={24} label="Link options" className="-mr-1 text-(--pl-text-muted)">
          <MoreVertIcon />
        </IconButton>
      }
      footer={
        changing ? (
          <div className="-my-1 flex items-center justify-between">
            <Button variant="ghost" size="sm" className="-ml-2" icon={<PlusIcon size={14} />}>
              Add a card
            </Button>
            <Button variant="ghost" size="sm" className="-mr-2" onClick={() => setScenario({ payment: "card" })}>
              Pay another way
            </Button>
          </div>
        ) : undefined
      }
    >
      {changing ? (
        <RadioGroup label="Card" value={card} onChange={setCard} className="gap-0!">
          {SAVED.map((c, i) => (
            <label
              key={c.id}
              className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-(--pl-subtle) ${
                i ? "shadow-[inset_0_0.5px_0_var(--pl-hairline)]" : ""
              }`}
            >
              <CardBrand brand={c.brand} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm leading-5 text-(--pl-text)">{c.name}</span>
                <span className="text-xs leading-4 text-(--pl-text-muted) tabular-nums">
                  •••• {c.last4} · Expires {c.expires}
                </span>
              </span>
              <Radio value={c.id} />
            </label>
          ))}
        </RadioGroup>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3">
            <CardBrand brand="visa" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm leading-5 text-(--pl-text)">Visa Credit</span>
              <span className="text-xs leading-4 text-(--pl-text-muted) tabular-nums">•••• 4242 · Expires 08/29</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setScenario({ payment: "link-change" })}
            className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm leading-5 text-(--pl-text-secondary) shadow-[inset_0_0.5px_0_var(--pl-hairline)] transition-colors hover:bg-(--pl-subtle) hover:text-(--pl-text)"
          >
            Change payment method
            <ChevronRightIcon className="text-(--pl-text-muted)" />
          </button>
        </div>
      )}
    </Frame>
  );
}

const TABS = [
  { id: "card", label: "Card" },
  { id: "wallet", label: "Apple Pay" },
  { id: "google", label: "Google Pay" },
] as const;

/** The element's tabs: a tile per method, the chosen one raised */
function MethodTabs({ value }: { value: "card" | "wallet" }) {
  return (
    <div role="tablist" aria-label="Payment method" className="grid grid-cols-3 gap-1 rounded-(--pl-radius-md) bg-(--pl-subtle) p-1">
      {TABS.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => t.id !== "google" && setScenario({ payment: t.id })}
            // the label sits low in the tile, more air under it than over the glyph, as a card's caption does
            className={`flex cursor-pointer flex-col items-start gap-2.5 rounded-(--pl-radius-sm) px-3 pt-3 pb-3.5 text-left text-xs leading-4 font-medium transition-colors ${
              on ? "bg-(--pl-raised) text-(--pl-text) shadow-(--pl-shadow-sm)" : "text-(--pl-text-muted) hover:text-(--pl-text-secondary)"
            }`}
          >
            <span className="flex h-4 items-center">
              <MethodGlyph id={t.id} />
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function MethodGlyph({ id }: { id: (typeof TABS)[number]["id"] }) {
  if (id === "card")
    return (
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="0.75" y="0.75" width="18.5" height="12.5" rx="2.25" />
        <path d="M1 4.5h18M4 9.5h4" />
      </svg>
    );
  if (id === "wallet")
    return (
      <svg width="14" height="16" viewBox="0 0 14 17" fill="currentColor" aria-hidden>
        <path d="M11.6 9c0-2 1.7-3 1.8-3a3.9 3.9 0 0 0-3-1.6c-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.8-2.8-.7A4.1 4.1 0 0 0 .9 6.6c-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.2 2.6 2.1 1-.1 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2a8.8 8.8 0 0 0 1.1-2.3A3.6 3.6 0 0 1 11.6 9ZM9.6 2.9A3.6 3.6 0 0 0 10.4.3a3.7 3.7 0 0 0-2.4 1.2 3.4 3.4 0 0 0-.9 2.5 3 3 0 0 0 2.5-1.1Z" />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path fill="#4285F4" d="M15.7 8.2c0-.6 0-1.1-.1-1.6H8v3h4.3a3.7 3.7 0 0 1-1.6 2.4v2h2.6c1.5-1.4 2.4-3.4 2.4-5.8Z" />
      <path fill="#34A853" d="M8 16c2.2 0 4-.7 5.3-2l-2.6-2c-.7.5-1.6.8-2.7.8a4.7 4.7 0 0 1-4.4-3.3H.9v2A8 8 0 0 0 8 16Z" />
      <path fill="#FBBC05" d="M3.6 9.5a4.8 4.8 0 0 1 0-3V4.4H.9a8 8 0 0 0 0 7.2l2.7-2Z" />
      <path fill="#EA4335" d="M8 3.2c1.2 0 2.3.4 3.2 1.2l2.3-2.3A8 8 0 0 0 .9 4.4l2.7 2.1A4.7 4.7 0 0 1 8 3.2Z" />
    </svg>
  );
}

type Brand = "visa" | "mastercard" | "amex";
const BRANDS: Brand[] = ["visa", "mastercard", "amex"];

/** The network a number belongs to, from its first digits (IIN ranges) */
const detect = (digits: string): Brand | null =>
  /^4/.test(digits) ? "visa" : /^(5[1-5]|2[2-7])/.test(digits) ? "mastercard" : /^3[47]/.test(digits) ? "amex" : null;

/** Grouped as the card is printed: 4 4 4 4, or 4 6 5 for Amex */
function groupNumber(digits: string, brand: Brand | null) {
  const sizes = brand === "amex" ? [4, 6, 5] : [4, 4, 4, 4];
  const groups: string[] = [];
  let at = 0;
  for (const size of sizes) {
    if (at >= digits.length) break;
    groups.push(digits.slice(at, at + size));
    at += size;
  }
  return groups.join(" ");
}

const onlyDigits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

/** Luhn's checksum, which every real card number passes */
function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return sum % 10 === 0;
}

/**
 * A new card: number, expiry and CVC. The number groups itself as you type
 * and the network it belongs to lights up among the ones Acme takes (the
 * rest fade back); leaving it short or failing its checksum says so.
 */
function CardForm({ invalid }: { invalid: boolean }) {
  const [digits, setDigits] = useState(invalid ? "424242424242" : "");
  const [touched, setTouched] = useState(invalid);
  const [expiry, setExpiry] = useState(invalid ? "0829" : "");
  const [cvc, setCvc] = useState(invalid ? "123" : "");
  const brand = detect(digits);
  const length = brand === "amex" ? 15 : 16;
  const error = !touched || !digits
    ? undefined
    : digits.length < length
      ? "Your card number is incomplete."
      : !luhn(digits)
        ? "Your card number is invalid."
        : undefined;
  return (
    <div className="flex flex-col gap-4">
      <MethodTabs value="card" />
      <Field label="Card number" error={error}>
        <Input
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 1234 1234 1234"
          value={groupNumber(digits, brand)}
          onChange={(e) => {
            const next = onlyDigits(e.target.value, 16);
            setDigits(detect(next) === "amex" ? next.slice(0, 15) : next);
          }}
          onBlur={() => setTouched(true)}
          className="tabular-nums"
          // clear of the three network tiles at its end
          style={{ paddingRight: 124 }}
          suffix={
            <span className="flex gap-1">
              {BRANDS.map((b) => (
                <span
                  key={b}
                  className={`flex transition-[opacity,filter] duration-(--pl-base) ${
                    brand && b !== brand ? "opacity-25 grayscale" : ""
                  }`}
                >
                  <CardBrand brand={b} />
                </span>
              ))}
            </span>
          }
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expiration date">
          <Input
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            className="tabular-nums"
            value={expiry.length > 2 ? `${expiry.slice(0, 2)} / ${expiry.slice(2)}` : expiry}
            // the separator only shows once the year starts, so backspacing never gets stuck on it
            onChange={(e) => setExpiry(onlyDigits(e.target.value, 4))}
          />
        </Field>
        <Field label="Security code">
          <Input
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder={brand === "amex" ? "4 digits" : "CVC"}
            className="tabular-nums"
            value={cvc}
            onChange={(e) => setCvc(onlyDigits(e.target.value, brand === "amex" ? 4 : 3))}
            suffix={<LockIcon size={14} />}
          />
        </Field>
      </div>
    </div>
  );
}

/** A wallet: it opens its own sheet on Pay, so there's nothing to fill in here */
function Wallet() {
  return (
    <div className="flex flex-col gap-4">
      <MethodTabs value="wallet" />
      <p className="rounded-(--pl-radius-md) bg-(--pl-subtle) px-4 py-3 text-sm leading-5 text-(--pl-text-secondary)">
        Apple Pay is selected. Another step opens to confirm the payment once you continue.
      </p>
    </div>
  );
}

/** The element before Stripe has drawn it: the tabs and fields as skeletons, the button held */
function Loading() {
  return (
    <div aria-busy className="flex flex-col gap-4" aria-label="Loading payment form">
      <Skeleton height={64} radius={12} />
      <div className="flex flex-col gap-2">
        <Skeleton width={96} height={14} radius={4} />
        <Skeleton height={40} radius={12} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton height={40} radius={12} />
        <Skeleton height={40} radius={12} />
      </div>
    </div>
  );
}

export function PaymentElement({ s }: { s: Scenario }) {
  switch (s.payment) {
    case "link":
      return <LinkWallet changing={false} />;
    case "link-change":
      return <LinkWallet changing />;
    case "card":
      return <CardForm invalid={false} />;
    case "card-invalid":
      return <CardForm invalid />;
    case "wallet":
      return <Wallet />;
    case "loading":
      return <Loading />;
    case "load-failed":
      return (
        <Alert
          variant="danger"
          title="The payment form failed to load"
          description="Refresh the page and try again. Nothing has been charged."
          actions={[{ label: "Refresh", onClick: () => setScenario({ payment: "loading" }) }]}
        />
      );
  }
}

/** Polar's WALLET_PAYMENT_METHODS: these carry the buyer's name, so the form doesn't ask for it */
export const isWallet = (s: Scenario) => s.payment === "link" || s.payment === "link-change" || s.payment === "wallet";
export const paymentReady = (s: Scenario) => s.payment !== "loading" && s.payment !== "load-failed";
