import type { ButtonHTMLAttributes } from "react";

// Polar's orbit Button (packages/orbit/src/components/Button.tsx), checked on
// the dashboard: a pill set in 550 weight with 0.01em tracking.
//   lg: 48px tall, 20px sides, 14px
//   md: 40px tall, 20px sides, 14px ("New Product", "Export", "Save")
//   sm: 32px tall, 12px sides, 12px ("Customize", "Share", "Copy", "Delete")
// primary   gray-950, no shadow (the fill is the edge); hovering fades it to 85%
// secondary a white chip raised with shadow-sm (as a segmented thumb), its hairline
//           inside the box so it reads the same size as a filled sibling; gray-50 on hover
// ghost     nothing until hovered, then gray-200
// danger    red-500, no shadow, lightening to red-400
// underline bare text whose bottom border darkens to black on hover
// link      blue-400 text, underlined on hover
// Disabled is half opacity and flat, no shadow, so it never reads as a gray
// smudge (secondary keeps a plain gray-200 hairline so it doesn't vanish on white).
// Loading, the button keeps its size either way: a label-only button hides
// the label and spins Polar's arc in the middle at a glyph's 16px; a button
// with a glyph spins the arc in the glyph's own box and keeps its label. Focus
// is the shared outline (--pl-focus, 2px, 2px out), as on everything else.
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "underline" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-(--pl-primary) text-(--pl-primary-fg) transition-opacity duration-100 hover:opacity-85",
  secondary:
    "bg-(--pl-secondary) text-(--pl-text) shadow-(--pl-shadow-sm) transition-colors hover:bg-(--pl-secondary-hover) disabled:inset-ring disabled:inset-ring-(--pl-border)",
  ghost: "bg-transparent text-(--pl-text) transition-colors hover:bg-(--pl-ghost-hover)",
  danger: "bg-(--pl-destructive) text-white transition-colors hover:bg-(--pl-destructive-light)",
  underline:
    "rounded-none! border-b border-transparent bg-transparent p-0! text-(--pl-text) transition-colors duration-300 hover:border-(--pl-text)",
  link: "bg-transparent text-(--pl-link) underline-offset-4 hover:underline",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-2 px-3 py-1.5 text-xs leading-4",
  md: "h-10 gap-2 px-5 py-3 text-sm leading-5",
  lg: "h-12 gap-2 px-5 py-4 text-sm leading-5",
};

/** the classes every pill shares, for links and labels styled as buttons */
export const BUTTON_BASE =
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-(--pl-radius-full) font-[550] tracking-[0.01em] whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none";

export const buttonClass = (variant: ButtonVariant = "primary", size: ButtonSize = "md") =>
  `${BUTTON_BASE} ${VARIANTS[variant]} ${SIZES[size]}`;

/** Polar's loading arc (Button.tsx's LoadingSpinner) */
function Arc({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`pl-spin fill-current ${className}`}>
      <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" />
    </svg>
  );
}

/** A label-only button loading: the arc in the middle over the hidden label, 16px like a glyph */
function ButtonSpinner() {
  return (
    <span role="status" aria-label="Loading" className="absolute inset-0 flex items-center justify-center">
      <Arc className="size-4" />
    </span>
  );
}

/**
 * The glyph's own box. Loading, the glyph keeps its place, invisible, and
 * the arc fills the same box, so it's the glyph's size and nothing moves.
 */
function GlyphSlot({ loading, children }: { loading?: boolean; children: React.ReactNode }) {
  return (
    <span className="relative inline-flex shrink-0">
      <span className={`inline-flex ${loading ? "invisible" : ""}`}>{children}</span>
      {loading && (
        <span role="status" aria-label="Loading" className="absolute inset-0 flex items-center justify-center">
          <Arc className="size-full" />
        </span>
      )}
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
      {/* with a glyph, the glyph turns into the spinner and the label stays; without one, the label hides under it */}
      {loading && !icon && <ButtonSpinner />}
      <span className={`flex items-center gap-[inherit] ${loading && !icon ? "opacity-0" : ""}`}>
        {icon && <GlyphSlot loading={loading}>{icon}</GlyphSlot>}
        {children}
      </span>
    </button>
  );
}

// Round buttons holding one 16px glyph, sized to sit level with what's
// beside them: 24px (list headers), 32px (a modal's close, a list's
// toolbar), 36px (beside a segmented control) and 40px (beside fields and
// selects, as page actions; the hover actions on a metric).
export function IconButton({
  variant = "ghost",
  size = 32,
  label,
  loading,
  disabled,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 24 | 32 | 36 | 40;
  label: string;
  /** the glyph turns into the spinner, in its own box */
  loading?: boolean;
}) {
  const box = size === 24 ? "size-6" : size === 32 ? "size-8" : size === 36 ? "size-9" : "size-10";
  return (
    <button
      type="button"
      aria-label={label}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={`${BUTTON_BASE} ${VARIANTS[variant]} ${box} ${className}`}
      {...props}
    >
      <GlyphSlot loading={loading}>{children}</GlyphSlot>
    </button>
  );
}
