"use client";

import { useState } from "react";
import { XIcon } from "../icons";
import { Button, IconButton } from "../ui/button";
import { Checkbox } from "../ui/controls";
import { Field, Input, Label, TextArea } from "../ui/field";
import { Alert } from "../ui/feedback";
import { Select } from "../ui/select";
import { ActionInput, Frame, PoweredBy } from "./bits";
import { isWallet, PaymentElement, paymentReady } from "./payment";
import { COUNTRIES, countryFor, mandate, SELLER, setScenario, type Pricing, type Scenario } from "./scenario";

// The right column: who's paying and how (CheckoutForm), in Polar's order:
// alerts about the seller, email, the payment element, the cardholder,
// billing address, business details, custom fields, then the button, what
// it's doing or what went wrong, and the mandate.

const REQUIRED = "This field is required";

const US_STATES = ["California", "Colorado", "Illinois", "Massachusetts", "New York", "Oregon", "Texas", "Washington"];
const CA_PROVINCES = ["Alberta", "British Columbia", "Manitoba", "Nova Scotia", "Ontario", "Quebec", "Saskatchewan"];

const options = (names: string[]) => names.map((n) => ({ id: n, label: n }));

function Email({ s }: { s: Scenario }) {
  const known = s.email === "known";
  return (
    <Field
      label="Email"
      error={s.email === "invalid" ? REQUIRED : undefined}
      description={known ? "You're signed in to Acme, so your order goes to this address." : undefined}
      small
    >
      <Input
        type="email"
        autoComplete="email"
        defaultValue={s.email === "filled" || known ? "maya.lin@example.com" : ""}
        key={s.email}
        disabled={known}
      />
    </Field>
  );
}

