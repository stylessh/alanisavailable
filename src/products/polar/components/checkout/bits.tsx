"use client";

import { PolarLogo } from "../icons";
import { Inset } from "../ui/card";
import { BOX_FOCUS, FIELD, useFieldProps } from "../ui/field";

// Small pieces the checkout's two columns share.

/**
 * A card-in-card, as the dashboard frames a table: a tinted frame (16px
 * corners) with an optional header and footer on the tint, and the body
 * raised in an Inset 4px in from its edges.
 */
export function Frame({
  title,
  end,
  footer,
  className = "",
  children,
}: {
  title?: React.ReactNode;
  /** beside the title, on the right */
  end?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex min-w-0 flex-col rounded-(--pl-radius-lg) bg-(--pl-subtle) ${className}`}>
      {title && (
        <header className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-sm leading-5">
          <span className="flex min-w-0 items-center gap-2 font-[550] tracking-[0.01em] text-(--pl-text)">{title}</span>
          {end}
        </header>
      )}
      <Inset className={`mx-1 ${title ? "" : "mt-1"} ${footer ? "" : "mb-1"}`}>{children}</Inset>
      {footer && <footer className="px-4 py-3">{footer}</footer>}
    </section>
  );
}

/**
 * A field with an action inside its right end (Apply, a remove ✕), 4px in,
 * as Polar sets the discount code and tax ID. The action sits in the field's
 * box, so the focus outline and an error's red edge go round both.
 */
export function ActionInput({
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  mono,
  label,
  onEnter,
  action,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  mono?: boolean;
  label?: string;
  onEnter?: () => void;
  action?: React.ReactNode;
}) {
  const wired = useFieldProps({ "aria-invalid": invalid || undefined });
  return (
    <div
      aria-invalid={wired["aria-invalid"]}
      className={`flex h-10 w-full items-center ${FIELD} ${BOX_FOCUS} ${disabled ? "shadow-none! inset-ring inset-ring-(--pl-border)" : ""}`}
    >
      <input
        {...wired}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        readOnly={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter?.();
          }
        }}
        className={`h-full min-w-0 flex-1 bg-transparent px-3 text-sm leading-5 outline-none ${
          disabled ? "text-(--pl-text-secondary)" : "text-(--pl-text)"
        } ${mono ? "font-mono text-[13px]" : ""}`}
      />
      {action && <span className="mr-1 flex shrink-0 items-center">{action}</span>}
    </div>
  );
}

/** "Powered by Polar", at the foot of every checkout page */
export function PoweredBy() {
  return (
    <a
      href="https://polar.sh"
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-center gap-2 rounded-(--pl-radius-sm) text-sm leading-5 text-(--pl-text-faint) transition-colors hover:text-(--pl-text-muted)"
    >
      <span>Powered by</span>
      <span className="flex items-center gap-1 font-medium">
        <PolarLogo size={20} />
        Polar
      </span>
    </a>
  );
}

/** Stripe Link's mark: a green disc with an arrow through it, then the word */
export function LinkMark() {
  return (
    <span className="flex items-center gap-1.5 text-sm leading-5 font-semibold tracking-normal text-(--pl-text)">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="8" fill="#00D66F" />
        <path d="M6.5 4.5 10 8l-3.5 3.5" fill="none" stroke="#011E0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      link
    </span>
  );
}

/** A card network's tile, 32x20 with 4px corners, as payment sheets draw them */
export function CardBrand({ brand }: { brand: "visa" | "mastercard" | "amex" }) {
  if (brand === "mastercard")
    return (
      <span className="flex h-5 w-8 shrink-0 items-center justify-center rounded-(--pl-radius-xs) bg-[#252525]">
        <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden>
          <circle cx="7" cy="6" r="6" fill="#EB001B" />
          <circle cx="13" cy="6" r="6" fill="#F79E1B" fillOpacity="0.9" />
        </svg>
      </span>
    );
  if (brand === "amex")
    return (
      <span className="flex h-5 w-8 shrink-0 items-center justify-center rounded-(--pl-radius-xs) bg-[#1F72CD] text-[7px] leading-none font-bold tracking-tight text-white">
        AMEX
      </span>
    );
  return (
    <span className="flex h-5 w-8 shrink-0 items-center justify-center rounded-(--pl-radius-xs) bg-[#1A1F71] text-[9px] leading-none font-extrabold tracking-tight text-white italic">
      VISA
    </span>
  );
}
