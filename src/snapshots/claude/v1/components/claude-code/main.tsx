"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Composer } from "./composer";
import { Icon } from "./icon";
import { TRANSCRIPT } from "./conversation";
import { useTurnStream } from "./stream";
import { BrowserPanel } from "./browser-panel";
import { DiffPanel } from "./diff-panel";
import { FilesPanel } from "./files-panel";
import { Header, type PanelId } from "./header";
import { PANEL_INSET, PANEL_W, SessionPanel } from "./session-panel";
import { PANEL_EDGE, PANEL_SHARE, type PanelKind } from "./side-panel";
import { TerminalPanel } from "./terminal-panel";
import { TranscriptBlock, Working } from "./transcript";
import { ACTIVE_SESSION } from "./content";
import { CONVERSATIONS } from "./sessions";
import { useSidebar } from "./sidebar-state";

const SIDE_PANELS = { terminal: TerminalPanel, diff: DiffPanel, browser: BrowserPanel, files: FilesPanel } satisfies Record<PanelKind, unknown>;
/** a side panel's icons sit this far left of its card, as in the recording */
const ICONS_GAP = 20;

// Main pane geometry (pt, from the reference). The transcript and composer
// share one column, 768pt at most, centered in the pane minus an 8pt
// scrollbar gutter on the right; a narrower window keeps 24pt either side.
const COLUMN = 768;
const SIDE_MIN = 24;
const GUTTER = 8;
/** how far the transcript fades out above the composer (pt) */
const BOTTOM_FADE = 24;
const column = {
  width: `min(${COLUMN}px, 100% - ${2 * SIDE_MIN}px)`,
  transform: `translateX(-${GUTTER / 2}px)`,
};

/** The open session: its title and panel buttons, the transcript, and the composer. */
export function Main() {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  // the latest turn is still running: it plays in from page load
  const { blocks, writingIndex, working } = useTurnStream(TRANSCRIPT, 142_600);
  // another session's conversation, when one is open instead of this one (which keeps running behind it)
  const { active } = useSidebar();
  const other = active === ACTIVE_SESSION ? null : (CONVERSATIONS[active] ?? []);
  const side = panel && panel !== "details" ? panel : null;
  const SidePanel = side ? SIDE_PANELS[side] : null;
  // what the transcript and composer leave free on the right, and where the header's icons end
  const reserved = panel === "details" ? `${PANEL_W + PANEL_INSET}px` : side ? `calc(${PANEL_SHARE[side] * 100}% + ${PANEL_EDGE}px)` : "0px";
  const iconsRight = side ? `calc(${PANEL_SHARE[side] * 100}% + ${PANEL_EDGE + ICONS_GAP}px)` : "11px";
  const toggle = (p: PanelId) => {
    setExpanded(false);
    setPanel((cur) => (cur === p ? null : p));
  };
  // opening another session shows its latest turn, all at once: what's already there doesn't fade in as if it just arrived
  const shownSession = useRef(active);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
    const box = content.current;
    if (!box || shownSession.current === active) return;
    shownSession.current = active;
    box.dataset.quiet = "";
    const t = setTimeout(() => delete box.dataset.quiet, 400);
    return () => clearTimeout(t);
  }, [active]);
  // A session opens scrolled to its latest turn and stays pinned there as
  // the transcript grows (or reflows when its fonts load), unless the
  // reader has scrolled up.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !content.current) return;
    let pinned = true;
    el.scrollTop = el.scrollHeight;
    const onScroll = () => {
      pinned = el.scrollHeight - el.clientHeight - el.scrollTop < 2;
      setAtBottom(el.scrollHeight - el.clientHeight - el.scrollTop < 40);
    };
    const observer = new ResizeObserver(() => {
      if (pinned) el.scrollTop = el.scrollHeight;
    });
    observer.observe(content.current);
    observer.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section className="relative flex min-w-0 flex-1 flex-col" style={{ background: "var(--cc-main)" }}>
      <Header panel={panel} onToggle={toggle} iconsRight={iconsRight} />
      {panel === "details" && <SessionPanel key={active} />}
      {SidePanel && side && (
        <div
          className="absolute z-20 transition-[width] duration-200"
          style={{
            top: PANEL_EDGE,
            right: PANEL_EDGE,
            bottom: PANEL_EDGE,
            width: expanded ? `calc(100% - ${2 * PANEL_EDGE}px)` : `${PANEL_SHARE[side] * 100}%`,
          }}
        >
          <SidePanel key={active} expanded={expanded} onExpand={() => setExpanded((e) => !e)} onClose={() => setPanel(null)} />
        </div>
      )}
      {/* with the panel open, the transcript and composer center in what's left of the pane */}
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: "none",
          marginRight: reserved,
          // what scrolls under the composer fades out (BOTTOM_FADE) instead of cutting off (the header has its own fade at the top)
          maskImage: `linear-gradient(to bottom, #000 calc(100% - ${BOTTOM_FADE}px), transparent)`,
        }}
      >
        <div ref={content} className="mx-auto flex flex-col gap-[14px] pt-[60px] pb-[49.5px] tracking-[-0.007em]" style={column}>
          {(other ?? blocks).map((b, i) => (
            <TranscriptBlock key={`${active}-${i}`} block={b} streaming={!other && i === writingIndex} />
          ))}
          {!other && <Working {...working} />}
        </div>
      </div>
      <div className="flex-none" style={{ marginRight: reserved }}>
        <div className="relative mx-auto" style={column}>
          {/* scrolled up: a round button 21pt above the composer jumps back to the latest turn */}
          <button
            type="button"
            aria-label="Scroll to bottom"
            tabIndex={atBottom ? -1 : 0}
            onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })}
            className="cc-surface absolute left-1/2 z-10 flex size-[32px] items-center justify-center rounded-full transition-[opacity,transform] duration-150 hover:brightness-125"
            style={{
              bottom: "calc(100% + 21px)",
              opacity: atBottom ? 0 : 1,
              transform: `translateX(-50%) translateY(${atBottom ? 6 : 0}px)`,
              pointerEvents: atBottom ? "none" : undefined,
            }}
          >
            <Icon name="arrowDown" size={14} style={{ color: "var(--cc-text-strong)" }} />
          </button>
          <Composer />
        </div>
      </div>
    </section>
  );
}
