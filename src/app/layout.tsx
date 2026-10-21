import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display fonts carry only the characters they render (see
// scripts/subset-fonts.sh): ~1 KB each instead of a full Latin file.
const pixel = localFont({
  src: "../fonts/pixelify-sans-subset.woff2",
  weight: "600",
  variable: "--font-pixelify",
  display: "swap",
});

const mono = localFont({
  src: "../fonts/geist-mono-subset.woff2",
  weight: "400",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://alanisavailable.com"),
  title: {
    default: "Alan is available",
    template: "%s · Alan is available",
  },
  description:
    "Alan Daniel rebuilds and improves his favorite products and apps, and shares the process online.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${mono.variable} ${pixel.variable} min-h-dvh overflow-x-hidden font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
