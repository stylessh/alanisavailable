"use client";

import { Children, Fragment, isValidElement } from "react";
import { Checkbox } from "./controls";

// Polar's surfaces, from orbit and the dashboard's own components.

/**
 * A bordered white panel, 16px corners (MetricGrid, a table's frame, a
 * Customers chart). Pass padding through className.
 */
export function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-(--pl-border) bg-(--pl-surface) ${className}`}>{children}</div>
  );
}

/**
 * Polar's Card atom: gray-100, borderless, 32px corners, gray-950 text. Its
 * header is 24px padded with 6px between title and description; its content
 * sits under it with no top padding.
 */
export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-4xl bg-(--pl-shell) text-(--pl-text-input) ${className}`}>{children}</div>;
}

export function CardHeader({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex flex-col gap-1.5 p-6 ${className}`}>{children}</div>;
}

export function CardContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex items-center p-6 pt-0 ${className}`}>{children}</div>;
}

/**
 * ShadowBox, the gray-50 well (Create Product's sections, balance empty
 * state): 12px corners, 32px on large screens, 32px of padding.
 */
export function Well({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`w-full rounded-xl border border-transparent bg-(--pl-subtle) p-8 lg:rounded-4xl ${className}`}>
      {children}
    </div>
  );
}

/**
 * orbit List: rows inside a gray-200 frame with a hairline between each;
 * 32px corners, or 16px when small.
 */
export function List({
  size = "default",
  className = "",
  children,
}: {
  size?: "default" | "small";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col divide-y divide-(--pl-border) overflow-hidden border border-(--pl-border) ${
        size === "default" ? "rounded-4xl" : "rounded-2xl"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * orbit ListItem: 16px tall padding and 24px sides (8px and 16px small), 24px
 * between its parts, gray-50 when hovered or selected. With a checkbox, the
 * box waits in a 16px gutter and appears on hover, staying once checked
 * (Catalogue's rows).
 */
export function ListItem({
  size = "default",
  selected,
  onSelect,
  checked,
  onCheckedChange,
  className = "",
  children,
}: {
  size?: "default" | "small";
  selected?: boolean;
  onSelect?: () => void;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const hasCheckbox = !!onCheckedChange;
  return (
    <div
      onClick={onSelect}
      className={`group/row flex items-center justify-between ${selected ? "bg-(--pl-subtle)" : "hover:bg-(--pl-subtle)"} ${
        onSelect ? "cursor-pointer" : ""
      } ${size === "default" ? "py-4" : "py-2"} ${hasCheckbox ? "pr-6" : size === "default" ? "gap-x-6 px-6" : "gap-x-6 px-4"} ${className}`}
    >
      {hasCheckbox && (
        <div className={`flex shrink-0 items-center pr-1 pl-4 ${size === "default" ? "-my-4 py-4" : "-my-2 py-2"}`}>
          <Checkbox
            checked={!!checked}
            onChange={onCheckedChange}
            className={`transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 ${checked ? "" : "opacity-0"}`}
          />
        </div>
      )}
      {children}
    </div>
  );
}

/** orbit ListGroup: a 1px gray-200 ring at 16px corners; items are 20px padded under a hairline */
export function ListGroup({ children }: { children: React.ReactNode }) {
  return <div className="w-full overflow-hidden rounded-2xl ring-1 ring-(--pl-border)">{children}</div>;
}

export function ListGroupItem({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-(--pl-border) p-5 first:border-t-0">{children}</div>;
}

/** The 32px gray-50 tile an icon sits in at the start of a row (discounts, benefits) */
export function IconTile({ children, size = 32 }: { children: React.ReactNode; size?: 32 | 40 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-(--pl-subtle) text-(--pl-text-muted)"
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}

/**
 * Settings' sections (SettingsGroup): a 16px title over a 12px gray-500
 * description, 12px above a gray-50 panel with 16px corners whose rows are
 * split by hairlines.
 */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex w-full flex-col gap-3">
      {(title || description) && (
        <div className="flex flex-col gap-1">
          {title && <h2 className="text-base leading-6 text-(--pl-text-strong)">{title}</h2>}
          {description && <p className="text-xs leading-[1.375] text-(--pl-text-muted)">{description}</p>}
        </div>
      )}
      <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-(--pl-border) bg-(--pl-subtle)">
        {Children.toArray(children).map((child, i) => (
          <Fragment key={isValidElement(child) ? child.key : i}>
            {i > 0 && <div className="border-t border-(--pl-border)" />}
            {child}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

/**
 * A setting: a 14px/500 title and gray-500 description, 24px by 16px padded.
 * split   label left (up to half), control right; stacked under each other
 *         below 768px
 * stacked label above a full-width control
 * inline  label and control on one line always (a switch, Delete)
 */
export function SettingsItem({
  title,
  description,
  layout = "split",
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  layout?: "split" | "stacked" | "inline";
  children?: React.ReactNode;
}) {
  const row =
    layout === "split"
      ? "flex-col md:flex-row md:items-start md:justify-between md:gap-x-12"
      : layout === "stacked"
        ? "flex-col"
        : "flex-row items-center justify-between gap-x-4 md:gap-x-12";
  return (
    <div className={`flex gap-y-4 px-6 py-4 ${row}`}>
      <div className={`flex flex-col gap-1 ${layout === "inline" ? "min-w-0 flex-1" : "w-full md:max-w-1/2"}`}>
        <h3 className="text-sm leading-[1.5] font-medium text-(--pl-text-strong)">{title}</h3>
        {description && <p className="text-sm leading-[1.5] text-(--pl-text-muted)">{description}</p>}
      </div>
      {children && (
        <div
          className={`flex gap-y-2 ${layout === "inline" ? "shrink-0 justify-end" : layout === "split" ? "w-full md:justify-end" : "w-full"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** A free-form row in a SettingsGroup, 24px by 16px padded */
export function SettingsRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col px-6 py-4">{children}</div>;
}
