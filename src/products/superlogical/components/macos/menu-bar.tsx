/* eslint-disable @next/next/no-img-element */
import { MenuBarClock } from "./clock";
import { type AppMenus, STATUS_ITEMS } from "./data";

/**
 * macOS 27 menu bar. It has no fill of its own: a black-to-clear gradient
 * sits over the wallpaper, as on a notched MacBook Pro.
 */
export function MenuBar({ app }: { app: AppMenus }) {
  return (
    <div className="mac-menubar absolute inset-x-0 top-0 h-[33px] bg-[linear-gradient(to_bottom,#000,rgb(0_0_0/0))] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text',Inter,sans-serif] text-[13px] leading-[33px] text-white antialiased select-none [-webkit-text-stroke:0.3px_currentColor]">
      <img
        src="/products/superlogical/macos/menubar/apple.png"
        alt="Apple"
        width={15}
        height={33}
        className="absolute top-0 left-[19.5px] h-[33px] w-[15px]"
      />

      <ul className="absolute top-0 left-[53px] flex gap-[20px]">
        <li className="mac-app-name font-bold">{app.name}</li>
        {app.menus.map((m) => (
          <li key={m} className="max-md:hidden">
            {m}
          </li>
        ))}
      </ul>

      <div className="mac-status absolute inset-y-0 right-0 [--shift:15px]">
        {STATUS_ITEMS.map((item) => (
          <img
            key={item.id}
            src={`/products/superlogical/macos/menubar/${item.id}.png`}
            alt={item.label}
            width={item.width}
            height={33}
            className="absolute top-0 h-[33px] max-w-none max-lg:hidden"
            style={{
              right: `calc(${item.right}px - var(--shift))`,
              width: item.width,
            }}
          />
        ))}
        <div className="absolute -top-[0.75px] right-[calc(23px-var(--shift))] text-[#e6e6e6] tabular-nums">
          <MenuBarClock />
        </div>
      </div>
    </div>
  );
}
