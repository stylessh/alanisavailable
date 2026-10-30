"use client";

import { createContext, useContext, useId } from "react";
import { CheckIcon, MinusIcon } from "../icons";

// The small controls, from orbit and Polar's shadcn layer, checked live in
// the Create Checkout Link sheet.

/**
 * orbit Switch: a 37x18 track (2px clear border) holding an 8px gray-50
 * thumb with shadow-lg, 4px in from the left when off and 22px when on. On
 * is blue-600, off gray-200.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-[18px] w-[37px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-(--pl-accent)" : "bg-(--pl-border)"
      }`}
    >
      <span
        className={`pointer-events-none block size-2 rounded-full bg-(--pl-subtle) shadow-(--pl-shadow-sm) transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/**
 * orbit Checkbox: 16px, 2px corners, a gray-300 outline. Checked fills
 * black with a white tick; indeterminate keeps the outline and shows a bold
 * black dash.
 */
export function Checkbox({
  checked,
  onChange,
  disabled,
  label,
  className = "",
  id,
}: {
  checked: boolean | "indeterminate";
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** shown beside it, 8px away, and clickable */
  label?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const on = checked === true;
  const box = (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked === "indeterminate" ? "mixed" : checked}
      aria-label={typeof label === "string" ? undefined : "Select"}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className={`flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-(--pl-radius-xs) border disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? "border-(--pl-text) bg-(--pl-text) text-(--pl-primary-fg)" : "border-(--pl-rule) bg-transparent"
      } ${className}`}
    >
      {on && <CheckIcon />}
      {checked === "indeterminate" && <MinusIcon size={12} strokeWidth={3} className="text-(--pl-text)" />}
    </button>
  );
  if (!label) return box;
  return (
    <label className={`inline-flex items-center gap-2 text-sm leading-5 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
      {box}
      <span>{label}</span>
    </label>
  );
}

const RadioContext = createContext<{ name: string; value: string; onChange: (v: string) => void } | null>(null);

/** shadcn RadioGroup: a set of radios sharing one value */
export function RadioGroup<T extends string>({
  value,
  onChange,
  label,
  className = "",
  children,
}: {
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const name = useId();
  return (
    <RadioContext value={{ name, value, onChange: onChange as (v: string) => void }}>
      <div role="radiogroup" aria-label={label} className={`grid gap-3 ${className}`}>
        {children}
      </div>
    </RadioContext>
  );
}

/** A 16px blue-600 ring; picked, a 10px blue-600 dot sits in it */
export function Radio({ value, disabled, id }: { value: string; disabled?: boolean; id?: string }) {
  const group = useContext(RadioContext);
  const on = group?.value === value;
  return (
    <button
      type="button"
      role="radio"
      id={id}
      aria-checked={on}
      disabled={disabled}
      onClick={() => group?.onChange(value)}
      className={`flex aspect-square size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-(--pl-accent) text-(--pl-accent) disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {on && <span className="size-2.5 rounded-full bg-current" />}
    </button>
  );
}

/**
 * The pricing choice on Create Product: a 16px-cornered card, 16px padded.
 * Chosen, it fills gray-50 on the gray-200 border; otherwise its border is
 * gray-100 (gray-200 on hover) and its label gray-500.
 */
export function RadioCard({ value, disabled, children }: { value: string; disabled?: boolean; children: React.ReactNode }) {
  const group = useContext(RadioContext);
  const id = useId();
  const on = group?.value === value;
  return (
    <label
      htmlFor={id}
      aria-disabled={disabled || undefined}
      className={`flex flex-col gap-3 rounded-(--pl-radius-lg) border p-4 transition-colors not-aria-disabled:cursor-pointer ${
        on
          ? "border-(--pl-border) bg-(--pl-subtle) text-(--pl-text)"
          : "border-(--pl-fill) text-(--pl-text-muted) not-aria-disabled:hover:border-(--pl-border)"
      }`}
    >
      <div className="flex items-center gap-2.5 text-sm leading-none font-medium">
        <Radio value={value} id={id} disabled={disabled} />
        {children}
      </div>
    </label>
  );
}
