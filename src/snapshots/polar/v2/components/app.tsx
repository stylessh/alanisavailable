"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MetricsPage } from "./pages/analytics";
import { EventsPage } from "./pages/events";
import { CustomersPage } from "./pages/customers";
import { IncomePage } from "./pages/finance";
import { HomePage } from "./pages/home";
import { CataloguePage } from "./pages/products";
import { OrdersPage } from "./pages/sales";
import { GeneralSettingsPage, ProfileSettingsPage } from "./pages/settings";
import { AppContext, type Route } from "./router";
import { NAV, SETTINGS_NAV, Sidebar, SidebarToggle } from "./sidebar";
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
    case "analytics/events":
      return <EventsPage />;
    case "sales/orders":
      return <OrdersPage />;
    case "finance/income":
      return <IncomePage />;
    case "settings/general":
      return <GeneralSettingsPage />;
    case "settings/profile":
      return <ProfileSettingsPage />;
    default:
      return <Unbuilt title={title(route)} />;
  }
}

/** the pause, after the column reaches the rail's width, before the group fades in */
const SETTLE_MS = 100;

// Whether the sidebar is folded to its rail, remembered across visits
const COMPACT_KEY = "pl-sidebar";
const compactListeners = new Set<() => void>();
const readCompact = () => {
  try {
    return localStorage.getItem(COMPACT_KEY) === "compact";
  } catch {
    return false;
  }
};
const setCompact = (compact: boolean) => {
  try {
    if (compact) localStorage.setItem(COMPACT_KEY, "compact");
    else localStorage.removeItem(COMPACT_KEY);
  } catch {}
  compactListeners.forEach((l) => l());
};
const onCompact = (l: () => void) => {
  compactListeners.add(l);
  return () => compactListeners.delete(l);
};

/**
 * The dashboard's frame, as measured at 1440x900: the gray-100 shell with 8px
 * of padding, the 208px sidebar in a 224px column (a 48px rail in a 56px one
 * when compact, even on both sides), and the page card (or, on Customers, the list and detail
 * cards) filling the rest, with the sidebar's handle on its left edge.
 */
export function App() {
  const [route, setRoute] = useState<Route>({ section: "home" });
  const app = useMemo(() => ({ route, go: setRoute }), [route]);
  const compact = useSyncExternalStore(onCompact, readCompact, () => false);
  // only a toggle animates: a rail remembered from last time is simply there
  const [animate, setAnimate] = useState(false);
  // Folding, staged for the sub-pages only: they fade out (--pl-fast), the
  // column resizes (--pl-base) with the labels fading along with it, then
  // the sub-pages fade in in their other form. Veiled covers the first two, and
  // folding to the rail holds it a beat longer (SETTLE_MS), so the rail's
  // group shows once the column has come to rest rather than as it lands.
  const [veiled, setVeiled] = useState(false);
  const folding = useRef(false);
  const fold = () => {
    if (folding.current) return;
    folding.current = true;
    const root = getComputedStyle(document.querySelector(".polar") ?? document.body);
    // the build may write 120ms as .12s
    const ms = (token: string) => {
      const value = root.getPropertyValue(token).trim();
      return (parseFloat(value) || 0) * (value.endsWith("ms") ? 1 : 1000);
    };
    setAnimate(true);
    setVeiled(true);
    setTimeout(() => {
      setCompact(!compact);
      setTimeout(
        () => {
          setVeiled(false);
          folding.current = false;
        },
        // to the rail: once it's at rest, and a beat more; back out: as the
        // column nears its width (60% of the way through its eased resize, it's
        // ~95% there), so the list follows it in without a pause
        compact ? ms("--pl-base") * 0.6 : ms("--pl-base") + SETTLE_MS,
      );
    }, ms("--pl-fast"));
  };
  return (
    <AppContext value={app}>
      <div className="flex size-full p-2">
        <div
          // compact, the gutter drops to 8px: with the rail's own 8px it makes 16px after the icons, as before them
          className={`hidden shrink-0 md:block ${compact ? "w-14 pr-2" : "w-56 pr-4"} ${
            animate ? "transition-[width,padding] duration-(--pl-base) ease-(--pl-ease)" : ""
          }`}
        >
          <Sidebar compact={compact} veiled={veiled} />
        </div>
        <main className="relative flex min-w-0 flex-1 gap-2">
          <CurrentPage key={`${route.section}/${route.sub ?? ""}`} route={route} />
          <SidebarToggle compact={compact} onToggle={fold} />
        </main>
      </div>
    </AppContext>
  );
}
