"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { Floating, useDismiss, useFloating, useListNavigation, type Align, type Side } from "./popover";

// Polar's DropdownMenu (the ⋮ on a product row, a metric's Export, the org
// switcher), measured live:
// panel  gray-50, a gray-200 border, 7.6px corners, 4px padding, shadow-lg,
//        at least 128px wide, 4px from its trigger
// item   32px, 8px sides, 14px gray-950 text, 8px gap to a 16px glyph, 2px
//        corners; highlighted, it turns blue-600 with white text. A
//        destructive item reads red-500 and still turns white.
// rule   a gray-100 hairline, 4px above and below, bleeding to the panel's edges
type MenuState = { active: number; setActive: (i: number) => void; close: () => void };
const MenuContext = createContext<MenuState | null>(null);

type TriggerProps = {
  ref: React.Ref<HTMLButtonElement>;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
};

export function Menu({
  trigger,
  side = "bottom",
  align = "start",
  className = "",
  children,
}: {
  /** render the button that opens the menu, spreading these props onto it */
  trigger: (props: TriggerProps) => React.ReactNode;
  side?: Side;
  align?: Align;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, floatingRef, style, side: placed } = useFloating<HTMLButtonElement>(open, { side, align });
  const { active, setActive, onKeyDown } = useListNavigation(open, floatingRef, "menuitem");
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  useDismiss(open, () => setOpen(false), [triggerRef, floatingRef]);

  return (
    <>
      {trigger({
        ref: triggerRef,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: () => setOpen((o) => !o),
        onKeyDown: (e) => {
          if (!open && e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          } else if (open) onKeyDown(e);
        },
      })}
      {open && (
        <Floating floatingRef={floatingRef} style={style} side={placed}>
          <MenuContext value={{ active, setActive, close }}>
            <MenuPanel className={className}>{children}</MenuPanel>
          </MenuContext>
        </Floating>
      )}
    </>
  );
}

/** The panel on its own (the design-system page shows one open in place) */
export function MenuPanel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      role="menu"
      className={`min-w-32 overflow-hidden rounded-[7.6px] border border-(--pl-border) bg-(--pl-menu) p-1 text-(--pl-popover-text) shadow-(--pl-shadow-lg) ${className}`}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  onSelect,
  destructive,
  disabled,
  icon,
  highlighted,
  children,
}: {
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  /** force the highlight (the design-system page) */
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  const menu = useContext(MenuContext);
  const ref = useRef<HTMLDivElement>(null);
  // its place among the enabled items, which the keyboard highlight counts in
  const [index, setIndex] = useState(-1);
  useLayoutEffect(() => {
    const el = ref.current;
    const all = el?.closest('[role="menu"]')?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])');
    setIndex(all && el ? [...all].indexOf(el) : -1);
  }, []);
  const on = highlighted ?? (index >= 0 && menu?.active === index);
  return (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      onPointerMove={() => index >= 0 && menu?.setActive(index)}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        menu?.close();
      }}
      className={`relative flex h-8 cursor-pointer items-center gap-2 rounded-xs px-2 py-1.5 text-sm leading-5 whitespace-nowrap transition-colors outline-none select-none aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${
        on ? "bg-(--pl-accent) text-(--pl-accent-fg)" : destructive ? "text-(--pl-destructive)" : ""
      }`}
    >
      {icon}
      {children}
    </div>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="-mx-1 my-1 h-px bg-(--pl-shell)" />;
}

/** shadcn DropdownMenuLabel: a 14px/600 heading inside the menu */
export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-1.5 text-sm leading-5 font-semibold">{children}</div>;
}
