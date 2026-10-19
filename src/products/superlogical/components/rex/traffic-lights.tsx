// macOS traffic lights as real elements. Size and spacing come from the Rex
// screenshot (13pt lights, 22pt apart); the Liquid Glass styling comes from a
// 2x close-up over a light window: a vertical gradient that is deepest in the
// upper half, a soft glow near the bottom, and a thin dark rim (the lights
// reflecting each other) that is strongest at the left and right and fades out
// along the circle toward the top and bottom. (Bright top/bottom rims only show over dark windows, so none here.)
// Hovering the group reveals the close / minimize / fullscreen glyphs.

const SIZE = 13;

// Angular fade for the side rim: opaque at 3 and 9 o'clock, gone by 12 and 6.
const SIDE_MASK =
  "conic-gradient(transparent 20deg, #000 90deg, transparent 160deg, transparent 200deg, #000 270deg, transparent 340deg)";

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

export function TrafficLights({ left, top }: { left: number; top: number }) {
  return (
    <div className="group absolute flex gap-[9px]" style={{ left, top }}>
      {LIGHTS.map((l) => (
        <button
          key={l.label}
          type="button"
          aria-label={l.label}
          tabIndex={-1}
          className="relative block cursor-default rounded-full"
          style={{
            width: SIZE,
            height: SIZE,
            background: [
              `radial-gradient(60% 46% at 50% 86%, ${l.glow} 0%, ${l.glow} 30%, transparent 100%)`,
              `linear-gradient(to bottom, ${l.upper} 0%, ${l.mid} 55%, ${l.lower} 100%)`,
            ].join(", "),
            boxShadow: `inset 0 0 0 0.5px ${l.edge}`,
          }}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `inset 0 0 0 0.75px ${l.side}`, maskImage: SIDE_MASK }}
          />
          <svg
            aria-hidden
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            fill="none"
            className="absolute inset-0 opacity-0 transition-opacity duration-100 group-hover:opacity-100"
            style={{ color: l.glyph }}
          >
            {l.icon}
          </svg>
        </button>
      ))}
    </div>
  );
}
