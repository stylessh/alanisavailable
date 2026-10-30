"use client";

import { useSyncExternalStore } from "react";
import { App } from "./app";
import { Checkout } from "./checkout/checkout";
import { CHECKOUT_HASH } from "./checkout/scenario";
import { Playground } from "./playground/playground";
import { useThemeSync } from "./theme";

// The dashboard, or at #design-system the playground where its design system
// is laid out on a canvas to try variations of, or at #checkout the checkout
// draft with its state picker. The hash keeps both outside Polar's own
// navigation and off the server render.
const PLAYGROUND = "#design-system";

const onHash = (change: () => void) => {
  window.addEventListener("hashchange", change);
  return () => window.removeEventListener("hashchange", change);
};

export function Root() {
  useThemeSync();
  const hash = useSyncExternalStore(
    onHash,
    () => window.location.hash,
    () => "",
  );
  if (hash === PLAYGROUND) return <Playground />;
  if (hash === CHECKOUT_HASH || hash.startsWith(`${CHECKOUT_HASH}?`)) return <Checkout />;
  return <App />;
}
