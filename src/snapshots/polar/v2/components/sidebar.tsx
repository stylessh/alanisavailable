"use client";

import { createContext, useContext, useState } from "react";
import { ORG } from "./data";
import {
  ActivityIcon,
  AnalyticsIcon,
  BanknoteIcon,
  CartIcon,
  ChartLineIcon,
  CoinsIcon,
  GaugeIcon,
  GiftIcon,
  LandmarkIcon,
  LinkIcon,
  PackageIcon,
  PaletteIcon,
  PercentIcon,
  ReceiptIcon,
  SendIcon,
  TagIcon,
  ArrowBackIcon,
  ArrowOutwardIcon,
  BellIcon,
  BillingIcon,
  CodeIcon,
  CustomersIcon,
  DomainsIcon,
  EmbedIcon,
  ExpandMoreIcon,
  FlaskIcon,
  LogOutIcon,
  PlusIcon,
  FieldsIcon,
  FinanceIcon,
  GeneralIcon,
  HomeIcon,
  KeyIcon,
  LockIcon,
  MailIcon,
  MembersIcon,
  PolarLogo,
  PortalIcon,
  PreviewIcon,
  ProductsIcon,
  ProfileIcon,
  SalesIcon,
  SearchIcon,
  SettingsIcon,
  SubscriptionsIcon,
  SupportIcon,
  WalletIcon,
  WebhooksIcon,
} from "./icons";
import { useApp, type Section } from "./router";
import { Avatar } from "./ui/avatar";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./ui/menu";
import { Tooltip } from "./ui/overlay";

type NavEntry = {
  section: Section;
  title: string;
  Icon: React.ComponentType<{ size?: number }>;
  subs?: { id: string; title: string; Icon: React.ComponentType<{ size?: number }> }[];
};

// Polar's dashboard routes (components/Dashboard/navigation.tsx), in order
export const NAV: NavEntry[] = [
  { section: "home", title: "Home", Icon: HomeIcon },
  {
    section: "products",
    title: "Products",
    Icon: ProductsIcon,
    subs: [
      { id: "catalogue", title: "Catalogue", Icon: PackageIcon },
      { id: "checkout-links", title: "Checkout Links", Icon: LinkIcon },
      { id: "discounts", title: "Discounts", Icon: TagIcon },
      { id: "benefits", title: "Benefits", Icon: GiftIcon },
      { id: "meters", title: "Meters", Icon: GaugeIcon },
    ],
  },
  { section: "customers", title: "Customers", Icon: CustomersIcon },
  {
    section: "analytics",
    title: "Analytics",
    Icon: AnalyticsIcon,
    subs: [
      { id: "metrics", title: "Metrics", Icon: ChartLineIcon },
      { id: "events", title: "Events", Icon: ActivityIcon },
      { id: "costs", title: "Costs", Icon: CoinsIcon },
    ],
  },
  {
    section: "sales",
    title: "Sales",
    Icon: SalesIcon,
    subs: [
      { id: "orders", title: "Orders", Icon: ReceiptIcon },
      { id: "subscriptions", title: "Subscriptions", Icon: SubscriptionsIcon },
      { id: "checkouts", title: "Checkouts", Icon: CartIcon },
    ],
  },
  {
    section: "finance",
    title: "Finance",
    Icon: FinanceIcon,
    subs: [
      { id: "income", title: "Income", Icon: BanknoteIcon },
      { id: "payouts", title: "Payouts", Icon: SendIcon },
      { id: "taxes", title: "Taxes", Icon: PercentIcon },
      { id: "account", title: "Account", Icon: LandmarkIcon },
    ],
  },
  { section: "settings", title: "Settings", Icon: SettingsIcon },
];

