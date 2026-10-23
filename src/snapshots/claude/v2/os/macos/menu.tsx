"use client";

import { useEffect, useRef, useState } from "react";
import type { MenuItem } from "./window-manager";

// A macOS 27 menu, measured on 2x captures of the Apple and Finder menus:
// 24pt rows inside 5pt of padding, a 24pt blue highlight inset 5pt from the
// sides, labels 16pt in (41pt when the row has a 14pt icon), shortcuts
// right-aligned 14pt from the edge, and 11pt separator gaps with a hairline.
// The panel is glass: lit along the top, a light rim inside a dark one.

export const MENU = { pad: 5, row: 24, gap: 12, header: 22, radius: 12 };
export const HIGHLIGHT = "rgb(52 120 246)";

/** The glass every menu and status panel is drawn on. */
export const MENU_GLASS: React.CSSProperties = {
  background: [
    "linear-gradient(to bottom, light-dark(rgb(255 255 255 / 0.5), rgb(255 255 255 / 0.1)), transparent 4px)",
    "light-dark(rgb(250 250 252 / 0.36), rgb(28 28 30 / 0.3))",
  ].join(", "),
  // Liquid Glass: thin enough that what's behind shows through, frosted and
  // a touch more saturated
  backdropFilter: "blur(9px) saturate(1.9)",
  WebkitBackdropFilter: "blur(9px) saturate(1.9)",
  boxShadow: [
    "inset 0 0.75px 0 light-dark(rgb(255 255 255 / 0.9), rgb(255 255 255 / 0.22))",
    "inset 0 0 0 0.5px light-dark(rgb(255 255 255 / 0.5), rgb(255 255 255 / 0.1))",
    "0 0 0 0.5px light-dark(rgb(0 0 0 / 0.14), rgb(0 0 0 / 0.65))",
    "0 10px 30px rgb(0 0 0 / 0.28)",
    "0 2px 6px rgb(0 0 0 / 0.12)",
  ].join(", "),
  color: "light-dark(rgb(0 0 0 / 0.86), rgb(255 255 255 / 0.9))",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif",
};

type Row = Extract<MenuItem, { label: string; type?: "item" }>;
const isRow = (it: MenuItem): it is Row => it.type === undefined || it.type === "item";
const selectable = (it: MenuItem) => isRow(it) && !it.disabled;

