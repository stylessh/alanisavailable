import { ACTIVE_SESSION } from "./content";
import { type PrCheck, PULL_REQUESTS, type PullRequest } from "./panel-content";
import { workspaceOf } from "./workspace";

// The pull requests each session has opened. The session this replica was
// built in has the repository's own; the checkout session has a stack of its
// own in the storefront's repository, and the dark mode pass has one. The
// rest haven't opened any, so their header has no PR button.

/** A check that ran the usual way: set up, install, then the check itself. */
function check(name: string, logo: PrCheck["logo"], command: string, done: string, timing?: { running: boolean; ms: number }): PrCheck {
  return {
    name,
    logo,
    detail: timing ? (timing.running ? "In progress" : "Waiting") : done,
    state: timing ? (timing.running ? "running" : "queued") : "success",
    ...(timing && { ms: timing.ms, done, runningStep: 2, ...(timing.running ? {} : { startMs: timing.ms / 2, runningDetail: "In progress" }) }),
    steps: [
      { name: "Set up job", time: "2s", log: ["Current runner version: '2.329.0'", "Operating System: Ubuntu 24.04.1 LTS"] },
      { name: "Install dependencies", time: "11s", log: ["pnpm install --frozen-lockfile", "Packages: +388", "Done in 9.8s"] },
      { name, time: "19s", log: [command, "✔ Done"] },
    ],
  };
}

const checkout = workspaceOf("checkout").diff;
const darkMode = workspaceOf("dark-mode").diff;
const STORE = "northwind/storefront";

const STOREFRONT_PRS: PullRequest[] = [
  {
    repo: STORE,
    number: 41,
    title: "Round coupon discounts to the cent",
    author: "alan",
    base: "main",
    head: "fix/coupon-rounding",
    commits: 2,
    state: "merged",
    updated: "1 hour ago",
    files: [{ name: "pricing.ts", dir: "src/lib", added: 9, removed: 3 }],
    checks: [
      check("Vercel – storefront", "vercel", "next build", "Deployment has completed"),
      check("Unit tests", "github", "pnpm vitest run", "Successful in 38s"),
    ],
    body: [{ h: "Summary" }, { p: "The charge rounded down while the page rounded to the nearest cent. Both now round half up, to the cent." }],
  },
  {
    repo: STORE,
    number: 42,
    title: "Lazy-load product gallery images",
    author: "alan",
    base: "main",
    head: "perf/lazy-images",
    commits: 1,
    state: "open",
    updated: "2 hours ago",
    files: [{ name: "gallery.tsx", dir: "src/app/products/[slug]", added: 7, removed: 4 }],
    checks: [check("Vercel – storefront", "vercel", "next build", "Deployment has completed"), check("Lighthouse", "github", "lhci autorun", "Performance 91")],
    body: [
      { h: "Summary" },
      { p: "The first image loads right away; the rest load as they near the screen. LCP on a throttled phone drops from 2.7s to 1.9s." },
    ],
  },
  {
    repo: STORE,
    number: 43,
    title: "Keep the cart through sign-in",
    author: "alan",
    base: "main",
    head: "checkout-cart",
    commits: 3,
    state: "open",
    updated: "just now",
    files: checkout,
    checks: [
      check("Vercel – storefront", "vercel", "next build", "Deployment has completed", { running: true, ms: 9000 }),
      check("Unit tests", "github", "pnpm vitest run", "Successful in 41s"),
      check("End-to-end tests", "github", "pnpm exec playwright test", "Successful in 1m 12s", { running: false, ms: 16000 }),
    ],
    body: [
      { h: "Summary" },
      { p: "A guest's cart now comes along when they sign in, merged into their account's cart." },
      { list: ["When both carts have the same item, the larger quantity wins.", "A note on the cart step says the items carried over."] },
      {
        tasks: [
          { label: "Merge on sign-in", done: true },
          { label: "Tests for 7 merge cases", done: true },
          { label: "End-to-end sign-in from every step", done: false },
        ],
      },
    ],
  },
  {
    repo: STORE,
    number: 44,
    title: "Save payment methods for next time",
    author: "alan",
    base: "checkout-cart",
    head: "saved-payments",
    commits: 2,
    state: "open",
    updated: "20 minutes ago",
    files: [{ name: "schema.prisma", dir: "prisma", added: 14, removed: 0 }],
    checks: [
      check("Vercel – storefront", "vercel", "next build", "Deployment has completed"),
      check("Unit tests", "github", "pnpm vitest run", "Successful in 35s"),
    ],
    body: [{ h: "Summary" }, { p: "Cards are saved with the payment provider; we keep only its token, the brand and the last four digits." }],
  },
];

const DARK_MODE_PRS: PullRequest[] = [
  {
    repo: "stylessh/alanisavailable",
    number: 11,
    title: "Raise text contrast in dark mode",
    author: "stylessh",
    base: "main",
    head: "dark-mode-contrast",
    commits: 1,
    state: "open",
    updated: "2 days ago",
    files: darkMode,
    checks: [
      check("Vercel – alanisavailable", "vercel", "next build", "Deployment has completed"),
      check("Lint and typecheck", "github", "pnpm eslint && pnpm tsc --noEmit", "Successful in 49s"),
    ],
    body: [
      { h: "Summary" },
      { p: "Every text color in dark mode now clears 4.5:1 against its background. Light mode is untouched." },
      { list: ["--muted: 3.1:1 → 6.9:1", "--faint: 2.6:1 → 4.6:1", "--link: 3.8:1 → 6.2:1"] },
    ],
  },
];

const BY_SESSION: Record<string, PullRequest[]> = {
  [ACTIVE_SESSION]: PULL_REQUESTS,
  checkout: STOREFRONT_PRS,
  "dark-mode": DARK_MODE_PRS,
};

/** Every pull request in any session, for looking one up by its number. */
export const ALL_PRS: PullRequest[] = Object.values(BY_SESSION).flat();

/** The pull requests a session has opened (none for most). */
export const prsOf = (session: string): PullRequest[] => BY_SESSION[session] ?? [];
