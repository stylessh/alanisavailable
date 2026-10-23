"use client";

import { createContext, useContext } from "react";

/** Where the app is. The page is one screen, so navigation is state, not URLs. */
export type Route =
  | { page: "issues" }
  | { page: "repos" }
  | { page: "repo"; slug: string; tab?: "overview" | "diffs" }
  | { page: "reviews"; tab?: "mine" | "created" | "open" | "all" }
  | { page: "diff"; key: string; tab?: "overview" | "diff" };

type App = { route: Route; go: (route: Route) => void; openDrawer: () => void };

export const AppContext = createContext<App>({ route: { page: "issues" }, go: () => {}, openDrawer: () => {} });

export const useApp = () => useContext(AppContext);
