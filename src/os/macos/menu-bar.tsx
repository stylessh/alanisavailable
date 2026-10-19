"use client";

/* eslint-disable @next/next/no-img-element */
import { motion } from "motion/react";
import { MenuBarClock } from "./clock";
import { FINDER_APP, MENU_BAR_H, STATUS_ITEMS } from "./data";
import { useOS } from "./window-manager";

/**
 * macOS 27 menu bar. It has no fill of its own: a black-to-clear gradient
 * sits over the wallpaper, as on a notched MacBook Pro. The app menus are
 * the focused window's app, or Finder's when the desktop has focus.
 */
export function MenuBar({ hidden = false }: { hidden?: boolean }) {
  const { state, appearance, setAppearance } = useOS();
  const app = state.focused ? state.windows[state.focused].app : FINDER_APP;

  return (
    <motion.div
      initial={false}
      animate={{ y: hidden ? -MENU_BAR_H : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 40 }}
      className="mac-menubar absolute inset-x-0 top-0 z-[1000] h-[33px] bg-[linear-gradient(to_bottom,#000,rgb(0_0_0/0))] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text',Inter,sans-serif] text-[13px] leading-[33px] text-white antialiased select-none [-webkit-text-stroke:0.3px_currentColor]"
    >
      <img
        src="/os/macos/menubar/apple.png"
        alt="Apple"
        width={15}
        height={33}
        className="absolute top-0 left-[19.5px] h-[33px] w-[15px]"
      />

      <ul className="absolute top-0 left-[53px] flex gap-[20px]">
        <li className="mac-app-name font-bold">{app.name}</li>
        {app.menus.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>

      <div className="mac-status absolute inset-y-0 right-0 [--shift:15px]">
        {STATUS_ITEMS.map((item) => {
          const image = (
            <img
              key={item.id}
              src={`/os/macos/menubar/${item.id}.png`}
              alt={item.label}
              width={item.width}
              height={33}
              className="absolute top-0 h-[33px] max-w-none"
              style={{
                right: `calc(${item.right}px - var(--shift))`,
                width: item.width,
              }}
            />
          );
          if (item.id !== "control-center") return image;
          // Control Center switches the appearance, as its Dark Mode toggle does.
          const label = `Switch to ${appearance === "dark" ? "Light" : "Dark"} Mode`;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={label}
              title={label}
              tabIndex={-1}
              onClick={() => setAppearance(appearance === "dark" ? "light" : "dark")}
              className="cursor-default"
            >
              {image}
            </button>
          );
        })}
        <div className="absolute -top-[0.75px] right-[calc(23px-var(--shift))] text-[#e6e6e6] tabular-nums">
          <MenuBarClock />
        </div>
      </div>
    </motion.div>
  );
}
