// What the side panels show. Fixtures in the shape of this repository, not
// copies of anyone's files: the tree, a few short sources and the diff are
// written for the replica.

export type TreeNode = { name: string; children?: TreeNode[] };

export const FILE_TREE: TreeNode[] = [
  { name: ".claude", children: [{ name: "launch.json" }] },
  { name: ".next", children: [] },
  { name: "node_modules", children: [] },
  { name: "public", children: [{ name: "products", children: [{ name: "claude", children: [{ name: "dock-icon.png" }] }] }] },
  { name: "scripts", children: [{ name: "shoot.sh" }] },
  {
    name: "src",
    children: [
      {
        name: "app",
        children: [
          { name: "[slug]", children: [{ name: "page.tsx" }] },
          { name: "favicon.ico" },
          { name: "globals.css" },
          { name: "layout.tsx" },
          { name: "page.tsx" },
        ],
      },
      { name: "components", children: [{ name: "card.tsx" }, { name: "container.tsx" }] },
      { name: "os", children: [{ name: "macos", children: [{ name: "traffic-lights.tsx" }, { name: "window.tsx" }] }] },
      { name: "products", children: [{ name: "claude", children: [{ name: "claude.tsx" }, { name: "styles.css" }] }] },
      { name: "mdx-components.tsx" },
    ],
  },
  { name: ".gitignore" },
  { name: "AGENTS.md" },
  { name: "eslint.config.mjs" },
  { name: "next-env.d.ts" },
  { name: "next.config.ts" },
  { name: "package.json" },
  { name: "pnpm-lock.yaml" },
  { name: "pnpm-workspace.yaml" },
  { name: "README.md" },
  { name: "tsconfig.json" },
];

/** Sources the Files panel can open (by path); anything else opens as "binary or too large". */
export const FILES: Record<string, string> = {
  "src/app/page.tsx": `import { Card } from "@/components/card";
import { Container } from "@/components/container";
import { products } from "@/products";

export default function Home() {
  return (
    <Container>
      <Section>
        <h1 className="text-2xl font-medium">Alan is available</h1>
        <p className="text-muted-foreground">
          I rebuild products I like, then add something of my own.
        </p>
      </Section>

      <Section className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <Card key={product.slug} href={\`/\${product.slug}\`}>
            {product.title}
          </Card>
        ))}
      </Section>

      <Section className="mt-auto pb-0">
        <p className="text-normal text-muted-foreground">
          Wanna reach out? Send me an{" "}
          <a href="mailto:alan@example.com" className="link text-foreground">
            email
          </a>
          .
        </p>
      </Section>
    </Container>
  );
}

function Section({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={\`py-8 \${className}\`}>{children}</section>;
}
`,
  "src/app/globals.css": `@import "tailwindcss";
@plugin "@tailwindcss/typography";

@layer base {
  :root {
    color-scheme: light dark;

    --background: #fbfbfb;
    --foreground: #171717;
    --muted-foreground: #737373;
    --border: #e5e5e5;
    --accent: #ffb162;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --background: #0a0a0a;
      --foreground: #fafafa;
      --muted-foreground: #a3a3a3;
      --border: #262626;
    }
  }

  body {
    @apply bg-background text-[14px] text-foreground;
  }

  ::selection {
    @apply bg-accent text-accent-foreground;
  }
}
`,
  "src/app/layout.tsx": `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alan is available",
  description: "Products I like, rebuilt, with something of my own.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
`,
};

export const OPEN_FILE = "src/app/page.tsx";

/** The working branch's changes, file by file, as the Diff panel lists them. */
export type DiffLine = { kind: "add" | "del" | "ctx"; n: number; text: string };
export type DiffFile = { name: string; dir: string; added: number; removed: number; hunks?: (DiffLine[] | { skipped: number })[] };

export const BRANCH = { base: "main", head: "claude-code-desktop" };

