import localFont from "next/font/local";

// The Claude app's own fonts, as claude.ai serves them to the desktop app
// (read from the app's HTTP cache): Anthropic Sans for the UI, Anthropic
// Mono for code, and Anthropicons, the variable icon font every glyph in the
// window comes from (Private Use Area code points, see components/claude-code/icon.tsx).
// All three are Anthropic's proprietary fonts, not open licensed.
export const anthropicSans = localFont({
  src: "./fonts/anthropic-sans.woff2",
  weight: "300 800",
  variable: "--font-claude-sans",
  display: "swap",
});

export const anthropicMono = localFont({
  src: "./fonts/anthropic-mono.woff2",
  weight: "300 800",
  variable: "--font-claude-mono",
  display: "swap",
});

export const anthropicons = localFont({
  src: "./fonts/anthropicons.woff2",
  weight: "400 700",
  variable: "--font-claude-icons",
  display: "block",
});
