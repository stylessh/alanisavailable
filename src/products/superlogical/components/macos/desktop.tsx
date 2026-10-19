import { type AppMenus, SUPERLOGICAL_MENUS } from "./data";
import { Dock } from "./dock";
import { MenuBar } from "./menu-bar";

/**
 * A full-viewport macOS desktop: wallpaper, menu bar and dock. Anything
 * passed as children (an app window) sits between the wallpaper and the
 * dock.
 */
export function MacDesktop({
  app = SUPERLOGICAL_MENUS,
  children,
}: {
  app?: AppMenus;
  children?: React.ReactNode;
}) {
  return (
    <div className="mac-desktop fixed inset-0 overflow-hidden bg-black">
      {/* "Mono Dark Distortion 2" from raycast.com/wallpapers */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/macos/wallpaper/mono-dark-distortion-2-1920.webp"
        srcSet="/macos/wallpaper/mono-dark-distortion-2-1920.webp 1920w, /macos/wallpaper/mono-dark-distortion-2-3840.webp 3840w"
        sizes="100vw"
        alt=""
        fetchPriority="high"
        draggable={false}
        className="mac-wallpaper absolute inset-0 size-full object-cover select-none"
      />
      {children}
      <MenuBar app={app} />
      <Dock />
    </div>
  );
}