export const DIFF: DiffFile[] = [
  {
    name: "launch.json",
    dir: ".claude",
    added: 14,
    removed: 0,
    hunks: [
      [
        { kind: "add", n: 1, text: "{" },
        { kind: "add", n: 2, text: '  "version": "0.0.1",' },
        { kind: "add", n: 3, text: '  "configurations": [' },
        { kind: "add", n: 4, text: "    {" },
        { kind: "add", n: 5, text: '      "name": "dev",' },
        { kind: "add", n: 6, text: '      "runtimeExecutable": "pnpm",' },
        { kind: "add", n: 7, text: '      "runtimeArgs": ["run", "dev"],' },
        { kind: "add", n: 8, text: '      "port": 3000' },
        { kind: "add", n: 9, text: "    }" },
        { kind: "add", n: 10, text: "  ]" },
        { kind: "add", n: 11, text: "}" },
      ],
    ],
  },
  { name: "dock-icon.png", dir: "public/products/claude", added: 0, removed: 0 },
  {
    name: "traffic-lights.tsx",
    dir: "src/os/macos",
    added: 13,
    removed: 6,
    hunks: [
      { skipped: 18 },
      [
        { kind: "ctx", n: 19, text: "// window shows them in a floating row when the" },
        { kind: "ctx", n: 20, text: "// pointer reaches the top edge." },
        { kind: "ctx", n: 21, text: "" },
        { kind: "del", n: 22, text: "const SIZE = 13;" },
        { kind: "add", n: 22, text: "/** light diameter and center-to-center pitch (pt) */" },
        { kind: "add", n: 23, text: "const SIZE = 13;" },
        { kind: "add", n: 24, text: "const PITCH = 22;" },
        { kind: "ctx", n: 25, text: "/** letting go of a stretched light: it" },
        { kind: "ctx", n: 26, text: "    snaps back and wobbles */" },
        { kind: "ctx", n: 27, text: 'const SNAP = { type: "spring", stiffness: 380 };' },
      ],
      { skipped: 118 },
    ],
  },
  { name: "claude.tsx", dir: "src/products/claude", added: 12, removed: 0 },
  { name: "fonts.ts", dir: "src/products/claude", added: 27, removed: 0 },
  { name: "index.mdx", dir: "src/products/claude", added: 4, removed: 1 },
  { name: "styles.css", dir: "src/products/claude", added: 126, removed: 0 },
  { name: "desktop.tsx", dir: "src/products/claude/components", added: 13, removed: 0 },
  { name: "app.ts", dir: "src/products/claude/components/claude-code", added: 8, removed: 0 },
  { name: "claude-window.tsx", dir: "src/products/claude/components/claude-code", added: 34, removed: 0 },
  { name: "composer.tsx", dir: "src/products/claude/components/claude-code", added: 59, removed: 0 },
  { name: "content.ts", dir: "src/products/claude/components/claude-code", added: 118, removed: 0 },
  { name: "header.tsx", dir: "src/products/claude/components/claude-code", added: 44, removed: 0 },
  { name: "icon.tsx", dir: "src/products/claude/components/claude-code", added: 50, removed: 0 },
  { name: "main.tsx", dir: "src/products/claude/components/claude-code", added: 60, removed: 0 },
  { name: "sidebar.tsx", dir: "src/products/claude/components/claude-code", added: 251, removed: 0 },
  { name: "transcript.tsx", dir: "src/products/claude/components/claude-code", added: 139, removed: 0 },
  { name: "anthropic-mono.woff2", dir: "src/products/claude/fonts", added: 0, removed: 0 },
  { name: "anthropic-sans.woff2", dir: "src/products/claude/fonts", added: 0, removed: 0 },
];

/** The terminal's prompt and the few commands it answers. */
export const SHELL = {
  prompt: "alan@macbook alanisavailable %",
  replies: {
    pwd: "/Users/alan/Dev/alanisavailable",
    whoami: "alan",
    ls: "AGENTS.md  README.md  next.config.ts  package.json  public  scripts  src  tsconfig.json",
    "git status": "On branch claude-code-desktop\nnothing to commit, working tree clean",
    "git branch --show-current": "claude-code-desktop",
    help: "This terminal is part of the replica. Try ls, pwd, git status, echo or clear.",
  } as Record<string, string>,
};

/** What the Browser panel opens on. */
export const BROWSER = { title: "Alan is available", url: "alanisavailable.com", src: "/" };

/**
 * One CI check on a pull request. A queued one starts running `startMs` after
 * the panel first opens (showing `runningDetail`), and a running one passes
 * `ms` after it opens (showing `done`).
 */
