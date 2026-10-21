import type { AppInfo } from "../../os/macos";

/** Rex as the OS knows it: its name in the menu bar and its menus. */
export const REX_APP: AppInfo = {
  id: "rex",
  name: "Rex",
  menus: ["File", "Edit", "View", "Shell", "Window", "Help"],
};
