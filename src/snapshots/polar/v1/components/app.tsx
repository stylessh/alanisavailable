"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { MetricsPage } from "./pages/analytics";
import { DesignSystemPage } from "./pages/design-system";
import { CustomersPage } from "./pages/customers";
import { IncomePage } from "./pages/finance";
import { HomePage } from "./pages/home";
import { CataloguePage } from "./pages/products";
import { OrdersPage } from "./pages/sales";
import { GeneralSettingsPage } from "./pages/settings";
import { AppContext, type Route } from "./router";
import { NAV, SETTINGS_NAV, Sidebar } from "./sidebar";
import { EmptyState, Page } from "./ui/page";

/** Pages the replica doesn't draw yet keep their place and title */
function Unbuilt({ title }: { title: string }) {
  return (
    <Page title={title}>
      <EmptyState title={`${title} isn't in the replica yet`}>{"It's next on the list."}</EmptyState>
    </Page>
  );
}

function title(route: Route) {
  if (route.section === "settings")
    return SETTINGS_NAV.flatMap((g) => g.items).find((i) => i.id === route.sub)?.title ?? "Settings";
  const entry = NAV.find((n) => n.section === route.section);
  return entry?.subs?.find((s) => s.id === route.sub)?.title ?? entry?.title ?? "";
}

function CurrentPage({ route }: { route: Route }) {
  const key = `${route.section}/${route.sub ?? ""}`;
  switch (key) {
    case "home/":
      return <HomePage />;
    case "products/catalogue":
      return <CataloguePage />;
    case "customers/":
      return <CustomersPage />;
    case "analytics/metrics":
      return <MetricsPage />;
    case "sales/orders":
      return <OrdersPage />;
    case "finance/income":
      return <IncomePage />;
    case "settings/general":
      return <GeneralSettingsPage />;
    default:
      return <Unbuilt title={title(route)} />;
  }
}

/** The design system lives at #design-system, outside Polar's own navigation */
const DESIGN_SYSTEM = "#design-system";
const onHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

/**
 * The dashboard's frame, as measured at 1440x900: the gray-100 shell with 8px
 * of padding, the 208px sidebar in a 224px column, and the page card (or, on
 * Customers, the list and detail cards) filling the rest.
 */
export function App() {
  const [route, setRoute] = useState<Route>({ section: "home" });
  const hash = useSyncExternalStore(
    onHash,
    () => window.location.hash,
    () => "",
  );
  const app = useMemo(
    () => ({
      route,
      go: (next: Route) => {
        // leaving the design system for a page of the dashboard
        if (window.location.hash) {
          history.pushState(null, "", window.location.pathname + window.location.search);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
        setRoute(next);
      },
    }),
    [route],
  );
  return (
    <AppContext value={app}>
      <div className="flex size-full p-2">
        <div className="hidden w-56 shrink-0 md:block">
          <Sidebar />
        </div>
        <main className="flex min-w-0 flex-1 gap-2">
          {hash === DESIGN_SYSTEM ? (
            <DesignSystemPage />
          ) : (
            <CurrentPage key={`${route.section}/${route.sub ?? ""}`} route={route} />
          )}
        </main>
      </div>
    </AppContext>
  );
}
