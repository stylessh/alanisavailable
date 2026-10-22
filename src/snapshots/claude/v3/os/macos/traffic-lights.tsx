"use client";

import { animate, motion, useMotionTemplate, useMotionValue, useTransform } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMacWindow } from "./window";

// macOS traffic lights as real elements. Size and spacing come from the Rex
// screenshot (13pt lights, 22pt apart); the Liquid Glass styling comes from a
// 2x close-up over a light window: a vertical gradient that is deepest in the
// upper half, a soft glow near the bottom, and a thin dark rim (the lights
// reflecting each other) that is strongest at the left and right and fades out
// along the circle toward the top and bottom. That dark side rim is light
// mode's; over a dark window the lights instead catch bright rims along their
// top and bottom edge, and have no dark sides.
// Hovering the group reveals the close / minimize / fullscreen glyphs.
// Inside a MacWindow they work: close, minimize into the Dock, full screen
// (Option-click zooms instead). In an unfocused window they turn gray until
// hovered, as on macOS. In full screen they leave the app's title bar; the
// window shows them in a floating row when the pointer reaches the top edge.
// They always sit on top of the window's content: an OS rule. The app places
// them as usual (`left`/`top` in their parent); an invisible anchor stays
// there, and the lights themselves render into the window's top layer at the
// anchor's position, so nothing the app draws can cover or dim them.

const SIZE = 13;
/** center to center */
const PITCH = 22;
/** letting go of a stretched light: it snaps back and wobbles */
const SNAP = { type: "spring", stiffness: 380, damping: 10, mass: 0.6 } as const;
/**
 * A dragged light's give: it follows the pointer by 2pt at most and
 * stretches by 10% at most, approaching both slowly (most pulls stay well
 * short of either).
 */
const PULL = { reach: 2, stretch: 0.1, reachOver: 90, stretchOver: 140 };

/**
 * Pulled while pressed, a light leans after the pointer like something on
 * an elastic: it moves a few points at most and stretches along the pull
 * (thinning across it), more the further it's pulled. Let go, it springs
 * back into shape with a wobble.
 */
function Elastic({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const stretch = useMotionValue(0);
  // while held, the light keeps its glyph even once the pointer leaves the group
  const [held, setHeld] = useState(false);
  const angle = useMotionValue(0);
  const along = useTransform(stretch, (v) => 1 + v);
  const across = useTransform(stretch, (v) => 1 - v * 0.4);
  // set together with angle (a derived value would trail it by a frame and tilt the light)
  const back = useMotionValue(0);
  const transform = useMotionTemplate`translate(${x}px, ${y}px) rotate(${angle}deg) scale(${along}, ${across}) rotate(${back}deg)`;

  // Capture phase: the light's own handler stops the event from reaching
  // the window (so pressing a light doesn't drag the window).
  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (!enabled || e.button !== 0) return;
    setHeld(true);
    const x0 = e.clientX;
    const y0 = e.clientY;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) return;
      const reach = PULL.reach * Math.tanh(dist / PULL.reachOver);
      x.set((reach * dx) / dist);
      y.set((reach * dy) / dist);
      const a = (Math.atan2(dy, dx) * 180) / Math.PI;
      angle.set(a);
      back.set(-a);
      stretch.set(PULL.stretch * Math.tanh(dist / PULL.stretchOver));
    };
    const up = () => {
      setHeld(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      animate(x, 0, SNAP);
      animate(y, 0, SNAP);
      animate(stretch, 0, SNAP);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <motion.span className="block will-change-transform" data-held={held || undefined} style={{ transform }} onPointerDownCapture={onPointerDownCapture}>
      {children}
    </motion.span>
  );
}

/** the press: unhurried, with a gentle overshoot that settles naturally */
const PRESS = { type: "spring", stiffness: 320, damping: 17, mass: 0.9 } as const;

// Angular fade for the side rim: opaque at 3 and 9 o'clock, gone by 12 and 6.
const SIDE_MASK =
  "conic-gradient(transparent 20deg, #000 90deg, transparent 160deg, transparent 200deg, #000 270deg, transparent 340deg)";
