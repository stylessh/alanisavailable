"use client";

import { dockWith, IPHONE_MIRRORING, IPhoneMirroring, MacOS } from "@/os/macos";
import { RexPhone } from "./rex-ios/rex-phone";
import { RexWindow } from "./rex/rex-window";
import { RexProvider } from "./rex/store";

/**
 * Rex on iPhone, from a macOS desktop. The iPhone app is a second client of
 * the same Rex, mirrored in iPhone Mirroring: it opens in the middle of the
 * screen, and the Mac window starts closed, a click on its Dock icon away.
 */
export function Desktop() {
  return (
    <RexProvider>
      <MacOS
        notices={[
          {
            app: "Rex",
            icon: "/products/superlogical/rex/dock-icon.png",
            subtitle: "Codex · rex-snake",
            body: "Finished: Stress-test Snake demo",
            ago: 12,
          },
        ]}
        dock={dockWith({ id: "rex", name: "Rex", icon: "/products/superlogical/rex/dock-icon.png" }, IPHONE_MIRRORING)}
      >
        <RexWindow closed />
        {/* last, so the phone opens in front with focus (centered: no `at`) */}
        <IPhoneMirroring wallpaper="#0c0c0e">
          <RexPhone />
        </IPhoneMirroring>
      </MacOS>
    </RexProvider>
  );
}
