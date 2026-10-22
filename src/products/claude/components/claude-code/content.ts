// What the window shows: the sidebar's sessions and the open session's
// transcript. It reproduces the reference capture (the Code tab while it
// was scaffolding this very replica), so the build can be diffed against it.

export type Session = {
  id: string;
  title: string;
  /** the session is working (a gray dot) or waiting on you (amber) or done (blue) */
  dot?: "working" | "waiting" | "done";
  /** what it's waiting on you for, or what it finished: the line its attention bar's tooltip shows */
  note?: string;
  /** worktree branches spun off it */
  branches?: number;
  /** sessions it started, drawn indented under it */
  children?: Session[];
};

export type Group = { id: string; label: string; sessions: Session[] };

export const PINNED: { id: string; title: string; icon: "eye" | "projects" }[] = [
  { id: "solvay-redesign", title: "Solvay Redesign", icon: "eye" },
  { id: "trylle-rebuild", title: "Trylle Rebuild", icon: "projects" },
];

export const GROUPS: Group[] = [
  {
    id: "redakt",
    label: "redakt · ~/Dev",
    sessions: [
      {
        id: "claude-code-desktop",
        title: "Claude Code desktop app scaffolding",
        dot: "working",
      },
      { id: "ios-onboarding", title: "iOS onboarding flow redesign" },
      { id: "native-ios", title: "Native iOS app for Redakt" },
      {
        id: "inbox-switching",
        title: "Inbox switching and Gmail token persistence",
        dot: "waiting",
        note: "Wants to know whether tokens should survive a sign-out",
      },
      { id: "railway-token", title: "Railway API token config and merge" },
    ],
  },
  {
    id: "solvay",
    label: "solvay",
    sessions: [
      {
        id: "platform-ui",
        title: "Platform UI/UX improvements",
        branches: 4,
        dot: "working",
        children: [
          {
            id: "multiple-instances",
            title: "Add multiple instances of a Claude agent",
            branches: 2,
            dot: "waiting",
            note: "Asking to run the migration on the staging database",
          },
          {
            id: "teach-flow",
            title: "Fix the console's teach flow gaps",
            branches: 0,
            dot: "done",
            note: "Closed 3 gaps in the teach flow, with tests",
          },
          {
            id: "favicon-og",
            title: "Favicon and OG metadata overhaul",
            branches: 0,
            dot: "done",
            note: "New favicons and OG images for 14 routes",
          },
          {
            id: "agent-card",
            title: "Ship the Agent card skill/playbook",
            branches: 0,
            dot: "done",
            note: "Playbook written and the skill published",
          },
        ],
      },
      { id: "recent-prs", title: "Recent pull requests overview" },
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
