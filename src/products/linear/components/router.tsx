"use client";

import { createContext, useContext } from "react";

/** Where the app is. The page is one screen, so navigation is state, not URLs. */
export type Route =
  | { page: "issues" }
  | { page: "repos" }
  /** `path` opens the code view at a folder or file ("apps/web/src/main.tsx") */
  | { page: "repo"; slug: string; tab?: "overview" | "diffs"; path?: string }
  | { page: "reviews"; tab?: "mine" | "created" }
  | { page: "diff"; key: string; tab?: "overview" | "guide" | "diff" }
  | { page: "settings" }
  | { page: "import" }
  /** Linear Agent: a chat that becomes a coding session in `repo` */
  | { page: "agent"; repo?: string }
  /** a coding session you started from Agent: its files on the left, the thread on the right */
  | { page: "session"; id: string };

type App = { route: Route; go: (route: Route) => void; openDrawer: () => void };

export const AppContext = createContext<App>({ route: { page: "issues" }, go: () => {}, openDrawer: () => {} });

export const useApp = () => useContext(AppContext);
