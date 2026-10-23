"use client";

import { dockWith, MacOS } from "../os/macos";
import { ClaudeWindow } from "./claude-code/claude-window";

/** The Claude desktop app on a macOS desktop; it follows the desktop's appearance (light or dark). */
export function Desktop() {
  return (
    <MacOS
      dock={dockWith({
        id: "claude",
        name: "Claude",
        icon: "/snapshots/claude/v2/dock-icon.png",
      })}
    >
      <ClaudeWindow />
    </MacOS>
  );
}
