"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "../icons";
import { Floating, useFloating, type Side } from "./popover";

// Polar's overlays: orbit Modal (Customize, Share), orbit InlineModal, the
// right-hand sheet (Create Checkout Link), and orbit Tooltip.

/** Escape closes, focus moves in on open and back to where it was on close, and the page stops scrolling */
function useOverlay(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab" || !panel.current) return;
      // keep Tab inside the overlay
      const f = [
        ...panel.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [open, panel]);
}

const root = () => document.querySelector(".polar") ?? document.body;

/**
 * orbit Modal: a 70% black scrim; an 800px gray-100 frame (24px corners, 4px
 * padding) with the title in 14px gray-500 on its top edge and a 32px close;
 * and inside it a white card with 20px corners holding the content. It sits
 * 80px from the top (up to 10% of the screen on large ones) and scales in
 * from 99% over 100ms.
 */
export function Modal({
  open,
  onClose,
  title,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(open, onClose, panel);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden" role="presentation">
      <div className="flex h-full flex-col items-center bg-(--pl-scrim-modal) p-2" onClick={onClose}>
        <div className="block h-20 w-2 shrink-0 lg:max-h-[10%] lg:grow-2" />
        <div
          ref={panel}
          role="dialog"
          aria-modal
          aria-labelledby={titleId}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          className={`pl-modal relative z-10 flex max-h-full w-full flex-col gap-y-1 overflow-x-hidden overflow-y-auto rounded-3xl bg-(--pl-shell) p-1 shadow-(--pl-shadow-sm) outline-none lg:w-[800px] lg:max-w-full ${className}`}
        >
          <div className="flex items-center justify-between pt-1 pr-1 pl-4 text-sm leading-5">
            <span id={titleId} className="text-(--pl-text-muted)">
              {title}
            </span>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full text-(--pl-text-muted) transition-colors hover:bg-(--pl-ghost-hover) hover:text-(--pl-text-dim)"
            >
              <XIcon />
            </button>
          </div>
          <div className="flex flex-col overflow-y-auto rounded-[20px] bg-(--pl-surface)">{children}</div>
        </div>
      </div>
    </div>,
    root(),
  );
}

/** A modal's footer: a hairline, then the actions on the right (Customize's Save) */
export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2 border-t border-(--pl-border) px-6 py-4">{children}</div>;
}

/**
 * orbit InlineModal, the sheet: white, 540px, full height on the right with
 * shadow-sm, over a scrim that fades to 50% black. It slides in over 320ms
 * on the decelerate curve. Its header is 24px/32px padded with a 20px title
 * and a 24px close glyph (1.5px strokes, gray-500, gray-900 on hover).
 */
export function Sheet({
  open,
  onClose,
  title,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** pinned under the scrolling body */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(open, onClose, panel);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden" role="presentation">
      <div
        className="pl-scrim relative flex h-full bg-(--pl-scrim-sheet)"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          ref={panel}
          role="dialog"
          aria-modal
          aria-labelledby={titleId}
          tabIndex={-1}
          className="pl-sheet fixed inset-y-0 right-0 z-10 flex w-full flex-col overflow-y-auto bg-(--pl-surface) text-(--pl-text) shadow-(--pl-shadow-sm) outline-none md:w-[540px]"
        >
          <div className="flex w-full items-center justify-between px-8 py-6">
            <h1 id={titleId} className="text-xl leading-7">
              {title}
            </h1>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="cursor-pointer text-(--pl-text-muted) transition-colors hover:text-(--pl-text)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 18L18 6M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-6 px-8 pb-8">{children}</div>
          {footer && <div className="sticky bottom-0 flex gap-2 bg-(--pl-surface) px-8 py-6">{footer}</div>}
        </div>
      </div>
    </div>,
    root(),
  );
}

/**
 * orbit Tooltip: white, gray-950 14px text, a gray-200 border, 7.6px corners,
 * 12px by 6px of padding and shadow-md, 4px from its target. It shows after
 * 150ms of hover (Polar's delay) or at once on keyboard focus.
 */
export function Tooltip({
  content,
  side = "top",
  children,
}: {
  content: React.ReactNode;
  side?: Side;
  /** one element; it gets the hover and focus listeners */
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const id = useId();
  const { triggerRef, floatingRef, style, side: placed } = useFloating<HTMLSpanElement>(open, { side, align: "center" });
  const show = (delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        aria-describedby={open ? id : undefined}
        onPointerEnter={() => show(150)}
        onPointerLeave={hide}
        onFocus={() => show(0)}
        onBlur={hide}
        onKeyDown={(e) => e.key === "Escape" && hide()}
      >
        {children}
      </span>
      {open && (
        <Floating floatingRef={floatingRef} style={style} side={placed} role="tooltip" id={id} className="pointer-events-none">
          <TooltipBubble>{content}</TooltipBubble>
        </Floating>
      )}
    </>
  );
}

export function TooltipBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[7.6px] border border-(--pl-border) bg-(--pl-popover) px-3 py-1.5 text-sm leading-5 whitespace-nowrap text-(--pl-popover-text) shadow-(--pl-shadow-md)">
      {children}
    </div>
  );
}
