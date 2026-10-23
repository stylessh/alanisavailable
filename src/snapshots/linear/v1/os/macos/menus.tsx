// The system's own menus: the Apple menu, and Finder's (what the menu bar
// shows when the desktop has focus). Rows and shortcuts follow captures of
// macOS 27; most rows only close the menu, as in a demo.
import { FINDER, GHOSTTY, IPHONE_MIRRORING, SYSTEM_SETTINGS } from "./data";
import type { Menu, MenuItem } from "./window-manager";

const glyph = (d: React.ReactNode) => (
  <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const LAPTOP = glyph(<><rect x="2.5" y="3" width="9" height="6.2" rx="0.9" /><path d="M1 11h12" /></>);
const GEAR = glyph(<><circle cx="7" cy="7" r="2" /><path d="M7 1.5v1.6M7 10.9v1.6M1.5 7h1.6M10.9 7h1.6M3.1 3.1l1.15 1.15M9.75 9.75l1.15 1.15M3.1 10.9l1.15-1.15M9.75 4.25l1.15-1.15" /></>);
const STORE = glyph(<path d="M5.4 2.5 9.8 10M8.6 2.5 4.2 10M2.6 8.4h8.8" />);
const TRASH = glyph(<><path d="M2.5 3.8h9M5.5 3.8V2.6h3v1.2" /><path d="M3.6 3.8l.6 7.6h5.6l.6-7.6" /></>);

const app = (a: { name: string; icon: string }, open?: () => void): MenuItem => ({
  label: `${a.name}.app`,
  // eslint-disable-next-line @next/next/no-img-element
  icon: <img src={a.icon} alt="" width={16} height={16} className="max-w-none" />,
  run: open,
});

export function appleMenu({ sleep, open }: { sleep: () => void; open: (app: string) => void }): MenuItem[] {
  return [
    { label: "About This Mac", icon: LAPTOP },
    { type: "separator" },
    { label: "System Settings…", icon: GEAR, badge: "1 update", run: () => open(SYSTEM_SETTINGS.id) },
    { label: "App Store", icon: STORE },
    { type: "separator" },
    {
      label: "Recent Items",
      submenu: [
        { type: "header", label: "Applications" },
        app(GHOSTTY, () => open(GHOSTTY.id)),
        app(IPHONE_MIRRORING, () => open(IPHONE_MIRRORING.id)),
        app(SYSTEM_SETTINGS, () => open(SYSTEM_SETTINGS.id)),
        { type: "separator" },
        { label: "Clear Menu" },
      ],
    },
    { type: "separator" },
    { label: "Force Quit…", shortcut: "⌥⌘⎋" },
    { type: "separator" },
    { label: "Sleep", run: sleep },
    { label: "Restart…" },
    { label: "Shut Down…" },
    { type: "separator" },
    { label: "Lock Screen", shortcut: "⌃⌘Q" },
    { label: "Log Out Alan Daniel…", shortcut: "⇧⌘Q" },
  ];
}

export function finderMenus({ appName = FINDER.name }: { appName?: string } = {}): Menu[] {
  return [
    {
      title: appName,
      items: [
        { label: "About Finder" },
        { type: "separator" },
        { label: "Settings…", shortcut: "⌘ ,", icon: GEAR },
        { type: "separator" },
        { label: "Empty Trash…", shortcut: "⇧⌘⌫", icon: TRASH },
        { type: "separator" },
        { label: "Services", submenu: [{ label: "No Services Apply", disabled: true }] },
        { type: "separator" },
        { label: "Hide Finder", shortcut: "⌘H" },
        { label: "Hide Others", shortcut: "⌥⌘H" },
        { label: "Show All", disabled: true },
      ],
    },
    {
      title: "File",
      items: [
        { label: "New Finder Window", shortcut: "⌘N" },
        { label: "New Folder", shortcut: "⇧⌘N" },
        { label: "New Folder with Selection", shortcut: "⌃⌘N", disabled: true },
        { label: "New Smart Folder" },
        { label: "New Tab", shortcut: "⌘T" },
        { label: "Open", shortcut: "⌘O", disabled: true },
        { label: "Close Window", shortcut: "⌘W", disabled: true },
        { type: "separator" },
        { label: "Get Info", shortcut: "⌘I" },
        { label: "Rename", disabled: true },
        { label: "Duplicate", shortcut: "⌘D", disabled: true },
        { label: "Quick Look", shortcut: "⌘Y", disabled: true },
      ],
    },
    {
      title: "Edit",
      items: [
        { label: "Undo", shortcut: "⌘Z", disabled: true },
        { label: "Redo", shortcut: "⇧⌘Z", disabled: true },
        { type: "separator" },
        { label: "Cut", shortcut: "⌘X", disabled: true },
        { label: "Copy", shortcut: "⌘C", disabled: true },
        { label: "Paste", shortcut: "⌘V", disabled: true },
        { label: "Select All", shortcut: "⌘A" },
      ],
    },
    {
      title: "View",
      items: [
        { label: "as Icons", shortcut: "⌘1", disabled: true },
        { label: "as List", shortcut: "⌘2", disabled: true },
        { label: "as Columns", shortcut: "⌘3", disabled: true },
        { label: "as Gallery", shortcut: "⌘4", disabled: true },
        { type: "separator" },
        { label: "Use Stacks", shortcut: "⌃⌘0" },
        { label: "Sort By", submenu: [{ label: "None", checked: true }, { label: "Name" }, { label: "Kind" }, { label: "Date Added" }] },
        { label: "Clean Up", disabled: true },
        { type: "separator" },
        { label: "Hide Sidebar", shortcut: "⌃⌘S", disabled: true },
        { label: "Hide Toolbar", shortcut: "⌥⌘T", disabled: true },
      ],
    },
    {
      title: "Go",
      items: [
        { label: "Back", shortcut: "⌘[", disabled: true },
        { label: "Forward", shortcut: "⌘]", disabled: true },
        { label: "Enclosing Folder", shortcut: "⌘↑" },
        { type: "separator" },
        { label: "Recents", shortcut: "⇧⌘F" },
        { label: "Documents", shortcut: "⇧⌘O" },
        { label: "Desktop", shortcut: "⇧⌘D" },
        { label: "Downloads", shortcut: "⌥⌘L" },
        { label: "Home", shortcut: "⇧⌘H" },
        { label: "Applications", shortcut: "⇧⌘A" },
        { label: "Utilities", shortcut: "⇧⌘U" },
      ],
    },
    {
      title: "Window",
      items: [
        { label: "Minimize", shortcut: "⌘M", disabled: true },
        { label: "Zoom", disabled: true },
        { type: "separator" },
        { label: "Bring All to Front" },
      ],
    },
    { title: "Help", items: [{ label: "macOS Help" }, { label: "Tips for Your Mac" }] },
  ];
}

/** Window controls every app's Window menu starts with. */
export const windowMenuItems = (w: { minimize: () => void; zoom: () => void; fullscreen: () => void }): MenuItem[] => [
  { label: "Minimize", shortcut: "⌘M", run: w.minimize },
  { label: "Zoom", run: w.zoom },
  { label: "Enter Full Screen", shortcut: "⌃⌘F", run: w.fullscreen },
];
