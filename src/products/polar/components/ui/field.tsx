"use client";

import { createContext, useContext, useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { CalendarIcon, SearchIcon } from "../icons";

// Polar's form fields (orbit Input, TextArea; shadcn Form), measured in the
// Create Checkout Link sheet:
// field     40px, white, 12px corners, raised like a secondary button
//           (shadow-sm, its hairline inside the box), 12px sides, 14px
//           gray-950 text, gray-400 placeholder
// focus     the shared outline, nothing else: 2px of the muted focus gray,
//           2px out, following the 12px corners (a field whose input sits
//           inside a box, CopyInput, outlines the box)
// label     14px/500 gray-900, leading 1, 8px above its control
// help      12px or 14px gray-500, 8px below
// error     the label and a 14px/500 message turn red-500; the message sits
//           between the control and the help; the field keeps its edge and
//           a red ring sits 2px outside it (aria-invalid, styles.css)
// disabled  half opacity, not-allowed, and flat: a plain gray-200 hairline inside, no shadow
export const FIELD =
  "rounded-(--pl-radius-md) bg-(--pl-field) shadow-(--pl-shadow-sm) disabled:shadow-none disabled:inset-ring disabled:inset-ring-(--pl-border) has-disabled:shadow-none has-disabled:inset-ring has-disabled:inset-ring-(--pl-border)";

const FOCUS = "disabled:cursor-not-allowed disabled:opacity-50";

/** The focus outline drawn on a box whose input inside has focus, so it takes the box's shape */
export const BOX_FOCUS = "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2";

/** Field wires its label, help and message to the control inside it */
const FieldContext = createContext<{ id: string; describedBy?: string; invalid: boolean } | null>(null);

/** The id, description and invalid state a Field gives the control inside it */
export function useFieldProps(props: Pick<React.AriaAttributes, "aria-describedby" | "aria-invalid"> & { id?: string }) {
  const field = useContext(FieldContext);
  return {
    id: props.id ?? field?.id,
    "aria-describedby": props["aria-describedby"] ?? field?.describedBy,
    "aria-invalid": props["aria-invalid"] ?? (field?.invalid || undefined),
  };
}

export function Input({
  className = "",
  prefix,
  suffix,
  mono,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  /** a glyph or text inside the left edge (the field indents to 40px) */
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  /** Geist Mono, as metadata keys and IDs are set */
  mono?: boolean;
}) {
  const wired = useFieldProps(props);
  const input = (
    <input
      {...props}
      {...wired}
      className={`h-10 w-full px-3 py-2 text-sm leading-5 text-(--pl-text) ${FIELD} ${FOCUS} ${
        prefix ? "pl-10" : ""
      } ${suffix ? "pr-10" : ""} ${mono ? "font-mono" : ""} ${prefix || suffix ? "" : className}`}
    />
  );
  if (!prefix && !suffix) return input;
  return (
    <div className={`relative flex flex-1 ${className}`}>
      {input}
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-(--pl-text-muted)">
          {prefix}
        </span>
      )}
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center pr-4 text-(--pl-text-muted)">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** orbit TextArea: 120px tall, 16px corners and 16px padding */
export function TextArea({
  className = "",
  resizable = true,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { resizable?: boolean }) {
  const wired = useFieldProps(props);
  return (
    <textarea
      {...props}
      {...wired}
      className={`min-h-[120px] w-full rounded-(--pl-radius-lg) bg-(--pl-field) p-4 text-sm leading-5 text-(--pl-text) shadow-(--pl-shadow-sm) disabled:shadow-none disabled:inset-ring disabled:inset-ring-(--pl-border) ${FOCUS} ${
        resizable ? "" : "resize-none"
      } ${className}`}
    />
  );
}

export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  const field = useContext(FieldContext);
  return (
    <label
      htmlFor={field?.id}
      {...props}
      className={`block text-sm leading-none font-medium ${field?.invalid ? "text-(--pl-error)" : "text-(--pl-text)"} ${className}`}
    />
  );
}

/**
 * A labelled control with its help and error (shadcn FormItem: 8px between
 * each part). Its label, help and message are tied to the control for assistive tech.
 */
export function Field({
  label,
  description,
  error,
  small,
  className = "",
  children,
}: {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  /** 12px help, as the checkout link form sets it */
  small?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const describedBy = [error && `${id}-error`, description && `${id}-help`].filter(Boolean).join(" ") || undefined;
  return (
    <FieldContext value={{ id, describedBy, invalid: !!error }}>
      <div className={`flex flex-col gap-2 ${className}`}>
        {label && <Label>{label}</Label>}
        {children}
        {error && (
          <p id={`${id}-error`} className="text-sm leading-5 font-medium text-(--pl-error)">
            {error}
          </p>
        )}
        {description && (
          <p id={`${id}-help`} className={`text-(--pl-text-muted) ${small ? "text-xs leading-4" : "text-sm leading-5"}`}>
            {description}
          </p>
        )}
      </div>
    </FieldContext>
  );
}

/**
 * A field with Polar's search glyph (the sidebar's, 16px) inside its left edge.
 * ghost  no chrome at all, for a search that is a list's toolbar: it fills
 *        its box, the glyph centred in a 32px slot 16px in, so the text
 *        starts where a list row's does after its 32px avatar (60px); the
 *        glyph darkens while you type. Actions (ghost icon buttons) sit inside
 *        its right end, 12px in, and the text stops short of them.
 */
export function SearchInput({
  className = "",
  variant = "field",
  actions,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { variant?: "field" | "ghost"; actions?: React.ReactNode }) {
  if (variant === "ghost")
    return (
      <div className={`relative flex items-center gap-1 pr-3 ${className}`}>
        <input
          type="search"
          className="peer h-full min-w-0 flex-1 bg-transparent pl-15 text-sm leading-5 text-(--pl-text) outline-none placeholder:text-(--pl-text-faint) [&::-webkit-search-cancel-button]:hidden"
          {...props}
        />
        <SearchIcon className="pointer-events-none absolute left-6 text-(--pl-text-faint) transition-colors peer-focus:text-(--pl-text-muted)" />
        {actions}
      </div>
    );
  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="search"
        className={`h-10 w-full pr-3 pl-10 text-sm leading-5 text-(--pl-text) [&::-webkit-search-cancel-button]:hidden ${FIELD} ${FOCUS}`}
        {...props}
      />
      <SearchIcon className="pointer-events-none absolute left-3.5 text-(--pl-text-muted)" />
    </div>
  );
}

/**
 * Settings' identifiers (CopyToClipboardInput): a read-only gray-600 value in
 * a field with a Copy pill at its right end, which says "Copied" for a moment.
 */
export function CopyInput({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`flex h-10 w-full items-center overflow-hidden ${FIELD} ${BOX_FOCUS} ${className}`}>
      <input
        readOnly
        value={value}
        aria-label={label}
        className="h-full min-w-0 flex-1 truncate bg-transparent px-3 text-sm leading-5 text-(--pl-text-secondary) outline-none"
      />
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="mr-1 inline-flex h-8 shrink-0 cursor-pointer items-center rounded-(--pl-radius-full) px-3 text-xs leading-4 font-[550] tracking-[0.01em] text-(--pl-text) transition-colors hover:bg-(--pl-ghost-hover)"
      >
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}

/** The date range field: a calendar button behind a hairline, then the range */
export function DateRangeField({
  label,
  onClick,
  onLabelClick,
  onPointerEnter,
  onLabelPointerEnter,
  expanded,
  className = "",
  triggerRef,
}: {
  label: string;
  /** the calendar glyph; the label too unless it has its own */
  onClick?: () => void;
  /** the label, which opens the quick ranges in Analytics */
  onLabelClick?: () => void;
  /** hovering each half, for moving between pickers while one is open */
  onPointerEnter?: (e: React.PointerEvent<HTMLElement>) => void;
  onLabelPointerEnter?: (e: React.PointerEvent<HTMLElement>) => void;
  expanded?: boolean;
  className?: string;
  triggerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={triggerRef} className={`flex h-10 shrink-0 items-stretch ${FIELD} ${className}`}>
      <button
        type="button"
        aria-label="Choose dates"
        aria-expanded={expanded}
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        // each half takes its side of the field's corners, so its focus outline is its own shape
        className="flex cursor-pointer items-center rounded-l-(--pl-radius-md) border-r border-(--pl-border) px-4 text-(--pl-text)"
      >
        <CalendarIcon />
      </button>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onLabelClick ?? onClick}
        onPointerEnter={onLabelPointerEnter ?? onPointerEnter}
        className="flex flex-1 cursor-pointer items-center rounded-r-(--pl-radius-md) px-4 text-sm leading-5 whitespace-nowrap text-(--pl-text)"
      >
        {label}
      </button>
    </div>
  );
}
