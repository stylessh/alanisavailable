"use client";

import type { ReactNode } from "react";
import type { Person } from "./code-data";
import { AddViewIcon, SidebarToggleIcon } from "./icons";
import { useApp } from "./router";

// The pieces every page shares, measured on the live app: a 44px header row
// with a hairline under it, a 44px row of pill tabs, round 28px icon
// buttons, and the properties panel's labelled sections.

/** A round 28px icon button; `raised` gives it the pill fill and ring. */
export function IconButton({
  label,
  children,
  raised,
  className = "",
  onClick,
}: {
  label: string;
  children: ReactNode;
  raised?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
        raised ? "ln-pill" : "hover:bg-(--ln-ghost-hover)"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** The page's first row: what you're looking at (a title or a breadcrumb) and its actions. */
export function PageHeader({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const { openDrawer } = useApp();
  return (
    <header className="flex h-11 shrink-0 items-center border-b-[0.5px] border-(--ln-header-rule) pr-2 pl-5 max-[800px]:pl-2">
      {/* below 800px the sidebar is a drawer, opened from here */}
      <button
        type="button"
        aria-label="Menu"
        onClick={openDrawer}
        className="mr-3 hidden size-7 items-center justify-center rounded-full text-(--ln-text-header) hover:bg-(--ln-ghost-hover) max-[800px]:flex"
      >
        <SidebarToggleIcon size={14} />
      </button>
      <div className="flex min-w-0 items-center text-[13px] font-medium text-(--ln-text-header)">{children}</div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-0.5 text-(--ln-text-muted)">{actions}</div>}
    </header>
  );
}

/** A link back up the breadcrumb, then the › that follows it. */
export function Crumb({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <>
      <button type="button" onClick={onClick} className="flex shrink-0 items-center gap-1.5 rounded-md hover:text-(--ln-text)">
        {children}
      </button>
      <span className="mx-2 text-(--ln-text-muted)">›</span>
    </>
  );
}

export type Tab<T extends string> = { id: T; label: string; count?: number };

/** The row of pill tabs under the header, with optional actions at its right. */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  addView = false,
  children,
}: {
  tabs: Tab<T>[];
  value: T;
  onChange: (id: T) => void;
  addView?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center px-2">
      <div className="flex items-center gap-[7px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={value === t.id ? "page" : undefined}
            onClick={() => onChange(t.id)}
            className={`ln-pill h-7 rounded-full px-[10.5px] text-xs font-medium ${
              value === t.id ? "text-(--ln-text)" : "text-(--ln-text-muted)"
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 font-[450] text-(--ln-text-muted)">{t.count}</span>}
          </button>
        ))}
        {addView && (
          <IconButton label="New view" className="text-(--ln-icon-faint)">
            <AddViewIcon size={14} />
          </IconButton>
        )}
      </div>
      {children && <div className="ml-auto flex items-center gap-1.5 text-(--ln-text-muted)">{children}</div>}
    </div>
  );
}

/** A person's round avatar: initials on their color; agents get a square. */
export function Avatar({ who, size = 18 }: { who: Person; size?: number }) {
  return (
    <span
      title={who.name}
      className={`flex shrink-0 items-center justify-center font-semibold text-white ${who.agent ? "rounded-[4px]" : "rounded-full"}`}
      style={{ width: size, height: size, background: who.color, fontSize: Math.round(size * 0.42) }}
    >
      {who.initials}
    </span>
  );
}

/** A section of the properties panel: a muted label, an optional action, then its rows. */
export function PanelSection({ label, action, children }: { label: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-1.5 flex h-6 items-center text-[13px] font-[450] text-(--ln-text-muted)">
        {label}
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </section>
  );
}

/** A row in a panel section: an icon and a value, 28px tall, inset like a ghost button. */
export function PanelRow({ icon, children, muted }: { icon?: ReactNode; children: ReactNode; muted?: boolean }) {
  return (
    <div
      className={`-mx-1 flex h-7 items-center gap-2 rounded-full px-1.5 text-[13px] font-medium hover:bg-(--ln-ghost-hover) ${
        muted ? "text-(--ln-text-muted)" : "text-(--ln-text-header)"
      }`}
    >
      {icon && <span className="flex size-3.5 shrink-0 items-center justify-center">{icon}</span>}
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

/** Green and red line counts, as diffs show them. */
export function LineCounts({ additions, deletions, className = "" }: { additions: number; deletions: number; className?: string }) {
  return (
    <span className={`ln-tnum flex shrink-0 gap-1.5 font-[450] ${className}`}>
      {additions > 0 && <span className="text-(--ln-added)">+{additions}</span>}
      {deletions > 0 && <span className="text-(--ln-removed)">-{deletions}</span>}
    </span>
  );
}

/**
 * A detail page's body, as on Linear's review page: a 688px content column
 * 68px in from the pane's left, and a 370px properties panel at the right.
 * Below 1200px the panel follows the content.
 */
export function DetailLayout({ children, panel }: { children: ReactNode; panel: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="grid grid-cols-[minmax(0,688px)_370px] justify-between gap-10 px-[68px] pt-[22px] pb-16 max-[1200px]:grid-cols-[minmax(0,1fr)] max-[1200px]:px-6">
        <div className="min-w-0">{children}</div>
        <aside className="min-w-0 pt-2.5">{panel}</aside>
      </div>
    </div>
  );
}

/** The header's branch button: the branch glyph and a ref in the mono face. */
export function RefButton({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-7 items-center gap-1.5 rounded-full px-2 text-(--ln-text-muted) hover:bg-(--ln-ghost-hover)"
    >
      {icon}
      <span className="ln-mono text-[11px] font-[450]">{children}</span>
    </button>
  );
}
