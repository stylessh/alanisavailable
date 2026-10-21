"use client";

import { dockWith, IPHONE_MIRRORING, IPhoneMirroring, MacOS } from "../os/macos";
import { RexPhone } from "./rex-ios/rex-phone";
import { RexWindow } from "./rex/rex-window";
import { RexProvider } from "./rex/store";

/** iPhone Mirroring's window width, to keep it on screen at the right */
const PHONE_W = 324;

/**
 * Rex running on a macOS desktop. The iPhone app is a second client of the
 * same Rex, mirrored in iPhone Mirroring: closed at first, it opens from its
 * Dock icon at the right of the screen.
 */
export function Desktop() {
  return (
    <RexProvider>
      <MacOS
        notices={[
          {
            app: "Rex",
            icon: "/snapshots/superlogical/v3/rex/dock-icon.png",
            subtitle: "Codex · rex-snake",
            body: "Finished: Stress-test Snake demo",
            ago: 12,
          },
        ]}
        dock={dockWith({ id: "rex", name: "Rex", icon: "/snapshots/superlogical/v3/rex/dock-icon.png" }, IPHONE_MIRRORING)}
      >
        {/* first, so Rex opens in front with focus */}
        <IPhoneMirroring closed wallpaper="#0c0c0e" at={(s) => ({ x: s.w - PHONE_W - 40 })}>
          <RexPhone />
        </IPhoneMirroring>
        <RexWindow />
      </MacOS>
    </RexProvider>
  );
}
