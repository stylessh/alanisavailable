// What the window shows: the sidebar's sessions and the open session's
// transcript. It reproduces the reference capture (the Code tab while it
// was scaffolding this very replica), so the build can be diffed against it.

export type Session = {
  id: string;
  title: string;
  /** the session is working (a gray dot) or waiting on you (amber) or done (blue) */
  dot?: "working" | "waiting" | "done";
  /** what it's waiting on you for, or what it finished, in a line */
  note?: string;
  /** worktree branches spun off it */
  branches?: number;
  /** sessions it started, drawn indented under it */
  children?: Session[];
};

export type Group = { id: string; label: string; sessions: Session[] };

export const PINNED: { id: string; title: string; icon: "eye" | "projects" }[] = [
  { id: "design-review", title: "Design review notes", icon: "eye" },
  { id: "launch-checklist", title: "Launch checklist", icon: "projects" },
];

export const GROUPS: Group[] = [
  {
    id: "alanisavailable",
    label: "alanisavailable · ~/Dev",
    sessions: [
      {
        id: "claude-code-desktop",
        title: "Claude Code desktop app scaffolding",
        dot: "working",
      },
      { id: "homepage-hero", title: "Homepage hero and case study layout" },
      { id: "dark-mode", title: "Dark mode contrast pass" },
      {
        id: "contact-form",
        title: "Contact form and email delivery",
        dot: "waiting",
        note: "Wants to know which address replies should come from",
      },
      { id: "og-images", title: "OG images for every product page" },
    ],
  },
  {
    id: "storefront",
    label: "storefront · ~/Projects",
    sessions: [
      {
        id: "checkout",
        title: "Checkout flow and cart persistence",
        branches: 4,
        dot: "working",
        children: [
          {
            id: "saved-payments",
            title: "Add saved payment methods",
            branches: 2,
            dot: "waiting",
            note: "Asking before it runs the payments migration on staging",
          },
          {
            id: "coupon-rounding",
            title: "Fix the coupon rounding bug",
            branches: 0,
            dot: "done",
            note: "Discounts now round to the cent, with tests for 12 cases",
          },
          {
            id: "lazy-images",
            title: "Lazy-load product images",
            branches: 0,
            dot: "done",
            note: "Images below the fold load on scroll; LCP down 0.8s",
          },
          {
            id: "order-emails",
            title: "Order confirmation emails",
            branches: 0,
            dot: "done",
            note: "Templates written and checked in three mail clients",
          },
        ],
      },
      { id: "inventory-sync", title: "Inventory sync with the warehouse API" },
    ],
  },
  {
    id: "field-notes",
    label: "field-notes · ~/Projects",
    sessions: [
      { id: "offline-sync", title: "Offline sync with conflict resolution" },
      { id: "markdown-shortcuts", title: "Markdown shortcuts in the editor" },
      { id: "share-links", title: "Share links that expire" },
    ],
  },
];

export const ACTIVE_SESSION = "claude-code-desktop";

/** Every session, its subsessions with it, alongside the project it's in. */
export const EVERY_SESSION = GROUPS.flatMap((g) => {
  const project = g.label.split(" · ")[0];
  const walk = (s: Session): { session: Session; project: string }[] => [{ session: s, project }, ...(s.children ?? []).flatMap(walk)];
  return g.sessions.flatMap(walk);
});

export const COMPOSER = {
  placeholder: "⏎ to send, ⌘⏎ to queue for later",
  mode: "Bypass permissions",
  model: "Opus 5.5",
  effort: "High",
  /** share of the context window used (the reference's arc spans about 40°) */
  contextUsed: 0.09,
};

/** What the session details panel shows for the open session. */
export const SESSION_DETAILS = {
  folder: "alanisavailable",
  parent: "~/Dev",
  branch: "claude-code-desktop",
  context: 0.33,
  connectorsToReconnect: 2,
  outputs: ["4-transcript-bottom-composer.png", "3-transcript-top.png", "2-sidebar.png", "1-full-window.png", "6-walkthrough.mp4"],
  added: 972,
  removed: 7,
};

/** The slash commands the composer lists after "/", in the app's order. */
export const SLASH_COMMANDS = [
  "schedule",
  "btw",
  "ultrareview",
  "rewind",
  "fork",
  "subtask",
  "mcp",
  "plugin",
  "feedback",
  "model",
  "effort",
  "fast",
  "plan",
  "permissions",
  "skills",
  "output-style",
];

/** The account; the email is a stand-in for the real one the app shows atop the account menu. */
export const ACCOUNT = {
  initials: "AD",
  name: "Alan",
  plan: "Max",
  email: "alan@example.com",
};
