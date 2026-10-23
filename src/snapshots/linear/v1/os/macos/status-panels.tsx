"use client";

import { useId, useState } from "react";
import { HIGHLIGHT, MENU_GLASS } from "./menu";

// The menu bar's status menus, measured on 2x captures of macOS 27: Wi-Fi
// and battery (about 308pt wide, text 14pt in, 26pt circle icons on rows).


// ─── Glyphs ─────────────────────────────────────────────────────────────────

/**
 * A glyph taken from the 2x captures (white with exact alpha), drawn in the
 * current color through a mask so it can be tinted. Each image is centered
 * on its disc as captured, so it sits right with no offsets.
 */
const Glyph = ({ name, w, h }: { name: string; w: number; h: number }) => {
  const url = `url(/os/macos/menubar/glyphs/${name}.png)`;
  return (
    <span
      aria-hidden
      className="block shrink-0"
      style={{ width: w, height: h, background: "currentColor", maskImage: url, WebkitMaskImage: url, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}
    />
  );
};

/**
 * Energy mode glyphs, rebuilt from the capture: a 17.5×9pt battery with
 * 3.5pt corners and a 1.3pt nub. Automatic is solid, Low Power an outline
 * with a sliver of charge, High Power a translucent body with ▸▸▸.
 */
function EnergyGlyph({ mode, on }: { mode: (typeof MODES)[number]; on: boolean }) {
  const clip = useId();
  const ink = on ? "#fff" : "light-dark(rgb(0 0 0 / 0.5), rgb(255 255 255 / 0.5))";
  return (
    <svg aria-hidden width="20" height="10" viewBox="0 0 20 10" style={{ color: ink }}>
      {mode === "Automatic" && <rect x="0" y="0.5" width="17.5" height="9" rx="3.5" fill="currentColor" opacity={on ? 0.9 : 1} />}
      {mode === "Low Power" && (
        <>
          <clipPath id={clip}>
            <rect x="0.6" y="1.1" width="16.3" height="7.8" rx="2.9" />
          </clipPath>
          {/* the charge: flush with the outline, square on its right */}
          <rect x="0" y="0" width="4.4" height="10" fill="currentColor" opacity={0.75} clipPath={`url(#${clip})`} />
          <rect x="0.6" y="1.1" width="16.3" height="7.8" rx="2.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </>
      )}
      {mode === "High Power" && (
        <>
          <rect x="0" y="0.5" width="17.5" height="9" rx="3.5" fill="currentColor" opacity={0.28} />
          <path d="M3.4 2.6v4.8L7 5zM7.7 2.6v4.8L11.3 5zM12 2.6v4.8L15.6 5z" fill="currentColor" />
        </>
      )}
      <rect x="18.6" y="3.3" width="1.1" height="3.4" rx="0.55" fill="currentColor" opacity={on ? 0.4 : 0.6} />
    </svg>
  );
}

// ─── Wi-Fi and battery menus ────────────────────────────────────────────────

const Sep = () => <div className="mx-[14px] my-[6px] h-[0.5px]" style={{ background: "light-dark(rgb(0 0 0 / 0.1), rgb(255 255 255 / 0.12))" }} />;
const Head = ({ children }: { children: React.ReactNode }) => <div className="px-[14px] pt-[6px] pb-[3px] text-[11px] leading-[16px] font-semibold opacity-50">{children}</div>;

/** A clickable row: gray highlight on hover, as status menus have. */
function Line({ children, tall = false, onClick }: { children: React.ReactNode; tall?: boolean; onClick?: () => void }) {
  return (
    <div
      role="menuitem"
      onClick={onClick}
      className="mx-[5px] flex cursor-default items-center gap-[8px] rounded-[7px] px-[9px] hover:bg-[light-dark(rgb(0_0_0/0.07),rgb(255_255_255/0.1))]"
      style={{ height: tall ? 32 : 24 }}
    >
      {children}
    </div>
  );
}

const Disc = ({ children, on }: { children: React.ReactNode; on: boolean }) => (
  <span
    className="grid size-[26px] shrink-0 place-items-center rounded-full"
    style={{ background: on ? HIGHLIGHT : "light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.12))", color: on ? "#fff" : "currentColor" }}
  >
    {children}
  </span>
);

function Panel({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <div role="menu" className="rounded-[12px] py-[8px] text-[13px] leading-[16px] select-none [corner-shape:superellipse(1.4)] [-webkit-text-stroke:0.15px_currentColor]" style={{ ...MENU_GLASS, width }}>
      {children}
    </div>
  );
}

export function WifiMenu({ onClose }: { onClose: () => void }) {
  const [on, setOn] = useState(true);
  return (
    <Panel width={308}>
      <div className="flex h-[26px] items-center justify-between px-[14px]">
        <span className="font-semibold">Wi-Fi</span>
        <button
          type="button"
          tabIndex={-1}
          role="switch"
          aria-checked={on}
          aria-label="Wi-Fi"
          onClick={() => setOn(!on)}
          className="relative h-[24px] w-[52px] cursor-default rounded-full transition-colors"
          style={{ background: on ? HIGHLIGHT : "light-dark(rgb(0 0 0 / 0.12), rgb(255 255 255 / 0.18))" }}
        >
          <span className="absolute top-[2px] h-[20px] w-[30px] rounded-full bg-white shadow transition-[left] duration-200" style={{ left: on ? 20 : 2 }} />
        </button>
      </div>
      {on && (
        <>
          <Sep />
          <Head>Personal Hotspot</Head>
          <Line tall onClick={onClose}>
            <Disc on={false}><span className="opacity-70"><Glyph name="hotspot" w={22} h={20} /></span></Disc>
            <span className="flex-1">Alan’s iPhone</span>
            <span className="text-[11px] opacity-50">5G</span>
          </Line>
          <Sep />
          <Head>Known Network</Head>
          <Line tall onClick={onClose}>
            <Disc on><Glyph name="wifi" w={18} h={18} /></Disc>
            <span className="flex-1">Studio 5G</span>
            <span className="opacity-50"><Glyph name="lock" w={18} h={18} /></span>
          </Line>
          <Sep />
          <Line onClick={onClose}>Other…</Line>
        </>
      )}
      <Sep />
      <Line onClick={onClose}>Wi-Fi Settings…</Line>
    </Panel>
  );
}

const MODES = ["Automatic", "Low Power", "High Power"] as const;

export function BatteryMenu({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<(typeof MODES)[number]>("Automatic");
  return (
    <Panel width={307}>
      <div className="flex h-[26px] items-center justify-between px-[14px]">
        <span className="font-semibold">Battery</span>
        <span className="opacity-50">82%</span>
      </div>
      <div className="px-[14px] text-[12px] leading-[18px] opacity-50">Power Source: Battery</div>
      <Sep />
      <Head>Energy Mode</Head>
      {MODES.map((m) => (
        <Line key={m} tall onClick={() => setMode(m)}>
          <Disc on={mode === m}>
            <EnergyGlyph mode={m} on={mode === m} />
          </Disc>
          {m}
        </Line>
      ))}
      <Sep />
      <Head>Using Significant Energy</Head>
      <Line>
        <span className="-mx-[1px]"><Glyph name="brightness" w={18} h={18} /></span>
        Display Brightness
      </Line>
      <Sep />
      <Line onClick={onClose}>Battery Settings…</Line>
    </Panel>
  );
}
