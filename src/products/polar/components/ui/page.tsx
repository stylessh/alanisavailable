// The page card every dashboard page sits in, and its header, as measured at
// 1440x900: a white card 8px in from the shell (16px corners, a gray-200
// border, shadow-xs) that scrolls on its own, 32px of side padding, 32px
// above the header row, a 24px/500 title, and the content 32px under it.

export function PageCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`pl-scroll relative flex min-w-0 flex-1 flex-col overflow-auto rounded-2xl border border-(--pl-border) bg-(--pl-surface) shadow-(--pl-shadow-xs) ${className}`}
    >
      {children}
    </div>
  );
}

export function Page({
  title,
  actions,
  narrow,
  gap = 32,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  /** settings pages center a 768px column */
  narrow?: boolean;
  /** space under the header: 32px on most pages, 16px on Finance */
  gap?: 16 | 32;
  children: React.ReactNode;
}) {
  return (
    <PageCard className="px-8">
      <div
        className={`mx-auto flex w-full flex-col pt-8 ${narrow ? "max-w-3xl" : ""} ${gap === 16 ? "gap-4" : "gap-8"}`}
      >
        <header className="flex min-h-8 flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl leading-8 font-medium text-(--pl-text)">{title}</h1>
          {actions && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{actions}</div>}
        </header>
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
      <h2
        className={
          large ? "text-2xl leading-[33px] font-normal text-(--pl-text-strong)" : "text-base leading-6 text-(--pl-text-strong)"
        }
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

// The empty and zero states moved to feedback.tsx with the rest of the design system
export { EmptyState } from "./feedback";
