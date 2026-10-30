// Polar's tokens as version 1 ("First version", src/snapshots/polar/v1) drew
// them, the reference every change is measured against, written in today's
// token names. Version 1 had more roles than today's system: where several
// became one, the role takes the value version 1 used most for it.
//   text       gray-900, the body (titles were black, inputs gray-950)
//   secondary  gray-700 (some labels were gray-600)
//   radii      2 / 7.6 / 12 / 16 / 24 for xs to xl (options were 9.6, tiles
//              8, big surfaces 32)
//   shadows    by today's levels: the thumbs wore a 20px glow, popovers a
//              15px one (menus the 20px), overlays Tailwind's shadow-sm
// So the Version 1 column is close, not exact; /polar/versions shows the
// frozen version itself. Never edit these to match styles.css.
export const POLAR_V1: Record<string, string> = {
  "--pl-shadow-xs": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "--pl-shadow-sm": "0 0 20px rgb(0 0 0 / 0.04), 0 0 5px rgb(0 0 0 / 0.06)",
  "--pl-shadow-md": "0 0 15px rgb(0 0 0 / 0.04), 0 0 2px rgb(0 0 0 / 0.06)",
  "--pl-shadow-lg": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  "--pl-white": "#fff",
  "--pl-gray-50": "oklch(0.985 0.002 247.839)",
  "--pl-gray-100": "oklch(0.967 0.003 264.542)",
  "--pl-gray-200": "oklch(0.928 0.006 264.531)",
  "--pl-gray-300": "oklch(0.872 0.01 258.338)",
  "--pl-gray-400": "oklch(0.707 0.022 261.325)",
  "--pl-gray-500": "oklch(0.551 0.027 264.364)",
  "--pl-gray-600": "oklch(0.446 0.03 256.802)",
  "--pl-gray-700": "oklch(0.373 0.034 259.733)",
  "--pl-gray-800": "oklch(0.278 0.033 256.848)",
  "--pl-gray-900": "oklch(0.21 0.034 264.665)",
  "--pl-gray-950": "oklch(0.13 0.028 261.692)",
  "--pl-surface": "#fff",
  "--pl-subtle": "oklch(0.985 0.002 247.839)",
  "--pl-shell": "oklch(0.967 0.003 264.542)",
  "--pl-border": "oklch(0.928 0.006 264.531)",
  "--pl-rule": "oklch(0.872 0.01 258.338)",
  "--pl-highlight": "oklch(0.546 0.245 262.881)",
  "--pl-popover": "#fff",
  "--pl-text": "oklch(0.21 0.034 264.665)",
  "--pl-text-secondary": "oklch(0.373 0.034 259.733)",
  "--pl-text-muted": "oklch(0.551 0.027 264.364)",
  "--pl-text-faint": "oklch(0.707 0.022 261.325)",
  "--pl-primary": "#000",
  "--pl-secondary": "oklch(0.967 0.003 264.542)",
  "--pl-secondary-hover": "oklch(0.928 0.006 264.531)",
  "--pl-ghost-hover": "oklch(0.928 0.006 264.531)",
  "--pl-destructive": "oklch(0.637 0.237 25.331)",
  "--pl-destructive-light": "oklch(0.704 0.191 22.216)",
  "--pl-link": "oklch(0.707 0.165 254.624)",
  "--pl-accent": "oklch(0.546 0.245 262.881)",
  "--pl-legend": "oklch(0.623 0.214 259.815)",
  "--pl-field-focus": "oklch(0.809 0.105 251.813)",
  "--pl-field-ring": "oklch(0.932 0.032 255.585)",
  "--pl-error": "oklch(0.637 0.237 25.331)",
  "--pl-chart": "#2563eb",
  "--pl-success": "#00bb7f",
  "--pl-success-bg": "#d0fae5",
  "--pl-warning": "oklch(0.795 0.184 86.047)",
  "--pl-warning-bg": "oklch(0.973 0.071 103.193)",
  "--pl-danger": "oklch(0.637 0.237 25.331)",
  "--pl-danger-bg": "oklch(0.936 0.032 17.717)",
  "--pl-info": "oklch(0.585 0.233 277.117)",
  "--pl-info-bg": "oklch(0.93 0.034 272.788)",
  "--pl-radius-xs": "2px",
  "--pl-radius-sm": "7.6px",
  "--pl-radius-md": "12px",
  "--pl-radius-lg": "16px",
  "--pl-radius-xl": "24px",
  "--pl-radius-full": "9999px",
};
