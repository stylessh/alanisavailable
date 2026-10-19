"use client";

import { useLayoutEffect, useRef, useState } from "react";

const MENU_BAR = 33;
const DOCK = 94; // dock height plus its gap to the screen edge
const MARGIN = 16;

/**
 * Centers a fixed-size window on the desktop between the menu bar and the
 * Dock, scaling it down (never up) when the viewport is too small, so its
 * measured proportions are preserved.
 */
export function FitWindow({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => {
      const w = (window.innerWidth - MARGIN * 2) / width;
      const h = (window.innerHeight - MENU_BAR - DOCK - MARGIN * 2) / height;
      setScale(Math.min(1, w, h));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [width, height]);

  return (
    <div
      ref={ref}
      className="rex-holder absolute left-1/2 -translate-x-1/2"
      style={{
        top: `calc(${MENU_BAR}px + (100dvh - ${MENU_BAR + DOCK}px - ${height * scale}px) / 2)`,
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: "top center",
      }}
    >
      {children}
    </div>
  );
}