const MUTED_SIDE: React.CSSProperties = { boxShadow: "inset 0 0 0 0.75px light-dark(rgb(0 0 0 / 0.16), transparent)", maskImage: SIDE_MASK };

/** an unfocused window's lights: gray glass, shaded like the colored ones */
const MUTED: React.CSSProperties = {
  background: [
    "radial-gradient(60% 46% at 50% 86%, light-dark(#d9d9dc, #4a4a4e) 0%, light-dark(#d9d9dc, #4a4a4e) 30%, transparent 100%)",
    "linear-gradient(to bottom, light-dark(#bdbdc1, #38383b) 0%, light-dark(#c4c4c8, #3d3d40) 55%, light-dark(#cbcbcf, #434346) 100%)",
  ].join(", "),
  boxShadow: [
    "inset 0 0 0 0.5px light-dark(rgb(0 0 0 / 0.12), rgb(255 255 255 / 0.08))",
    "inset 0 0.75px 0 light-dark(transparent, rgb(255 255 255 / 0.24))",
    "inset 0 -0.75px 0 light-dark(transparent, rgb(255 255 255 / 0.12))",
  ].join(", "),
};

const LIGHTS = [
  {
    label: "Close",
    upper: "#f65449",
    mid: "#f05c56",
    lower: "#f16862",
    glow: "#f5837c",
    side: "rgb(175 20 15 / 0.7)",
    edge: "rgb(140 20 15 / 0.2)",
    glyph: "#8a0000",
    // ×, spanning 23–80% of the light
    icon: <path d="M3.7 3.7l5.6 5.6M9.3 3.7l-5.6 5.6" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />,
  },
  {
    label: "Minimize",
    upper: "#fbb300",
    mid: "#fbc000",
    lower: "#fece32",
    glow: "#ffd95a",
    side: "rgb(160 90 0 / 0.75)",
    edge: "rgb(150 95 0 / 0.2)",
    glyph: "#a83000",
    // −, spanning 21–79%, rounded ends
    icon: <path d="M3.4 6.5h6.2" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />,
  },
  {
    label: "Full screen",
    upper: "#00be00",
    mid: "#33bf00",
    lower: "#52c43c",
    glow: "#6fd95c",
    side: "rgb(25 105 5 / 0.7)",
    edge: "rgb(0 90 0 / 0.2)",
    glyph: "#005300",
    // two triangles split by a diagonal gap, spanning 28–80%
    icon: (
      <g fill="currentColor">
        <path d="M3.6 3.6h5.2L3.6 8.8z" />
        <path d="M10.2 5v5.2H5z" />
      </g>
    ),
  },
];

