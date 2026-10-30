"use client";

import { useId, useRef } from "react";

// Polar's tabs come in two kinds:
// text  the page sub-navigation (Customers' Overview / Top Customers / At
//       Risk, a product's Overview / Metrics): 20px/400 words 24px apart,
//       gray-500 until chosen or hovered, then black
// pill  orbit Tabs: 14px/500 labels 16px from their edges, gray-400, black on
//       hover; the chosen one sits on a gray-100 pill with 12px corners
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  variant = "text",
  size = "default",
}: {
  tabs: { id: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  variant?: "text" | "pill";
  /** pill tabs at 12px */
  size?: "default" | "small";
}) {
  const id = useId();
  const list = useRef<HTMLDivElement>(null);
  const move = (e: React.KeyboardEvent, i: number) => {
    const next =
      e.key === "ArrowRight"
        ? i + 1
        : e.key === "ArrowLeft"
          ? i - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? tabs.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    onChange(t.id);
    list.current?.querySelector<HTMLElement>(`[data-tab="${t.id}"]`)?.focus();
  };
  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      className={variant === "text" ? "flex flex-wrap gap-x-6 gap-y-2" : "flex w-fit flex-row items-center gap-2"}
    >
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${id}-${t.id}`}
            data-tab={t.id}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => move(e, i)}
            className={
              variant === "text"
                ? `cursor-pointer text-xl leading-[27.5px] font-normal transition-colors ${
                    on ? "text-(--pl-text)" : "text-(--pl-text-muted) hover:text-(--pl-text)"
                  }`
                : `inline-flex cursor-pointer items-center justify-center rounded-(--pl-radius-md) px-4 py-1.5 font-medium whitespace-nowrap transition-all ${
                    size === "default" ? "text-sm leading-5" : "text-xs leading-4"
                  } ${on ? "bg-(--pl-fill) text-(--pl-text)" : "text-(--pl-text-faint) hover:text-(--pl-text)"}`
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
