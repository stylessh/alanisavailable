"use client";

import { dockWith, IPHONE_MIRRORING, IPhoneMirroring, MacOS } from "@/os/macos";
import { WINDOW } from "./rex/model";
import { RexWindow } from "./rex/rex-window";

/** Rex and the phone side by side, centered together when the screen has room. */
const PHONE_W = 317;
const GAP = 40;
const groupLeft = (w: number) => Math.max(24, (w - WINDOW.w - GAP - PHONE_W) / 2);

/** Rex running on a macOS desktop, with the iPhone app mirrored beside it. */
export function Desktop() {
  return (
    <MacOS
      dock={dockWith({ id: "rex", name: "Rex", icon: "/products/superlogical/rex/dock-icon.png" }, IPHONE_MIRRORING)}
    >
      {/* first, so Rex opens in front with focus */}
      <IPhoneMirroring at={(s) => ({ x: Math.min(s.w - PHONE_W - 24, groupLeft(s.w) + WINDOW.w + GAP) })} />
      <RexWindow at={(s) => ({ x: groupLeft(s.w) })} />
    </MacOS>
  );
}
