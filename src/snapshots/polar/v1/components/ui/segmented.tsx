"use client";

// orbit SegmentedControl: the pill toggles for time ranges ("All Time …
// Today") and small switches ("New / Total", "System / All"). A gray-50
// track with 4px of padding and 4px between options; the chosen one is
// lifted onto a white thumb with shadow-lg. Options are 12px/500:
//   sm 24px (4px by 10px)   md 28px (6px by 12px)   lg 14px, 36px (8px by 16px)
// The tabs variant fills its row on a gray-100 track, each option growing.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  variant = "default",
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "tabs";
  label: string;
}) {
  const pad =
    size === "sm"
      ? "px-2.5 py-1 text-xs leading-4"
      : size === "md"
        ? "px-3 py-1.5 text-xs leading-4"
        : "px-4 py-2 text-sm leading-5";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex shrink-0 items-center gap-1 rounded-full p-1 ${variant === "tabs" ? "w-full bg-(--pl-shell)" : "bg-(--pl-subtle)"}`}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`cursor-pointer rounded-full font-medium whitespace-nowrap transition-[color,background-color,box-shadow] duration-150 ${pad} ${
              variant === "tabs" ? "grow" : ""
            } ${on ? "bg-(--pl-surface) text-(--pl-text-strong) shadow-(--pl-shadow-lg)" : "text-(--pl-text-muted) hover:text-(--pl-text)"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
