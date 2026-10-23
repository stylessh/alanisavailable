"use client";

import { useEffect, useMemo, useState } from "react";
import { Crumb } from "./chrome";
import { TEAM } from "./data";
import { DiffView } from "./diff-view";
import { AskLinearIcon, AsiaIcon, HistoryIcon } from "./icons";
import { IssuesView } from "./issues-view";
import { RepoView } from "./repo-view";
import { ReposView } from "./repos-view";
import { ReviewsView } from "./reviews-view";
import { AppContext, type Route } from "./router";
import { Sidebar } from "./sidebar";

/** The team, as the first crumb of its own pages. */
function TeamCrumb({ go }: { go: (r: Route) => void }) {
  return (
    <Crumb onClick={() => go({ page: "issues" })}>
      <AsiaIcon size={14} style={{ color: TEAM.color }} />
      {TEAM.name}
    </Crumb>
  );
}

// Team tab: code pages live under the team, so they open with its crumb.
function Page({ route, go }: { route: Route; go: (r: Route) => void }) {
  switch (route.page) {
    case "repos":
      return <ReposView title="Code" crumb={<TeamCrumb go={go} />} />;
    case "repo":
      return <RepoView slug={route.slug} rootCrumb={{ label: "Code", onClick: () => go({ page: "repos" }) }} />;
    case "reviews":
      return <ReviewsView title="Diffs" crumb={<TeamCrumb go={go} />} team />;
    case "diff":
      return <DiffView diffKey={route.key} />;
    default:
      return <IssuesView />;
  }
}

/**
 * The app's frame: the sidebar, the main pane and the "Ask Linear" bar under
 * it. From 800px up the main pane is a card inset 8px from the top and right;
 * below that it fills the width and the sidebar becomes a drawer.
 */
export function App() {
  const [drawer, setDrawer] = useState(false);
  // opens on the team's Diffs, where this version puts code, so the versions canvas shows each idea at a glance
  const [route, setRoute] = useState<Route>({ page: "reviews", tab: "open" });
  const app = useMemo(
    () => ({
      route,
      go: (r: Route) => {
        setRoute(r);
        setDrawer(false);
      },
      openDrawer: () => setDrawer(true),
    }),
    [route],
  );

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
    <AppContext value={app}>
      <Sidebar open={drawer} />
      <div
        aria-hidden
        onClick={() => setDrawer(false)}
        className={`fixed inset-0 z-20 hidden bg-(--ln-scrim) transition-opacity duration-200 max-[800px]:block ${
          drawer ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <main className="absolute top-2 right-2 bottom-9 left-[244px] overflow-hidden rounded-xl border-[0.5px] border-(--ln-main-border) bg-(--ln-main) shadow-(--ln-main-shadow) max-[800px]:inset-x-0 max-[800px]:top-0 max-[800px]:rounded-none max-[800px]:border-0 max-[800px]:shadow-none">
        <Page route={route} go={app.go} />
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
    </AppContext>
  );
}
