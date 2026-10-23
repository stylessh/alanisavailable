"use client";

import { useEffect, useState } from "react";
import { AskLinearIcon, HistoryIcon } from "./icons";
import { IssuesView } from "./issues-view";
import { Sidebar } from "./sidebar";

/**
 * The app's frame: the sidebar, the main pane and the "Ask Linear" bar under
 * it. From 800px up the main pane is a card inset 8px from the top and right;
 * below that it fills the width and the sidebar becomes a drawer.
 */
export function App() {
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    // the drawer only exists below 800px; widening the window closes it
    const wide = window.matchMedia("(width >= 800px)");
    const onWide = () => wide.matches && setDrawer(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [drawer]);

  return (
    <>
      <Sidebar open={drawer} />
      <div
        aria-hidden
        onClick={() => setDrawer(false)}
        className={`fixed inset-0 z-20 hidden bg-(--ln-scrim) transition-opacity duration-200 max-[800px]:block ${
          drawer ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <main className="absolute top-2 right-2 bottom-9 left-[244px] overflow-hidden rounded-xl border-[0.5px] border-(--ln-main-border) bg-(--ln-main) shadow-(--ln-main-shadow) max-[800px]:inset-x-0 max-[800px]:top-0 max-[800px]:rounded-none max-[800px]:border-0 max-[800px]:shadow-none">
        <IssuesView onMenu={() => setDrawer(true)} />
      </main>
      <div className="absolute right-2.5 bottom-0 flex h-9 items-center gap-1.5 text-(--ln-text-nav)">
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded-full px-2 text-xs font-[450] hover:bg-(--ln-ghost-hover)"
        >
          <AskLinearIcon size={14} />
          Ask Linear
        </button>
        <button
          type="button"
          aria-label="Recent"
          className="flex size-7 items-center justify-center rounded-full text-(--ln-text-strong) hover:bg-(--ln-ghost-hover)"
        >
          <HistoryIcon size={14} />
        </button>
      </div>
    </>
  );
}
