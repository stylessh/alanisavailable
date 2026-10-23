"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./chrome";
import { AttachIcon, SendIcon } from "./code-icons";
import { MoreIcon } from "./icons";

// Linear's sheet, for content too rich for the timeline (an agent session's
// output), measured off the desktop app (2x): a 560px panel floating 8px in
// from the window's right, over the page dimmed by about a quarter; a 48px
// header with an 18px icon 16px in, the title in 13/500 9px after it, and
// "…" and × on the right; the body 19px in at 13px on 21px lines; and a
// composer card 8px in at the bottom, its placeholder in 13px, attach and
// send 32px apart.

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="m3.5 3.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Sheet({
  icon,
  title,
  onClose,
  children,
  placeholder,
}: {
  icon: ReactNode;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** the composer's placeholder, as "Tell Cursor what to do next..." */
  placeholder?: string;
}) {
  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);
  // the sheet lives at the top of the product's tree, so it floats over the whole window and keeps the product's tokens
  const host = typeof document === "undefined" ? null : document.querySelector(".linear");
  if (!host) return null;
  return createPortal(
    <>
      <div aria-hidden onClick={onClose} className="fixed inset-0 z-40 bg-(--ln-sheet-backdrop)" />
      <aside
        role="dialog"
        aria-label={title}
        className="fixed top-2 right-2 bottom-2 z-50 flex w-[560px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-xl border-[0.5px] border-(--ln-popover-border) bg-(--ln-popover) shadow-(--ln-popover-shadow)"
      >
        <header className="flex h-12 shrink-0 items-center pr-1.5 pl-4">
          <span className="flex size-[18px] shrink-0 items-center justify-center">{icon}</span>
          <h2 className="ml-[9px] min-w-0 flex-1 truncate text-[13px] font-medium text-(--ln-text)">{title}</h2>
          {/* the actions sit 2px above the title's centre, as Linear's do */}
          <span className="ml-2 mb-1 flex text-(--ln-text-muted)">
            <IconButton label="More">
              <MoreIcon size={14} />
            </IconButton>
            <IconButton label="Close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-[19px] pb-4">{children}</div>
        {placeholder && (
          <div className="m-2 mt-0 flex min-h-[71.5px] shrink-0 flex-col rounded-[10px] border-[0.5px] border-(--ln-card-border) bg-(--ln-card) pt-[8.5px] pr-[7px] pb-[6.5px] pl-2 shadow-(--ln-main-shadow)">
            <span className="text-[13px] leading-5 font-[450] text-(--ln-icon-faint)">{placeholder}</span>
            <span className="mt-auto flex items-center justify-end gap-2 text-(--ln-text-strong)">
              <IconButton label="Attach images, files, or videos" className="size-6">
                <AttachIcon size={14} />
              </IconButton>
              <IconButton label="Send" className="size-6">
                <SendIcon size={14} />
              </IconButton>
            </span>
          </div>
        )}
      </aside>
    </>,
    host,
  );
}
