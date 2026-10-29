import type { ButtonHTMLAttributes } from "react";

// Polar's orbit Button (packages/orbit/src/components/Button.tsx), checked on
// the dashboard: a pill set in 550 weight with 0.01em tracking.
//   lg: 48px tall, 20px sides, 14px
//   md: 40px tall, 20px sides, 14px ("New Product", "Export", "Save")
//   sm: 32px tall, 12px sides, 12px ("Customize", "Share", "Copy", "Delete")
// primary   black; hovering fades it to 85%
// secondary gray-100 with a 4% black hairline, gray-200 on hover
// outline   a gray-100 hairline that turns gray-200, filling gray-200 on hover
// ghost     nothing until hovered, then gray-200
// danger    red-500, lightening to red-400
// underline bare text whose bottom border darkens to black on hover
// link      blue-400 text, underlined on hover
// Disabled is half opacity. Loading keeps the width, hides the label and
// spins Polar's 8px arc in the middle. Focus draws a 2px gray-200 ring 2px out.
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "underline" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-(--pl-primary) text-white transition-opacity duration-100 hover:opacity-85",
  secondary:
    "border border-(--pl-secondary-border) bg-(--pl-secondary) text-(--pl-text-strong) transition-colors hover:bg-(--pl-secondary-hover)",
  outline:
    "border border-(--pl-shell) bg-transparent text-(--pl-text-strong) transition-colors hover:border-(--pl-border) hover:bg-(--pl-border)",
  ghost: "bg-transparent text-(--pl-text-strong) transition-colors hover:bg-(--pl-ghost-hover)",
  danger: "bg-(--pl-destructive) text-white transition-colors hover:bg-(--pl-destructive-light)",
  underline:
    "rounded-none! border-b border-transparent bg-transparent p-0! text-(--pl-text-strong) transition-colors duration-300 hover:border-(--pl-text-strong)",
  link: "bg-transparent text-(--pl-link) underline-offset-4 hover:underline",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-2 px-3 py-1.5 text-xs leading-4",
  md: "h-10 gap-2 px-5 py-3 text-sm leading-5",
  lg: "h-12 gap-2 px-5 py-4 text-sm leading-5",
};

/** the classes every pill shares, for links and labels styled as buttons */
export const BUTTON_BASE =
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full font-[550] tracking-[0.01em] whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pl-border) focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

export const buttonClass = (variant: ButtonVariant = "primary", size: ButtonSize = "md") =>
  `${BUTTON_BASE} ${VARIANTS[variant]} ${SIZES[size]}`;

/** Polar's loading arc (Button.tsx's LoadingSpinner): 8px, or 16px on lg */
function ButtonSpinner({ size }: { size: ButtonSize }) {
  return (
    <span role="status" aria-label="Loading" className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 24 24" className={`pl-spin fill-current ${size === "lg" ? "size-4" : "size-2"}`}>
        <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" />
      </svg>
    </span>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading,
  fullWidth,
  className = "",
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** a glyph before the label, 8px from it */
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClass(variant, size)} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading && <ButtonSpinner size={size} />}
      <span className={`flex items-center gap-[inherit] ${loading ? "opacity-0" : ""}`}>
        {icon}
        {children}
      </span>
    </button>
  );
}

// Round buttons holding one 16px glyph: 24px (list headers), 32px (page
// actions, a modal's close) and 40px (the hover actions on a metric).
export function IconButton({
  variant = "ghost",
  size = 32,
  label,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 24 | 32 | 40;
  label: string;
}) {
  const box = size === 24 ? "size-6" : size === 32 ? "size-8" : "size-10";
  return (
    <button type="button" aria-label={label} className={`${BUTTON_BASE} ${VARIANTS[variant]} ${box} ${className}`} {...props}>
      {children}
    </button>
  );
}
