"use client";

import { dockWith, MacOS } from "@/os/macos";
import { ClaudeWindow } from "./claude-code/claude-window";

/** The Claude desktop app on a macOS desktop, in dark mode like the reference. */
export function Desktop() {
  return (
    <MacOS
      appearance="dark"
      dock={dockWith({
        id: "claude",
        name: "Claude",
        icon: "/products/claude/dock-icon.png",
      })}
    >
      <ClaudeWindow />
    </MacOS>
  );
}
