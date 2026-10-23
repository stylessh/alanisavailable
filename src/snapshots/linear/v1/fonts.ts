import localFont from "next/font/local";

// Linear sets its UI in Inter Variable 4.1, served from static.linear.app.
// This is the same file (byte for byte) from the official Inter release
// (rsms.me/inter), which is licensed under the SIL Open Font License.
export const interVariable = localFont({
  src: "./fonts/InterVariable.woff2",
  weight: "100 900",
  variable: "--font-linear-sans",
  display: "swap",
});