// The settings menu that replaces the navigation inside Settings
export const SETTINGS_NAV: {
  title?: string;
  items: {
    id: string;
    title: string;
    Icon: React.ComponentType<{ size?: number }>;
  }[];
}[] = [
  {
    items: [
      { id: "general", title: "General", Icon: GeneralIcon },
      { id: "members", title: "Members", Icon: MembersIcon },
      { id: "notifications", title: "Notifications", Icon: BellIcon },
      { id: "billing", title: "Billing", Icon: BillingIcon },
      { id: "domains", title: "Domains", Icon: DomainsIcon },
      { id: "preview", title: "Preview Features", Icon: PreviewIcon },
    ],
  },
  {
    title: "Payments",
    items: [
      { id: "payments", title: "Payments", Icon: WalletIcon },
      { id: "subscriptions", title: "Subscriptions", Icon: SubscriptionsIcon },
      { id: "portal", title: "Customer Portal", Icon: PortalIcon },
      {
        id: "customer-notifications",
        title: "Customer Notifications",
        Icon: MailIcon,
      },
      { id: "custom-fields", title: "Custom Fields", Icon: FieldsIcon },
    ],
  },
  {
    title: "Developers",
    items: [
      { id: "tokens", title: "Access Tokens", Icon: KeyIcon },
      { id: "webhooks", title: "Webhooks", Icon: WebhooksIcon },
      { id: "embedding", title: "Embedding", Icon: EmbedIcon },
    ],
  },
  {
    title: "Account",
    items: [
      { id: "profile", title: "Profile", Icon: ProfileIcon },
      { id: "security", title: "Security", Icon: LockIcon },
      { id: "oauth", title: "OAuth Apps", Icon: CodeIcon },
    ],
  },
];

export const firstSub = (section: Section) => NAV.find((n) => n.section === section)?.subs?.[0].id;

/**
 * How folded the sidebar is: compact (the rail's layout and width) and
 * veiled (mid-fold, the sub-pages faded out while the width changes).
 * Labels follow compact alone, so they fade with the width as it changes;
 * only the sub-pages wait out the resize.
 */
const Fold = createContext({ compact: false, veiled: false });
const useFolded = () => useContext(Fold).compact;

/**
 * One row of the navigation: 32px, a 15px glyph 9px in, the label 16px past
 * it. The current page is lifted onto a white chip with shadow-sm, the same
 * raised chip as a segmented control's thumb; the rest are gray-500. 9px
 * sides stand in for the 1px border it used to have, so nothing moved.
 */
function NavItem({
  active,
  Icon,
  title,
  onClick,
}: {
  active: boolean;
  Icon: React.ComponentType<{ size?: number }>;
  title: string;
  onClick: () => void;
}) {
  const { compact } = useContext(Fold);
  const folded = useFolded();
  return (
    <Tooltip content={title} side="right" disabled={!compact} className="flex">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`flex h-8 w-full cursor-pointer items-center gap-4 overflow-hidden rounded-(--pl-radius-sm) py-2 text-left text-sm leading-5 font-medium transition-colors ${
          active ? "bg-(--pl-surface) text-(--pl-text) shadow-(--pl-shadow-sm)" : "text-(--pl-text-muted) hover:text-(--pl-text)"
        } ${compact ? "px-[8.5px]" : "px-[9px]"}`}
      >
        <span className={`flex size-[15px] shrink-0 items-center justify-center ${active ? "text-(--pl-text)" : ""}`}>
          <Icon size={15} />
        </span>
        {/* no ellipsis: like Polar, a long label ("Customer Notifications") runs into the padding */}
        <span className={`whitespace-nowrap pl-fold ${folded ? "pl-folded" : ""}`}>{title}</span>
      </button>
    </Tooltip>
  );
}

function Header() {
  const folded = useFolded();
  return (
    <div className="flex items-center justify-between gap-2 px-2 pt-3.5 pb-2">
      <a
        href="https://polar.sh"
        target="_blank"
        rel="noreferrer"
        aria-label="Polar"
        className="ml-1 flex size-6 text-(--pl-text)"
      >
        <PolarLogo />
      </a>
      <div inert={folded} className={`flex items-center gap-2 text-(--pl-text) pl-fold ${folded ? "pl-folded" : ""}`}>
        <button
          type="button"
          aria-label="Notifications"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-(--pl-border)"
        >
          <BellIcon />
        </button>
        <button
          type="button"
          aria-label="Search"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-(--pl-border)"
        >
          <SearchIcon />
        </button>
      </div>
    </div>
  );
}

