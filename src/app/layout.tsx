import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
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

const DESCRIPTION =
  "Alan Daniel rebuilds and improves his favorite products and apps, and shares the process online.";

export const metadata: Metadata = {
  metadataBase: new URL("https://alanisavailable.com"),
  title: {
    default: "Alan is available",
    template: "%s · Alan is available",
  },
  description: DESCRIPTION,
  applicationName: "Alan is available",
  authors: [{ name: "Alan Daniel", url: "https://x.com/stylessh" }],
  creator: "Alan Daniel",
  keywords: [
    "Alan Daniel",
    "product engineer",
    "design engineer",
    "frontend",
    "portfolio",
    "hire",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Alan is available",
    title: "Alan is available",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@stylessh",
    title: "Alan is available",
    description: DESCRIPTION,
  },
  // A white square in light mode, a dark one in dark mode.
  icons: {
    icon: [
      {
        url: "/icon-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    // Listing icons here replaces the file-based ones, so point at apple-icon.tsx.
    apple: "/apple-icon",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${mono.variable} ${pixel.variable} min-h-dvh overflow-x-hidden font-sans antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