export type PrCheck = {
  name: string;
  /** whose check it is, shown as a logo before its name */
  logo?: "vercel" | "github";
  detail: string;
  state: "queued" | "running" | "success" | "failure";
  startMs?: number;
  runningDetail?: string;
  ms?: number;
  done?: string;
  /** the step it's on while it runs (its index in `steps`) */
  runningStep?: number;
  /** what it runs, step by step, each with its log as it reads when the step passes */
  steps: CheckStep[];
  /**
   * The first run fails at `ms` instead of passing: in step `step`, whose log
   * reads `log`, with `error` as the reason. A re-run passes after `rerunMs`.
   */
  fail?: {
    detail: string;
    step: number;
    log: string[];
    /** why: the test that failed, what went wrong in words, the line of code it failed on, and where that is */
    error: { title: string; message: string; code: string; line: number; at: string };
  };
  rerunMs?: number;
  rerunDone?: string;
};

/** One step of a check's run: its name, how long it took, and its log. */
export type CheckStep = { name: string; time: string; log: string[] };

/** A pull request's description, as GitHub renders it: headings, paragraphs, lists and task lists. */
export type PrBody = ({ h: string } | { p: string } | { list: string[] } | { tasks: { label: string; done: boolean }[] })[];

export type PullRequest = {
  repo: string;
  number: number;
  title: string;
  author: string;
  base: string;
  head: string;
  commits: number;
  /** where it stands when the session opens it: open, or already merged */
  state: "open" | "merged";
  /** when it last changed, as the list says it */
  updated: string;
  checks: PrCheck[];
  files: DiffFile[];
  body: PrBody;
};

/** A check whose steps are a plain run (set up, install, then the check itself): the later pull requests' checks. */
function plainCheck(name: string, logo: PrCheck["logo"], command: string, done: string, timing?: { running: boolean; ms: number }): PrCheck {
  return {
    name,
    logo,
    detail: timing ? (timing.running ? "In progress" : "Waiting") : done,
    state: timing ? (timing.running ? "running" : "queued") : "success",
    ...(timing && { ms: timing.ms, done, runningStep: 2, ...(timing.running ? {} : { startMs: timing.ms / 2, runningDetail: "In progress" }) }),
    steps: [
      { name: "Set up job", time: "2s", log: ["Current runner version: '2.329.0'", "Operating System: Ubuntu 24.04.1 LTS"] },
      { name: "Install dependencies", time: "14s", log: ["pnpm install --frozen-lockfile", "Packages: +412", "Done in 12.6s"] },
      { name, time: "22s", log: [command, "✔ Done"] },
    ],
  };
}

