"use client";

import { dockWith, MacOS } from "../os/macos";
import { RexWindow } from "./rex/rex-window";
import { RexProvider } from "./rex/store";

/**
 * Rex running on a macOS desktop. The iPhone app (and iPhone Mirroring with
 * it) only arrives in the live version, so this one's Dock doesn't have it.
 */
export function Desktop() {
  return (
    <RexProvider>
      <MacOS
        notices={[
          {
            app: "Rex",
            icon: "/snapshots/superlogical/v4/rex/dock-icon.png",
            subtitle: "Codex · rex-snake",
            body: "Finished: Stress-test Snake demo",
            ago: 12,
          },
        ]}
        dock={dockWith({ id: "rex", name: "Rex", icon: "/snapshots/superlogical/v4/rex/dock-icon.png" })}
      >
        <RexWindow />
      </MacOS>
    </RexProvider>
  );
}
