"use client";

import { createContext, useContext } from "react";

/** Where the dashboard is: a section of the sidebar and, for sections with sub-pages, which one. */
export type Section = "home" | "products" | "customers" | "analytics" | "sales" | "finance" | "settings";

export type Route = { section: Section; sub?: string };

type App = { route: Route; go: (route: Route) => void };

export const AppContext = createContext<App>({
  route: { section: "home" },
  go: () => {},
});

export const useApp = () => useContext(AppContext);
