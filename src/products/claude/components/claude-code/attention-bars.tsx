"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EVERY_SESSION, type Session } from "./content";
import { useSidebar } from "./sidebar-state";

// With the sidebar hidden, the sessions that want you show as small bars
// along the window's left edge, like a phone's volume buttons: one per
// session, in its dot's color, most pressing first. Pointing at one widens
// it and shows what it wants; clicking opens it. The strip shares one
// tooltip: it eases in when the pointer arrives and out when it leaves, and
// moving along the strip swaps what it says, and where it sits, at once.

/** the bars' thickness, and how much a pointed-at one widens (pt) */
const BAR_W = 3;
const BAR_W_HOVER = 5;
const BAR_H = 22;
/** the bars run together as one strip, a hairline of the window between each */
const GAP = 1;
const R = BAR_W_HOVER / 2;
/** where the first bar starts, clear of the window controls and the header */
const TOP = 96;
/** the area that answers the pointer around a bar, wider than the bar */
const HIT_W = 14;
/** how long the pointer can be off the strip (crossing the hairline between two bars) before the tooltip goes */
const LEAVE_MS = 90;

const topOf = (i: number) => TOP + i * (BAR_H + GAP);

const TONE: Record<"waiting" | "done", { color: string; label: string }> = {
  waiting: { color: "var(--cc-dot-waiting)", label: "Needs input" },
  done: { color: "var(--cc-dot-done)", label: "Ready for review" },
};

export function AttentionBars() {
  const { shown, peeking, docking, wants, openSession } = useSidebar();
  const [pointed, setPointed] = useState<string | null>(null);
  const leaving = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(leaving.current), []);
  const point = (id: string) => {
    clearTimeout(leaving.current);
    setPointed(id);
  };
  const leave = (id: string) => {
    clearTimeout(leaving.current);
    leaving.current = setTimeout(() => setPointed((p) => (p === id ? null : p)), LEAVE_MS);
  };
  // waiting on you first, then what's done
  const rows = EVERY_SESSION.filter((e) => wants(e.session)).sort((a, b) => rank(a.session) - rank(b.session));
  const visible = !shown && !peeking && !docking;
  const at = visible ? rows.findIndex((e) => e.session.id === pointed) : -1;
  const tip = at >= 0 ? rows[at] : null;
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-[25]" style={{ width: HIT_W }}>
      <AnimatePresence initial={false}>
        {visible &&
          rows.map(({ session }, i) => {
            const tone = TONE[session.dot as "waiting" | "done"];
            const on = pointed === session.id;
            return (
              <motion.button
                key={session.id}
                type="button"
                aria-label={`${tone.label}: ${session.title}`}
                className="pointer-events-auto absolute left-0 flex items-center outline-none"
                style={{ width: HIT_W, height: BAR_H }}
                // they slide out from the edge one after another, and back into it; one leaving, the rest close up
                initial={{ x: -BAR_W_HOVER, top: topOf(i) }}
                animate={{
                  x: 0,
                  top: topOf(i),
                  transition: { x: { type: "spring", stiffness: 520, damping: 40, delay: i * 0.04 }, top: { type: "spring", stiffness: 520, damping: 44 } },
                }}
                exit={{ x: -BAR_W_HOVER, transition: { duration: 0.12, ease: "easeIn" } }}
                onPointerEnter={() => point(session.id)}
                onPointerLeave={() => leave(session.id)}
                onFocus={() => point(session.id)}
                onBlur={() => leave(session.id)}
                onClick={() => {
                  clearTimeout(leaving.current);
                  setPointed(null);
                  openSession(session.id);
                }}
              >
                <span
                  aria-hidden
                  className="block transition-[width,filter] duration-150 ease-out"
                  style={{
                    width: on ? BAR_W_HOVER : BAR_W,
                    height: BAR_H,
                    background: tone.color,
                    // flush with the window's edge; only the strip's two ends are rounded, and a pointed-at one, standing out of it
                    borderRadius: `0 ${on || i === 0 ? R : 0}px ${on || i === rows.length - 1 ? R : 0}px 0`,
                    filter: on ? "brightness(1.1)" : undefined,
                  }}
                />
              </motion.button>
            );
          })}
      </AnimatePresence>
      {/* one tooltip for the whole strip, kept (same key) while the pointer moves along it */}
      <AnimatePresence>{tip && <Tip key="tip" session={tip.session} project={tip.project} top={topOf(at) + BAR_H / 2} />}</AnimatePresence>
    </div>
  );
}

const rank = (s: Session) => (s.dot === "waiting" ? 0 : 1);

/** What a bar's session wants: its state, its title, and the project and what it said. */
function Tip({ session, project, top }: { session: Session; project: string; top: number }) {
  const tone = TONE[session.dot as "waiting" | "done"];
  return (
    <motion.span
      role="tooltip"
      className="cc-surface pointer-events-none absolute flex w-[248px] flex-col gap-[2px] rounded-[10px] px-[10px] py-[8px] text-left"
      // where it sits follows the pointed-at bar straight away; only coming and going is animated
      style={{ left: HIT_W, top }}
      initial={{ opacity: 0, x: -4, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      exit={{ opacity: 0, x: -4, y: "-50%", transition: { duration: 0.08 } }}
      transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
    >
      <span className="flex items-center gap-[6px] text-[11.5px] leading-[16px]" style={{ color: "var(--cc-text-muted)" }}>
        <span className="size-[6px] rounded-full" style={{ background: tone.color }} />
        {tone.label}
        <span className="ml-auto">{project}</span>
      </span>
      <span className="line-clamp-2 text-[13px] leading-[18px]" style={{ color: "var(--cc-text-strong)" }}>
        {session.title}
      </span>
      {session.note && (
        <span className="text-[12px] leading-[16px]" style={{ color: "var(--cc-text-muted)" }}>
          {session.note}
        </span>
      )}
    </motion.span>
  );
}