function MenuList({
  items,
  active,
  openSub,
  onHover,
  onRun,
  innerRef,
}: {
  items: MenuItem[];
  active: number | null;
  /** the row whose submenu is open, which stays highlighted */
  openSub: number | null;
  onHover: (i: number | null) => void;
  onRun: (i: number) => void;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={innerRef}
      role="menu"
      className="relative min-w-[200px] rounded-[12px] text-[13px] leading-[16px] select-none [corner-shape:superellipse(1.4)] [-webkit-text-stroke:0.15px_currentColor]"
      style={{ ...MENU_GLASS, padding: `${MENU.pad}px` }}
      onPointerLeave={() => onHover(null)}
    >
      {items.map((it, i) => {
        if (it.type === "separator")
          return <div key={i} aria-hidden className="mx-[11px] my-[5.25px] h-[0.5px]" style={{ background: "light-dark(rgb(0 0 0 / 0.1), rgb(255 255 255 / 0.12))" }} />;
        if (it.type === "header")
          return (
            <div key={i} className="flex h-[22px] items-end px-[11px] pb-[3px] text-[11px] leading-[13px] font-semibold opacity-50">
              {it.label}
            </div>
          );
        const lit = (active === i || openSub === i) && !it.disabled;
        return (
          <div
            key={i}
            role="menuitem"
            aria-disabled={it.disabled || undefined}
            aria-haspopup={it.submenu ? "menu" : undefined}
            data-row={i}
            onPointerEnter={() => onHover(it.disabled ? null : i)}
            onClick={() => !it.disabled && onRun(i)}
            className="relative flex h-[24px] cursor-default items-center gap-[10px] rounded-[7px] pr-[11px] whitespace-nowrap"
            style={{
              paddingLeft: it.icon || it.checked ? 12 : 11,
              background: lit ? HIGHLIGHT : undefined,
              color: lit ? "#fff" : undefined,
              opacity: it.disabled ? 0.32 : 1,
            }}
          >
            {(it.icon || it.checked) && (
              <span className="grid min-w-[14px] shrink-0 place-items-center" style={{ opacity: lit ? 1 : 0.85 }}>
                {it.checked ? "✓" : it.icon}
              </span>
            )}
            <span className="flex-1">{it.label}</span>
            {it.badge && (
              <span
                className="ml-[18px] rounded-full px-[7px] text-[11px] leading-[17px] font-medium"
                style={{ background: lit ? "transparent" : "light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.14))" }}
              >
                {it.badge}
              </span>
            )}
            {it.shortcut && <kbd className="ml-[28px] font-sans tracking-[0.12em]" style={{ opacity: lit ? 0.9 : 0.42 }}>{it.shortcut}</kbd>}
            {it.submenu && (
              <svg aria-hidden width="7" height="11" viewBox="0 0 7 11" className="ml-[28px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: lit ? 1 : 0.7 }}>
                <path d="M1.5 1.5 5.5 5.5 1.5 9.5" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * A menu that opens below a menu bar title: hover or arrow keys pick a row,
 * Enter or a click runs it, → opens a submenu (← closes it), and ← / → past
 * the ends move to the neighbouring menu. Escape closes. Keys go to the
 * menu while it's open, not to the app behind it.
 */
export function MenuPanel({
  items,
  x,
  y,
  onClose,
  onStep,
  keyboard = false,
}: {
  items: MenuItem[];
  /** top-left, screen points */
  x: number;
  y: number;
  onClose: () => void;
  /** ← / → past the menu's ends: the neighbouring menu */
  onStep?: (dir: -1 | 1) => void;
  /** opened from the keyboard: the first row starts highlighted */
  keyboard?: boolean;
}) {
  const first = items.findIndex(selectable);
  const [active, setActive] = useState<number | null>(keyboard ? first : null);
  const [sub, setSub] = useState<{ row: number; active: number | null; left: number; top: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const subItems = sub ? ((items[sub.row] as Row).submenu ?? []) : [];

  const run = (it: Row) => {
    onClose();
    it.run?.();
  };
  const step = (list: MenuItem[], from: number | null, d: 1 | -1) => {
    const n = list.length;
    for (let k = 1; k <= n; k++) {
      const i = (((from ?? (d === 1 ? -1 : n)) + d * k) % n + n) % n;
      if (selectable(list[i])) return i;
    }
    return from;
  };
  // a submenu opens beside its row, its first row level with it
  const openSubmenu = (row: number, focus: boolean) => {
    const el = panel.current;
    const top = (el?.querySelector<HTMLElement>(`[data-row="${row}"]`)?.offsetTop ?? 0) - MENU.pad;
    const left = (el?.offsetWidth ?? 220) - 4;
    setSub({ row, top, left, active: focus ? ((items[row] as Row).submenu ?? []).findIndex(selectable) : null });
  };

  // the latest state for the key handler
  const now = useRef({ active, sub, items, subItems });
  useEffect(() => {
    now.current = { active, sub, items, subItems };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { active, sub, items, subItems } = now.current;
      e.preventDefault();
      e.stopImmediatePropagation();
      const inSub = sub && sub.active !== null;
      if (e.key === "Escape") return sub ? setSub(null) : onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const d = e.key === "ArrowDown" ? 1 : -1;
        if (inSub) setSub({ ...sub, active: step(subItems, sub.active, d) });
        else {
          setSub(null);
          setActive(step(items, active, d));
        }
      } else if (e.key === "ArrowRight") {
        const row = active !== null ? items[active] : null;
        if (!inSub && row && isRow(row) && row.submenu) openSubmenu(active!, true);
        else onStep?.(1);
      } else if (e.key === "ArrowLeft") {
        if (inSub) setSub(null);
        else onStep?.(-1);
      } else if (e.key === "Enter" || e.key === " ") {
        const list = inSub ? subItems : items;
        const i = inSub ? sub.active : active;
        const row = i !== null ? list[i] : null;
        if (!row || !isRow(row) || row.disabled) return;
        if (row.submenu) openSubmenu(i!, true);
        else run(row);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // handlers read the latest state from the ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute z-[1100]" style={{ left: x, top: y }}>
      <MenuList
        innerRef={panel}
        items={items}
        active={active}
        openSub={sub?.row ?? null}
        onHover={(i) => {
          if (i === null) return sub ? undefined : setActive(null);
          setActive(i);
          const row = items[i];
          if (isRow(row) && row.submenu) openSubmenu(i, false);
          else setSub(null);
        }}
        onRun={(i) => {
          const row = items[i] as Row;
          if (row.submenu) openSubmenu(i, true);
          else run(row);
        }}
      />
      {sub && (
        <div className="absolute" style={{ left: sub.left, top: sub.top }}>
          <MenuList
            items={subItems}
            active={sub.active}
            openSub={null}
            onHover={(i) => setSub({ ...sub, active: i })}
            onRun={(i) => run(subItems[i] as Row)}
          />
        </div>
      )}
    </div>
  );
}
