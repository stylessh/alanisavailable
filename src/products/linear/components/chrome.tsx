"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Person } from "./code-data";
import { AddViewIcon, PlusIcon, SidebarToggleIcon } from "./icons";
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
      // a size passed in replaces the 28px default, which would otherwise win the cascade
      className={`flex ${/(^|\s)size-/.test(className) ? "" : "size-7"} shrink-0 items-center justify-center rounded-full ${
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

export type Tab<T extends string> = { id: T; label: string; count?: number; suffix?: ReactNode };

/** The row of pill tabs under the header, with optional actions at its right. */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  addView = false,
  children,
  className = "px-2",
}: {
  tabs: Tab<T>[];
  value: T;
  onChange: (id: T) => void;
  addView?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-11 shrink-0 items-center ${className}`}>
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
            {t.suffix && <span className="ml-1.5 inline-flex">{t.suffix}</span>}
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

/** A person's round avatar: initials on their color; agents get a square with a hairline, so a black one holds on dark. */
/**
 * Agents' marks, from svgl.app (the brands' own SVGs): Cursor's cube in its
 * light-on-dark color on a black disc, Linear's in white on its indigo.
 */
const MARKS = {
  cursor: (
    <svg viewBox="0 0 466.73 532.09" fill="#edecec" aria-hidden style={{ height: "56%" }}>
      <path d="M457.43 125.94 244.42 2.96c-6.84-3.95-15.28-3.95-22.12 0L9.3 125.94C3.55 129.26 0 135.4 0 142.05v247.99c0 6.65 3.55 12.79 9.3 16.11l213.01 122.98c6.84 3.95 15.28 3.95 22.12 0l213.01-122.98c5.75-3.32 9.3-9.46 9.3-16.11V142.05c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05 151.99 238.42 508.15c-1.39 2.4-5.06 1.42-5.06-1.36V273.58c0-4.66-2.49-8.97-6.53-11.31L24.87 145.67c-2.4-1.39-1.42-5.06 1.36-5.06h411.26c5.84 0 9.49 6.33 6.57 11.39h-.01Z" />
    </svg>
  ),
  linear: (
    <svg viewBox="0 0 100 100" fill="#fff" aria-hidden style={{ width: "54%" }}>
      <path d="M1.225 61.523c-.222-.949.908-1.546 1.597-.857l36.512 36.512c.69.69.092 1.82-.857 1.597-18.425-4.323-32.93-18.827-37.252-37.252ZM.002 46.889a.99.99 0 0 0 .29.76L52.35 99.71c.201.2.478.307.76.29 2.37-.149 4.695-.46 6.963-.927.765-.157 1.03-1.096.478-1.648L2.576 39.448c-.552-.551-1.491-.286-1.648.479a50.067 50.067 0 0 0-.926 6.962ZM4.21 29.705a.988.988 0 0 0 .208 1.1l64.776 64.776c.289.29.726.375 1.1.208a49.908 49.908 0 0 0 5.185-2.684.981.981 0 0 0 .183-1.54L8.436 24.336a.981.981 0 0 0-1.541.183 49.896 49.896 0 0 0-2.684 5.185Zm8.448-11.631a.986.986 0 0 1-.045-1.354C21.78 6.46 35.111 0 49.952 0 77.592 0 100 22.407 100 50.048c0 14.84-6.46 28.172-16.72 37.338a.986.986 0 0 1-1.354-.045L12.659 18.074Z" />
    </svg>
  ),
};

