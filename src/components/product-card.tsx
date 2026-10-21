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

/**
 * The next product, not yet revealed: the same card, but unlit (no shadow
 * or sheen), on a quiet neutral fill with a hairline edge and a muted
 * question mark in the middle. Not a link.
 */
export function SurpriseCard() {
  return (
    <li className="w-[78vw] max-w-[22rem] shrink-0 snap-start" aria-label="A new one is on its way">
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl bg-[#f5f5f5] shadow-[inset_0_0_0_1px_var(--border)] dark:bg-[#121212]">
        <span aria-hidden className="text-muted-foreground/70 text-[44px] leading-none font-medium select-none">
          ?
        </span>
      </div>
    </li>
  );
}
