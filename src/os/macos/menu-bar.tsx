"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { MenuBarClock } from "./clock";
import { type AppInfo, FINDER_APP, MENU_BAR_H, STATUS_ITEMS } from "./data";
import { MenuPanel } from "./menu";
import { appleMenu, finderMenus, windowMenuItems } from "./menus";
import { NotificationCenter } from "./notifications";
import { BatteryMenu, WifiMenu } from "./status-panels";
import { type Menu, type MenuItem, type OSContextValue, toScreen, useOS } from "./window-manager";

/** Status items that open something: the rest only show. */
type Status = "wifi" | "battery" | "clock";
const STATUS_PANELS: Status[] = ["wifi", "battery"];

type Open =
  | { kind: "menu"; index: number; items: MenuItem[]; x: number; keyboard: boolean }
  | { kind: "status"; id: Status; x: number; right: number }
  | null;

/** The menus of an app the menu bar knows only by name: the standard ones. */
function genericMenus(app: AppInfo, os: OSContextValue): Menu[] {
  const windows = Object.values(os.state.windows).filter((w) => w.app.id === app.id);
  const quit = () => windows.forEach((w) => os.dispatch({ type: "close", id: w.id }));
  return [
    {
      title: app.name,
      items: [
        { label: `About ${app.name}` },
        { type: "separator" },
        { label: `Hide ${app.name}`, shortcut: "⌘H" },
        { label: "Hide Others", shortcut: "⌥⌘H" },
        { type: "separator" },
        { label: `Quit ${app.name}`, shortcut: "⌘Q", run: quit },
      ],
    },
    ...app.menus.map((title): Menu => ({
      title,
      items:
        title === "Window"
          ? windowMenuItems({
              minimize: () => windows[0] && os.dispatch({ type: "minimize", id: windows[0].id }),
              zoom: () => windows[0] && os.dispatch({ type: "set-mode", id: windows[0].id, mode: "zoomed" }),
              fullscreen: () => windows[0] && os.dispatch({ type: "set-mode", id: windows[0].id, mode: "fullscreen" }),
            })
          : title === "Help"
            ? [{ label: `${app.name} Help` }]
            : [
                { label: "Undo", shortcut: "⌘Z", disabled: true },
                { label: "Copy", shortcut: "⌘C", disabled: true },
                { label: "Paste", shortcut: "⌘V", disabled: true },
              ],
    })),
  ];
}

/**
 * macOS 27 menu bar. It has no fill of its own: a black-to-clear gradient
 * sits over the wallpaper, as on a notched MacBook Pro. The app menus are
 * the focused window's app (with the menus it registered), or Finder's
 * when the desktop has focus. Titles and status items open their menus
 * and panels; while one is open, pointing at another title switches to it.
 */
