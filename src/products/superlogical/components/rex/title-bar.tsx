"use client";

import { motion } from "motion/react";
import { CloseIcon, CommandIcon, HostIcon, PlusIcon } from "./icons";
import type { ProgramKind } from "./model";
import { TabChip, TITLE_OFFSET } from "./tab-chip";
import { TrafficLights } from "./traffic-lights";

export type TabView = { id: string; title: string; front: ProgramKind; back: ProgramKind[] };

// Tab strip geometry (window-relative px, from the reference): the track
// spans 190–820 and three tabs split it into 210pt slots; the active tab is a
// white pill 2pt inside its slot.
const TRACK = { left: 190, w: 630 };
const fade = "linear-gradient(to right, #000 calc(100% - 22px), transparent)";
const SPRING = { type: "spring", stiffness: 520, damping: 42 } as const;

/** Traffic lights, session, tab strip and window actions (window-relative px). */
export function TitleBar({
  tabs,
  active,
  onSelect,
  onClose,
  onNew,
  onPalette,
}: {
  tabs: TabView[];
  active: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onPalette: () => void;
}) {
  const pitch = TRACK.w / tabs.length;
  const activeIndex = tabs.findIndex((t) => t.id === active);

  return (
    <div className="rex-ui absolute inset-x-0 top-0 h-[44px]">
      <TrafficLights left={14.5} top={14.75} />

      {/* The session: rex-snake, running on this Mac */}
      <HostIcon className="absolute" style={{ left: 92, top: 16.5, color: "var(--rex-chrome-ink)" }} />
      <div className="absolute left-[114.5px] top-[9px] leading-[13px] [-webkit-text-stroke:0.1px_currentColor]">
        <div className="text-[11.5px] font-semibold text-[#606063]">rex-snake</div>
        <div className="text-[9.5px] leading-[12px] font-medium text-[#8e8e92]">Mac Studio</div>
      </div>

      <div
        className="absolute top-[5.5px] h-[32.5px] rounded-full"
        style={{ left: TRACK.left, width: TRACK.w, background: "var(--rex-track)" }}
      />
      <motion.div
        className="absolute top-[7.75px] h-[28.25px] rounded-full"
        initial={false}
        animate={{ left: TRACK.left + 2 + activeIndex * pitch, width: pitch - 2 }}
        transition={SPRING}
        style={{
          background: "var(--rex-tab-active)",
          boxShadow: "0 0 0 0.5px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.08)",
        }}
      />

      <div role="tablist" aria-label="Tabs">
        {tabs.map((tab, i) => {
          const isActive = tab.id === active;
          const left = TRACK.left + 2 + i * pitch;
          const textLeft = TITLE_OFFSET[Math.min(tab.back.length, 2)];
          const right = pitch - 2; // tab width
          // A hairline sits between two inactive neighbours.
          const divider = i > 0 && !isActive && tabs[i - 1].id !== active;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.title}
              onPointerDown={() => onSelect(tab.id)}
              className="group absolute top-[7.75px] h-[28.25px]"
              style={{ left, width: right }}
            >
              {divider && <div className="absolute -left-[2.5px] top-[5.25px] h-[17px] w-[1px] bg-[rgb(0_0_0/0.1)]" />}
              <TabChip left={6.5} top={-0.75} front={tab.front} back={tab.back} />
              <div
                className="absolute top-[4.75px] overflow-hidden text-[12px] leading-[17px] font-medium whitespace-nowrap [-webkit-text-stroke:0.1px_currentColor]"
                style={{
                  left: textLeft,
                  width: right - textLeft - (isActive ? 18 : 12),
                  color: isActive ? "var(--rex-tab-text)" : "var(--rex-tab-text-muted)",
                  // inactive titles fade out; the active one has room to the divider
                  maskImage: isActive ? undefined : fade,
                  textOverflow: isActive ? "ellipsis" : undefined,
                }}
              >
                {tab.title}
              </div>
              {isActive && <div className="absolute top-[6.25px] h-[13px] w-[1px] bg-[#d6d6d9]" style={{ left: right - 14 }} />}
              <button
                type="button"
                aria-label={`Close ${tab.title}`}
                tabIndex={-1}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onClose(tab.id)}
                className="absolute top-[7.5px] grid size-[13px] cursor-default place-items-center rounded-full text-[#8e8e92] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[rgb(0_0_0/0.07)]"
                style={{ left: right - 11.5 }}
              >
                <CloseIcon style={{ transform: "scale(0.75)" }} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Command palette"
        title="Command palette (⇧⌘P)"
        tabIndex={-1}
        onClick={onPalette}
        className="absolute grid cursor-default place-items-center rounded-[6px] p-[5px] transition-colors hover:bg-[rgb(0_0_0/0.06)]"
        style={{ left: 935.5, top: 11 }}
      >
        <CommandIcon style={{ color: "#59595c" }} />
      </button>
      <button
        type="button"
        aria-label="New tab"
        title="New tab (⌥⌘T)"
        tabIndex={-1}
        onClick={onNew}
        className="absolute grid cursor-default place-items-center rounded-[6px] p-[5px] transition-colors hover:bg-[rgb(0_0_0/0.06)]"
        style={{ left: 968, top: 11.5 }}
      >
        <PlusIcon style={{ color: "var(--rex-chrome-ink)" }} />
      </button>
    </div>
  );
}
