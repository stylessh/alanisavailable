import type { Metadata, Viewport } from "next";
import "@/products/superlogical/styles.css";
import { PhoneApp } from "@/products/superlogical/components/rex-ios/phone-app";
import { rexMono } from "@/products/superlogical/fonts";

// Rex's iPhone prototype on its own, to try on a real phone. Added to the
// Home Screen it runs full screen, under the status bar.

export const metadata: Metadata = {
  title: "Rex for iPhone",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Rex" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0c0c0e",
};

export default function RexPhonePage() {
  return (
    <div className={`superlogical ${rexMono.variable}`}>
      {/* no page scroll or rubber-banding: every gesture belongs to the app */}
      <style>{`html, body { background: #0c0c0e; overflow: hidden; overscroll-behavior: none; }`}</style>
      <PhoneApp />
    </div>
  );
}
