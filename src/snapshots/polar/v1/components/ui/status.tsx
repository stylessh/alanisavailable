// Polar's small labels and lights.

export type Tone = "success" | "warning" | "danger" | "info" | "purple" | "neutral";

const TONES: Record<Tone, string> = {
  success: "bg-(--pl-success-bg) text-(--pl-success)",
  warning: "bg-(--pl-warning-bg) text-(--pl-warning)",
  danger: "bg-(--pl-danger-bg) text-(--pl-danger)",
  info: "bg-(--pl-info-bg) text-(--pl-info)",
  purple: "bg-(--pl-purple-bg) text-(--pl-purple)",
  neutral: "bg-(--pl-neutral-bg) text-(--pl-text-muted)",
};

/**
 * orbit Status ("Paid", "Active", "Refunded"): a tinted chip whose padding
 * and corners are in em (0.3em x 0.7em and 0.5em at 14px; 0.2em x 0.5em at
 * 12px), so it scales with its text. A 100 fill under 500 text.
 */
export function Status({ tone, size = "md", children }: { tone: Tone; size?: "sm" | "md"; children: React.ReactNode }) {
  return (
    <div
      className={`inline-flex w-fit items-center justify-center rounded-[0.5em] whitespace-nowrap ${
        size === "md" ? "px-[0.7em] py-[0.3em] text-sm leading-5" : "px-[0.5em] py-[0.2em] text-xs leading-4"
      } ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}

export type PillColor = "gray" | "blue" | "purple" | "yellow" | "red" | "green";

const PILLS: Record<PillColor, string> = {
  gray: "bg-(--pl-pill-gray-bg) text-(--pl-pill-gray)",
  blue: "bg-(--pl-pill-blue-bg) text-(--pl-pill-blue)",
  purple: "bg-(--pl-pill-purple-bg) text-(--pl-pill-purple)",
  yellow: "bg-(--pl-pill-yellow-bg) text-(--pl-pill-yellow)",
  red: "bg-(--pl-pill-red-bg) text-(--pl-pill-red)",
  green: "bg-(--pl-pill-green-bg) text-(--pl-pill-green)",
};

/**
 * orbit Pill ("One-time Product", plan badges): a 12px/500 capsule, 6px by
 * 2px, a 100 fill under 600 text (blue sits on 50).
 */
export function Pill({ color, className = "", children }: { color: PillColor; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs leading-4 font-medium whitespace-nowrap ${PILLS[color]} ${className}`}
    >
      {children}
    </span>
  );
}

/** A discount code ("PANETEST"): a gray pill in Geist Mono, 8px sides, set solid */
export function Code({ children }: { children: React.ReactNode }) {
  return (
    <Pill color="gray" className="shrink-0 px-2 py-0.5 font-mono text-xs leading-none">
      {children}
    </Pill>
  );
}

const LIGHTS: Record<Tone, string> = {
  success: "bg-(--pl-success)",
  warning: "bg-(--pl-warning)",
  danger: "bg-(--pl-danger)",
  info: "bg-(--pl-info)",
  purple: "bg-(--pl-purple)",
  neutral: "bg-(--pl-text-faint)",
};

/**
 * A status light: an 8px dot in a status color. Live states (a running
 * webhook, an open checkout) pulse a soft ring out of it.
 */
export function StatusDot({ tone, live, label }: { tone: Tone; live?: boolean; label?: string }) {
  return (
    <span role={label ? "img" : undefined} aria-label={label} className="relative inline-flex size-2 shrink-0">
      {live && <span className={`pl-ping absolute inset-0 rounded-full opacity-60 ${LIGHTS[tone]}`} />}
      <span className={`relative size-2 rounded-full ${LIGHTS[tone]}`} />
    </span>
  );
}

/** A dot beside a label ("● Active"), 14px text 8px from the light */
export function StatusLabel({ tone, live, children }: { tone: Tone; live?: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm leading-5 text-(--pl-text)">
      <StatusDot tone={tone} live={live} />
      {children}
    </span>
  );
}

/**
 * A chart's legend light, as on every metric: a 12px ring drawn with a 2px
 * stroke in the series' color (blue-500 for the current period). Filled, it
 * becomes the 10px dot of a chart tooltip, with 2px corners.
 */
export function LegendDot({ color = "var(--pl-legend)", variant = "ring" }: { color?: string; variant?: "ring" | "dot" }) {
  return variant === "ring" ? (
    <span className="size-3 shrink-0 rounded-full border-2" style={{ borderColor: color }} />
  ) : (
    <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: color }} />
  );
}
