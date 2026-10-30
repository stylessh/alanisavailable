"use client";

import { useSyncExternalStore } from "react";
import { App } from "./app";
import { Playground } from "./playground/playground";
import { useThemeSync } from "./theme";

// The dashboard, or at #design-system the playground where its design system
// is laid out on a canvas to try variations of. The hash keeps the
// playground outside Polar's own navigation and off the server render.
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
  return hash === PLAYGROUND ? <Playground /> : <App />;
}
