"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { MENU_BAR_H } from "./data";
import type { Notice } from "./window-manager";

// Notifications, measured on a 2x capture of macOS 27's Notification
// Center: 342pt cards 17pt from the screen's right edge, starting 11pt
// below the menu bar, 74pt tall for a title, subtitle and one line of body,
// a 32pt app icon 12pt in, text at 57pt. Banners use the same card.

export const CARD = { w: 342, right: 17, top: MENU_BAR_H + 11 };
const BANNER_MS = 5000;
const SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;

/** A notification posted before the page opened: minutes ago instead of a time. */
export type SeedNotice = Omit<Notice, "id" | "at"> & { ago: number };

// Liquid Glass as measured on a 2x capture of Notification Center (dark):
// fills a little lighter than what's behind, crescents of light along the
// top and bottom edges (none at the sides), light spilling a couple of
// points in under the top rim and glowing up from the bottom one, and a
// dark hairline at the sides. Cards: top rim ~110, bottom ~78; buttons
// ~100 at the top and ~88 at the bottom, with a glow rising from below
// (~+15 over the last 8 rows).
const glass = (fill: string, rims: { top: number; bottom: number }, spill: number, glow: number): React.CSSProperties => ({
  background: [
    `linear-gradient(to bottom, light-dark(rgb(255 255 255 / ${spill * 3}), rgb(255 255 255 / ${spill})), light-dark(rgb(255 255 255 / ${spill / 2}), rgb(255 255 255 / ${spill / 6})) 1px, transparent 3px)`,
    `linear-gradient(to top, light-dark(rgb(255 255 255 / ${glow * 3}), rgb(255 255 255 / ${glow})), transparent 5px)`,
    fill,
  ].join(", "),
  backdropFilter: "blur(9px) saturate(1.9)",
  WebkitBackdropFilter: "blur(9px) saturate(1.9)",
  boxShadow: [
    // each rim is a point thick, brightest at the very edge
    `inset 0 0.5px 0 light-dark(rgb(255 255 255 / 0.9), rgb(255 255 255 / ${rims.top}))`,
    `inset 0 1px 0 light-dark(rgb(255 255 255 / 0.5), rgb(255 255 255 / ${rims.top * 0.45}))`,
    `inset 0 -0.5px 0 light-dark(rgb(255 255 255 / 0.7), rgb(255 255 255 / ${rims.bottom}))`,
    `inset 0 -1px 0 light-dark(rgb(255 255 255 / 0.4), rgb(255 255 255 / ${rims.bottom * 0.45}))`,
    // the dark hairline only shows at the sides: the rims own the top and bottom edge
    "-0.5px 0 0 light-dark(rgb(0 0 0 / 0.08), rgb(0 0 0 / 0.6))",
    "0.5px 0 0 light-dark(rgb(0 0 0 / 0.08), rgb(0 0 0 / 0.6))",
  ].join(", "),
  color: "light-dark(rgb(0 0 0 / 0.86), rgb(255 255 255 / 0.92))",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif",
});

const CARD_FILL = "light-dark(rgb(250 250 252 / 0.55), rgb(46 46 49 / 0.7))";
const CARD_BASE = glass(CARD_FILL, { top: 0.22, bottom: 0.12 }, 0.12, 0.035);
const CARD_GLASS: React.CSSProperties = { ...CARD_BASE, boxShadow: `${CARD_BASE.boxShadow}, 0 8px 24px rgb(0 0 0 / 0.22)` };
const BUTTON_FILL = "light-dark(rgb(250 250 252 / 0.6), rgb(54 54 58 / 0.55))";
const PILL_GLASS = glass(BUTTON_FILL, { top: 0.14, bottom: 0.15 }, 0.06, 0.06);
const ROUND_GLASS = PILL_GLASS;

