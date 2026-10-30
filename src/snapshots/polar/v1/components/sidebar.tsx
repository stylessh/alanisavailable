"use client";

import { ORG } from "./data";
import {
  AnalyticsIcon,
  ArrowBackIcon,
  ArrowOutwardIcon,
  BellIcon,
  BillingIcon,
  CodeIcon,
  CustomersIcon,
  DomainsIcon,
  EmbedIcon,
  ExpandMoreIcon,
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

type NavEntry = {
  section: Section;
  title: string;
  Icon: React.ComponentType<{ size?: number }>;
  subs?: { id: string; title: string }[];
};

// Polar's dashboard routes (components/Dashboard/navigation.tsx), in order
export const NAV: NavEntry[] = [
  { section: "home", title: "Home", Icon: HomeIcon },
  {
    section: "products",
    title: "Products",
    Icon: ProductsIcon,
    subs: [
      { id: "catalogue", title: "Catalogue" },
      { id: "checkout-links", title: "Checkout Links" },
      { id: "discounts", title: "Discounts" },
      { id: "benefits", title: "Benefits" },
      { id: "meters", title: "Meters" },
    ],
  },
  { section: "customers", title: "Customers", Icon: CustomersIcon },
  {
    section: "analytics",
    title: "Analytics",
    Icon: AnalyticsIcon,
    subs: [
      { id: "metrics", title: "Metrics" },
      { id: "events", title: "Events" },
      { id: "costs", title: "Costs" },
    ],
  },
  {
    section: "sales",
    title: "Sales",
    Icon: SalesIcon,
    subs: [
      { id: "orders", title: "Orders" },
      { id: "subscriptions", title: "Subscriptions" },
      { id: "checkouts", title: "Checkouts" },
    ],
  },
  {
    section: "finance",
    title: "Finance",
    Icon: FinanceIcon,
    subs: [
      { id: "income", title: "Income" },
      { id: "payouts", title: "Payouts" },
      { id: "taxes", title: "Taxes" },
      { id: "account", title: "Account" },
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
 * One row of the navigation: 32px, a 15px glyph 9px in, the label 16px past
 * it. The current page is lifted onto a white chip with a gray-200 border
 * and shadow-xs; the rest are gray-500.
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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex h-8 w-full cursor-pointer items-center gap-4 overflow-hidden rounded-[7.6px] border p-2 text-left text-sm leading-5 font-medium transition-colors ${
        active
          ? "border-(--pl-border) bg-(--pl-surface) text-(--pl-text) shadow-(--pl-shadow-xs)"
          : "border-transparent text-(--pl-text-muted) hover:text-(--pl-text)"
      }`}
    >
      <span className={`flex size-[15px] shrink-0 items-center justify-center ${active ? "text-(--pl-text-strong)" : ""}`}>
        <Icon size={15} />
      </span>
      {/* no ellipsis: like Polar, a long label ("Customer Notifications") runs into the padding */}
      <span className="whitespace-nowrap">{title}</span>
    </button>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between gap-2 px-2 pt-3.5 pb-2">
      <a
        href="https://polar.sh"
        target="_blank"
        rel="noreferrer"
        aria-label="Polar"
        className="ml-1 flex size-6 text-(--pl-text-strong)"
      >
        <PolarLogo />
      </a>
      <div className="flex items-center gap-2 text-(--pl-text-strong)">
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

function OrgSwitcher() {
  return (
    <button
      type="button"
      className="flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-[7.6px] p-2 hover:bg-(--pl-border)"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Avatar name={ORG.name} size={24} />
        <span className="truncate text-sm leading-5 text-(--pl-text)">{ORG.name}</span>
      </span>
      <ExpandMoreIcon size={20} className="shrink-0 text-(--pl-text)" />
    </button>
  );
}

function MainNav() {
  const { route, go } = useApp();
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = route.section === n.section;
        return (
          <li key={n.section} className="flex flex-col gap-2">
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
              // 8px under the last sub-page before the next section (Customers at y=314, as in Polar)
              <ul className="mb-2 ml-[15px] flex w-[164px] flex-col gap-2 border-l border-(--pl-rule) px-2.5 py-0.5">
                {n.subs.map((s) => (
                  <li key={s.id} className="flex h-6 items-center">
                    <button
                      type="button"
                      onClick={() => go({ section: n.section, sub: s.id })}
                      aria-current={route.sub === s.id ? "page" : undefined}
                      className={`cursor-pointer pl-4 text-sm leading-5 font-medium transition-colors ${
                        route.sub === s.id ? "text-(--pl-text-strong)" : "text-(--pl-text-muted) hover:text-(--pl-text-strong)"
                      }`}
                    >
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SettingsNav() {
  const { route, go } = useApp();
  return (
    <div className="flex flex-col gap-6">
      {SETTINGS_NAV.map((group, i) => (
        <div key={i} className="flex flex-col gap-2">
          {group.title && <span className="px-2 text-xs leading-4 font-medium text-(--pl-text-faint)">{group.title}</span>}
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
 */
export function Sidebar() {
  const { route, go } = useApp();
  const settings = route.section === "settings";
  return (
    <aside className="flex h-full w-52 shrink-0 flex-col">
      <Header />
      {settings && (
        <div className="px-2 pt-2">
          <button
            type="button"
            onClick={() => go({ section: "home" })}
            className="flex h-8 w-full cursor-pointer items-center gap-4 rounded-[7.6px] p-2 text-sm leading-5 text-(--pl-text-strong) hover:bg-(--pl-border)"
          >
            <ArrowBackIcon size={15} />
            Settings
          </button>
        </div>
      )}
      <nav aria-label="Dashboard" className="pl-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-2">
        {settings ? <SettingsNav /> : <MainNav />}
      </nav>
      <div className="flex flex-col gap-2 p-2">
        {!settings && (
          <>
            <button
              type="button"
              className="flex h-[22px] cursor-pointer items-center gap-4 rounded-[9.6px] border border-transparent px-2 text-sm leading-5 font-medium text-(--pl-text-muted) hover:text-(--pl-text)"
            >
              <SupportIcon size={14} />
              Support
            </button>
            <a
              href="https://polar.sh/docs"
              target="_blank"
              rel="noreferrer"
              className="flex h-[22px] items-center gap-4 rounded-[9.6px] border border-transparent px-2 text-sm leading-5 font-medium text-(--pl-text-muted) hover:text-(--pl-text)"
            >
              <ArrowOutwardIcon size={14} />
              Documentation
            </a>
            <div role="none" className="h-px bg-(--pl-border)" />
          </>
        )}
        <OrgSwitcher />
      </div>
    </aside>
  );
}
