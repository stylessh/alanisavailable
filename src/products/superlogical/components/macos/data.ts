// Measured from a 2x capture of a 1512×982pt MacBook Pro screen (macOS 27).
// All numbers are points, which map 1:1 to CSS px.

export type DockApp = {
  id: string;
  name: string;
  running?: boolean;
  badge?: string;
  /** Vertical nudge in points, for icon files padded unlike the dock's own. */
  offsetY?: number;
};

export type DockItem = DockApp | "separator";

export const DOCK_ITEMS: DockItem[] = [
  { id: "finder", name: "Finder", running: true },
  { id: "system-settings", name: "System Settings", badge: "1" },
  { id: "ghostty", name: "Ghostty", running: true },
  { id: "rex", name: "Rex", running: true },
  "separator",
  { id: "trash", name: "Trash", offsetY: 1 },
];

/**
 * Menu bar extras, right to left is how macOS lays them out, but they're
 * listed left to right here. `right` is the distance from the image's right
 * edge to the screen's right edge as captured, where a screen-recording dot
 * took the last slot; the menu bar shifts them 15pt right without it.
 * `width` is the image width (each PNG is a full-height 33pt strip at 2x).
 */
export const STATUS_ITEMS = [
  { id: "user", label: "Fast User Switching", right: 370, width: 17 },
  { id: "input", label: "Input: U.S.", right: 326, width: 24 },
  { id: "battery", label: "Battery", right: 281, width: 28 },
  { id: "wifi", label: "Wi-Fi", right: 245.5, width: 19 },
  { id: "now-playing", label: "Now Playing", right: 211, width: 17 },
  { id: "control-center", label: "Control Center", right: 174, width: 16 },
] as const;

export type AppMenus = { name: string; menus: string[] };

export const SUPERLOGICAL_MENUS: AppMenus = {
  name: "Rex",
  menus: ["File", "Edit", "View", "Shell", "Window", "Help"],
};
