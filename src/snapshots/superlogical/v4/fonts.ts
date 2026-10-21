import localFont from "next/font/local";

// Rex's terminal font. Rendering every pane with JetBrains Mono and with SF
// Mono and diffing both against the reference, JetBrains Mono matched better
// in all three panes (agent 6.19 vs 6.73, lazygit 7.52 vs 9.06, snake 2.99 vs
// 3.26 mean diff), so it's most likely the font in the screenshot. OFL.
// Subset to ASCII plus the box-drawing and board symbols the panes use
// (scripts/subset-fonts.sh), so the character grid never falls back.
export const rexMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-400.woff2", weight: "400" },
    { path: "./fonts/jetbrains-mono-700.woff2", weight: "700" },
  ],
  variable: "--font-rex-mono",
  display: "swap",
});
