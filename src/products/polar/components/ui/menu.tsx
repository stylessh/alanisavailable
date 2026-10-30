"use client";

import { Children, createContext, isValidElement, useContext, useLayoutEffect, useRef, useState } from "react";
import {
  Floating,
  POPOVER,
  PopoverEmpty,
  PopoverLabel,
  PopoverSearch,
  PopoverSeparator,
  SEARCH_FROM,
  matches,
  RowEnd,
  RowIcon,
  rowClass,
  useDismiss,
  useFloating,
  useListNavigation,
  usePopoverOpen,
  type Align,
  type Side,
} from "./popover";

// The dropdown menu (the ⋮ on a product row, a metric's ⋮, the org
// switcher), on the shared popover and row (see popover.tsx): grayscale,
// a muted glyph leading each item, a check on the right for a chosen one and
// its shortcut after it, small muted section labels and edge-to-edge
// hairlines. A destructive item stays red on the same gray highlight. The
// highlight follows the pointer and the arrow keys, and leaves with the pointer.
// A menu of SEARCH_FROM items or more opens with a search on top, focused:
// typing narrows it to the items that match (labels and separators step
// aside), the first match highlighted, so Enter picks it.
type MenuState = { active: number; setActive: (i: number) => void; close: () => void; query: string };
const MenuContext = createContext<MenuState | null>(null);

type TriggerProps = {
  ref: React.Ref<HTMLButtonElement>;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void;
};

export function Menu({
  trigger,
  side = "bottom",
  align = "start",
  className = "",
  search,
  children,
}: {
  /** render the button that opens the menu, spreading these props onto it */
  trigger: (props: TriggerProps) => React.ReactNode;
  side?: Side;
  align?: Align;
  className?: string;
  /** a search on top; by default when it has SEARCH_FROM items or more */
  search?: boolean;
  children: React.ReactNode;
}) {
  const { open, setOpen, onPointerEnter, instant } = usePopoverOpen();
  const { triggerRef, floatingRef, style, side: placed } = useFloating<HTMLButtonElement>(open, { side, align });
  const { active, setActive, onKeyDown } = useListNavigation(open, floatingRef, "menuitem");
  const searchable = search ?? countItems(children) >= SEARCH_FROM;
  const [query, setQuery] = useState("");
  // each opening starts unfiltered
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery("");
  }
  // nothing left to show: say so
  const [none, setNone] = useState(false);
  useLayoutEffect(() => {
    setNone(open && !!query && !floatingRef.current?.querySelector('[role="menuitem"]'));
  }, [open, query, floatingRef]);
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
        onClick: () => setOpen(!open),
        onPointerEnter,
        onKeyDown: (e) => {
          if (!open && e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          } else if (open) onKeyDown(e);
        },
      })}
      {open && (
        // with a search, keys arrive from its input, inside the panel
        <Floating
          floatingRef={floatingRef}
          style={style}
          side={placed}
          instant={instant}
          onKeyDown={searchable ? onKeyDown : undefined}
        >
          <MenuContext value={{ active, setActive, close, query }}>
            <MenuPanel
              className={className}
              onPointerLeave={() => setActive(-1)}
              search={
                searchable && (
                  <PopoverSearch
                    value={query}
                    onChange={(q) => {
                      setQuery(q);
                      setActive(q.trim() ? 0 : -1);
                    }}
                  />
                )
              }
              empty={none}
            >
              {children}
            </MenuPanel>
          </MenuContext>
        </Floating>
      )}
    </>
  );
}

/** how many items a menu holds, through fragments and wrappers */
function countItems(node: React.ReactNode): number {
  let n = 0;
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === MenuItem) n++;
    else n += countItems((child.props as { children?: React.ReactNode }).children);
  });
  return n;
}

/** an item's text, for matching what's typed */
function textOf(node: React.ReactNode): string {
  let text = "";
  Children.forEach(node, (child) => {
    if (typeof child === "string" || typeof child === "number") text += child;
    else if (isValidElement(child)) text += textOf((child.props as { children?: React.ReactNode }).children);
  });
  return text;
}

/** The panel on its own (the design-system page shows one open in place) */
export function MenuPanel({
  className = "",
  onPointerLeave,
  search,
  empty,
  children,
}: {
  className?: string;
  onPointerLeave?: () => void;
  /** the search row on top; the items then scroll under it */
  search?: React.ReactNode;
  /** nothing matches what's typed */
  empty?: boolean;
  children: React.ReactNode;
}) {
  if (search)
    return (
      <div className={`flex max-h-[360px] flex-col overflow-hidden ${POPOVER} p-0! ${className}`}>
        {search}
        <div
          role="menu"
          onPointerLeave={onPointerLeave}
          className="min-h-0 overflow-y-auto p-1 [&:has([data-glyph])_[role=menuitem]:not(:has([data-glyph]))]:pl-8"
        >
          {children}
          {empty && <PopoverEmpty />}
        </div>
      </div>
    );
  return (
    // when some items have a glyph, the rest start where its label would (8px in, 16px glyph, 8px gap)
    <div
      role="menu"
      onPointerLeave={onPointerLeave}
      className={`overflow-hidden ${POPOVER} [&:has([data-glyph])_[role=menuitem]:not(:has([data-glyph]))]:pl-8 ${className}`}
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
  checked,
  shortcut,
  end,
  keepOpen,
  textValue,
  highlighted,
  children,
}: {
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** a 16px glyph before the label */
  icon?: React.ReactNode;
  /** a check on the right: the current one of a set (an organization, a theme) */
  checked?: boolean;
  /** its key, shown last */
  shortcut?: string;
  /** quiet text at the end, before the check (a filter value's count) */
  end?: React.ReactNode;
  /** choosing it leaves the menu open (ticking several filter values) */
  keepOpen?: boolean;
  /** what a search matches against, when its label isn't plain text */
  textValue?: string;
  /** force the highlight (the design-system page) */
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  const menu = useContext(MenuContext);
  const ref = useRef<HTMLDivElement>(null);
  // its place among the enabled items, which the keyboard highlight counts in
  const [index, setIndex] = useState(-1);
  const query = menu?.query ?? "";
  // counted again as a search hides and shows items around it
  useLayoutEffect(() => {
    const el = ref.current;
    const all = el?.closest('[role="menu"]')?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])');
    setIndex(all && el ? [...all].indexOf(el) : -1);
  }, [query]);
  const on = highlighted ?? (index >= 0 && menu?.active === index);
  if (query && !matches(textValue ?? textOf(children), query)) return null;
  return (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      // a click mustn't take focus from the search (ticking several filters, typing on)
      onMouseDown={(e) => e.preventDefault()}
      onPointerMove={() => index >= 0 && menu?.setActive(index)}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        if (!keepOpen) menu?.close();
      }}
      className={rowClass(!!on, destructive)}
    >
      {icon && <RowIcon danger={destructive}>{icon}</RowIcon>}
      <span className="min-w-0 truncate">{children}</span>
      <RowEnd checked={checked} shortcut={shortcut}>
        {end}
      </RowEnd>
    </div>
  );
}

/** A hairline between groups; it steps aside while a search narrows the menu */
export function MenuSeparator() {
  const menu = useContext(MenuContext);
  return menu?.query ? null : <PopoverSeparator />;
}

/** A small muted heading over a group of items; it steps aside while searching */
export function MenuLabel(props: React.ComponentProps<typeof PopoverLabel>) {
  const menu = useContext(MenuContext);
  return menu?.query ? null : <PopoverLabel {...props} />;
}
