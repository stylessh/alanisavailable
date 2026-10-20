"use client";

import { useState } from "react";
import { Icon } from "./icon";
import { BROWSER } from "./panel-content";
import { BarButton, PanelFrame, PanelTab } from "./side-panel";

// The Browser panel (pt, from the recording): a tab row, then a 34pt address
// row (back, forward, reload, a 26pt rounded URL field, and the element
// picker), then the page. A floating annotation toolbar sits 35pt above the
// bottom edge: select, draw, box, text and close.

const TOOLS = [
  { icon: "pointer", label: "Select" },
  { icon: "pen", label: "Draw" },
  { icon: "square", label: "Box" },
  { icon: "text", label: "Text" },
] as const;

/** A small browser showing this site. */
export function BrowserPanel({ expanded, onExpand, onClose }: { expanded: boolean; onExpand: () => void; onClose: () => void }) {
  const [reloads, setReloads] = useState(0);
  const [tool, setTool] = useState<string | null>(null);
  const [toolbar, setToolbar] = useState(true);
  return (
    <PanelFrame
      expanded={expanded}
      onExpand={onExpand}
      onClose={onClose}
      background="var(--cc-panel)"
      title={
        <div className="flex items-center gap-[4px]">
          <PanelTab
            active
            label={BROWSER.title}
            icon={
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" src="/products/claude/dock-icon.png" className="size-[13px] max-w-none rounded-[3px]" />
            }
            onSelect={() => {}}
            onClose={onClose}
          />
          <BarButton icon="plus" label="New tab" size={14} />
        </div>
      }
      actions={
        <>
          <BarButton icon="split" label="Open beside the chat" />
          <BarButton icon="moreVertical" label="Browser options" />
        </>
      }
    >
      <div className="absolute inset-0 flex flex-col">
        <div className="flex h-[34px] flex-none items-center gap-[2px] pr-[5px] pl-[3px]">
          <BarButton icon="arrowLeft" label="Back" size={14} style={{ color: "var(--cc-text-muted)" }} />
          <BarButton icon="arrowRight" label="Forward" size={14} style={{ color: "var(--cc-text-muted)" }} />
          <BarButton icon="reload" label="Reload" size={14} onClick={() => setReloads((r) => r + 1)} />
          <div
            className="mx-[4px] flex h-[26px] min-w-0 flex-1 items-center rounded-[8px] px-[8px]"
            style={{ background: "var(--cc-field)", boxShadow: "inset 0 0 0 1px var(--cc-field-border)" }}
          >
            <span className="truncate" style={{ color: "var(--cc-text-strong)" }}>
              {BROWSER.url}
            </span>
          </div>
          <BarButton icon="pointer" label="Pick an element" />
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden" style={{ background: "#0a0a0a", borderTop: "1px solid var(--cc-rule)" }}>
          <iframe key={reloads} title={BROWSER.title} src={BROWSER.src} className="absolute inset-0 size-full border-0" />
          {toolbar && (
            <div
              role="toolbar"
              aria-label="Annotate"
              className="cc-surface absolute bottom-[16px] left-1/2 flex -translate-x-1/2 items-center gap-[4px] rounded-[10px] p-[5px]"
            >
              {TOOLS.map((t) => (
                <BarButton key={t.icon} icon={t.icon} label={t.label} active={tool === t.icon} onClick={() => setTool(tool === t.icon ? null : t.icon)} />
              ))}
              <span aria-hidden className="mx-[2px] h-[14px] w-px" style={{ background: "var(--cc-menu-rule)" }} />
              <button
                type="button"
                aria-label="Hide toolbar"
                onClick={() => setToolbar(false)}
                className="flex size-[24px] items-center justify-center rounded-[6px] hover:bg-white/5"
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </PanelFrame>
  );
}