export function Avatar({ who, size = 18 }: { who: Person; size?: number }) {
  // an agent is round like everyone else, its brand's mark on its brand's color, with a hairline so a black disc holds on dark
  if (who.mark)
    return (
      <span
        role="img"
        aria-label={who.name}
        title={who.name}
        className="flex shrink-0 items-center justify-center rounded-full ring-[0.5px] ring-(--ln-chip-border)"
        style={{ width: size, height: size, background: who.color }}
      >
        {MARKS[who.mark]}
      </span>
    );
  if (who.photo)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a 14-24px avatar from public/, nothing for the image pipeline to do
      <img
        src={who.photo}
        alt=""
        title={who.name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, background: who.color }}
      />
    );
  return (
    <span
      title={who.name}
      // round for everyone, as Linear draws agents too; an agent's dark disc keeps a hairline so it reads on dark surfaces
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${who.agent ? "ring-[0.5px] ring-(--ln-chip-border)" : ""}`}
      style={{ width: size, height: size, background: who.color, fontSize: Math.round(size * 0.42) }}
    >
      {who.initials}
    </span>
  );
}

/** A section of the properties panel: a muted label, an optional action, then its rows. */
export function PanelSection({ label, action, children }: { label: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-7">
      <div className="mb-1.5 flex h-6 items-center text-[13px] font-[450] text-(--ln-text-muted)">
        {label}
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

/**
 * A panel section's +: always on a row of its own under the section's items,
 * a 24px muted button whose glyph centres on the 14px icon column above it.
 */
export function AddButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <IconButton label={label} className="-ml-[5px] size-6 text-(--ln-text-muted)" onClick={onClick}>
      <PlusIcon size={14} />
    </IconButton>
  );
}

/**
 * A row in a panel section, as Linear's issue panel has them: a ghost pill
 * that hugs its content (clicking it changes the value), and, when the row
 * points at something with its own page, a round › beside it on hover that
 * goes there.
 */
export function PanelRow({
  icon,
  children,
  muted,
  onClick,
  onGo,
  goLabel = "Open",
  after,
}: {
  icon?: ReactNode;
  children: ReactNode;
  muted?: boolean;
  onClick?: () => void;
  onGo?: () => void;
  goLabel?: string;
  /** something that sits on the row after the pill, like Labels' + */
  after?: ReactNode;
}) {
  const pill = (
    <>
      {icon && <span className="flex size-3.5 shrink-0 items-center justify-center">{icon}</span>}
      <span className="min-w-0 truncate">{children}</span>
    </>
  );
  // the pill stays lit while the pointer is on its › as well, so reaching for the arrow doesn't drop the row's hover
  const cls = `-mx-1.5 flex h-7 min-w-0 items-center gap-2 rounded-full px-1.5 text-[13px] font-medium group-hover/row:bg-(--ln-item-hover) hover:bg-(--ln-item-hover) ${
    muted ? "text-(--ln-text-muted)" : "text-(--ln-text-header)"
  }`;
  return (
    // the pill hangs 6px past its text on both sides, so 10px here leaves the measured 4px between pill and ›
    <div className="group/row flex w-fit max-w-full items-center gap-2.5">
      {onClick ? (
        <button type="button" onClick={onClick} className={`${cls} text-left`}>
          {pill}
        </button>
      ) : (
        <div className={cls}>{pill}</div>
      )}
      {onGo && <GoButton label={goLabel} onClick={onGo} />}
      {after}
    </div>
  );
}

/**
 * The round › beside a panel item, shown on hover, that opens the item's own
 * page. Measured off the desktop app at 2x: a 28px circle 4px after the
 * item's pill, filled fainter than the pill, holding a 4x7.5 chevron in the
 * muted text color.
 */
export function GoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--ln-go-fill) text-(--ln-text-muted) opacity-0 group-hover/row:opacity-100 hover:bg-(--ln-ghost-hover) hover:text-(--ln-text-header) focus-visible:opacity-100"
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
        <path d="M2.6.85 5.4 4 2.6 7.15" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/**
 * The elbow from a person down to the agent they've handed work to, copied
 * from Linear's own element: a 1px line 10px tall, and under it a 10x9 glyph
 * that carries the line on and bends it out to the right through a tight
 * curve, ending 8px across at the agent's centre height (18px down). Place
 * it with `className` so the line starts 7.5px under the person's avatar,
 * centred on it.
 */
export function Elbow({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`absolute h-2.5 w-px bg-(--ln-chip-border) ${className}`}>
      <svg width="10" height="9" viewBox="0 0 10 9" className="absolute -bottom-2 left-0 text-(--ln-chip-border)" fill="currentColor">
        <path d="M0 0h1v2.077c0 2.5 2.212 3.546 2.212 3.546L7.737 8.06c.568.306.094 1.186-.474.88l-4.48-2.411S0 5.077 0 2.077V0Z" />
      </svg>
    </span>
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
 * A detail page's body, measured off Linear's issue page at two window
 * widths: the properties panel takes 34.7% of the pane, its items flush at
 * its left, and the content is a column of at most 688px with 46px either
 * side, centred in what's left. So on a narrow pane the text sits 46px in,
 * and on a wide one it floats with equal room on both sides. The panel stays
 * put while the content scrolls; on a pane under 850px (a 1100px window, or
 * a wide one with the agent docked) it follows the content.
 */
export function DetailLayout({
  children,
  panel,
  pinStart = false,
}: {
  children: ReactNode;
  panel: ReactNode;
  /** hold the content column at its left edge and inset rather than centring it, so a panel docking beside the page doesn't move it */
  pinStart?: boolean;
}) {
  // whether the panel is taller than the page: only then does it scroll by itself; otherwise it stays
  // unclipped, so the menus its rows open (reviewers, agents) can drop past its last section
  const page = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  useEffect(() => {
    const measure = () => page.current && inner.current && setTall(inner.current.offsetHeight + 38 > page.current.clientHeight);
    const watch = new ResizeObserver(measure);
    if (page.current) watch.observe(page.current);
    if (inner.current) watch.observe(inner.current);
    return () => watch.disconnect();
  }, []);
  return (
    // one page scroll (its bar at the window's edge), measured as a container so the panel can be held to its height
    <div ref={page} className="min-h-0 flex-1 overflow-y-auto [container-type:size]">
      {/* the page's bottom padding sits inside the content column, so the grid runs to the very end and the pinned panel never gets nudged up */}
      <div className="grid grid-cols-[minmax(0,1fr)_34.7%] @max-[850px]:grid-cols-[minmax(0,1fr)]">
        <div
          className={`w-full max-w-[780px] min-w-0 px-[46px] pt-6 pb-16 ${
            // pinned, its inset holds when the pane narrows too (only a phone-sized window tightens it), so nothing slides
            pinStart ? "mr-auto max-[800px]:px-6" : "mx-auto @max-[850px]:px-6"
          }`}
        >
          {children}
        </div>
        {/* the panel stays pinned while the page scrolls; it's never taller than the page's height, so a long one
            (a repo's) scrolls by itself under the pointer, its bar hidden, rather than riding along with the page.
            Its items hug their content; anything that wraps stops at 320px rather than the page's edge */}
        <aside
          className={`sticky top-0 z-10 min-w-0 self-start pt-3.5 pr-3 pb-6 @max-[850px]:relative @max-[850px]:max-h-none @max-[850px]:overflow-visible @max-[850px]:px-6 ${
            tall ? "max-h-[100cqh] overflow-y-auto overscroll-contain [scrollbar-width:none]" : ""
          }`}
        >
          <div ref={inner} className="max-w-80">
            {panel}
          </div>
        </aside>
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

/** A property in a side panel: a muted label in a 96px column, then its value (one line, unless `wrap`). */
export function PropertyRow({ label, children, wrap = false }: { label: string; children: ReactNode; wrap?: boolean }) {
  return (
    <div className={`flex min-h-9 items-center gap-2 text-[13px] ${wrap ? "py-1.5" : ""}`}>
      <span className="w-24 shrink-0 font-[450] text-(--ln-text-muted)">{label}</span>
      <span className={`flex min-w-0 flex-1 items-center gap-1.5 font-medium text-(--ln-text-header) ${wrap ? "flex-wrap" : ""}`}>{children}</span>
    </div>
  );
}

/** A branch name as a badge: the mono face on a faint tint, as Linear sets refs. */
export function BranchBadge({ name }: { name: string }) {
  return (
    <span className="ln-mono inline-flex h-5 max-w-full items-center truncate rounded-[5px] bg-(--ln-pill-neutral) px-1.5 text-[11.5px] font-[450] text-(--ln-text-header)">
      {name}
    </span>
  );
}
