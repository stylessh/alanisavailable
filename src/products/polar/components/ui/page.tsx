import { IconButton } from "./button";
import { Tooltip } from "./overlay";
import { PopoverGroup } from "./popover";

// The page card every dashboard page sits in, and its header, as measured at
// 1440x900: a white card 8px in from the shell (16px corners, edged by
// shadow-xs's hairline, outside it so dividers inside reach it) that scrolls on its own, 32px of side padding, 32px
// above the header row, a 24px/500 title, and the content 32px under it.

export function PageCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`pl-scroll relative flex min-w-0 flex-1 flex-col overflow-auto rounded-(--pl-radius-lg) bg-(--pl-surface) shadow-(--pl-shadow-xs) ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Every page's header, laid out as Metrics' is: the title on the left; on the
 * right the filters (fields, selects, a time range), 8px apart, then 24px
 * on the quick actions, round icon-only buttons 8px apart, each named by a
 * tooltip and as tall as the filters. Filters and actions are one popover
 * group: with one open, hovering another opens it. It wraps under the title
 * when the card is narrow.
 */
export function PageHeader({
  title,
  filters,
  actions,
}: {
  title: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-10 flex-wrap items-center justify-between gap-x-8 gap-y-4">
      <h1 className="text-2xl leading-8 font-medium text-(--pl-text)">{title}</h1>
      {(filters || actions) && (
        <PopoverGroup>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </PopoverGroup>
      )}
    </header>
  );
}

/**
 * A quick action in a page header: a round secondary button with one glyph,
 * its name in a tooltip, as tall as the filters beside it: 40px beside
 * fields and selects, 36px beside a segmented control. Primary for the one
 * that makes something new (the + of New Product, Add metric), filled so it
 * leads the row. Ghost (32px) inside a toolbar that has no chrome of its own
 * (a list's search), its glyph gray-500 like the search's, so it reads as
 * part of it.
 */
export function PageAction({
  label,
  onClick,
  ghost,
  primary,
  size = ghost ? 32 : 40,
  children,
  ...props
}: Omit<React.ComponentProps<typeof IconButton>, "variant"> & { ghost?: boolean; primary?: boolean }) {
  return (
    <Tooltip content={label}>
      <IconButton
        label={label}
        variant={ghost ? "ghost" : primary ? "primary" : "secondary"}
        size={size}
        onClick={onClick}
        {...props}
        className={`${ghost ? "text-(--pl-text-muted) hover:text-(--pl-text)" : ""} ${props.className ?? ""}`}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

export function Page({
  title,
  filters,
  actions,
  narrow,
  gap = 32,
  children,
}: {
  title: string;
  /** fields, selects and ranges that narrow what the page shows */
  filters?: React.ReactNode;
  /** PageActions: what you can do from here, icon-only */
  actions?: React.ReactNode;
  /** settings pages center a 768px column */
  narrow?: boolean;
  /** space under the header: 32px on most pages, 16px on Finance */
  gap?: 16 | 32;
  children: React.ReactNode;
}) {
  return (
    <PageCard className="px-8">
      <div className={`mx-auto flex w-full flex-col pt-8 ${narrow ? "max-w-3xl" : ""} ${gap === 16 ? "gap-4" : "gap-8"}`}>
        <PageHeader title={title} filters={filters} actions={actions} />
        <div className="flex flex-col pb-8">{children}</div>
      </div>
    </PageCard>
  );
}

/** A titled group inside a page: Settings' "Identifiers", Analytics' "Revenue" */
export function Section({
  title,
  large,
  children,
}: {
  title: string;
  /** Analytics sets its section titles at 24px/400 black; Settings at 16px */
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col ${large ? "gap-4" : "gap-3"}`}>
      <h2 className={large ? "text-2xl leading-[33px] font-normal text-(--pl-text)" : "text-base leading-6 text-(--pl-text)"}>
        {title}
      </h2>
      {children}
    </section>
  );
}

// The empty and zero states moved to feedback.tsx with the rest of the design system
export { EmptyState } from "./feedback";