export function MenuBar({ hidden = false }: { hidden?: boolean }) {
  const os = useOS();
  const { state, dispatch, notices, dismissNotice, clearNotices } = os;
  const app = state.focused ? state.windows[state.focused].app : FINDER_APP;
  const titles = [app.name, ...app.menus];
  const [open, setOpen] = useState<Open>(null);
  const [asleep, setAsleep] = useState(false);
  const close = () => setOpen(null);

  /** every menu, read now: the Apple menu, then the app's */
  const allMenus = (): Menu[] => {
    const appMenus = os.menusFor(app.id) ?? (app.id === FINDER_APP.id ? finderMenus() : genericMenus(app, os));
    const byTitle = (t: string) => appMenus.find((m) => m.title === t) ?? { title: t, items: [] };
    const apple = appleMenu({
      sleep: () => setAsleep(true),
      open: (id) => dispatch({ type: "activate-app", app: id }),
    });
    return [{ title: "", items: apple }, ...titles.map(byTitle)];
  };
  const openMenu = (index: number, keyboard = false) => {
    const el = document.querySelector<HTMLElement>(`[data-menu-title="${index}"]`);
    const r = el?.getBoundingClientRect();
    const x = r ? toScreen(os, r.left, r.top).x - 1 : 5;
    setOpen({ kind: "menu", index, items: allMenus()[index]?.items ?? [], x, keyboard });
  };
  const openStatus = (id: Status, target: HTMLElement) => {
    if (open?.kind === "status" && open.id === id) return close();
    const r = target.getBoundingClientRect();
    setOpen({ kind: "status", id, x: toScreen(os, r.left, r.top).x, right: toScreen(os, r.right, r.top).x });
  };

  // Escape closes a status panel (menus handle their own keys)
  const statusOpen = open?.kind === "status";
  useEffect(() => {
    if (!statusOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [statusOpen]);

  const pill = (lit: boolean) => (
    <span
      aria-hidden
      className="absolute top-[5px] h-[23px] rounded-full transition-opacity duration-75"
      style={{ left: -10, right: -10, background: "rgb(255 255 255 / 0.2)", opacity: lit ? 1 : 0 }}
    />
  );
  const menuOpen = open?.kind === "menu" ? open.index : null;
  const titleProps = (index: number) => ({
    "data-menu-title": index,
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      if (menuOpen === index) close();
      else openMenu(index);
    },
    onPointerEnter: () => menuOpen !== null && menuOpen !== index && openMenu(index),
  });

  const screenW = os.screen?.w ?? 1512;
  const panelLeft = (width: number) => {
    if (open?.kind !== "status") return 0;
    // left-aligned under the item, or right-aligned when that would run off screen
    return open.x + width > screenW - 8 ? open.right - width : open.x - 4;
  };

  return (
    <>
      {open && <div className="absolute inset-0 z-[999]" onPointerDown={close} />}
      <motion.div
        initial={false}
        animate={{ y: hidden ? -MENU_BAR_H : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 40 }}
        className="mac-menubar absolute inset-x-0 top-0 z-[1000] h-[33px] bg-[linear-gradient(to_bottom,#000,rgb(0_0_0/0))] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text',Inter,sans-serif] text-[13px] leading-[33px] text-white antialiased select-none [-webkit-text-stroke:0.3px_currentColor]"
      >
        <div className="absolute top-0 left-[19.5px] h-[33px] w-[15px] cursor-default" {...titleProps(0)}>
          {pill(menuOpen === 0)}
          <img src="/os/macos/menubar/apple.png" alt="Apple" width={15} height={33} className="relative h-[33px] w-[15px] max-w-none" />
        </div>

        <ul className="absolute top-0 left-[53px] flex gap-[20px]">
          {titles.map((t, i) => (
            <li key={`${t}-${i}`} className={`relative cursor-default ${i === 0 ? "mac-app-name font-bold" : ""}`} {...titleProps(i + 1)}>
              {pill(menuOpen === i + 1)}
              <span className="relative">{t}</span>
            </li>
          ))}
        </ul>

        <div className="mac-status absolute inset-y-0 right-0 [--shift:15px]">
          {STATUS_ITEMS.map((item) => {
            const image = (
              <img
                src={`/os/macos/menubar/${item.id}.png`}
                alt={item.label}
                width={item.width}
                height={33}
                className="relative h-[33px] max-w-none"
                style={{ width: item.width }}
              />
            );
            const box = { right: `calc(${item.right}px - var(--shift))`, width: item.width };
            const id = item.id as Status;
            if (!STATUS_PANELS.includes(id)) {
              return (
                <span key={item.id} className="absolute top-0" style={box}>
                  {image}
                </span>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                tabIndex={-1}
                onPointerDown={(e) => openStatus(id, e.currentTarget)}
                className="absolute top-0 cursor-default"
                style={box}
              >
                {pill(open?.kind === "status" && open.id === id)}
                {image}
              </button>
            );
          })}
          <button
            type="button"
            aria-label="Notification Center"
            tabIndex={-1}
            onPointerDown={(e) => openStatus("clock", e.currentTarget)}
            className="absolute -top-[0.75px] right-[calc(23px-var(--shift))] cursor-default text-[#e6e6e6] tabular-nums"
          >
            <span className="relative">
              <MenuBarClock />
            </span>
          </button>
        </div>
      </motion.div>

      {open?.kind === "menu" && (
        <MenuPanel
          key={open.index}
          items={open.items}
          x={open.x}
          y={MENU_BAR_H + 1}
          keyboard={open.keyboard}
          onClose={close}
          onStep={(d) => openMenu((open.index + d + titles.length + 1) % (titles.length + 1), true)}
        />
      )}
      {open?.kind === "status" && open.id !== "clock" && (
        <div className="absolute z-[1100]" style={{ top: MENU_BAR_H + 1, left: panelLeft(308) }}>
          {open.id === "wifi" ? <WifiMenu onClose={close} /> : <BatteryMenu onClose={close} />}
        </div>
      )}
      <AnimatePresence>
      {open?.kind === "status" && open.id === "clock" && (
        <NotificationCenter
          key="nc"
          onClose={close}
          notices={notices}
          onOpen={(n) => {
            close();
            dismissNotice(n.id);
            n.open?.();
          }}
          onDismiss={dismissNotice}
          onClear={clearNotices}
        />
      )}
      </AnimatePresence>

      {/* Sleep, from the Apple menu: the screen goes dark until a click or key */}
      <AnimatePresence>
        {asleep && (
          <motion.div
            className="absolute inset-0 z-[5000] cursor-none bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onPointerDown={() => setAsleep(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