/** The pull request this session opened first, as the PR panel shows it. Its changed files are the Diff panel's. */
const SCRATCHPAD_PR: PullRequest = {
  repo: "stylessh/alanisavailable",
  number: 6,
  title: "Version Claude Code like Rex, and add Scratchpad",
  author: "stylessh",
  base: "main",
  head: "stylessh/code-demo-showcase-prep-ffdafa",
  commits: 1,
  state: "open",
  updated: "12 minutes ago",
  files: DIFF,
  checks: [
    {
      name: "Vercel Preview Comments",
      logo: "vercel",
      detail: "No unresolved comments",
      state: "success",
      steps: [
        { name: "Read preview comments", time: "1s", log: ["Fetching comments for alanisavailable-git-stylessh-code-demo.vercel.app", "0 threads, 0 unresolved"] },
      ],
    },
    {
      name: "Vercel – alanisavailable",
      logo: "vercel",
      detail: "Deployment has completed",
      state: "success",
      steps: [
        {
          name: "Build",
          time: "41s",
          log: [
            "Cloning github.com/stylessh/alanisavailable (Branch: stylessh/code-demo-showcase-prep-ffdafa, Commit: 9ac0282)",
            "Running \"pnpm install\"",
            "Packages: +412",
            "Running \"next build\"",
            "▲ Next.js 16.4.2",
            "✓ Compiled successfully in 18.2s",
            "✓ Generating static pages (14/14)",
          ],
        },
        { name: "Deploy", time: "6s", log: ["Uploading build outputs", "Deployed to alanisavailable-git-stylessh-code-demo.vercel.app"] },
        { name: "Assign domains", time: "1s", log: ["Assigned alanisavailable-git-stylessh-code-demo.vercel.app"] },
      ],
    },
    {
      name: "Lint and typecheck",
      logo: "github",
      detail: "In progress",
      state: "running",
      ms: 6000,
      done: "Successful in 48s",
      runningStep: 4,
      steps: [
        { name: "Set up job", time: "2s", log: ["Current runner version: '2.329.0'", "Operating System: Ubuntu 24.04.1 LTS", "Runner Image: ubuntu-24.04"] },
        { name: "Check out", time: "1s", log: ["Syncing repository: stylessh/alanisavailable", "HEAD is now at 9ac0282 Version Claude Code like Rex, and add Scratchpad"] },
        { name: "Set up pnpm", time: "3s", log: ["Installing pnpm@11.17.0", "pnpm 11.17.0 is in the PATH"] },
        { name: "Install dependencies", time: "14s", log: ["pnpm install --frozen-lockfile", "Lockfile is up to date, resolution step is skipped", "Packages: +412", "Done in 12.8s"] },
        { name: "Typecheck", time: "17s", log: ["pnpm tsc --noEmit", "Found 0 errors."] },
        { name: "Lint", time: "11s", log: ["pnpm eslint", "✔ No problems (0 errors, 0 warnings)"] },
      ],
    },
    {
      name: "End-to-end tests",
      logo: "github",
      detail: "Waiting for lint",
      state: "queued",
      startMs: 6000,
      runningDetail: "In progress",
      ms: 12000,
      done: "Successful in 1m 12s",
      runningStep: 3,
      rerunMs: 5000,
      rerunDone: "Successful in 1m 9s",
      steps: [
        { name: "Set up job", time: "2s", log: ["Current runner version: '2.329.0'", "Operating System: Ubuntu 24.04.1 LTS"] },
        { name: "Install dependencies", time: "15s", log: ["pnpm install --frozen-lockfile", "Packages: +412", "Done in 13.1s"] },
        { name: "Install Playwright browsers", time: "21s", log: ["pnpm exec playwright install --with-deps chromium", "Chromium 141.0.7390.37 downloaded to ~/.cache/ms-playwright"] },
        {
          name: "Run Playwright",
          time: "32s",
          log: [
            "pnpm exec playwright test",
            "Running 24 tests using 4 workers",
            "  ✓  versions.spec.ts:12:3 › homepage opens Claude on its versions (2.1s)",
            "  ✓  viewer.spec.ts:18:3 › scratchpad › Write pins a numbered note (1.4s)",
            "  ✓  viewer.spec.ts:42:5 › scratchpad › Done attaches the image to the composer (1.9s)",
            "  ✓  pr-panel.spec.ts:9:3 › PR link opens the PR panel (0.8s)",
            "  24 passed (31.2s)",
          ],
        },
      ],
      fail: {
        detail: "Failed after 1m 3s",
        step: 3,
        log: [
          "pnpm exec playwright test",
          "Running 24 tests using 4 workers",
          "  ✓  versions.spec.ts:12:3 › homepage opens Claude on its versions (2.1s)",
          "  ✓  viewer.spec.ts:18:3 › scratchpad › Write pins a numbered note (1.4s)",
          "  ✘  viewer.spec.ts:42:5 › scratchpad › Done attaches the image to the composer (5.0s)",
          "",
          "    Error: Timed out 5000ms waiting for expect(locator).toBeVisible()",
          "    Locator: getByRole('button', { name: /View attached image/ })",
          "    Expected: visible",
          "    Received: <element(s) not found>",
          "",
          "      42 |   await page.getByRole('button', { name: 'Done' }).click();",
          "    > 43 |   await expect(page.getByRole('button', { name: /View attached image/ })).toBeVisible();",
          "         |                                                                            ^",
          "",
          "  1 failed",
          "    viewer.spec.ts:42:5 › scratchpad › Done attaches the image to the composer",
          "  23 passed (36.4s)",
          "Error: Process completed with exit code 1.",
        ],
        error: {
          title: "Done attaches the image to the composer",
          message: "Timed out after 5000ms waiting for the attached image to show in the composer.",
          code: "await expect(page.getByRole('button', { name: /View attached image/ })).toBeVisible();",
          line: 43,
          at: "tests/viewer.spec.ts:43:5",
        },
      },
    },
  ],
  body: [
    { h: "Summary" },
    { p: "Claude’s card is on the homepage and opens the versions canvas, like Rex. Today’s Claude Code is frozen as Original, and the live version is Scratchpad." },
    {
      list: [
        "The image viewer gets a Scratch button that turns the picture on show into a scratchpad.",
        "Write pins numbered notes, Draw draws freehand and Box drags out rectangles, in five inks.",
        "Done bakes the marks into a new image and attaches it to the composer with its notes.",
      ],
    },
    { h: "Test plan" },
    {
      tasks: [
        { label: "Homepage shows the Claude card and opens its versions", done: true },
        { label: "Scratch a chat image: notes, a stroke and a box", done: true },
        { label: "Done attaches the image; sending shows its notes", done: false },
      ],
    },
  ],
};

