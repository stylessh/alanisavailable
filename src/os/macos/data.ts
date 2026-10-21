// Measured from a 2x capture of a 1512×982pt MacBook Pro screen (macOS 27).
// All numbers are points, which map 1:1 to CSS px.

/** Menu bar height. */
export const MENU_BAR_H = 33;
/** Space the Dock takes at the bottom of the screen (tile row plus its gap). */
export const DOCK_H = 94;

/** An app as the OS knows it: its name in the menu bar and its menus. */
export type AppInfo = { id: string; name: string; menus: string[] };

export type DockApp = {
  /** matches an AppInfo id for apps with windows on screen */
  id: string;
  name: string;
  icon: string;
  /** shows the running dot even without a window (Finder, background apps) */
  running?: boolean;
  badge?: string;
  /** Vertical nudge in points, for icon files padded unlike the dock's own. */
  offsetY?: number;
};

export type DockItem = DockApp | "separator";

const icon = (id: string) => `/os/macos/dock/${id}.png`;

export const FINDER: DockApp = { id: "finder", name: "Finder", icon: icon("finder"), running: true };
export const SYSTEM_SETTINGS: DockApp = { id: "system-settings", name: "System Settings", icon: icon("system-settings"), badge: "1" };
export const GHOSTTY: DockApp = { id: "ghostty", name: "Ghostty", icon: icon("ghostty"), running: true };
export const IPHONE_MIRRORING: DockApp = { id: "iphone-mirroring", name: "iPhone Mirroring", icon: icon("iphone-mirroring") };
export const TRASH: DockApp = { id: "trash", name: "Trash", icon: icon("trash"), offsetY: 1 };

/** The standard Dock with a product's own apps after the system ones. */
export const dockWith = (...apps: DockApp[]): DockItem[] => [
  FINDER,
  SYSTEM_SETTINGS,
  GHOSTTY,
  ...apps,
  "separator",
  TRASH,
];

/** What the menu bar shows when no window is focused. */
export const FINDER_APP: AppInfo = {
  id: "finder",
  name: "Finder",
  menus: ["File", "Edit", "View", "Go", "Window", "Help"],
};

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

/** The desktop picture every screen starts with. */
export const WALLPAPER = {
  // "Mono Dark Distortion 2" from raycast.com/wallpapers
  src: "/os/macos/wallpaper/mono-dark-distortion-2-1920.webp",
  srcSet: "/os/macos/wallpaper/mono-dark-distortion-2-1920.webp 1920w, /os/macos/wallpaper/mono-dark-distortion-2-3840.webp 3840w",
};
