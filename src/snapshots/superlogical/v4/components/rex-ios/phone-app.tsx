"use client";

import { useSyncExternalStore } from "react";
import { RexProvider } from "../rex/store";
import { RexPhone } from "./rex-phone";

const noop = () => () => {};

/**
 * Rex for iPhone on its own, filling a phone's browser (or its Home Screen,
 * as a web app). It starts in the browser only: Rex's state is stamped with
 * the current time, which can't be prerendered.
 */
export function PhoneApp() {
  const client = useSyncExternalStore(noop, () => true, () => false);
  if (!client) return null;
  return (
    <RexProvider>
      <div className="fixed inset-0 touch-none">
        <RexPhone standalone />
      </div>
    </RexProvider>
  );
}