function ago(at: number, now: number) {
  const m = Math.floor((now - at) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** One notification card: hovering shows a close button at its top-left, as on macOS. */
export function NoticeCard({ notice, onOpen, onDismiss }: { notice: Notice; onOpen: () => void; onDismiss: () => void }) {
  const now = useNow();
  return (
    <div className="group relative" style={{ width: CARD.w }}>
      <button
        type="button"
        tabIndex={-1}
        onClick={onOpen}
        className="relative flex w-full cursor-default items-start rounded-[26px] py-[11.5px] pr-[14px] pl-[12px] text-left text-[13px] leading-[17px] [corner-shape:superellipse(1.5)]"
        style={CARD_GLASS}
      >
        <img src={notice.icon} alt="" width={32} height={32} className="mt-[5px] mr-[13px] size-[32px] max-w-none shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-[8px]">
            <span className="flex-1 truncate font-semibold">{notice.app}</span>
            <span className="shrink-0 text-[11.5px] opacity-50">{ago(notice.at, now)}</span>
          </span>
          {notice.subtitle && <span className="block truncate font-semibold">{notice.subtitle}</span>}
          <span className="line-clamp-2 block">{notice.body}</span>
        </span>
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Clear"
        onClick={onDismiss}
        className="absolute -top-[6px] -left-[6px] grid size-[20px] cursor-default place-items-center rounded-full opacity-0 transition-opacity duration-100 group-hover:opacity-100"
        style={{ ...ROUND_GLASS, borderRadius: 999 }}
      >
        <svg aria-hidden width="8" height="8" viewBox="0 0 8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M1 1l6 6M7 1 1 7" />
        </svg>
      </button>
    </div>
  );
}

/** A banner that slides in at the top right, stays a few seconds, and slides away. */
function Banner({ notice, onDone }: { notice: Notice; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, BANNER_MS);
    return () => clearTimeout(t);
    // one timer per banner
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <motion.div
      layout
      initial={{ x: CARD.w + 40, opacity: 1 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: CARD.w + 40, transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
      transition={SPRING}
    >
      <NoticeCard
        notice={notice}
        onOpen={() => {
          onDone();
          notice.open?.();
        }}
        onDismiss={onDone}
      />
    </motion.div>
  );
}

export function Banners({ banners, onDone }: { banners: Notice[]; onDone: (id: string) => void }) {
  return (
    <div className="absolute z-[1050] flex flex-col gap-[8px]" style={{ right: CARD.right, top: CARD.top }}>
      <AnimatePresence initial={false}>
        {banners.map((n) => (
          <Banner key={n.id} notice={n} onDone={() => onDone(n.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Behind Notification Center's column, and only as big as it: a blur that
 * builds up toward the screen's right edge and eases out at the column's
 * left and bottom, so there's no hard edge where it starts. Layered blurs,
 * each masked to a band (one blur can't vary in strength), plus a shade.
 */
const STEPS = [1, 2, 4, 8, 16, 32];

function ProgressiveBlur() {
  const at = (n: number) => `${Math.max(0, Math.min(100, (n / STEPS.length) * 70))}%`;
  // stronger to the right; the whole thing fades out over the last 40pt at the bottom
  const band = (k: number) =>
    `linear-gradient(to right, transparent ${at(k - 1)}, #000 ${at(k)}), linear-gradient(to bottom, #000 calc(100% - 40px), transparent)`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {STEPS.map((b, k) => (
        <div
          key={b}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${b}px)`,
            WebkitBackdropFilter: `blur(${b}px)`,
            maskImage: band(k),
            WebkitMaskImage: band(k),
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, transparent, light-dark(rgb(255 255 255 / 0.18), rgb(0 0 0 / 0.32)) 60%)",
          maskImage: "linear-gradient(to bottom, #000 calc(100% - 40px), transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 40px), transparent)",
        }}
      />
    </div>
  );
}

/** One app's notifications: the newest on top with the rest stacked under it, until clicked open. */
function Group({ notices, onOpen, onDismiss }: { notices: Notice[]; onOpen: (n: Notice) => void; onDismiss: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const stacked = !open && notices.length > 1;
  const shown = stacked ? notices.slice(0, 1) : notices;
  return (
    <div className="relative flex flex-col gap-[8px]">
      {stacked && (
        // the cards underneath peek out below the top one
        <div
          aria-hidden
          className="absolute inset-x-[10px] -bottom-[9px] h-[40px] rounded-[20px] [corner-shape:superellipse(1.5)]"
          style={{
            ...CARD_GLASS,
            background: "light-dark(rgb(240 240 243 / 0.5), rgb(36 36 38 / 0.62))",
            boxShadow: "inset 0 -0.75px 0 light-dark(rgb(255 255 255 / 0.7), rgb(255 255 255 / 0.12)), 0 0 0 0.5px light-dark(rgb(0 0 0 / 0.08), rgb(0 0 0 / 0.45)), 0 6px 16px rgb(0 0 0 / 0.2)",
          }}
        />
      )}
      <AnimatePresence initial={false}>
        {shown.map((n) => (
          <motion.div key={n.id} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }} transition={SPRING}>
            <NoticeCard notice={n} onOpen={() => (stacked ? setOpen(true) : onOpen(n))} onDismiss={() => onDismiss(n.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const Round = ({ label, onClick, size }: { label: string; onClick?: () => void; size: number }) => (
  <button type="button" tabIndex={-1} aria-label={label} title={label} onClick={onClick} className="grid shrink-0 cursor-default place-items-center rounded-full active:brightness-125" style={{ ...ROUND_GLASS, width: size, height: size, borderRadius: 999 }}>
    <svg aria-hidden width={size * 0.38} height={size * 0.38} viewBox="0 0 8 8" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" style={{ opacity: 0.72 }}>
      <path d="M1 1l6 6M7 1 1 7" />
    </svg>
  </button>
);

/**
 * Notification Center, from the clock, over a progressive blur: a title
 * with a close button, each app's notifications stacked newest first (or a
 * note that there are none), and Edit Widgets.
 */
export function NotificationCenter({
  notices,
  onOpen,
  onDismiss,
  onClear,
  onClose,
}: {
  notices: Notice[];
  onOpen: (n: Notice) => void;
  onDismiss: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const groups = [...new Set(notices.map((n) => n.app))].map((app) => notices.filter((n) => n.app === app));
  const font = CARD_GLASS.fontFamily;
  // The column, its blur included, slides in from past the screen's right
  // edge and back out; nothing fades.
  const width = CARD.w + 2 * CARD.right;
  return (
    <motion.div
      className="absolute right-0 z-[1100] flex flex-col"
      style={{ top: MENU_BAR_H, width, padding: `${CARD.top - MENU_BAR_H - 4}px ${CARD.right}px 40px`, fontFamily: font }}
      initial={{ x: width }}
      animate={{ x: 0 }}
      exit={{ x: width, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
      transition={SPRING}
    >
      <ProgressiveBlur />
      <div className="relative">
        <div className="mb-[6.5px] flex h-[24px] items-center justify-between">
          <span className="text-[18px] leading-[24px] font-bold tracking-[-0.2px] text-[light-dark(rgb(0_0_0/0.85),#fff)] [text-shadow:0_1px_6px_light-dark(transparent,rgb(0_0_0/0.35))]">Notification Center</span>
          <Round label="Close" size={21} onClick={onClose} />
        </div>
        {groups.length ? (
          <div className="flex flex-col gap-[16px]">
            {groups.map((g) => (
              <Group key={g[0].app} notices={g} onOpen={onOpen} onDismiss={onDismiss} />
            ))}
          </div>
        ) : (
          <div className="mt-[14px] text-center text-[15px] font-semibold text-[light-dark(rgb(0_0_0/0.75),rgb(255_255_255/0.9))]">No recent notifications</div>
        )}
        <div className="mt-[25px] flex justify-center gap-[8px]">
          <span className="grid h-[24px] w-[86px] place-items-center rounded-full text-[11px] font-medium" style={{ ...PILL_GLASS, borderRadius: 999, color: "light-dark(rgb(0 0 0 / 0.55), rgb(255 255 255 / 0.62))" }}>
            Edit Widgets
          </span>
          {notices.length > 0 && <Round label="Clear all" size={24} onClick={onClear} />}
        </div>
      </div>
    </motion.div>
  );
}