/** Billing address: the fields the country needs, stacked under one label as Polar does */
function BillingAddress({ s }: { s: Scenario }) {
  const [country, setCountry] = useState(countryFor(s.address));
  const [region, setRegion] = useState(s.address === "canada" ? "Ontario" : s.address === "us" ? "New York" : "");
  const full = s.address === "full" || s.address === "full-errors";
  const errors = s.address === "full-errors";
  const postal = country === "US" || country === "CA" || full;
  const err = (show: boolean) => (show ? <p className="text-sm leading-5 font-medium text-(--pl-error)">{REQUIRED}</p> : null);
  return (
    <div className="flex flex-col gap-2">
      <Label>Billing address</Label>
      {full && (
        <>
          <Input
            autoComplete="billing address-line1"
            placeholder="Street address"
            aria-label="Street address"
            aria-invalid={errors || undefined}
            defaultValue={errors ? "" : "350 Fifth Avenue"}
          />
          {err(errors)}
          <Input autoComplete="billing address-line2" placeholder="Apartment or unit number" aria-label="Apartment or unit number" />
        </>
      )}
      {postal && (
        <div className={`grid gap-2 ${full ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="flex flex-col gap-2">
            <Input
              autoComplete="billing postal-code"
              placeholder="Postal code"
              aria-label="Postal code"
              aria-invalid={errors || undefined}
              defaultValue={errors ? "" : country === "CA" ? "M5V 2T6" : "10118"}
            />
            {err(errors)}
          </div>
          {full && (
            <div className="flex flex-col gap-2">
              <Input
                autoComplete="billing address-level2"
                placeholder="City"
                aria-label="City"
                aria-invalid={errors || undefined}
                defaultValue={errors ? "" : "New York"}
              />
              {err(errors)}
            </div>
          )}
        </div>
      )}
      {(country === "US" || country === "CA") && (
        <>
          <Select
            label={country === "US" ? "State" : "Province"}
            placeholder={country === "US" ? "State" : "Province"}
            options={options(country === "US" ? US_STATES : CA_PROVINCES)}
            value={errors ? "" : region}
            onChange={setRegion}
            error={errors}
          />
          {err(errors)}
        </>
      )}
      <Select
        label="Country"
        placeholder="Country"
        options={COUNTRIES.map((c) => ({ id: c.id, label: c.label }))}
        value={country}
        onChange={(c) => {
          setCountry(c);
          setRegion("");
        }}
      />
    </div>
  );
}

/** "I'm purchasing as a business", and once ticked, the business's name and tax ID in a frame of their own */
function Business({ s }: { s: Scenario }) {
  const on = s.business !== "off";
  const applied = s.business === "applied";
  const [taxId, setTaxId] = useState("NL123456789B01");
  return (
    <div className="flex flex-col gap-4">
      <Checkbox
        checked={on}
        onChange={(v) => setScenario({ business: v ? "on" : "off" })}
        label={<span className="text-(--pl-text-secondary)">I&apos;m purchasing as a business</span>}
      />
      {on && (
        <Frame title="Business details">
          <div className="flex flex-col gap-3 p-4">
            <Field>
              <Input autoComplete="billing organization" placeholder="Business name" aria-label="Business name" defaultValue="Lin Studio B.V." />
            </Field>
            <Field
              error={s.business === "invalid" ? "This tax ID isn't valid for the Netherlands. Check its format and try again." : undefined}
              description={applied ? "Verified. Taxes are reverse-charged on this order." : undefined}
              small
            >
              <ActionInput
                label="Tax ID"
                placeholder="Tax ID (Optional)"
                mono={s.business !== "on"}
                value={s.business === "on" ? "" : taxId}
                onChange={(v) => {
                  setTaxId(v);
                  if (s.business === "on" || s.business === "invalid") setScenario({ business: v ? "typed" : "on" });
                }}
                disabled={applied}
                onEnter={() => setScenario({ business: "applied" })}
                action={
                  applied ? (
                    <IconButton size={32} label="Remove tax ID" onClick={() => setScenario({ business: "on" })}>
                      <XIcon size={14} />
                    </IconButton>
                  ) : s.business !== "on" ? (
                    <Button variant="secondary" size="sm" onClick={() => setScenario({ business: "applied" })}>
                      Apply
                    </Button>
                  ) : undefined
                }
              />
            </Field>
          </div>
        </Frame>
      )}
    </div>
  );
}

/** CustomFieldInput, one of each type Polar has: text, textarea, number, date, select, checkbox */
function CustomFields({ s }: { s: Scenario }) {
  const errors = s.fields === "errors";
  const [role, setRole] = useState(errors ? "" : "engineering");
  const [agreed, setAgreed] = useState(!errors);
  return (
    <div className="flex flex-col gap-6">
      <Field label="Company" error={errors ? REQUIRED : undefined}>
        <Input placeholder="Where you work" defaultValue={errors ? "" : "Lin Studio"} />
      </Field>
      <Field label="Your role" error={errors ? REQUIRED : undefined}>
        <Select
          label="Your role"
          placeholder="Choose one"
          options={[
            { id: "engineering", label: "Engineering" },
            { id: "design", label: "Design" },
            { id: "product", label: "Product" },
            { id: "founder", label: "Founder" },
            { id: "other", label: "Something else" },
          ]}
          value={role}
          onChange={setRole}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={<>Team size <Optional /></>} description="Including you" small>
          <Input type="number" min={1} max={500} placeholder="1" />
        </Field>
        <Field label={<>Start date <Optional /></>} small description="We'll time onboarding">
          <Input type="date" />
        </Field>
      </div>
      <Field label={<>What will you build? <Optional /></>} description="Up to 280 characters. Only Acme sees this." small>
        <TextArea rows={3} maxLength={280} placeholder="A sentence or two" className="min-h-[88px]!" resizable={false} />
      </Field>
      <div className="flex flex-col gap-2">
        <Checkbox
          checked={agreed}
          onChange={setAgreed}
          label={
            <span className={errors && !agreed ? "text-(--pl-error)" : "text-(--pl-text-secondary)"}>
              I agree to Acme&apos;s{" "}
              <a href="#" className="text-(--pl-text) underline underline-offset-2">
                terms of service
              </a>
            </span>
          }
        />
        {errors && !agreed && <p className="text-sm leading-5 font-medium text-(--pl-error)">{REQUIRED}</p>}
      </div>
    </div>
  );
}

const Optional = () => <span className="font-normal text-(--pl-text-muted)">(Optional)</span>;

/** What went wrong on submitting, set above the button where the eye already is */
function SubmitError({ s }: { s: Scenario }) {
  switch (s.step) {
    case "declined":
      return (
        <Alert variant="danger" title="Your card was declined" description="Nothing was charged. Try another card or payment method." />
      );
    case "3ds-failed":
      return (
        <Alert
          variant="danger"
          title="Payment was not completed"
          description="Your bank couldn't verify it was you. Nothing was charged; please try again."
        />
      );
    case "already":
      return (
        <Alert
          variant="danger"
          title="You already have an active subscription"
          description={
            <>
              maya.lin@example.com is subscribed to Acme Pro.{" "}
              <a href="#" className="font-medium text-(--pl-text) underline underline-offset-2">
                Manage it in your portal
              </a>
            </>
          }
        />
      );
    default:
      return null;
  }
}

export function CheckoutForm({ s, p, onSubmit }: { s: Scenario; p: Pricing; onSubmit: () => void }) {
  const unavailable = s.step === "unavailable";
  const processing = s.step === "processing" || s.step === "3ds";
  const updating = s.step === "updating";
  const [prefix, suffix] = mandate(p);
  const needsPayment = !p.free;
  return (
    <div className="flex flex-col gap-12">
      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {s.step === "test-mode" && (
          <Alert
            variant="info"
            title={`${SELLER.name} is in test mode`}
            description="You can test checkout with free products or 100% discount orders. No real payment is taken."
          />
        )}
        {unavailable && (
          <Alert
            variant="danger"
            title="Payments are currently unavailable"
            description={`${SELLER.name} can't take payments right now. Try again later, or contact them.`}
          />
        )}
        <div className="flex flex-col gap-6">
          <Email s={s} />
          {needsPayment && <PaymentElement s={s} />}
          {needsPayment && !isWallet(s) && paymentReady(s) && (
            <Field label="Cardholder name">
              <Input autoComplete="name" defaultValue="Maya Lin" />
            </Field>
          )}
          {(needsPayment || s.address === "full" || s.address === "full-errors") && (
            <>
              <BillingAddress key={s.address} s={s} />
              <Business s={s} />
            </>
          )}
          {s.fields !== "none" && <CustomFields key={s.fields} s={s} />}
        </div>
        {s.offer === "trial-used" && (
          <div className="flex flex-col gap-1 rounded-(--pl-radius-md) bg-(--pl-subtle) px-4 py-3">
            <p className="text-sm leading-5 font-medium text-(--pl-text)">No free trial for this purchase</p>
            <p className="text-sm leading-5 text-(--pl-text-muted)">
              You&apos;ve already used a free trial for this product, so you&apos;ll be charged today. Continue below to complete your
              purchase.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <SubmitError s={s} />
          <Button
            type="submit"
            size="lg"
            fullWidth
            className="h-13! text-base!"
            loading={processing}
            disabled={unavailable || updating || (needsPayment && !paymentReady(s))}
          >
            {p.cta}
          </Button>
          {/* processing and updating say so on the button alone (its spinner, its held state), so nothing under it jumps */}
          {unavailable && <p className="text-center text-sm leading-5 text-(--pl-error)">Payments are currently unavailable</p>}
        </div>
      </form>
      <p className="text-center text-xs leading-[1.6] text-pretty text-(--pl-text-muted)">
        {prefix}
        {suffix !== undefined && (
          <>
            <a href="https://polar.sh/legal/checkout-buyer-terms" target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Buyer Terms
            </a>
            {suffix}
          </>
        )}
      </p>
      <PoweredBy />
    </div>
  );
}
