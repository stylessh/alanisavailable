import Link from "next/link";
import type { ProductMeta } from "@/lib/products";

// Static fractal noise, tiled over the fill for a film-grain finish.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

// Average relative luminance of every hex color in a CSS background, so a
// gradient is judged by its overall tone.
function luminance(background: string) {
  const hexes = background.match(/#[0-9a-f]{6}\b/gi) ?? [];
  if (hexes.length === 0) return 0.5;
  const channel = (v: number) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const total = hexes.reduce((sum, hex) => {
    const [r, g, b] = [1, 3, 5].map((i) =>
      channel(parseInt(hex.slice(i, i + 2), 16) / 255),
    );
    return sum + 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }, 0);
  return total / hexes.length;
}

// The edge contrasts with the card: dark and mid-tone cards get a light rim
// so the dark shadow below reads as separate; light cards get a dark one.
// Light rims are softer on the dark page, where there's no shadow to fight.
const edge = (background: string, page: "light" | "dark") =>
  luminance(background) < 0.4
    ? `rgb(255 255 255 / ${page === "light" ? 0.22 : 0.12})`
    : "rgb(0 0 0 / 0.1)";

export function ProductCard({
  slug,
  metadata,
}: {
  slug: string;
  metadata: ProductMeta;
}) {
  const { company, logo, flat, grain } = metadata;
  const background = metadata.background ?? "#171717";
  const foreground = metadata.foreground ?? "#fafafa";

  const backgroundDark = metadata.backgroundDark ?? background;

  const vars = {
    "--card-bg": background,
    "--card-bg-dark": backgroundDark,
    "--card-edge": edge(background, "light"),
    // A shadow reads lighter next to a dark card, so dark and mid-tone
    // cards get a little more of it to look as lifted as light ones.
    "--card-shadow-alpha": luminance(background) < 0.4 ? 0.09 : 0.06,
    "--card-edge-dark": edge(backgroundDark, "dark"),
    "--card-fg": foreground,
    "--card-fg-dark": metadata.foregroundDark ?? foreground,
  } as React.CSSProperties;

  return (
    <li className="w-[78vw] max-w-[22rem] shrink-0 snap-start">
      <Link
        href={`/${slug}`}
        aria-label={company}
        className="group block outline-none"
        style={vars}
      >
        <div className="shadow-card relative grid aspect-video place-items-center overflow-hidden rounded-2xl [background:var(--card-bg)] group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background dark:[background:var(--card-bg-dark)]">
          {grain && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light"
              style={{ backgroundImage: GRAIN }}
            />
          )}

          {logo ? (
            <span
              aria-hidden
              className={`relative block h-7 w-36 bg-(--card-fg) dark:bg-(--card-fg-dark) ${flat ? "" : "drop-shadow-[0_1px_1px_rgb(0_0_0/0.12)]"}`}
              style={{
                maskImage: `url(${logo})`,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
              }}
            />
          ) : (
            <span className="text-highlight relative text-(--card-fg) dark:text-(--card-fg-dark)">
              {company}
            </span>
          )}

          {!flat && (
            <>
              {/* Light layer on top: a soft sheen from above and a little weight
                  at the bottom. The edge itself is the inset ring below. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.16),transparent_60%),linear-gradient(to_top,rgb(0_0_0/0.04),transparent_40%)]"
              />
            </>
          )}

          {/* Edge: a translucent inset ring above everything, blending with
              whatever color or gradient the card has. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--card-edge)] dark:shadow-[inset_0_0_0_1px_var(--card-edge-dark)]"
          />
        </div>
      </Link>
    </li>
  );
}

// Brushed metal: fine horizontal streaks of uneven length and strength (noise
// stretched sideways), not regular lines, so it reads as a satin finish.
const BRUSHED = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='b'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.004 .9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23b)'/%3E%3C/svg%3E")`;

/**
 * The question mark as a blueprint: a large outlined glyph with just its
 * construction circle and centre left in, drawn in currentColor (muted ink).
 */
function BlueprintQuestion() {
  // centreline: a bowl around (60, 42) r 20, the stem down to 82, the dot at 100
  const glyph = "M40 42 a20 20 0 1 1 30.5 17 C64 63 60 67 60 74 v6";
  return (
    <svg aria-hidden viewBox="0 0 120 120" className="relative h-[72%] w-auto" fill="none" stroke="currentColor" strokeLinecap="round">
      <defs>
        {/* the outline: a wide stroke of the glyph with a narrower one cut out of it */}
        <mask id="bp-outline" maskUnits="userSpaceOnUse">
          <path d={glyph} stroke="#fff" strokeWidth="12" />
          <circle cx="60" cy="99" r="6.8" fill="#fff" stroke="none" />
          <path d={glyph} stroke="#000" strokeWidth="10.2" />
          <circle cx="60" cy="99" r="5.9" fill="#000" stroke="none" />
        </mask>
      </defs>
      <g strokeWidth="0.55" opacity="0.6">
        <circle cx="60" cy="42" r="20" strokeDasharray="1.6 2.4" />
        <path d="M57 42h6M60 39v6" />
      </g>
      <rect width="120" height="120" fill="currentColor" stroke="none" mask="url(#bp-outline)" />
    </svg>
  );
}

/**
 * The next product, not yet revealed: the same card in brushed metal (a
 * steel gradient, fine horizontal brushing, a sheen from above and a lit top
 * edge; silver on the light page, gunmetal on the dark one) with a blueprint
 * question mark in muted ink. Not a link.
 */
export function SurpriseCard() {
  return (
    <li className="w-[78vw] max-w-[22rem] shrink-0 snap-start" aria-label="A new one is on its way">
      <div
        // silver on the light page, gunmetal on the dark one: darkest a little below the middle
        className="shadow-card relative grid aspect-video place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(170deg,#f2f3f5_0%,#dadde2_38%,#c2c6cd_64%,#e3e5e9_100%)] text-[rgb(40_52_72/0.55)] [--card-shadow-alpha:0.07] dark:bg-[linear-gradient(170deg,#3a3d43_0%,#27292e_40%,#191a1d_66%,#2a2c31_100%)] dark:text-[rgb(200_214_235/0.45)]"
      >
        {/* fine horizontal brushing */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 mix-blend-soft-light"
          style={{ backgroundImage: BRUSHED }}
        />
        {/* sheen: a soft band of light from above, and a cooler fall-off at the bottom */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_30%_0%,rgb(255_255_255/0.35),transparent_60%),linear-gradient(to_top,rgb(0_0_0/0.08),transparent_45%)] dark:bg-[radial-gradient(90%_70%_at_30%_0%,rgb(255_255_255/0.09),transparent_60%),linear-gradient(to_top,rgb(0_0_0/0.25),transparent_45%)]"
        />
        {/* a blueprint grid across the card, fading out toward its edges */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "16px 16px",
            backgroundPosition: "center",
            maskImage: "radial-gradient(60% 75% at 50% 50%, #000 15%, transparent 90%)",
          }}
        />
        <BlueprintQuestion />
        {/* the edge: a lit top rim and a hairline around */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgb(255_255_255/0.85),inset_0_0_0_1px_rgb(0_0_0/0.08)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.14),inset_0_0_0_1px_rgb(255_255_255/0.07)]"
        />
      </div>
    </li>
  );
}
