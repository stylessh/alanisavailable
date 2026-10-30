"use client";

import { useState } from "react";
import { Confirmation, Expired, ThreeDSecure } from "./confirmation";
import { CheckoutForm } from "./form";
import { Picker } from "./picker";
import {
  advance,
  PRODUCTS,
  PWYW_INITIAL,
  price,
  productsFor,
  SEATS,
  setScenario,
  UNITS,
  useScenario,
  type Product,
  type Scenario,
} from "./scenario";
import { CollapsibleSummary, OrderSummary, SellerHeader } from "./summary";

// A redesign draft of Polar's checkout (polar.sh/checkout/…), for Acme, at
// /polar#checkout. Every state Polar's checkout can be in (STATES.md) is
// reachable from the picker in the corner, and the page's own controls move
// between them too: Apply checks a code, Pay walks through processing to
// the confirmation.

const AFTER_PAYING = ["confirming", "confirm-action", "failed", "granting", "success"];

// One product with only fixed prices folds its summary on a phone
// (isOrderSummaryCollapsible)
const COLLAPSIBLE = ["one-time", "monthly", "yearly", "trial", "trial-used"];

/** The checkout for one offer; its quantities and picks reset when the offer changes */
function CheckoutPage({ s }: { s: Scenario }) {
  const [product, setProduct] = useState<Product>(() => (s.offer === "switcher" ? PRODUCTS.monthly : productsFor(s.offer)[0]));
  const [quantity, setQuantity] = useState(s.offer === "units" ? UNITS.initial : SEATS.initial);
  const [amount, setAmount] = useState(s.offer === "pwyw-free" ? PWYW_INITIAL["pwyw-free"] : PWYW_INITIAL.pwyw);
  const p = price(s, { product, quantity, amount });
  const local = { product, setProduct, quantity, setQuantity, amount, setAmount };
  const pending = s.step === "updating";

  if (s.step === "expired") return <Expired />;
  if (AFTER_PAYING.includes(s.step)) return <Confirmation s={s} p={p} />;

  const pay = () => {
    setScenario({ step: "processing" });
    advance("step", "processing", "confirming", 1400);
    advance("step", "confirming", "granting", 2800);
    advance("step", "granting", "success", 4400);
  };

  const summary = <OrderSummary s={s} p={p} local={local} pending={pending} />;
  const collapsible = COLLAPSIBLE.includes(s.offer);
  return (
    <div className="flex min-h-full flex-col @3xl:grid @3xl:grid-cols-2">
      <div className="bg-(--pl-shell) @3xl:flex @3xl:justify-end">
        {/* folded, the summary's bar is the column's last edge on a phone, so nothing pads under it */}
        <div
          className={`mx-auto flex w-full max-w-[480px] flex-col gap-6 px-4 pt-6 @3xl:sticky @3xl:top-0 @3xl:mx-0 @3xl:self-start @3xl:py-12 @3xl:pr-12 @3xl:pl-4 ${
            collapsible ? "" : "pb-8"
          }`}
        >
          <SellerHeader />
          {collapsible ? <CollapsibleSummary p={p}>{summary}</CollapsibleSummary> : summary}
        </div>
      </div>
      <div
        className={`flex-1 bg-(--pl-surface) @3xl:shadow-[inset_0.5px_0_0_var(--pl-hairline)] ${
          collapsible ? "" : "shadow-[inset_0_0.5px_0_var(--pl-hairline)]"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[480px] flex-col px-4 pt-8 pb-10 @3xl:mx-0 @3xl:py-12 @3xl:pr-4 @3xl:pl-12">
          <CheckoutForm s={s} p={p} onSubmit={pay} />
        </div>
      </div>
      <ThreeDSecure p={p} open={s.step === "3ds"} />
    </div>
  );
}

export function Checkout() {
  const s = useScenario();
  const page = (
    <div className="pl-scroll @container h-full overflow-y-auto">
      <CheckoutPage key={s.offer} s={s} />
    </div>
  );
  return (
    <div className="absolute inset-0 flex bg-(--pl-shell)">
      <main className="relative min-w-0 flex-1">
        {s.viewport === "mobile" ? (
          <div className="flex h-full items-center justify-center overflow-auto p-6">
            <div className="h-[844px] max-h-full w-[390px] shrink-0 overflow-hidden rounded-[44px] bg-(--pl-shell) shadow-(--pl-shadow-lg)">
              {page}
            </div>
          </div>
        ) : (
          page
        )}
      </main>
      <Picker s={s} />
    </div>
  );
}