/**
 * Every pull request this session opened, newest last. The session can open
 * more than one: the PR panel lists them, and its header button counts them.
 * Some are stacked: a pull request whose base is another's branch builds on
 * it (#9 on #7's branch, #10 on #9's), and merges after it.
 */
export const PULL_REQUESTS: PullRequest[] = [
  SCRATCHPAD_PR,
  {
    repo: "stylessh/alanisavailable",
    number: 7,
    title: "Add a PR panel, and stack and resize side panels",
    author: "stylessh",
    base: "main",
    head: "stylessh/pr-panel",
    commits: 4,
    state: "open",
    updated: "3 minutes ago",
    files: DIFF.slice(8, 14),
    checks: [
      plainCheck("Vercel – alanisavailable", "vercel", "next build", "Deployment has completed", { running: true, ms: 8000 }),
      plainCheck("Lint and typecheck", "github", "pnpm eslint && pnpm tsc --noEmit", "Successful in 51s"),
      plainCheck("End-to-end tests", "github", "pnpm exec playwright test", "Successful in 1m 4s", { running: false, ms: 14000 }),
    ],
    body: [
      { h: "Summary" },
      { p: "Pull requests open in a panel beside the conversation instead of a browser tab, and side panels stack and resize." },
      {
        list: [
          "A PR link in the conversation, and a header button, open its panel: overview, checks with their logs, and files changed.",
          "Side panels stack two to a column, and every gap between them drags.",
        ],
      },
    ],
  },
  {
    repo: "stylessh/alanisavailable",
    number: 8,
    title: "Fade scrolled edges in side panels",
    author: "stylessh",
    base: "main",
    head: "stylessh/panel-edge-fades",
    commits: 2,
    state: "merged",
    updated: "1 minute ago",
    files: DIFF.slice(14, 16),
    checks: [
      plainCheck("Vercel – alanisavailable", "vercel", "next build", "Deployment has completed"),
      plainCheck("Lint and typecheck", "github", "pnpm eslint && pnpm tsc --noEmit", "Successful in 47s"),
    ],
    body: [{ h: "Summary" }, { p: "A panel's tabs and its content fade at an edge with more past it, instead of cutting off." }],
  },
  {
    repo: "stylessh/alanisavailable",
    number: 9,
    title: "List a session's pull requests",
    author: "stylessh",
    base: "stylessh/pr-panel",
    head: "stylessh/pr-list",
    commits: 2,
    state: "open",
    updated: "2 minutes ago",
    files: DIFF.slice(16, 18),
    checks: [
      plainCheck("Vercel – alanisavailable", "vercel", "next build", "Deployment has completed"),
      plainCheck("Lint and typecheck", "github", "pnpm eslint && pnpm tsc --noEmit", "Successful in 49s"),
    ],
    body: [
      { h: "Summary" },
      { p: "Stacked on #7. A session that opens more than one pull request lists them in the PR panel, and its header button counts them." },
    ],
  },
  {
    repo: "stylessh/alanisavailable",
    number: 10,
    title: "Show stacked pull requests",
    author: "stylessh",
    base: "stylessh/pr-list",
    head: "stylessh/stacked-prs",
    commits: 1,
    state: "open",
    updated: "just now",
    files: DIFF.slice(12, 14),
    checks: [
      plainCheck("Vercel – alanisavailable", "vercel", "next build", "Deployment has completed", { running: true, ms: 7000 }),
      plainCheck("Lint and typecheck", "github", "pnpm eslint && pnpm tsc --noEmit", "Successful in 45s"),
    ],
    body: [
      { h: "Summary" },
      { p: "Stacked on #9. A pull request built on another's branch shows its stack, and merges once the one under it has." },
    ],
  },
];

