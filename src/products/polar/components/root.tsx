"use client";

import { useSyncExternalStore } from "react";
import { App } from "./app";
import { Checkout } from "./checkout/checkout";
import { Playground } from "./playground/playground";
import { useThemeSync } from "./theme";

// The live version is "Checkout", so Polar opens on the checkout draft (its
// state picker keeps the state in the hash, #checkout?…). The dashboard it
// sits on is at #dashboard (frozen as it was in "Unified design system"),
// and #design-system is the playground where the design system is laid out
// on a canvas to try variations of. The hash keeps them all outside Polar's
// own navigation and off the server render.
const PLAYGROUND = "#design-system";
export const DASHBOARD = "#dashboard";

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
  if (hash === DASHBOARD) return <App />;
  return <Checkout />;
}
