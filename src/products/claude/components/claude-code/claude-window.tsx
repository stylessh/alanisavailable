"use client";

import { MacWindow, TrafficLights, useMacWindow } from "@/os/macos";
import { CLAUDE_APP } from "./app";
import { Main } from "./main";
import { ComposerSettingsProvider } from "./menus";
import { Sidebar } from "./sidebar";
import { SidebarProvider, useSidebar, WindowControls } from "./sidebar-state";
import { ViewerProvider } from "./viewer";

/**
 * The window's size (pt). The reference was captured at 1332 × 814; this
 * opens smaller so it sits clear of the Dock in a browser window, and is
 * still wide enough for the transcript's full 768pt column. Everything
 * inside is anchored like the app's own layout, so the sidebar, header and
 * composer keep their measured positions. Its corners are circular, r 16.5pt
 * (see .cc-window in styles.css).
 */
export const WINDOW = { w: 1160, h: 720, radius: 16.5 };

/**
 * The window's light inner rim. It is drawn over the content (the sidebar
 * and main pane fill the window edge to edge, so an inset shadow on the
 * window itself would sit under them). Full screen has no edges.
 */
function WindowRim() {
  const win = useMacWindow();
  if (win?.mode === "fullscreen") return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1000] rounded-[inherit] [corner-shape:inherit]"
      style={{ boxShadow: "var(--cc-window-rim)" }}
    />
  );
}

/**
 * With the sidebar hidden, its window controls stay put at the window's
 * top-left, over the session's header, and above the floating sidebar when
 * it slides in, so the panel blends in under the same lights and buttons.
 */
function HiddenSidebarControls() {
  const { shown } = useSidebar();
  if (shown) return null;
  return (
    <div className="cc-dimmable absolute top-0 left-0 z-40 h-12 w-[160px]">
      <WindowControls />
    </div>
  );
}

/** The Claude desktop app's window, on its Code tab: sessions on the left, the open session on the right. */
export function ClaudeWindow() {
  return (
    <MacWindow
      id="claude"
      app={CLAUDE_APP}
      width={WINDOW.w}
      height={WINDOW.h}
      radius={WINDOW.radius}
      className="cc-window select-none"
      style={{
        background: "var(--cc-main)",
        boxShadow: "var(--cc-window-shadow)",
      }}
    >
      <ComposerSettingsProvider>
        <ViewerProvider>
          <SidebarProvider>
            <div className="cc-dimmable flex size-full">
              <Sidebar />
              <Main />
            </div>
            <HiddenSidebarControls />
          </SidebarProvider>
        </ViewerProvider>
      </ComposerSettingsProvider>
      <WindowRim />
      {/* Electron's 14pt lights, 23pt apart, 17pt in; the OS draws them above everything in the window */}
      <TrafficLights left={17} top={17} size={14} pitch={23} />
    </MacWindow>
  );
}
