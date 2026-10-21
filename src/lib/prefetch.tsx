import { preload } from "react-dom";
import { WALLPAPER } from "@/os/macos/data";

// Warming the browser's cache for what a page is about to show, so moving to
// a product or between its versions never flashes an empty screen first.

/**
 * The macOS wallpaper, the first thing every desktop product paints. "low"
 * fetches it while the browser is otherwise idle; "high" is for a page that
 * shows it right away.
 */
export function preloadWallpaper(fetchPriority: "high" | "low") {
  preload(WALLPAPER.src, { as: "image", imageSrcSet: WALLPAPER.srcSet, imageSizes: "100vw", fetchPriority });
}

/** Pages a frame or the next click will load, fetched at idle priority into the HTTP cache. */
export function PrefetchPages({ hrefs }: { hrefs: string[] }) {
  return hrefs.map((href) => <link key={href} rel="prefetch" as="document" href={href} />);
}
