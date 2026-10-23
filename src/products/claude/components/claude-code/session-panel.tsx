"use client";

import { type ReactNode, useState } from "react";
import { useWorkspace } from "./workspace";
import { Icon, type IconName } from "./icon";
import { Toggle } from "./popover";

// The session details panel, opened by the header's first button (pt, from
// the screen recording): a column of cards 278pt wide, 12pt from the
// window's right edge, starting 54pt down and 10.5pt apart. Each card has a
// 1pt #282828 rim and r 12 corners; its heading sits 12.5pt in, its rows
// (26pt pitch) put their icon 16.5pt in and their text at 40pt.
export const PANEL_W = 278;
export const PANEL_INSET = 12;
const PANEL_TOP = 54;
const ROW = 26;

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[12px] ${className}`}
      style={{
        boxShadow: "inset 0 0 0 1px var(--cc-card-rim)",
        background: "var(--cc-card)",
      }}
    >
      {children}
    </section>
  );
}

/** A card's heading: a disclosure (chevron down when it holds rows, right when it opens a page) and an optional value on the right. */
function Heading({ label, open, onToggle, detail, link }: { label: string; open?: boolean; onToggle?: () => void; detail?: ReactNode; link?: boolean }) {
  return (
    <div className="flex h-[41.5px] items-center justify-between" style={{ paddingInline: 12.5 }}>
      <button type="button" onClick={onToggle} className="flex items-center gap-[5px] text-[12px]" style={{ color: "var(--cc-text)" }}>
        {label}
        <Icon
          name={link ? "chevronRight" : "chevronDown"}
          size={11}
          className="transition-transform duration-150"
          style={{
            color: "var(--cc-text-muted)",
            transform: !link && !open ? "rotate(-90deg)" : undefined,
          }}
        />
      </button>
      {detail}
    </div>
  );
}

function Row({ icon, children, right }: { icon: IconName; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="relative flex items-center" style={{ height: ROW, paddingLeft: 40, paddingRight: 12.5 }}>
      <Icon name={icon} size={15} className="absolute" style={{ left: 15.5, color: "var(--cc-text-muted)" }} />
      <span className="min-w-0 flex-1 truncate" style={{ color: "var(--cc-text)" }}>
        {children}
      </span>
      {right}
    </div>
  );
}

/** A collapsible card: heading plus rows, with the card's bottom padding. */
function Section({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <Heading label={label} open={open} onToggle={() => setOpen((o) => !o)} />
      {open && <div className="-mt-[8px] pb-[8px]">{children}</div>}
    </Card>
  );
}

/** The session's environment, context, connectors, outputs and changes. */
export function SessionPanel() {
  const d = useWorkspace().details;
  const [remote, setRemote] = useState(true);
  return (
    <aside
      aria-label="Session details"
      className="absolute bottom-[12px] flex flex-col gap-[10.5px] overflow-y-auto text-[13px]"
      style={{
        top: PANEL_TOP,
        right: PANEL_INSET,
        width: PANEL_W,
        scrollbarWidth: "none",
      }}
    >
      <Section label="Environment">
        <Row
          icon="laptop"
          right={
            <span className="underline decoration-1 underline-offset-2" style={{ color: "var(--cc-text-muted)" }}>
              Save
            </span>
          }
        >
          This computer
        </Row>
        <Row icon="folder">
          {d.folder} <span style={{ color: "var(--cc-text-muted)" }}>· {d.parent}</span>
        </Row>
        <Row icon="gitBranch">{d.branch}</Row>
        <Row
          icon="pointer"
          right={
            <button type="button" aria-label="Remote Control" aria-pressed={remote} onClick={() => setRemote((r) => !r)}>
              <Toggle on={remote} />
            </button>
          }
        >
          Remote Control
        </Row>
      </Section>
      <Card>
        <Heading
          label="Context"
          link
          detail={
            <span className="flex items-center gap-[8px]" style={{ color: "var(--cc-text-muted)" }}>
              {Math.round(d.context * 100)}%
              <span className="relative h-[8px] w-[22px] overflow-hidden rounded-full" style={{ background: "var(--cc-meter-track)" }}>
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${d.context * 100}%`,
                    background: "var(--cc-toggle-on)",
                  }}
                />
              </span>
            </span>
          }
        />
      </Card>
      <Card>
        <Heading label="Connectors" link detail={<span style={{ color: "var(--cc-text-muted)" }}>{d.connectorsToReconnect} to reconnect</span>} />
      </Card>
      {d.outputs.length > 0 && (
        <Section label="Outputs">
          {d.outputs.map((o) => (
            <Row key={o} icon={o.endsWith(".png") ? "image" : "file"}>
              {o}
            </Row>
          ))}
          <div
            className="flex items-center"
            style={{
              height: ROW,
              paddingLeft: 15.5,
              color: "var(--cc-text-muted)",
            }}
          >
            Show more
          </div>
        </Section>
      )}
      <Section label="Changes">
        <Row
          icon="diff"
          right={
            <button
              type="button"
              className="rounded-[6px] px-[6px] text-[12px] leading-[19px] hover:brightness-125"
              style={{
                background: "var(--cc-chip-hover)",
                color: "var(--cc-text-strong)",
              }}
            >
              Create PR
            </button>
          }
        >
          <span style={{ color: "var(--cc-added)" }}>+{d.added}</span> <span style={{ color: "var(--cc-removed)" }}>−{d.removed}</span>
        </Row>
      </Section>
    </aside>
  );
}
