import { CircleAlertIcon, CircleCheckIcon, InfoIcon, LoaderCircleIcon, TriangleAlertIcon, XIcon } from "../icons";
import { Button, type ButtonVariant } from "./button";

// Telling the merchant something: alerts, loading and empty states.

type AlertVariant = "info" | "warning" | "danger" | "success";

const ALERTS: Record<AlertVariant, { Icon: typeof InfoIcon; accent: string }> = {
  info: { Icon: InfoIcon, accent: "text-(--pl-text)" },
  warning: { Icon: TriangleAlertIcon, accent: "text-(--pl-warning)" },
  danger: { Icon: CircleAlertIcon, accent: "text-(--pl-danger)" },
  success: { Icon: CircleCheckIcon, accent: "text-(--pl-success)" },
};

/**
 * orbit Alert ("These are your personal notifications"): a gray-100 panel
 * with 8px corners, 16px by 24px padded. A 16px icon, 12px from the title
 * (14px/500), both in the variant's color; a gray-500 description under the
 * title; an optional dismiss and up to two small actions. Loading swaps
 * the icon for a spinner.
 */
export function Alert({
  variant = "info",
  title,
  description,
  loading,
  onDismiss,
  actions,
}: {
  variant?: AlertVariant;
  title: string;
  description?: React.ReactNode;
  loading?: boolean;
  onDismiss?: () => void;
  actions?: { label: string; onClick?: () => void }[];
}) {
  const { Icon, accent } = ALERTS[variant];
  const Glyph = loading ? LoaderCircleIcon : Icon;
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={`grid flex-1 content-start items-center gap-x-3 gap-y-1 rounded-(--pl-radius-md) bg-(--pl-fill) px-6 py-4 ${
        onDismiss ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_1fr]"
      }`}
    >
      <span className={`flex ${accent}`}>
        <Glyph aria-hidden className={loading ? "pl-spin" : undefined} />
      </span>
      <p className={`text-sm leading-[1.5] font-medium text-pretty ${accent}`}>{title}</p>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className={`inline-flex cursor-pointer opacity-60 transition-opacity duration-(--pl-fast) hover:opacity-100 ${accent}`}
        >
          <XIcon />
        </button>
      )}
      {description && <div className="col-start-2 text-sm leading-[1.5] text-(--pl-text-muted)">{description}</div>}
      {actions && (
        <div className="col-start-2 mt-4 flex gap-2">
          {actions.slice(0, 2).map((a, i) => (
            <Button key={a.label} size="sm" variant={(i === 0 ? "primary" : "ghost") as ButtonVariant} onClick={a.onClick}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/** orbit Spinner: a quarter-lit ring, 20px, in the current color */
export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      role="status"
      aria-label="Loading"
      className={`pl-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * A placeholder block while data loads (Polar's LoadingBox and the skeleton
 * rows on Customers): gray-100, pulsing between full and half strength.
 */
export function Skeleton({
  width,
  height = 16,
  radius = 8,
  className = "",
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}) {
  return <div aria-hidden className={`pl-pulse bg-(--pl-fill) ${className}`} style={{ width, height, borderRadius: radius }} />;
}

/** The text-only loading row Polar shows in a table or list ("Loading...") */
export function LoadingText({ children = "Loading..." }: { children?: React.ReactNode }) {
  return <p className="py-6 text-center text-sm leading-5 text-(--pl-text)">{children}</p>;
}

/**
 * EmptyState (Shared/EmptyState.tsx): inside a gray-200 frame with 12px
 * corners and 48px of padding, a 48px gray-500 icon 12px over a 16px title
 * and a gray-500 line, then any actions 16px further down. `fill` grows it to
 * its column's height, as on Customers' At Risk and Cost Drivers; `bare`
 * drops the frame, for one already inside a card (a FramedCard's body).
 */
export function EmptyState({
  icon,
  title,
  children,
  actions,
  fill,
  bare,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  fill?: boolean;
  bare?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-12 text-center ${
        bare ? "" : "rounded-(--pl-radius-md) border border-(--pl-border)"
      } ${fill ? "flex-1" : ""}`}
    >
      {icon && <div className="text-5xl text-(--pl-text-muted) [&_svg]:size-[1em]">{icon}</div>}
      <div className="flex flex-col">
        <h3 className="text-base leading-6 text-(--pl-text)">{title}</h3>
        {children && <p className="text-sm leading-[1.5] text-(--pl-text-muted)">{children}</p>}
      </div>
      {actions && <div className="mt-4 flex gap-4">{actions}</div>}
    </div>
  );
}

/**
 * The page-level empty state ("No products found", "No Checkout Links"):
 * no frame, a 48px gray-300 icon, an 18px/500 title over a gray-500 line,
 * and one action 24px below.
 */
export function EmptyHero({
  icon,
  title,
  children,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-y-6 py-12 text-center md:py-48">
      {icon && <div className="text-5xl text-(--pl-rule) [&_svg]:size-[1em]">{icon}</div>}
      <div className="flex flex-col items-center gap-y-6">
        <div className="flex flex-col items-center gap-y-2">
          <h3 className="text-lg leading-7 font-medium text-(--pl-text)">{title}</h3>
          {children && <p className="text-base leading-6 text-(--pl-text-muted)">{children}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