// the other organizations this person belongs to (made up, as Acme is)
const ORGS = [ORG.name, "Globex", "Initech"];

/** The organization at the foot of the sidebar; it opens a menu upward to switch, add one, or sign out */
function OrgSwitcher() {
  const { compact } = useContext(Fold);
  const folded = useFolded();
  const [current, setCurrent] = useState(ORG.name);
  return (
    <Menu
      side="top"
      className="w-[208px]"
      trigger={(t) => (
        <button
          {...t}
          type="button"
          aria-label={compact ? current : undefined}
          className={`flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-(--pl-radius-sm) py-2 transition-[padding] duration-(--pl-base) ease-(--pl-ease) hover:bg-(--pl-border) aria-expanded:bg-(--pl-border) ${
            compact ? "px-1" : "px-2"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={current} size={24} />
            <span className="truncate text-sm leading-5 text-(--pl-text)">{current}</span>
          </span>
          <ExpandMoreIcon size={20} className={`shrink-0 text-(--pl-text) pl-fold ${folded ? "pl-folded" : ""}`} />
        </button>
      )}
    >
      <MenuLabel>Organizations</MenuLabel>
      {ORGS.map((name) => (
        <MenuItem key={name} icon={<Avatar name={name} size={16} />} checked={name === current} onSelect={() => setCurrent(name)}>
          {name}
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem icon={<PlusIcon />}>New Organization</MenuItem>
      <MenuItem icon={<FlaskIcon />}>Go to Sandbox</MenuItem>
      <MenuSeparator />
      <MenuItem icon={<LogOutIcon />}>Log out</MenuItem>
    </Menu>
  );
}

/**
 * A section's sub-pages under its row. Expanded: the indented list, each
 * page's glyph beside its name. Compact: icon only, 28px rows 4px apart
 * and 8px under the section's row,
 * the current one marked by color alone, each named in a tooltip, all on a
 * track (gray-50, 4px in, corners the row's 8px plus that) drawn as a layer
 * behind the section's row and its pages, so the row is never moved or
 * remounted to sit in it; inside it the row's chip takes the raised shade,
 * as a segmented thumb does.
 *
 * Both take the same height (32px a page), so the rows below never move as
 * one gives way to the other; the swap happens while both are faded out.
 * The group then opens rather than fading: its track grows down out of the
 * section's chip and its pages drop in one after another (pl-track,
 * pl-rise in styles.css); the list's pages drop in the same way.
 */
function SubPages({
  title,
  subs,
  current,
  onPick,
}: {
  title: string;
  subs: NonNullable<NavEntry["subs"]>;
  current?: string;
  onPick: (sub: string) => void;
}) {
  const { compact, veiled } = useContext(Fold);
  if (!compact)
    return (
      // 8px under the last sub-page before the next section (Customers at y=314, as in Polar)
      <ul
        className={`pl-fold mb-2 ml-[15px] flex w-[164px] flex-col gap-2 border-l border-(--pl-rule) px-2.5 py-0.5 ${
          veiled ? "pl-folded" : ""
        }`}
      >
        {/* the rule fades with the list; the pages drop in one after another, as on the rail */}
        {subs.map((s, i) => (
          <li
            key={s.id}
            className={`pl-rise flex h-6 items-center ${veiled ? "pl-closed" : ""}`}
            style={{ "--pl-i": i, "--pl-rise-lead": "0ms" } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => onPick(s.id)}
              aria-current={current === s.id ? "page" : undefined}
              className={`flex cursor-pointer items-center gap-2 pl-2 text-sm leading-5 font-medium whitespace-nowrap transition-colors ${
                current === s.id ? "text-(--pl-text)" : "text-(--pl-text-muted) hover:text-(--pl-text)"
              }`}
            >
              <s.Icon size={14} />
              {s.title}
            </button>
          </li>
        ))}
      </ul>
    );
  return (
    <>
      {/* the track: 4px past the section's row on the sides and top, down to 8px under its last page */}
      <div
        aria-hidden
        className={`pl-track absolute -inset-x-1 -top-1 bottom-0 -z-10 rounded-(--pl-radius-md) bg-(--pl-subtle) ${
          veiled ? "pl-closed" : ""
        }`}
      />
      {/* 8px under the row (the li's gap), and 8px of track under the last, so it ends where the list would */}
      <div role="group" aria-label={title} className="mb-2 flex flex-col gap-1">
        {subs.map((s, i) => {
          const on = s.id === current;
          return (
            <Tooltip key={s.id} content={s.title} side="right" className="flex">
              <button
                type="button"
                aria-label={s.title}
                aria-current={on ? "page" : undefined}
                onClick={() => onPick(s.id)}
                className={`flex h-7 w-full cursor-pointer items-center justify-center rounded-(--pl-radius-sm) transition-colors ${
                  on ? "text-(--pl-text)" : "text-(--pl-text-faint) hover:text-(--pl-text)"
                }`}
              >
                <span className={`pl-rise flex ${veiled ? "pl-closed" : ""}`} style={{ "--pl-i": i } as React.CSSProperties}>
                  <s.Icon size={14} />
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </>
  );
}

function MainNav() {
  const { route, go } = useApp();
  const { compact, veiled } = useContext(Fold);
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = route.section === n.section;
        const grouped = active && n.subs && compact;
        return (
          <li
            key={n.section}
            // the track is drawn behind the row (isolate keeps it above the shell); while it shows, the chip is raised
            className={`flex flex-col gap-2 ${grouped ? "relative isolate" : ""} ${
              grouped && !veiled ? "[--pl-surface:var(--pl-raised)]" : ""
            }`}
          >
            <NavItem
              active={active}
              Icon={n.Icon}
              title={n.title}
              onClick={() =>
                go({
                  section: n.section,
                  sub: n.section === "settings" ? "general" : firstSub(n.section),
                })
              }
            />
            {active && n.subs && (
              <SubPages title={n.title} subs={n.subs} current={route.sub} onPick={(sub) => go({ section: n.section, sub })} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SettingsNav() {
  const { route, go } = useApp();
  const folded = useFolded();
  return (
    <div className="flex flex-col gap-6">
      {SETTINGS_NAV.map((group, i) => (
        <div key={i} className="flex flex-col gap-2">
          {group.title && (
            <span
              aria-hidden={folded}
              className={`px-2 text-xs leading-4 font-medium whitespace-nowrap text-(--pl-text-faint) pl-fold ${folded ? "pl-folded" : ""}`}
            >
              {group.title}
            </span>
          )}
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <li key={item.id}>
                <NavItem
                  active={route.sub === item.id}
                  Icon={item.Icon}
                  title={item.title}
                  onClick={() => go({ section: "settings", sub: item.id })}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * The shell's left column, 208px wide: the logo with notifications and
 * search, the navigation, and Support, Documentation and the organization at
 * the bottom. Inside Settings the navigation becomes the settings menu, under
 * a way back.
 *
 * Compact, it's a 48px rail of the same rows: each keeps its glyph where it
 * was and its label goes (named in a tooltip instead), so nothing jumps as
 * it narrows. Notifications and search go; the current section's sub-pages
 * gather into a group on the rail; the organization keeps its avatar.
 *
 * Folding: the labels (and the bell and search) fade with the width as it
 * changes. The sub-pages alone are staged (the app sequences them): they
 * fade out in place, the column resizes with the section's chip, then their
 * other form fades in where the first was, at the same height.
 */
export function Sidebar({ compact = false, veiled = false }: { compact?: boolean; veiled?: boolean }) {
  // labels go with the width; only the sub-pages are veiled
  const folded = compact;
  const { route, go } = useApp();
  const settings = route.section === "settings";
  return (
    <Fold value={{ compact, veiled }}>
      {/* as wide as its column allows (208px, or 48px compact), so only the column animates */}
      <aside className="flex h-full w-full flex-col overflow-hidden">
        <Header />
        {settings && (
          <div className="px-2 pt-2">
            <Tooltip content="Back" side="right" disabled={!compact} className="flex">
              <button
                type="button"
                aria-label={compact ? "Back" : undefined}
                onClick={() => go({ section: "home" })}
                className="flex h-8 w-full cursor-pointer items-center gap-4 rounded-(--pl-radius-sm) p-2 text-sm leading-5 whitespace-nowrap text-(--pl-text) hover:bg-(--pl-border)"
              >
                <ArrowBackIcon size={15} className="shrink-0" />
                <span className={`pl-fold ${folded ? "pl-folded" : ""}`}>Settings</span>
              </button>
            </Tooltip>
          </div>
        )}
        <nav aria-label="Dashboard" className="pl-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-2">
          {settings ? <SettingsNav /> : <MainNav />}
        </nav>
        <div className="flex flex-col gap-2 p-2">
          {!settings && (
            <>
              {/* not Polar's: the way into this replica's design-system playground */}
              <Tooltip content="Design system" side="right" disabled={!compact} className="flex">
                <a
                  href="#design-system"
                  className="flex h-[22px] w-full items-center gap-4 rounded-(--pl-radius-sm) border border-transparent px-2 text-sm leading-5 font-medium whitespace-nowrap text-(--pl-text-muted) hover:text-(--pl-text)"
                >
                  <PaletteIcon size={14} className="shrink-0" />
                  <span className={`pl-fold ${folded ? "pl-folded" : ""}`}>Design system</span>
                </a>
              </Tooltip>
              <Tooltip content="Support" side="right" disabled={!compact} className="flex">
                <button
                  type="button"
                  className="flex h-[22px] w-full cursor-pointer items-center gap-4 rounded-(--pl-radius-sm) border border-transparent px-2 text-sm leading-5 font-medium whitespace-nowrap text-(--pl-text-muted) hover:text-(--pl-text)"
                >
                  <SupportIcon size={14} className="shrink-0" />
                  <span className={`pl-fold ${folded ? "pl-folded" : ""}`}>Support</span>
                </button>
              </Tooltip>
              <Tooltip content="Documentation" side="right" disabled={!compact} className="flex">
                <a
                  href="https://polar.sh/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-[22px] w-full items-center gap-4 rounded-(--pl-radius-sm) border border-transparent px-2 text-sm leading-5 font-medium whitespace-nowrap text-(--pl-text-muted) hover:text-(--pl-text)"
                >
                  <ArrowOutwardIcon size={14} className="shrink-0" />
                  <span className={`pl-fold ${folded ? "pl-folded" : ""}`}>Documentation</span>
                </a>
              </Tooltip>
            </>
          )}
          {/* 16px above it, as under the header row: the links' 8px gap and 8px more */}
          <div className={settings ? undefined : "mt-2"}>
            <OrgSwitcher />
          </div>
        </div>
      </aside>
    </Fold>
  );
}

/**
 * The handle that folds the sidebar to its rail and back: a short vertical
 * bar on the content card's left edge, held at the middle of its height. It
 * sits 8px inside the card, in the gutter no content uses, at rule strength,
 * and grows and darkens under the pointer. Its target is far bigger than the
 * bar, 32px by 80px around it, reaching 8px out over the shell's gap beside
 * the card (never as far as the sidebar's own rows).
 */
export function SidebarToggle({ compact, onToggle }: { compact: boolean; onToggle: () => void }) {
  const label = compact ? "Expand sidebar" : "Collapse sidebar";
  return (
    <div className="absolute top-1/2 -left-2 z-10 hidden -translate-y-1/2 md:flex">
      <Tooltip content={label} side="right">
        <button
          type="button"
          aria-label={label}
          aria-expanded={!compact}
          onClick={onToggle}
          // the outline goes on the bar, the thing you see, not this larger target
          className="group flex h-20 w-8 cursor-pointer items-center justify-center outline-none"
        >
          <span className="h-4 w-[3px] rounded-full bg-(--pl-rule) transition-[height,background-color] duration-(--pl-fast) ease-(--pl-ease) group-hover:h-6 group-hover:bg-(--pl-text-muted) group-focus-visible:h-6 group-focus-visible:bg-(--pl-text-muted) group-focus-visible:outline-2 group-focus-visible:outline-offset-2" />
        </button>
      </Tooltip>
    </div>
  );
}