export function TrafficLights({
  left,
  top,
  floating = false,
  hidden = false,
  size = SIZE,
  pitch = PITCH,
}: {
  left: number;
  top: number;
  /** the full-screen floating row's copy, which stays visible (it is drawn in place, already on top) */
  floating?: boolean;
  /** faded out and not clickable (a title bar that hides, as in iPhone Mirroring) */
  hidden?: boolean;
  /** light diameter; Electron windows (Claude) draw 14pt lights 23pt apart */
  size?: number;
  pitch?: number;
}) {
  const win = useMacWindow();
  const anchor = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const lifted = !!win?.chrome && !floating;

  // where the anchor sits in the window, in the window's own (unscaled) points
  useLayoutEffect(() => {
    const chrome = win?.chrome;
    const el = anchor.current;
    if (!lifted || !chrome || !el) return;
    const measure = () => {
      const c = chrome.getBoundingClientRect();
      const s = c.width / chrome.offsetWidth || 1;
      const a = el.getBoundingClientRect();
      const next = { x: (a.left - c.left) / s, y: (a.top - c.top) / s };
      setAt((p) => (p && Math.abs(p.x - next.x) < 0.01 && Math.abs(p.y - next.y) < 0.01 ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(chrome);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [lifted, win?.chrome]);

  if (win?.mode === "fullscreen" && !floating) return null;
  const pos = lifted ? at : { x: left, y: top };
  const unfocused = !!win && !win.focused;
  const lights = (
    <div
      className="group pointer-events-auto absolute z-10 flex transition-opacity duration-200"
      style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, gap: pitch - size, opacity: hidden || !pos ? 0 : 1, pointerEvents: hidden ? "none" : undefined }}
    >
      {LIGHTS.map((l, i) => (
        <Elastic key={l.label} enabled={!(i === 2 && win?.fixedSize)}>
        <motion.button
          type="button"
          // Pressed, a light swells a touch on a bouncy spring and blooms
          // brighter, and holds there until the click is released.
          whileTap={i === 2 && win?.fixedSize ? undefined : { scale: 1.12, filter: "brightness(1.2) saturate(1.1)" }}
          transition={PRESS}
          aria-label={l.label}
          tabIndex={-1}
          onPointerDown={(e) => e.stopPropagation()}
          // the genie needs a picture of the window: take it while the pointer is on its way
          onPointerEnter={i === 1 ? () => win?.prepareMinimize() : undefined}
          disabled={i === 2 && win?.fixedSize}
          onClick={(e) =>
            [win?.close, win?.minimize, e.altKey ? win?.toggleZoom : win?.toggleFullscreen][i]?.()
          }
          // its own layer, so scaling it doesn't re-rasterize it soft
          className="relative block cursor-default rounded-full will-change-transform disabled:[&>*]:hidden"
          style={i === 2 && win?.fixedSize ? { width: size, height: size, background: "light-dark(#d4d4d6, #4b4b4f)", boxShadow: "inset 0 0 0 0.5px light-dark(rgb(0 0 0 / 0.12), rgb(255 255 255 / 0.1))" } : {
            filter: "brightness(1) saturate(1)",
            width: size,
            height: size,
          }}
        >
          {/* Unfocused, the light is gray glass (shaded like the colored one: gradient, low glow,
              crescents in dark mode, side rim in light mode) and the color only comes back on hover.
              The colored glass sits on top of the gray, so no color rings the muted light. */}
          {unfocused && (
            <span aria-hidden className="absolute inset-0 rounded-full" style={MUTED}>
              <span aria-hidden className="absolute inset-0 rounded-full" style={MUTED_SIDE} />
            </span>
          )}
          <span
            aria-hidden
            className={`absolute inset-0 rounded-full transition-opacity duration-100 ${unfocused ? "opacity-0 group-hover:opacity-100" : ""}`}
            style={{
              background: [
                `radial-gradient(60% 46% at 50% 86%, ${l.glow} 0%, ${l.glow} 30%, transparent 100%)`,
                `linear-gradient(to bottom, ${l.upper} 0%, ${l.mid} 55%, ${l.lower} 100%)`,
              ].join(", "),
              boxShadow: [
                `inset 0 0 0 0.5px ${l.edge}`,
                // dark mode: bright crescents top and bottom
                "inset 0 0.75px 0 light-dark(transparent, rgb(255 255 255 / 0.4))",
                "inset 0 -0.75px 0 light-dark(transparent, rgb(255 255 255 / 0.22))",
              ].join(", "),
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full"
              // light mode only: the dark rim at the sides
              style={{ boxShadow: `inset 0 0 0 0.75px light-dark(${l.side}, transparent)`, maskImage: SIDE_MASK }}
            />
          </span>
          <svg
            aria-hidden
            width={size}
            height={size}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            fill="none"
            className="absolute inset-0 opacity-0 transition-opacity duration-100 group-hover:opacity-100 [[data-held]_&]:opacity-100"
            style={{ color: l.glyph }}
          >
            {l.icon}
          </svg>
        </motion.button>
        </Elastic>
      ))}
    </div>
  );
  // inside a window, the lights live in its top layer; the floating row (already on top) and anything outside a window keep them in place
  if (!lifted || !win?.chrome) return lights;
  return (
    <>
      <span ref={anchor} aria-hidden className="pointer-events-none absolute size-0" style={{ left, top }} />
      {createPortal(lights, win.chrome)}
    </>
  );
}
