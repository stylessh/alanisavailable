import type { AppInfo } from "../../os/macos";

/** The Claude desktop app as the OS knows it: its name in the menu bar and its menus. */
export const CLAUDE_APP: AppInfo = {
  id: "claude",
  name: "Claude",
  menus: ["File", "Edit", "View", "Go", "Window", "Help"],
};
