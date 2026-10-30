import localFont from "next/font/local";

// Polar sets its whole dashboard in PP Neue Montreal (variable, 100–900),
// served from polar.sh/fonts/PPNeueMontreal-VariableUpright.woff2; this is
// that file, byte for byte. It's Pangram Pangram's commercial typeface, not
// open licensed. Polar's own fallback is Inter.
export const neueMontreal = localFont({
  src: "./fonts/PPNeueMontreal-VariableUpright.woff2",
  weight: "100 900",
  variable: "--font-polar-sans",
  display: "swap",
});

// IDs, metadata keys and code chips are set in Geist Mono (Vercel, SIL Open
// Font License), which Polar serves beside it from polar.sh/fonts.
export const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  weight: "100 900",
  variable: "--font-polar-mono",
  display: "swap",
});
