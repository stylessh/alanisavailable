// A shared macOS desktop for product demos: a screen with menu bar and
// Dock, and a window manager whose windows drag, zoom, minimize into the
// Dock, close and go full screen. Products compose it:
//
//   <MacOS dock={dockWith({ id: "rex", name: "Rex", icon: "/…/dock-icon.png" })}>
//     <MacWindow id="rex" app={{ id: "rex", name: "Rex", menus: [...] }} width={1000} height={600}>
//       <div {...DRAG_REGION}>title bar <TrafficLights left={14} top={14} /></div>
//       …app…
//     </MacWindow>
//   </MacOS>
//
// Inside a window, useMacWindow() gives the app its size, focus and controls.
export { MacOS } from "./mac-os";
export { DRAG_REGION, MacWindow, type MacWindowContext, useMacWindow } from "./window";
export { EmbeddedWindow } from "./embedded-window";
export { TrafficLights } from "./traffic-lights";
export { IPHONE_MIRRORING_APP, IPHONE_SCREEN, IPhoneMirroring, StatusBar } from "./iphone-mirroring";
export {
  type Appearance,
  type AppearancePref,
  appearanceStyle,
  type Menu,
  type MenuItem,
  type Notice,
  useAppMenus,
  useMacAppearance,
  useNotify,
} from "./window-manager";
export { windowMenuItems } from "./menus";
export type { SeedNotice } from "./notifications";
export { type AppInfo, type DockApp, type DockItem, dockWith, DOCK_H, FINDER, GHOSTTY, IPHONE_MIRRORING, MENU_BAR_H, SYSTEM_SETTINGS, TRASH, WALLPAPER } from "./data";
