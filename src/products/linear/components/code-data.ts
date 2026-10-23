// The code side of the AS Mobbin workspace, for the explorations of Linear
// hosting repositories: repos tied to the workspace's projects, and diffs
// (Linear's name for pull requests) that resolve its issues. People and
// agents are invented; issue keys and projects are the ones on the Issues page.
import type { FileKind } from "./code-icons";
import { LABELS, type Label, type StatusId } from "./data";

/** Someone in the workspace; people have a photo (free Unsplash portraits, face-cropped to 96px), agents their mark. */
export type Person = { name: string; initials: string; color: string; agent?: boolean; photo?: string; mark?: "cursor" | "linear" };

const photo = (name: string) => `/products/linear/avatars/${name}.jpg`;

export const ME: Person = { name: "Alex Smith", initials: "AS", color: "#8e67d9", photo: photo("alex") };
export const PEOPLE = {
  maya: { name: "Maya Chen", initials: "MC", color: "#e0752f", photo: photo("maya") },
  jordan: { name: "Jordan Lee", initials: "JL", color: "#2f8fd8", photo: photo("jordan") },
  priya: { name: "Priya Patel", initials: "PP", color: "#d4498a", photo: photo("priya") },
  sam: { name: "Sam Ortiz", initials: "SO", color: "#3aa57a", photo: photo("sam") },
  cursor: { name: "Cursor", initials: "C", color: "#000000", agent: true, mark: "cursor" },
  linear: { name: "Linear", initials: "L", color: "#5e6ad2", agent: true, mark: "linear" },
} satisfies Record<string, Person>;

/** What a person's hover card shows: their handle, whether they're around, their local time, teams and projects. */
export type Profile = { handle: string; status: "online" | "away" | "offline"; time?: string; teams: string[]; projects: string[] };

export const PROFILES: Record<string, Profile> = {
  "Alex Smith": { handle: "alex", status: "online", time: "10:50 AM", teams: ["AS Mobbin"], projects: ["User Insight & Behavior Analytics Dashboard"] },
  "Maya Chen": { handle: "maya", status: "online", time: "6:50 PM", teams: ["AS Mobbin", "Design"], projects: ["User Insight & Behavior Analytics Dashboard"] },
  "Jordan Lee": { handle: "jordan", status: "away", time: "1:50 PM", teams: ["AS Mobbin", "Infra"], projects: ["Dashboard Performance", "Smart User Onboarding Optimization System"] },
  "Priya Patel": { handle: "priya", status: "online", time: "11:20 PM", teams: ["AS Mobbin"], projects: ["User Insight & Behavior Analytics Dashboard", "AI UX Research Assistant"] },
  "Sam Ortiz": { handle: "sam", status: "offline", time: "7:50 AM", teams: ["Design"], projects: ["Design System 2.0"] },
  Cursor: { handle: "cursor", status: "online", teams: ["AS Mobbin"], projects: ["User Insight & Behavior Analytics Dashboard"] },
  Linear: { handle: "linear", status: "online", teams: ["AS Mobbin"], projects: [] },
};

export type Language = { name: string; color: string; share: number };

export type TreeEntry = {
  name: string;
  kind: FileKind;
  folder?: boolean;
  /** the last commit to touch it, and the issue that commit resolves */
  message: string;
  issue?: string;
  age: string;
  children?: TreeEntry[];
};

/**
 * A Linear project as the code side sees it: a group of issues, as in Linear
 * today, and the diffs that carry its work, across however many repos. The
 * first two are the projects on the Issues page.
 */
export type CodeProject = {
  id: string;
  name: string;
  emoji?: string;
  icon?: "headphones";
  lead: Person;
  /** done, as a share of its issues */
  progress: number;
  target?: string;
  issues: number;
};

export const PROJECTS: CodeProject[] = [
  { id: "dashboard", name: "User Insight & Behavior Analytics Dashboard", emoji: "📑", lead: ME, progress: 0.42, target: "Apr 15", issues: 12 },
  { id: "assistant", name: "AI UX Research Assistant", icon: "headphones", lead: PEOPLE.priya, progress: 0.18, target: "May 2", issues: 9 },
  { id: "onboarding", name: "Smart User Onboarding Optimization System", emoji: "🧭", lead: PEOPLE.jordan, progress: 0.25, issues: 7 },
  { id: "performance", name: "Dashboard Performance", emoji: "⚡", lead: PEOPLE.jordan, progress: 0.6, target: "Apr 30", issues: 5 },
  { id: "design", name: "Design System 2.0", emoji: "🎨", lead: PEOPLE.sam, progress: 0.75, target: "Apr 22", issues: 8 },
];
export const findProject = (id?: string) => PROJECTS.find((p) => p.id === id);

export type Release = { tag: string; title: string; age: string };
export type Environment = { name: string; url: string; age: string; state: "live" | "building" | "failed" };
export type LastCommit = { who: Person; message: string; sha: string; age: string; issue?: string };

export type Repo = {
  slug: string;
  description: string;
  languages: Language[];
  /** the projects whose work lives here, by id: a repo carries several, and a project can span repos */
  projects: string[];
  defaultBranch: string;
  visibility: "Private" | "Internal";
  updated: string;
  branches: number;
  commits: number;
  tree: TreeEntry[];
  /** a small markdown subset: #, ##, -, ``` fences, `code` and paragraphs */
  readme: string;
  lead: Person;
  contributors: Person[];
  tags: number;
  lastCommit: LastCommit;
  /** the checks on the default branch's latest commit */
  mainChecks: Check[];
  releases: Release[];
  environments: Environment[];
};

const TS = { name: "TypeScript", color: "#3178c6" };
const PY = { name: "Python", color: "#3572a5" };
const CSS = { name: "CSS", color: "#663399" };
const HCL = { name: "HCL", color: "#844fba" };

export const REPOS: Repo[] = [
  {
    slug: "insight-dashboard",
    description: "Internal dashboard for user behavior, UI patterns and engagement metrics",
    languages: [{ ...TS, share: 0.86 }, { ...CSS, share: 0.14 }],
    projects: ["dashboard", "performance", "design"],
    defaultBranch: "main",
    visibility: "Private",
    updated: "1h ago",
    branches: 14,
    commits: 312,
    tree: [
      {
        name: "apps",
        kind: "folder",
        folder: true,
        message: "KPI definitions for success metrics",
        issue: "AS-10",
        age: "2d",
        children: [
          {
            name: "web",
            kind: "folder-src",
            folder: true,
            message: "KPI definitions for success metrics",
            issue: "AS-10",
            age: "2d",
            children: [
              {
                name: "src",
                kind: "folder-src",
                folder: true,
                message: "KPI definitions for success metrics",
                issue: "AS-10",
                age: "2d",
                children: [
                  {
                    name: "components",
                    kind: "folder-components",
                    folder: true,
                    message: "Hypothesis callout above the KPI table",
                    issue: "AS-9",
                    age: "3d",
                    children: [
                      { name: "kpi-table.tsx", kind: "react-ts", message: "KPI definitions for success metrics", issue: "AS-10", age: "2d" },
                      { name: "metric-row.tsx", kind: "react-ts", message: "Trend arrows on metric rows", age: "1w" },
                      { name: "problem-callout.tsx", kind: "react-ts", message: "Hypothesis callout above the KPI table", issue: "AS-9", age: "3d" },
                    ],
                  },
                  {
                    name: "queries",
                    kind: "folder-src",
                    folder: true,
                    message: "Engagement funnel queries",
                    age: "2w",
                    children: [
                      { name: "funnel.ts", kind: "typescript", message: "Engagement funnel queries", age: "2w" },
                      { name: "sessions.ts", kind: "typescript", message: "Sessions by day, in the viewer's timezone", age: "3w" },
                    ],
                  },
                  {
                    name: "views",
                    kind: "folder-src",
                    folder: true,
                    message: "KPI definitions for success metrics",
                    issue: "AS-10",
                    age: "2d",
                    children: [{ name: "insights-overview.tsx", kind: "react-ts", message: "KPI definitions for success metrics", issue: "AS-10", age: "2d" }],
                  },
                  { name: "main.tsx", kind: "react-ts", message: "Turn on typed routes", age: "2w" },
                  { name: "styles.css", kind: "css", message: "Tighter chart spacing", age: "1w" },
                ],
              },
              {
                name: "public",
                kind: "folder-public",
                folder: true,
                message: "Persona illustrations",
                age: "1w",
                children: [{ name: "favicon.svg", kind: "file", message: "New dashboard icon", age: "3w" }],
              },
              { name: "next.config.ts", kind: "typescript", message: "Turn on typed routes", age: "2w" },
              { name: "package.json", kind: "nodejs", message: "Bump charts to 4.2", age: "2d" },
              { name: "tsconfig.json", kind: "tsconfig", message: "Strict null checks", age: "1w" },
            ],
          },
        ],
      },
      {
        name: "docs",
        kind: "folder-docs",
        folder: true,
        message: "Success metrics and owners",
        issue: "AS-10",
        age: "2d",
        children: [
          { name: "personas.md", kind: "markdown", message: "Internal personas, first pass", issue: "AS-11", age: "4d" },
          { name: "success-metrics.md", kind: "markdown", message: "Success metrics and owners", issue: "AS-10", age: "2d" },
          { name: "competitors.md", kind: "markdown", message: "Benchmark notes", issue: "AS-24", age: "5d" },
        ],
      },
      {
        name: "packages",
        kind: "folder-src",
        folder: true,
        message: "KPI definitions for success metrics",
        issue: "AS-10",
        age: "2d",
        children: [
          {
            name: "metrics",
            kind: "folder-src",
            folder: true,
            message: "KPI definitions for success metrics",
            issue: "AS-10",
            age: "2d",
            children: [
              { name: "kpis.ts", kind: "typescript", message: "KPI definitions for success metrics", issue: "AS-10", age: "2d" },
              { name: "package.json", kind: "nodejs", message: "Bump charts to 4.2", age: "2d" },
            ],
          },
        ],
      },
      {
        name: "tests",
        kind: "folder-test",
        folder: true,
        message: "Snapshot the KPI table",
        age: "4d",
        children: [{ name: "kpi-table.test.tsx", kind: "react-ts", message: "Snapshot the KPI table", age: "4d" }],
      },
      { name: ".gitignore", kind: "git", message: "Ignore local exports", age: "3w" },
      { name: "README.md", kind: "markdown", message: "Document the metrics pipeline", age: "4d" },
      { name: "package.json", kind: "nodejs", message: "Bump charts to 4.2", age: "2d" },
      { name: "pnpm-lock.yaml", kind: "lock", message: "Bump charts to 4.2", age: "2d" },
      { name: "tsconfig.json", kind: "tsconfig", message: "Strict null checks", age: "1w" },
    ],
    lead: PEOPLE.maya,
    contributors: [PEOPLE.maya, PEOPLE.priya, PEOPLE.jordan, ME, PEOPLE.cursor],
    tags: 6,
    lastCommit: { who: PEOPLE.maya, message: "KPI definitions for success metrics", sha: "7c1e94b", age: "2d", issue: "AS-10" },
    mainChecks: [
      { name: "Build", state: "passed" },
      { name: "Lint", state: "passed" },
      { name: "Unit tests", state: "passed" },
      { name: "E2E", state: "running" },
    ],
    releases: [
      { tag: "v0.4.0", title: "KPI definitions", age: "2d" },
      { tag: "v0.3.2", title: "Chart tooltips everywhere", age: "1w" },
      { tag: "v0.3.0", title: "Engagement funnel", age: "3w" },
    ],
    environments: [
      { name: "Production", url: "insights.asmobbin.app", age: "2d", state: "live" },
      { name: "Staging", url: "staging.insights.asmobbin.app", age: "3h", state: "live" },
      { name: "Preview #12", url: "insight-dashboard-12.preview.asmobbin.app", age: "2h", state: "building" },
    ],
    readme: `# insight-dashboard

One place to see how people use the product: which UI patterns they reach for, where they drop off, and which features they come back to.

## Getting started

\`\`\`
pnpm install
pnpm dev --filter web
\`\`\`

## How it fits together

- \`apps/web\` is the dashboard, a Next.js app reading from the warehouse
- \`packages/metrics\` defines every KPI once, with its query and owner
- \`docs\` holds the problem statement, personas and success metrics

Each KPI links back to the Linear issue that introduced it, so a number on a chart always has a reason to exist.`,
  },
  {
    slug: "ux-research-assistant",
    description: "AI assistant that turns research sessions into findings and personas",
    languages: [{ ...PY, share: 0.71 }, { ...TS, share: 0.29 }],
    projects: ["assistant"],
    defaultBranch: "main",
    visibility: "Private",
    updated: "2h ago",
    branches: 6,
    commits: 128,
    tree: [
      { name: "assistant", kind: "folder-src", folder: true, message: "Benchmark matrix for competitors", age: "2h" },
      { name: "prompts", kind: "folder", folder: true, message: "Tighten the synthesis prompt", age: "1d" },
      { name: "web", kind: "folder-components", folder: true, message: "Session upload drop zone", age: "3d" },
      { name: "tests", kind: "folder-test", folder: true, message: "Fixture for long interviews", age: "5d" },
      { name: "README.md", kind: "markdown", message: "Explain the session format", age: "1d" },
      { name: "pyproject.toml", kind: "file", message: "Pin the tokenizer", age: "1w" },
    ],
    lead: PEOPLE.priya,
    contributors: [PEOPLE.priya, ME, PEOPLE.cursor],
    tags: 2,
    lastCommit: { who: PEOPLE.priya, message: "Tighten the synthesis prompt", sha: "b2a0c91", age: "1d" },
    mainChecks: [
      { name: "Build", state: "passed" },
      { name: "Unit tests", state: "passed" },
    ],
    releases: [{ tag: "v0.1.0", title: "First synthesis pass", age: "2w" }],
    environments: [{ name: "Staging", url: "assistant.staging.asmobbin.app", age: "1d", state: "live" }],
    readme: `# ux-research-assistant

Upload a research session and get back findings, quotes and persona updates you can drop into Linear.

## Running locally

\`\`\`
uv sync
uv run assistant serve
\`\`\`

- Sessions are transcribed, then summarized against the current personas
- Every finding keeps a link to the moment in the recording it came from`,
  },
  {
    slug: "onboarding-flows",
    description: "Experiments for the smart user onboarding system",
    languages: [{ ...TS, share: 1 }],
    projects: ["onboarding", "dashboard"],
    defaultBranch: "main",
    visibility: "Internal",
    updated: "5h ago",
    branches: 9,
    commits: 87,
    tree: [
      { name: "flows", kind: "folder-src", folder: true, message: "Track step completion events", age: "5h" },
      { name: "public", kind: "folder-public", folder: true, message: "Illustrations for step two", age: "1w" },
      { name: "README.md", kind: "markdown", message: "How to add a flow", age: "2w" },
      { name: "package.json", kind: "nodejs", message: "Add the events client", age: "5h" },
    ],
    lead: PEOPLE.jordan,
    contributors: [PEOPLE.jordan, PEOPLE.sam],
    tags: 0,
    lastCommit: { who: PEOPLE.jordan, message: "Add the events client", sha: "e91f02d", age: "5h" },
    mainChecks: [
      { name: "Build", state: "passed" },
      { name: "Lint", state: "failed" },
    ],
    releases: [],
    environments: [{ name: "Production", url: "onboarding.asmobbin.app", age: "1w", state: "live" }],
    readme: `# onboarding-flows

Each onboarding flow is a list of steps with an exit condition. Flows run as experiments, so every change ships behind a flag and reports its completion rate.

- Add a flow in \`flows/\` and register it in \`flows/index.ts\`
- Events go through \`track()\`, never straight to the warehouse`,
  },
  {
    slug: "design-system",
    description: "Shared React components, tokens and icons",
    projects: ["design"],
    languages: [{ ...TS, share: 0.78 }, { ...CSS, share: 0.22 }],
    defaultBranch: "main",
    visibility: "Internal",
    updated: "1d ago",
    branches: 11,
    commits: 540,
    tree: [
      { name: "components", kind: "folder-components", folder: true, message: "Token scale for spacing and radius", age: "1d" },
      { name: "tokens", kind: "folder", folder: true, message: "Token scale for spacing and radius", age: "1d" },
      { name: "README.md", kind: "markdown", message: "Contribution guide", age: "3w" },
      { name: "package.json", kind: "nodejs", message: "Release 3.4.0", age: "1w" },
    ],
    lead: PEOPLE.sam,
    contributors: [PEOPLE.sam, PEOPLE.maya, PEOPLE.priya],
    tags: 24,
    lastCommit: { who: PEOPLE.sam, message: "Release 3.4.0", sha: "3d77e10", age: "1w" },
    mainChecks: [
      { name: "Build", state: "passed" },
      { name: "Visual tests", state: "passed" },
    ],
    releases: [
      { tag: "v3.4.0", title: "Callout and empty states", age: "1w" },
      { tag: "v3.3.1", title: "Focus rings", age: "3w" },
    ],
    environments: [{ name: "Storybook", url: "design.asmobbin.app", age: "1w", state: "live" }],
    readme: `# design-system

Components and tokens shared by every app in the workspace.

- Tokens live in \`tokens/\` and compile to CSS variables
- Components never hard-code a color, a radius or a space`,
  },
  {
    slug: "infra",
    description: "Terraform, deploy pipelines and preview environments",
    projects: ["performance"],
    languages: [{ ...HCL, share: 1 }],
    defaultBranch: "main",
    visibility: "Private",
    updated: "3d ago",
    branches: 3,
    commits: 204,
    tree: [
      { name: "environments", kind: "folder", folder: true, message: "Preview environments per diff", age: "3d" },
      { name: "modules", kind: "folder-src", folder: true, message: "Warehouse read replica", age: "2w" },
      { name: "README.md", kind: "markdown", message: "Runbook links", age: "1mo" },
    ],
    lead: ME,
    contributors: [ME, PEOPLE.linear],
    tags: 0,
    lastCommit: { who: ME, message: "Preview environments per diff", sha: "0aa4f6c", age: "3d" },
    mainChecks: [{ name: "Plan", state: "passed" }],
    releases: [],
    environments: [],
    readme: `# infra

Everything that runs the workspace's apps. Every diff gets its own preview environment, linked from the diff in Linear.`,
  },
];

export type DiffState = "open" | "draft" | "merged" | "closed";
export type ReviewState = "requested" | "reviewing" | "changes" | "approved" | "waiting" | "done";

export type Line = { kind: "ctx" | "add" | "del" | "gap"; text: string; old?: number; new?: number; skipped?: number };
/**
 * A file a diff touches. Most are edits; `change` marks one the diff adds,
 * deletes or moves (`from` is where it was), and `binary` one git can't show
 * as text, with its size before and after.
 */
export type DiffFile = {
  path: string;
  kind: FileKind;
  additions: number;
  deletions: number;
  lines: Line[];
  change?: "added" | "deleted" | "renamed";
  from?: string;
  binary?: { before?: string; after?: string };
};

export type Reviewer = { who: Person; verdict?: "approved" | "changes" | "commented"; delegate?: Person };
/** A CI check: what ran, how it ended, a line on what happened and how long it took (or has been running). */
export type Check = { name: string; state: "passed" | "failed" | "running" | "skipped"; detail?: string; duration?: string };
export type Comment = { who: Person; age: string; body: string; reactions?: { emoji: string; count: number }[] };
/** A conversation on one line of a file, by its number on the new side. */
export type Thread = { path: string; line: number; comments: Comment[]; resolved?: boolean };
export type Commit = { sha: string; message: string };

/**
 * One thing that changed on a diff, as Linear's activity records it. The
 * timeline reads consecutive changes by the same person at the same time as
 * one sentence ("Maya Chen added label Frontend and requested review from
 * Alex Smith"), the way Linear composes an issue's history.
 */
export type Change =
  | { type: "opened"; draft?: boolean; onBehalfOf?: Person }
  | { type: "linked"; issue: string }
  | { type: "commit"; sha: string; message: string }
  | { type: "requested"; who: Person }
  | { type: "unrequested"; who: Person }
  | { type: "label"; label: Label; removed?: boolean }
  | { type: "delegated"; to: Person }
  | { type: "deployed"; url: string }
  | { type: "check-failed"; check: string; file?: string }
  | { type: "ready" }
  | { type: "updated"; commits: number }
  | { type: "merged"; into: string }
  | { type: "closed" }
  | { type: "reopened" };

/**
 * An agent's run on a diff, as Linear shows a Cursor session on an issue: a
 * compact card with who started it and how it ended, whose full output
 * (markdown) opens in a sheet.
 */
export type Session = {
  kind: "session";
  agent: Person;
  by: Person;
  age: string;
  status: "working" | "finished";
  /** the output's headline, then the output itself */
  title: string;
  output: string;
  /** the diff it opened or pushed to, by number */
  diff?: number;
};

/** What happened on a diff, in order: a change, a comment (with replies), a review, or an agent's session. */
export type Event =
  | Session
  | { kind: "change"; who: Person; age: string; change: Change }
  | ({ kind: "comment"; replies?: Comment[] } & Comment)
  | { kind: "review"; who: Person; age: string; verdict: "approved" | "changes" | "commented"; body?: string; threads: Thread[] };

/** Several changes by one person at one time, spread into a diff's activity. */
const did = (who: Person, age: string, ...changes: Change[]): Event[] => changes.map((change) => ({ kind: "change", who, age, change }));
const commit = (sha: string, message: string): Change => ({ type: "commit", sha, message });
const label = (l: Label, removed = false): Change => ({ type: "label", label: l, removed });

export type Diff = {
  number: number;
  repo: string;
  title: string;
  author: Person;
  branch: string;
  state: DiffState;
  review: ReviewState;
  /** the issue it resolves, by key */
  issue?: string;
  /** the project it's part of, by id */
  project?: string;
  /** who's reviewing; a reviewer can hand their review to an agent (Linear's delegation) */
  reviewers: Reviewer[];
  checks: Check[];
  age: string;
  /** the description, in the README's markdown subset */
  body: string;
  files: DiffFile[];
  labels: Label[];
  activity: Event[];
  /** how far the branch is behind its base, and whether it conflicts */
  behind?: number;
  conflicts?: boolean;
};

/** Turns a compact hunk (` ` context, `+` added, `-` removed, `@@ n` n unchanged lines) into numbered lines. */
function hunk(start: number, src: string): Line[] {
  let oldN = start;
  let newN = start;
  return src.split("\n").map((raw) => {
    const mark = raw[0];
    const text = raw.slice(2);
    if (mark === "@") {
      const skipped = Number(raw.slice(3));
      oldN += skipped;
      newN += skipped;
      return { kind: "gap", text: "", skipped };
    }
    if (mark === "+") return { kind: "add", text, new: newN++ };
    if (mark === "-") return { kind: "del", text, old: oldN++ };
    return { kind: "ctx", text, old: oldN++, new: newN++ };
  });
}

const count = (lines: Line[], kind: Line["kind"]) => lines.filter((l) => l.kind === kind).length;
/** A file with its lines; one that's all additions from line 1 is new. */
function file(path: string, kind: FileKind, lines: Line[]): DiffFile {
  const isNew = lines.length > 0 && lines.every((l) => l.kind === "add") && lines[0].new === 1;
  return { path, kind, additions: count(lines, "add"), deletions: count(lines, "del"), lines, ...(isNew && { change: "added" as const }) };
}

/** A file the diff removes, every line of it deleted. */
function deleted(path: string, kind: FileKind, src: string): DiffFile {
  const lines = hunk(1, src.split("\n").map((l) => `- ${l}`).join("\n"));
  return { path, kind, additions: 0, deletions: lines.length, lines, change: "deleted" };
}

/** A file the diff moves, with whatever it changes on the way (often nothing). */
function renamed(from: string, path: string, kind: FileKind, lines: Line[] = []): DiffFile {
  return { ...file(path, kind, lines), change: "renamed", from };
}

/** A file git can't show as text (an image, a font), by its size before and after. */
function binary(path: string, size: { before?: string; after?: string }): DiffFile {
  return { path, kind: "file", additions: 0, deletions: 0, lines: [], binary: size, ...(!size.before && { change: "added" as const }) };
}

const PASSING: Check[] = [
  { name: "Build", state: "passed", duration: "1m 12s" },
  { name: "Lint", state: "passed", duration: "24s" },
  { name: "Unit tests", state: "passed", detail: "214 tests", duration: "48s" },
];

export const DIFFS: Diff[] = [
  {
    number: 14,
    project: "dashboard",
    repo: "insight-dashboard",
    title: "Problem statement and hypothesis page",
    author: PEOPLE.maya,
    branch: "maya/as-9-problem-statement",
    state: "open",
    review: "requested",
    issue: "AS-9",
    reviewers: [{ who: ME }],
    checks: PASSING,
    age: "1h",
    body: `## Summary

Adds a Problem page to the dashboard docs, so the hypothesis behind every KPI is one click away from the chart that measures it.

## Changes

- **docs/problem.md** states the problem, the hypothesis and how we'll know we're wrong
- **ProblemCallout** shows the hypothesis above the KPI table`,
    files: [
      file("apps/web/src/components/problem-callout.tsx", "react-ts", hunk(1, `+ import { Callout } from "@as/design-system";
+ import { useHypothesis } from "../hooks/use-hypothesis";
+
+ export function ProblemCallout() {
+   const hypothesis = useHypothesis();
+   if (!hypothesis) return null;
+   return <Callout title="Hypothesis">{hypothesis.statement}</Callout>;
+ }`)),
      file("docs/problem.md", "markdown", hunk(1, `+ # Problem statement
+
+ Product and design teams can't see how people use the product.
+ Insights are scattered across analytics, research docs and feedback.`)),
    ],
    labels: [LABELS.feature],
    activity: [
      ...did(
        PEOPLE.maya,
        "1h",
        { type: "opened" },
        commit("5b1e0aa", "Write the problem statement"),
        commit("d93f7c1", "Show the hypothesis above the KPI table"),
        { type: "linked", issue: "AS-9" },
      ),
      ...did(PEOPLE.maya, "50m", label(LABELS.feature), label(LABELS.documentation), label(LABELS.documentation, true), { type: "requested", who: ME }),
      {
        kind: "comment",
        who: PEOPLE.priya,
        age: "40m",
        body: "Love having the hypothesis next to the numbers. Should the callout link to the problem page?",
        replies: [{ who: PEOPLE.maya, age: "35m", body: "Yes, pushing that in a sec." }],
      },
    ],
  },
  {
    number: 9,
    project: "assistant",
    repo: "ux-research-assistant",
    title: "Competitor benchmark matrix",
    author: PEOPLE.cursor,
    branch: "cursor/as-24-benchmark-matrix",
    state: "open",
    review: "requested",
    issue: "AS-24",
    reviewers: [{ who: ME }, { who: PEOPLE.priya }],
    checks: [...PASSING.slice(0, 2), { name: "Unit tests", state: "running", detail: "131 of 214 tests", duration: "32s" }],
    age: "2h",
    body: `## Summary

Builds a benchmark matrix from the competitor notes: one row per product, one column per research question, each cell linking to its source.`,
    files: [
      file("assistant/benchmark.py", "python", hunk(41, `  def summarize(notes: list[Note]) -> Summary:
-     return Summary.from_notes(notes)
+     matrix = BenchmarkMatrix.from_notes(notes)
+     return Summary.from_notes(notes, matrix=matrix)`)),
    ],
    labels: [LABELS.research],
    activity: [
      ...did(
        PEOPLE.cursor,
        "2h",
        { type: "opened", onBehalfOf: PEOPLE.priya },
        commit("3c9a1f0", "Build the benchmark matrix"),
        { type: "linked", issue: "AS-24" },
        { type: "requested", who: ME },
        { type: "requested", who: PEOPLE.priya },
      ),
      {
        kind: "session",
        agent: PEOPLE.cursor,
        by: PEOPLE.priya,
        age: "2h",
        status: "finished",
        diff: 9,
        title: "Benchmark matrix from the competitor notes",
        output: `Built the benchmark matrix for AS-24.

Summary:

- Added \`BenchmarkMatrix\`: one row per product, one column per research question
- Every cell links to the note it came from
- \`summarize\` now passes the matrix along with the notes

Validation:

- Ran \`pytest assistant/\`: 18 passed
- Checked the matrix against the five products in \`competitors.md\`

**Repository:** \`ux-research-assistant\`
**Branch:** \`cursor/as-24-benchmark-matrix\``,
      },
      ...did(PEOPLE.priya, "1h", label(LABELS.research)),
    ],
  },
  {
    number: 21,
    project: "onboarding",
    repo: "onboarding-flows",
    title: "Track step completion events",
    author: PEOPLE.jordan,
    branch: "jordan/step-events",
    state: "open",
    review: "requested",
    reviewers: [{ who: ME }],
    checks: PASSING,
    age: "5h",
    body: `## Summary

Every onboarding step now reports \`step_completed\` with the flow, the step and the time it took.`,
    files: [
      file("flows/track.ts", "typescript", hunk(12, `  export function completeStep(flow: Flow, step: Step) {
+   track("step_completed", { flow: flow.id, step: step.id, ms: step.elapsed() });
    flow.advance();
  }`)),
    ],
    labels: [LABELS.analytics],
    activity: [
      ...did(PEOPLE.jordan, "5h", { type: "opened" }, commit("71be0d4", "Track step_completed with its duration")),
      ...did(
        PEOPLE.jordan,
        "4h",
        label(LABELS.analytics),
        label(LABELS.bug),
        label(LABELS.bug, true),
        label(LABELS.frontend),
        label(LABELS.frontend, true),
        { type: "requested", who: ME },
      ),
    ],
  },
  {
    number: 12,
    project: "dashboard",
    repo: "insight-dashboard",
    title: "Persona cards on the insights overview",
    author: PEOPLE.priya,
    branch: "priya/as-11-persona-cards",
    state: "open",
    review: "changes",
    issue: "AS-11",
    reviewers: [{ who: ME, verdict: "changes", delegate: PEOPLE.cursor }, { who: PEOPLE.maya, verdict: "approved" }],
    checks: [
      { name: "Build", state: "passed", duration: "1m 4s" },
      { name: "Lint", state: "failed", detail: "3 errors in OnboardingChecklist.tsx", duration: "21s" },
      { name: "Unit tests", state: "passed", detail: "198 tests", duration: "45s" },
    ],
    age: "4h",
    body: `## Summary

The overview now opens with the internal personas from AS-11, each with the three metrics that matter most to them.

## Changes

- **PersonaCard** shows a persona's goal and their top metrics
- **InsightsOverview** lays the cards out above the charts
- Personas load once per session and are cached for the charts below

## Review follow-ups

- **Empty states**: a persona without metrics shows "No data yet" instead of zeros`,
    files: [
      file("apps/web/src/components/persona-card.tsx", "react-ts", hunk(1, `+ import type { Persona } from "@as/metrics";
+ import { MetricRow } from "./metric-row";
+
+ export function PersonaCard({ persona }: { persona: Persona }) {
+   return (
+     <article className="persona-card">
+       <h3>{persona.name}</h3>
+       <p className="goal">{persona.goal}</p>
+       {persona.metrics.slice(0, 3).map((m) => (
+         <MetricRow key={m.id} metric={m} />
+       ))}
+     </article>
+   );
+ }`)),
      file("apps/web/src/views/insights-overview.tsx", "react-ts", [
        ...hunk(1, `  import { Charts } from "../charts";
+ import { PersonaCard } from "../components/persona-card";
  import { usePersonas } from "../hooks/use-personas";`),
        ...hunk(4, `@@ 208`),
        ...hunk(212, `  export function InsightsOverview() {
    const personas = usePersonas();
-   // personas are loaded but not shown yet
-   return <Charts />;
+   return (
+     <>
+       <section className="personas">{personas.map((p) => <PersonaCard key={p.id} persona={p} />)}</section>
+       <Charts />
+     </>
+   );
  }`),
      ]),
      file("apps/web/src/hooks/use-personas.ts", "typescript", hunk(8, `  export function usePersonas() {
-   const { data } = useQuery({ queryKey: ["personas"], queryFn: fetchPersonas });
+   const { data } = useQuery({ queryKey: ["personas"], queryFn: fetchPersonas, staleTime: Infinity });
    return data ?? [];
  }`)),
      deleted(
        "apps/web/src/components/persona-list.tsx",
        "react-ts",
        `export function PersonaList({ personas }: { personas: Persona[] }) {
  return (
    <ul>
      {personas.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}`,
      ),
      binary("apps/web/public/personas/placeholder.png", { after: "12 KB" }),
    ],
    behind: 2,
    labels: [LABELS.frontend, LABELS.feature],
    activity: [
      ...did(
        PEOPLE.priya,
        "1d",
        { type: "opened" },
        commit("a41c9e2", "Add PersonaCard component"),
        commit("e7b03d1", "Show personas above the charts"),
        commit("9fd28a4", "Cache personas for the session"),
        { type: "linked", issue: "AS-11" },
      ),
      ...did(PEOPLE.linear, "1d", { type: "deployed", url: "insight-dashboard-12.preview.asmobbin.app" }),
      ...did(PEOPLE.priya, "23h", label(LABELS.frontend), label(LABELS.feature), { type: "requested", who: ME }, { type: "requested", who: PEOPLE.maya }),
      ...did(PEOPLE.maya, "22h", label(LABELS.performance), label(LABELS.performance, true)),
      {
        kind: "review",
        who: PEOPLE.maya,
        age: "6h",
        verdict: "approved",
        body: "Lovely. One nit inline, not blocking.",
        threads: [
          {
            path: "apps/web/src/components/persona-card.tsx",
            line: 10,
            resolved: true,
            comments: [
              { who: PEOPLE.maya, age: "6h", body: "Could `MetricRow` take the persona's color, so each card reads at a glance?" },
              { who: PEOPLE.priya, age: "5h", body: "Good call. I'll do it in a follow-up, AS-31." },
            ],
          },
        ],
      },
      {
        kind: "review",
        who: ME,
        age: "4h",
        verdict: "changes",
        body: "Cards look great. Two things before this goes in:",
        threads: [
          {
            path: "apps/web/src/views/insights-overview.tsx",
            line: 216,
            comments: [
              {
                who: ME,
                age: "4h",
                body: "A persona without metrics renders three zeros here. Can we show an empty state instead?",
              },
              { who: PEOPLE.priya, age: "3h", body: "Yes, adding \"No data yet\" now.", reactions: [{ emoji: "👍", count: 1 }] },
            ],
          },
          {
            path: "apps/web/src/hooks/use-personas.ts",
            line: 9,
            comments: [
              {
                who: ME,
                age: "4h",
                body: "`staleTime: Infinity` means a new persona never shows up until a reload. Maybe ten minutes?",
              },
            ],
          },
        ],
      },
      ...did(ME, "4h", { type: "delegated", to: PEOPLE.cursor }),
      {
        kind: "session",
        agent: PEOPLE.cursor,
        by: ME,
        age: "4h",
        status: "finished",
        diff: 12,
        title: "Reviewed the persona cards for AS-11",
        output: `Reviewed the persona cards for AS-11, against the issue and Maya's approval.

Findings:

- **Empty state**: a persona without metrics renders three zeros in \`PersonaCard\`; it should say "No data yet".
- **Stale personas**: \`staleTime: Infinity\` in \`usePersonas\` keeps a new persona out until a reload.
- **Lint**: \`persona-card.tsx\` fails on an unused import, which is why the check is red.

Suggested changes:

- Show "No data yet" when \`persona.metrics\` is empty
- Use a ten minute \`staleTime\`
- Drop the unused \`Persona\` import

Validation:

- Ran \`pnpm --filter web test\`: 42 passed
- Ran \`pnpm --filter web lint\`: 1 error, the import above

Requested changes on your behalf, with both findings as threads.

**Repository:** \`insight-dashboard\`
**Branch:** \`priya/as-11-persona-cards\``,
      },
      ...did(PEOPLE.linear, "4h", { type: "check-failed", check: "Lint", file: "persona-card.tsx" }),
      {
        kind: "comment",
        who: PEOPLE.jordan,
        age: "3h",
        body: "Heads up: #11 changed what `usePersonas` returns, so this needs a rebase before it merges.",
        reactions: [{ emoji: "👍", count: 2 }, { emoji: "🙏", count: 1 }],
        replies: [{ who: PEOPLE.priya, age: "2h", body: "Thanks, rebasing after the empty state lands." }],
      },
      ...did(PEOPLE.priya, "2h", commit("c02e6f8", "Empty state for personas without metrics")),
    ],
  },
  {
    number: 7,
    project: "design",
    repo: "design-system",
    title: "Token scale for spacing and radius",
    author: PEOPLE.sam,
    branch: "sam/token-scale",
    state: "open",
    review: "reviewing",
    reviewers: [{ who: ME, verdict: "commented" }],
    checks: PASSING,
    age: "1d",
    body: `## Summary

Replaces one-off spacing and radius values with a 4px scale.`,
    files: [
      file("tokens/space.css", "css", hunk(1, `  :root {
-   --space-card: 14px;
+   --space-3: 12px;
+   --space-4: 16px;
    --radius-card: 8px;
  }`)),
    ],
    labels: [LABELS.frontend],
    activity: [
      ...did(PEOPLE.sam, "2d", { type: "opened" }, commit("e40d2b7", "Spacing and radius on a 4px scale"), { type: "requested", who: ME }),
      {
        kind: "review",
        who: ME,
        age: "1d",
        verdict: "commented",
        threads: [
          {
            path: "tokens/space.css",
            line: 2,
            comments: [
              { who: ME, age: "1d", body: "Should `--space-3` be 12 or 14? The card used 14." },
              { who: PEOPLE.sam, age: "1d", body: "12, to stay on the 4px scale. The card will look a hair tighter." },
            ],
          },
        ],
      },
    ],
  },
  {
    number: 11,
    project: "dashboard",
    repo: "insight-dashboard",
    title: "KPI definitions for success metrics",
    author: PEOPLE.maya,
    branch: "maya/as-10-kpis",
    state: "merged",
    review: "done",
    issue: "AS-10",
    reviewers: [{ who: ME, verdict: "approved" }],
    checks: PASSING,
    age: "2d",
    body: `## Summary

Defines activation, retention and depth of use in \`packages/metrics\`, each with its query and owner.`,
    files: [
      file("packages/metrics/src/kpis.ts", "typescript", hunk(1, `+ export const KPIS = [
+   { id: "activation", owner: "Maya Chen", query: activationQuery },
+   { id: "retention", owner: "Jordan Lee", query: retentionQuery },
+ ];`)),
    ],
    labels: [LABELS.analytics, LABELS.feature],
    activity: [
      ...did(PEOPLE.maya, "3d", { type: "opened" }, commit("b8d1c35", "Define activation, retention and depth"), { type: "linked", issue: "AS-10" }, { type: "requested", who: ME }),
      { kind: "review", who: ME, age: "2d", verdict: "approved", body: "Clear definitions, and each has an owner. Ship it.", threads: [] },
      ...did(PEOPLE.maya, "2d", { type: "merged", into: "main" }),
    ],
  },
  {
    number: 5,
    project: "dashboard",
    repo: "insight-dashboard",
    title: "New project logo assets",
    author: PEOPLE.jordan,
    branch: "jordan/as-5-logo",
    state: "closed",
    review: "done",
    issue: "AS-5",
    reviewers: [{ who: ME }],
    checks: PASSING,
    age: "4d",
    body: `Superseded by the logo refresh in the design system.`,
    files: [],
    labels: [],
    activity: [
      ...did(PEOPLE.jordan, "5d", { type: "opened" }, commit("09fa6e1", "Add the new logo files"), { type: "linked", issue: "AS-5" }),
      ...did(PEOPLE.jordan, "4d", { type: "closed" }),
    ],
  },
  {
    number: 15,
    project: "dashboard",
    repo: "insight-dashboard",
    title: "Alignment summary document template",
    author: ME,
    branch: "alex/as-12-alignment",
    state: "draft",
    review: "waiting",
    issue: "AS-12",
    reviewers: [],
    checks: [{ name: "Build", state: "running", detail: "Compiling", duration: "40s" }],
    age: "20m",
    body: `Draft: a template for the alignment summary, so every project starts from the same questions.`,
    files: [
      file("docs/templates/alignment.md", "markdown", hunk(1, `+ # Alignment summary
+
+ - What problem are we solving?
+ - Who is it for?
+ - How will we know it worked?`)),
    ],
    labels: [LABELS.documentation],
    activity: [...did(ME, "20m", { type: "opened", draft: true }, commit("5e2a9c0", "Start the alignment template"), { type: "linked", issue: "AS-12" }, label(LABELS.documentation))],
  },
  {
    // the demo diff: what Linear's agent opens from the Agent chat, big enough to read as real work
    number: 24,
    project: "dashboard",
    repo: "insight-dashboard",
    title: "Compare KPIs with the previous period",
    author: ME,
    branch: "alex/as-33-compare-previous-period",
    state: "draft",
    review: "waiting",
    issue: "AS-33",
    reviewers: [],
    checks: [
      { name: "Build", state: "passed", duration: "1m 4s" },
      { name: "Lint", state: "passed", duration: "21s" },
      { name: "Type check", state: "passed", duration: "38s" },
      { name: "Unit tests", state: "passed", detail: "221 tests", duration: "49s" },
      { name: "Preview", state: "passed", detail: "insight-dashboard-24.preview.asmobbin.app", duration: "1m 52s" },
    ],
    age: "1m",
    body: `Every KPI can now be read against the period before it. The comparison is computed in \`@insight/metrics\` and shown as a change badge, green when the metric moved the right way.

## Changes

- **compare.ts** adds \`previousRange\` and \`compare\` to the metrics package
- **use-metric.ts** fetches the previous range when comparing is on
- **kpi-table.tsx** adds Previous and Change columns, with a toggle in the header
- **delta-badge.tsx** replaces \`TrendArrow\`
- **format.ts** moves into the metrics package and keeps a decimal

## Testing

- \`pnpm vitest run\` (221 tests)
- Checked March against February on the preview, with the toggle on and off`,
    files: [
      file("packages/metrics/src/compare.ts", "typescript", hunk(1, `+ import { shiftRange, type DateRange } from "./range";
+ import type { Series } from "./series";
+ 
+ export type Comparison = {
+   current: number;
+   previous: number;
+   /** relative change, or null when there's nothing to compare against */
+   delta: number | null;
+ };
+ 
+ /** The range just before \`range\`, of the same length: Mar 1–31 compares with Jan 29–Feb 28. */
+ export function previousRange(range: DateRange): DateRange {
+   return shiftRange(range, -range.days());
+ }
+ 
+ export function compare(current: Series, previous: Series): Comparison {
+   const now = current.total();
+   const before = previous.total();
+   return {
+     current: now,
+     previous: before,
+     delta: before === 0 ? null : (now - before) / before,
+   };
+ }`)),
      file("packages/metrics/src/range.ts", "typescript", hunk(1, `- import { endOfDay, startOfDay } from "date-fns";
+ import { addDays, endOfDay, startOfDay } from "date-fns";
  import { DateRange } from "./date-range";
@@ 14
  export function rangeOf(from: Date, to: Date): DateRange {
    return new DateRange(startOfDay(from), endOfDay(to));
  }
+ 
+ /** The same range moved by \`days\`; negative goes back. */
+ export function shiftRange(range: DateRange, days: number): DateRange {
+   return new DateRange(addDays(range.from, days), addDays(range.to, days));
+ }`)),
      file("packages/metrics/src/index.ts", "typescript", hunk(1, `  export * from "./kpis";
  export * from "./range";
  export * from "./series";
+ export * from "./compare";
+ export * from "./format";`)),
      renamed("apps/web/src/lib/format.ts", "packages/metrics/src/format.ts", "typescript", hunk(9, `  export function formatPercent(value: number) {
-   return \`\${Math.round(value * 100)}%\`;
+   return \`\${value > 0 ? "+" : ""}\${(value * 100).toFixed(1)}%\`;
  }`)),
      file("apps/web/src/types/filter.ts", "typescript", hunk(3, `  export type Filter = {
    range: DateRange;
    segment: Segment;
+   /** show each KPI next to the period before it */
+   compare: boolean;
  };`)),
      file("apps/web/src/components/filter-bar.tsx", "react-ts", hunk(14, `    const [filter, setFilter] = useState<Filter>({
      range: lastDays(30),
      segment: "all",
+     compare: true,
    });`)),
      file("apps/web/src/hooks/use-metric.ts", "typescript", hunk(1, `- import { type Kpi } from "@insight/metrics";
+ import { compare, previousRange, type Comparison, type Kpi } from "@insight/metrics";
  import { useQuery } from "@tanstack/react-query";
  import { fetchSeries } from "../queries/series";
@@ 2
- export function useMetric(kpi: Kpi, filter: Filter) {
-   const { data } = useQuery({ queryKey: ["series", kpi.id, filter], queryFn: () => fetchSeries(kpi, filter.range) });
-   return data?.total();
+ export function useMetric(kpi: Kpi, filter: Filter): Comparison | undefined {
+   const current = useQuery({ queryKey: ["series", kpi.id, filter.range], queryFn: () => fetchSeries(kpi, filter.range) });
+   const before = previousRange(filter.range);
+   const previous = useQuery({
+     queryKey: ["series", kpi.id, before],
+     queryFn: () => fetchSeries(kpi, before),
+     enabled: filter.compare,
+   });
+   if (!current.data) return undefined;
+   return compare(current.data, previous.data ?? current.data.empty());
  }`)),
      file("apps/web/src/components/compare-toggle.tsx", "react-ts", hunk(1, `+ import { formatRange, previousRange } from "@insight/metrics";
+ import { useFilter } from "../hooks/use-filter";
+ 
+ /** "Compare with Jan 29 – Feb 28": the switch in the KPI table's header. */
+ export function CompareToggle({ filter }: { filter: Filter }) {
+   const { setFilter } = useFilter();
+   return (
+     <label className="compare-toggle">
+       <input
+         type="checkbox"
+         checked={filter.compare}
+         onChange={(e) => setFilter({ ...filter, compare: e.target.checked })}
+       />
+       Compare with {formatRange(previousRange(filter.range))}
+     </label>
+   );
+ }`)),
      file("apps/web/src/components/kpi-table.tsx", "react-ts", hunk(1, `  import { KPIS, type Kpi } from "@insight/metrics";
+ import { CompareToggle } from "./compare-toggle";
  import { MetricRow } from "./metric-row";
@@ 3
  export function KpiTable({ filter }: { filter: Filter }) {
    const rows = KPIS.map((kpi: Kpi) => ({ kpi, value: useMetric(kpi, filter) }));
    return (
      <section className="kpi-table">
+       <header className="kpi-table__header">
+         <h2>Key metrics</h2>
+         <CompareToggle filter={filter} />
+       </header>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
-             <th>Trend</th>
+             {filter.compare && <th>Previous</th>}
+             <th>Change</th>
            </tr>
          </thead>
          <tbody>
-           {rows.map(({ kpi, value }) => <MetricRow key={kpi.id} kpi={kpi} value={value} />)}
+           {rows.map(({ kpi, value }) => (
+             <MetricRow key={kpi.id} kpi={kpi} value={value} compare={filter.compare} />
+           ))}
          </tbody>`)),
      file("apps/web/src/components/metric-row.tsx", "react-ts", hunk(1, `- import { TrendArrow } from "./trend-arrow";
+ import { formatNumber, type Comparison } from "@insight/metrics";
+ import { DeltaBadge } from "./delta-badge";
@@ 2
- export function MetricRow({ kpi, value }: { kpi: Kpi; value?: number }) {
+ export function MetricRow({ kpi, value, compare }: { kpi: Kpi; value?: Comparison; compare: boolean }) {
    return (
      <tr>
        <td>{kpi.label}</td>
-       <td>{value ?? "—"}</td>
-       <td><TrendArrow value={value} /></td>
+       <td>{value ? formatNumber(value.current, kpi.unit) : "—"}</td>
+       {compare && <td className="muted">{value ? formatNumber(value.previous, kpi.unit) : "—"}</td>}
+       <td><DeltaBadge delta={value?.delta ?? null} goodWhen={kpi.goodWhen} /></td>
      </tr>
    );
  }`)),
      file("apps/web/src/components/delta-badge.tsx", "react-ts", hunk(1, `+ import { formatPercent } from "@insight/metrics";
+ 
+ type Props = { delta: number | null; goodWhen: "up" | "down" };
+ 
+ /** The change against the previous period, green when it moved the right way. */
+ export function DeltaBadge({ delta, goodWhen }: Props) {
+   if (delta === null) return <span className="delta delta--none">No data</span>;
+   const good = goodWhen === "up" ? delta >= 0 : delta <= 0;
+   return (
+     <span className={\`delta \${good ? "delta--good" : "delta--bad"}\`}>
+       {delta >= 0 ? "▲" : "▼"} {formatPercent(delta)}
+     </span>
+   );
+ }`)),
      deleted("apps/web/src/components/trend-arrow.tsx", "react-ts", `export function TrendArrow({ value }: { value?: number }) {
  if (value === undefined) return null;
  return (
    <svg className="trend-arrow" viewBox="0 0 12 12" aria-hidden>
      <path d="M6 2v8M2 6l4-4 4 4" />
    </svg>
  );
}`),
      file("apps/web/src/styles/kpi.css", "css", hunk(22, `  .kpi-table th {
    text-align: left;
    color: var(--muted);
  }
+ 
+ .kpi-table__header {
+   display: flex;
+   align-items: center;
+   justify-content: space-between;
+ }
+ 
+ .delta {
+   font-variant-numeric: tabular-nums;
+   font-weight: 500;
+ }
+ 
+ .delta--good { color: var(--green); }
+ .delta--bad { color: var(--red); }
+ .delta--none { color: var(--muted); }
- 
- .trend-arrow {
-   width: 12px;
-   height: 12px;
- }`)),
      file("tests/compare.test.ts", "typescript", hunk(1, `+ import { describe, expect, test } from "vitest";
+ import { compare, previousRange, rangeOf } from "@insight/metrics";
+ import { series } from "./fixtures";
+ 
+ describe("previousRange", () => {
+   test("is the same length, just before", () => {
+     const march = rangeOf(new Date("2026-03-01"), new Date("2026-03-31"));
+     expect(previousRange(march)).toEqual(rangeOf(new Date("2026-01-29"), new Date("2026-02-28")));
+   });
+ });
+ 
+ describe("compare", () => {
+   test("gives the relative change", () => {
+     expect(compare(series(120), series(100)).delta).toBeCloseTo(0.2);
+   });
+ 
+   test("has no change against an empty period", () => {
+     expect(compare(series(40), series(0)).delta).toBeNull();
+   });
+ });`)),
      file("CHANGELOG.md", "markdown", hunk(1, `  # Changelog
  
+ ## Unreleased
+ 
+ - Every KPI can be compared with the period before it, its change colored by whether it moved the right way.
+ - The change badge replaces the trend arrows.
+ 
  ## 0.8.0`)),
    ],
    labels: [LABELS.frontend, LABELS.feature],
    activity: [
      ...did(ME, "2m", { type: "linked", issue: "AS-33" }),
      ...did(
        PEOPLE.linear,
        "1m",
        { type: "opened", draft: true },
        commit("a3f9c21", "Compute the previous period in @insight/metrics"),
        commit("7be04d9", "Show previous and change columns in the KPI table"),
        commit("4e1c0a2", "Replace TrendArrow with DeltaBadge"),
      ),
      {
        kind: "session",
        agent: PEOPLE.linear,
        by: ME,
        age: "1m",
        status: "finished",
        diff: 24,
        title: "Compare KPIs with the previous period",
        output: `Every KPI now compares with the previous period: \`previousRange\` and \`compare\` in \`@insight/metrics\`, Previous and Change columns in the KPI table, and \`DeltaBadge\` in place of \`TrendArrow\`. Biome, TypeScript and the unit tests pass; opened draft diff #24.`,
      },
    ],
  },
  {
    number: 22,
    project: "dashboard",
    repo: "insight-dashboard",
    title: "Session replay links on the funnel chart",
    author: ME,
    branch: "alex/funnel-replays",
    state: "open",
    review: "waiting",
    reviewers: [
      { who: PEOPLE.maya, verdict: "approved" },
      { who: PEOPLE.jordan, verdict: "approved" },
    ],
    checks: PASSING,
    age: "1d",
    body: `## Summary

Each step of the funnel chart links to three session replays of people who dropped off there, so a drop-off comes with a reason to watch.

## Changes

- **FunnelStep** shows a replays link on hover
- **useReplays** fetches the sessions for a step, newest first`,
    files: [
      file("apps/web/src/charts/funnel-step.tsx", "react-ts", hunk(18, `    <div className="funnel-step">
      <StepBar step={step} />
+     <ReplaysLink step={step} limit={3} />
    </div>`)),
      file("apps/web/src/hooks/use-replays.ts", "typescript", hunk(1, `+ export function useReplays(step: Step, limit = 3) {
+   return useQuery({ queryKey: ["replays", step.id], queryFn: () => fetchReplays(step.id, limit) });
+ }`)),
    ],
    labels: [LABELS.feature, LABELS.analytics],
    activity: [
      ...did(ME, "1d", { type: "opened" }, commit("5c2e8a1", "Link funnel steps to session replays"), commit("b04d7f3", "Fetch replays per step")),
      ...did(ME, "1d", { type: "requested", who: PEOPLE.maya }, { type: "requested", who: PEOPLE.jordan }, label(LABELS.feature), label(LABELS.analytics)),
      { kind: "review", who: PEOPLE.maya, age: "20h", verdict: "approved", body: "Watching a drop-off right from the chart is great.", threads: [] },
      { kind: "review", who: PEOPLE.jordan, age: "18h", verdict: "approved", threads: [] },
    ],
  },
  {
    number: 23,
    project: "assistant",
    repo: "ux-research-assistant",
    title: "Retry failed transcript exports",
    author: ME,
    branch: "alex/export-retries",
    state: "open",
    review: "waiting",
    reviewers: [{ who: PEOPLE.priya, verdict: "changes" }],
    checks: [
      { name: "Build", state: "passed", duration: "58s" },
      { name: "Lint", state: "passed", duration: "19s" },
      { name: "Unit tests", state: "failed", detail: "1 of 88 failed in test_export.py", duration: "41s" },
    ],
    age: "2d",
    body: `Retries a failed transcript export up to three times with backoff, instead of dropping it.`,
    files: [
      file("assistant/export.py", "python", hunk(30, `  def export(transcript: Transcript) -> None:
-     upload(transcript.to_pdf())
+     retry(lambda: upload(transcript.to_pdf()), tries=3, backoff=2.0)`)),
    ],
    labels: [LABELS.research],
    activity: [
      ...did(ME, "2d", { type: "opened" }, commit("e18c4b9", "Retry transcript exports with backoff"), { type: "requested", who: PEOPLE.priya }),
      {
        kind: "review",
        who: PEOPLE.priya,
        age: "1d",
        verdict: "changes",
        body: "A retry that uploads the same PDF twice will leave duplicates. Can the upload be idempotent first?",
        threads: [],
      },
    ],
  },
  {
    number: 3,
    project: "assistant",
    repo: "ux-research-assistant",
    title: "Import legacy research notes",
    author: ME,
    branch: "alex/import-notes",
    state: "open",
    review: "waiting",
    reviewers: [{ who: PEOPLE.priya }],
    checks: PASSING,
    age: "3h",
    body: `Imports the research notes from the old wiki, keeping each note's author and date.`,
    files: [
      file("assistant/importers/wiki.py", "python", hunk(1, `+ def import_wiki(path: Path) -> list[Note]:
+     return [Note.from_page(page) for page in Wiki(path).pages()]`)),
    ],
    labels: [LABELS.research],
    activity: [
      ...did(ME, "3h", { type: "opened" }, commit("d4417ab", "Import notes from the old wiki"), { type: "requested", who: PEOPLE.jordan }),
      ...did(ME, "2h", { type: "unrequested", who: PEOPLE.jordan }, { type: "requested", who: PEOPLE.priya }, label(LABELS.research)),
    ],
  },
  {
    number: 16,
    project: "performance",
    repo: "insight-dashboard",
    title: "Virtualize the events table",
    author: PEOPLE.jordan,
    branch: "jordan/as-31-virtual-events",
    state: "open",
    review: "requested",
    issue: "AS-31",
    reviewers: [{ who: ME }, { who: PEOPLE.maya }],
    checks: PASSING,
    age: "3h",
    body: `## Summary

The events table rendered every row it loaded; it now renders only what's on screen, so a day of events scrolls at 60fps.

## Changes

- **EventsTable** windows its rows with a fixed 36px row height
- Row heights no longer depend on their content`,
    files: [
      renamed("apps/web/src/components/events-table.tsx", "apps/web/src/components/events/events-table.tsx", "react-ts", hunk(12, `  export function EventsTable({ events }: { events: Event[] }) {
-   return <Table rows={events} />;
+   const rows = useVirtualRows(events, { rowHeight: 36 });
+   return <Table rows={rows.visible} offset={rows.offset} total={rows.height} />;
  }`)),
    ],
    labels: [LABELS.performance, LABELS.frontend],
    activity: [
      ...did(PEOPLE.jordan, "3h", { type: "opened" }, commit("f3a90c2", "Window the events table"), { type: "linked", issue: "AS-31" }),
      ...did(PEOPLE.jordan, "3h", label(LABELS.performance), label(LABELS.frontend), { type: "requested", who: ME }, { type: "requested", who: PEOPLE.maya }),
    ],
  },
  {
    number: 17,
    project: "design",
    repo: "insight-dashboard",
    title: "Adopt the 4px spacing tokens",
    author: PEOPLE.sam,
    branch: "sam/dashboard-tokens",
    state: "draft",
    review: "waiting",
    reviewers: [],
    checks: [{ name: "Build", state: "running", detail: "Installing dependencies", duration: "12s" }],
    age: "1h",
    body: `Draft: moves the dashboard onto the design system's 4px spacing scale from #7.`,
    files: [
      file("apps/web/src/styles/cards.css", "css", hunk(1, `  .card {
-   padding: 14px;
+   padding: var(--space-3);
  }`)),
    ],
    labels: [LABELS.frontend],
    activity: [...did(PEOPLE.sam, "1h", { type: "opened", draft: true }, commit("2b7d4e1", "Use the spacing tokens on cards"))],
  },
  {
    number: 19,
    project: "performance",
    repo: "insight-dashboard",
    title: "Rebuild the insights queries on the warehouse API",
    author: PEOPLE.jordan,
    branch: "jordan/as-32-warehouse-queries",
    state: "open",
    review: "requested",
    issue: "AS-32",
    reviewers: [
      { who: ME, verdict: "commented", delegate: PEOPLE.cursor },
      { who: PEOPLE.maya, verdict: "approved" },
      { who: PEOPLE.priya, verdict: "changes" },
      { who: PEOPLE.sam },
    ],
    checks: [
      { name: "Build", state: "passed", duration: "1m 18s" },
      { name: "Typecheck", state: "passed", duration: "36s" },
      { name: "Lint", state: "passed", duration: "22s" },
      { name: "Unit tests", state: "failed", detail: "2 of 226 failed in insights.test.ts", duration: "52s" },
      { name: "E2E", state: "running", detail: "18 of 40 specs", duration: "3m" },
      { name: "Preview", state: "passed", detail: "insight-dashboard-19.preview.asmobbin.app", duration: "2m 6s" },
    ],
    age: "3d",
    behind: 6,
    body: `## Summary

The overview ran eleven queries on every load, each straight against the events table. They now go through the warehouse API: one batched request per view, cached per filter, so the overview opens in under a second on a year of data.

## Changes

- **WarehouseClient** batches the queries a view needs into one request and retries on 429s
- **insightsQueries** describes each chart's query once, with its cache key
- **InsightsOverview** asks for its queries together and renders as they land
- **KPIS** reads from the same client, so the KPI table and the charts agree

## Rollout

- Behind \`warehouse_queries\`, on for the team this week
- The old queries stay until the flag is gone, so we can compare numbers side by side

## Open questions

- Should a failed batch fall back to the old queries, or show the error per chart?
- Cache per filter, or per filter and user?`,
    files: [
      file("apps/web/src/queries/warehouse-client.ts", "typescript", hunk(1, `+ import { backoff } from "@as/retry";
+
+ export class WarehouseClient {
+   constructor(private readonly url: string, private readonly token: string) {}
+
+   async batch(queries: Query[]): Promise<Result[]> {
+     const res = await backoff(() => fetch(\`\${this.url}/batch\`, {
+       method: "POST",
+       headers: { authorization: \`Bearer \${this.token}\` },
+       body: JSON.stringify({ queries }),
+     }), { on: [429, 503], tries: 4 });
+     if (!res.ok) throw new WarehouseError(res.status);
+     return res.json();
+   }
+ }`)),
      file("apps/web/src/queries/insights.ts", "typescript", hunk(1, `+ export const insightsQueries = (filter: Filter) => [
+   { key: ["sessions", filter], sql: sessionsByDay(filter) },
+   { key: ["patterns", filter], sql: topPatterns(filter, 20) },
+   { key: ["dropoff", filter], sql: dropoffByStep(filter) },
+   { key: ["retention", filter], sql: weeklyRetention(filter) },
+ ];`)),
      file("apps/web/src/views/insights-overview.tsx", "react-ts", [
        ...hunk(1, `  import { Charts } from "../charts";
- import { useInsights } from "../hooks/use-insights";
+ import { useWarehouse } from "../hooks/use-warehouse";
+ import { insightsQueries } from "../queries/insights";`),
        ...hunk(4, `@@ 210`),
        ...hunk(214, `  export function InsightsOverview({ filter }: { filter: Filter }) {
-   const insights = useInsights(filter);
-   return <Charts data={insights} />;
+   const results = useWarehouse(insightsQueries(filter));
+   return <Charts data={results} pending={results.pending} />;
  }`),
      ]),
      file("packages/metrics/src/kpis.ts", "typescript", hunk(1, `  export const KPIS = [
-   { id: "activation", owner: "Maya Chen", query: activationQuery },
+   { id: "activation", owner: "Maya Chen", query: warehouse("activation") },
-   { id: "retention", owner: "Jordan Lee", query: retentionQuery },
+   { id: "retention", owner: "Jordan Lee", query: warehouse("retention") },
  ];`)),
      file("apps/web/src/queries/insights.test.ts", "typescript", hunk(1, `+ test("batches every query a view needs", async () => {
+   const client = fakeWarehouse();
+   await loadOverview(client, lastYear);
+   expect(client.requests).toHaveLength(1);
+ });`)),
      deleted(
        "apps/web/src/hooks/use-insights.ts",
        "typescript",
        `import { useQueries } from "@tanstack/react-query";
import { sessionsByDay, topPatterns, dropoffByStep, weeklyRetention } from "../legacy/queries";

/** One request per chart, in parallel; replaced by the warehouse batch. */
export function useInsights(filter: Filter) {
  return useQueries({
    queries: [sessionsByDay, topPatterns, dropoffByStep, weeklyRetention].map((q) => ({
      queryKey: [q.name, filter],
      queryFn: () => q(filter),
    })),
  });
}`,
      ),
      renamed("apps/web/src/hooks/use-insights-filter.ts", "apps/web/src/hooks/use-filter.ts", "typescript"),
      binary("apps/web/public/og/insights-overview.png", { before: "184 KB", after: "171 KB" }),
    ],
    labels: [LABELS.performance, LABELS.analytics, LABELS.frontend],
    activity: [
      ...did(
        PEOPLE.jordan,
        "3d",
        { type: "opened", draft: true },
        commit("a01f3c2", "Add WarehouseClient with batching"),
        commit("b77e910", "Describe the overview's queries once"),
        commit("c3d54a8", "Read KPIs through the warehouse"),
        commit("d9e02b6", "Retry on 429 and 503"),
        { type: "linked", issue: "AS-32" },
      ),
      ...did(PEOPLE.jordan, "3d", label(LABELS.performance), label(LABELS.frontend)),
      ...did(PEOPLE.linear, "3d", { type: "deployed", url: "insight-dashboard-19.preview.asmobbin.app" }),
      ...did(PEOPLE.jordan, "2d", commit("e41aa07", "Cache per filter"), commit("f5c2d19", "Render charts as their results land"), commit("0b8e6f3", "Tests for batching and retries")),
      ...did(PEOPLE.jordan, "2d", { type: "ready" }, { type: "requested", who: ME }, { type: "requested", who: PEOPLE.maya }, { type: "requested", who: PEOPLE.priya }),
      {
        kind: "comment",
        who: PEOPLE.maya,
        age: "2d",
        body: "@Jordan Lee the overview opens in 0.8s on the preview with a year of data, down from 6s. @Alex Smith this also fixes the KPI table disagreeing with the charts, since both read through `WarehouseClient` now.",
        reactions: [{ emoji: "🚀", count: 4 }, { emoji: "👏", count: 2 }],
        replies: [
          { who: PEOPLE.jordan, age: "2d", body: "That's the batching: eleven round trips became one. The cache does the rest on the second load." },
          { who: PEOPLE.priya, age: "2d", body: "Nice. Does the cache key include the filter's date range? I saw stale numbers after switching to last quarter." },
          { who: PEOPLE.jordan, age: "2d", body: "It didn't. Fixed in the next push, the key now has the whole `Filter`." },
          { who: PEOPLE.maya, age: "1d", body: "Confirmed on the preview, last quarter shows the right numbers now." },
        ],
      },
      {
        kind: "review",
        who: PEOPLE.priya,
        age: "2d",
        verdict: "changes",
        body: "The batching is great. Three things before this can go in, mostly about failure:",
        threads: [
          {
            path: "apps/web/src/queries/warehouse-client.ts",
            line: 12,
            comments: [
              { who: PEOPLE.priya, age: "2d", body: "One failed query fails the whole batch. Can a view still render the charts whose queries succeeded?" },
              { who: PEOPLE.jordan, age: "1d", body: "The API returns per-query errors with a 207, I'll surface those per chart." },
            ],
          },
          {
            path: "apps/web/src/queries/insights.ts",
            line: 3,
            resolved: true,
            comments: [
              { who: PEOPLE.priya, age: "2d", body: "`topPatterns(filter, 20)`: is 20 enough for the patterns chart? Design shows 25." },
              { who: PEOPLE.jordan, age: "2d", body: "Good catch, it's 25 in the next push." },
            ],
          },
          {
            path: "apps/web/src/queries/insights.test.ts",
            line: 4,
            comments: [{ who: PEOPLE.priya, age: "2d", body: "Could we also test a batch where one query fails?" }],
          },
        ],
      },
      ...did(PEOPLE.linear, "2d", { type: "check-failed", check: "Unit tests", file: "insights.test.ts" }),
      ...did(PEOPLE.jordan, "1d", commit("1c9d4e5", "Surface per-query errors per chart"), commit("2a6f8b0", "Patterns chart shows 25")),
      ...did(PEOPLE.jordan, "1d", { type: "updated", commits: 6 }),
      ...did(PEOPLE.maya, "1d", label(LABELS.bug), label(LABELS.bug, true), label(LABELS.ux), label(LABELS.ux, true), label(LABELS.analytics)),
      ...did(PEOPLE.jordan, "1d", { type: "unrequested", who: PEOPLE.priya }, { type: "requested", who: PEOPLE.priya }),
      { kind: "review", who: PEOPLE.maya, age: "20h", verdict: "approved", body: "Numbers match the old queries on every chart I checked, and the overview is fast. Approving from the product side.", threads: [] },
      ...did(ME, "18h", { type: "delegated", to: PEOPLE.cursor }),
      {
        kind: "session",
        agent: PEOPLE.cursor,
        by: ME,
        age: "18h",
        status: "finished",
        diff: 19,
        title: "Reviewed the warehouse queries for AS-32",
        output: `Reviewed the warehouse queries for AS-32 against the issue, Priya's review and the preview.

Findings:

- **Partial failures**: \`batch\` throws on any non-2xx, so a 207 with one failed query loses every chart. Priya's first thread is still open.
- **Retries**: \`backoff\` retries the whole batch on a 429, including queries that already succeeded.
- **Cache key**: now includes the full \`Filter\`; stale numbers after a date change are gone.
- **Tests**: \`insights.test.ts\` has no case for a partially failed batch, and the unit test run is red on the fake client's missing \`status\`.

Suggested changes:

- Parse 207 responses into per-query results, and let \`Charts\` show an error per chart
- Retry only the failed queries
- Give \`fakeWarehouse\` a \`status\` and add a partial-failure test

Validation:

- Ran \`pnpm --filter web test\`: 61 passed, 1 failed (\`batches every query a view needs\`)
- Loaded the preview overview on last year, last quarter and last week; every chart matched the old queries
- Compared the KPI table against the charts: they agree

Left a comment on your behalf with the partial-failure finding.

**Repository:** \`insight-dashboard\`
**Branch:** \`jordan/as-32-warehouse-queries\``,
      },
      {
        kind: "review",
        who: ME,
        age: "16h",
        verdict: "commented",
        body: "Cursor's pass matches what I see. One more on retries, otherwise I'm close to approving:",
        threads: [
          {
            path: "apps/web/src/queries/warehouse-client.ts",
            line: 11,
            comments: [
              { who: ME, age: "16h", body: "Retrying the whole batch on a 429 re-runs queries that already succeeded. Can we retry only the failed ones?" },
              { who: PEOPLE.jordan, age: "14h", body: "Yes, with the 207 parsing that falls out naturally. Doing both together." },
              { who: PEOPLE.sam, age: "12h", body: "+1, and maybe cap the batch at 20 queries so one view can't starve the others." },
            ],
          },
        ],
      },
      {
        kind: "comment",
        who: PEOPLE.sam,
        age: "12h",
        body: "From the design side: while a chart's query is pending it shows the skeleton, and with per-chart errors each chart can say \"Couldn't load\" with a retry. @Jordan Lee I'll add both states to the design system this week so you can drop them in.",
        reactions: [{ emoji: "🙏", count: 1 }],
      },
      ...did(PEOPLE.jordan, "12h", { type: "requested", who: PEOPLE.sam }),
      {
        kind: "session",
        agent: PEOPLE.linear,
        by: PEOPLE.jordan,
        age: "2h",
        status: "working",
        title: "Parse 207s into per-query results",
        output: `Working on per-query results for AS-32.

Plan:

- Parse 207 responses in \`WarehouseClient.batch\`
- Retry only the failed queries, at most four times
- Cap a batch at 20 queries
- Add a partial-failure test to \`insights.test.ts\`

Progress:

- Parsing and per-query retries are done
- The partial-failure test is written and passing locally
- Running the full suite now`,
      },
      ...did(PEOPLE.linear, "2h", { type: "check-failed", check: "Unit tests", file: "insights.test.ts" }),
      {
        kind: "comment",
        who: PEOPLE.jordan,
        age: "1h",
        body: "@Alex Smith @Priya Patel per-query errors and partial retries are in, plus the cap Sam suggested. Could you take another look? The unit test failure is the fake client, fixing it now.",
      },
      ...did(PEOPLE.jordan, "1h", commit("3e7c1d2", "Retry only failed queries, cap batches at 20")),
    ],
  },
];

/** The issues a diff can resolve, with the status their icon shows. */
export const ISSUE_STATUS: Record<string, StatusId> = {
  "AS-9": "started",
  "AS-11": "started",
  "AS-24": "started",
  "AS-10": "unstarted",
  "AS-5": "unstarted",
  "AS-12": "unstarted",
  "AS-31": "started",
  "AS-32": "started",
  "AS-33": "started",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MINUTES = { m: 1, h: 60, d: 1440, w: 10080 } as const;
/** The workspace's today, read off the Issues page: the newest issue was created Apr 1, and AS-9 is due tomorrow. */
const TODAY = { month: 3, day: 2 };

/**
 * When something happened, as Linear's lists show it: relative while it's
 * under a day old ("20m", "4h"), then the date ("Mar 31").
 */
export function listDate(age: string) {
  const minutes = Number.parseInt(age) * (MINUTES[age.slice(-1) as keyof typeof MINUTES] ?? 1);
  if (minutes < MINUTES.d) return age;
  const date = new Date(Date.UTC(2026, TODAY.month, TODAY.day) - minutes * 60_000);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** The workspace's now: mid-afternoon on TODAY, so "20h" falls on the day before. */
const NOW = Date.UTC(2026, TODAY.month, TODAY.day, 15);

/**
 * The day something happened, for the activity's day headings: "Today" or
 * "Yesterday", then the weekday for the rest of the week, each with its date
 * ("Today", "Apr 2"); anything older is its date and year ("Mar 12", "2026").
 */
export function dayOf(age: string) {
  const unit = age.endsWith("mo") ? 43_200 : (MINUTES[age.slice(-1) as keyof typeof MINUTES] ?? 1);
  const minutes = (Number.parseInt(age) || 0) * unit;
  const date = new Date(NOW - minutes * 60_000);
  const days = Math.round((Date.UTC(2026, TODAY.month, TODAY.day) - Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) / 86_400_000);
  const short = `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
  const key = date.toISOString().slice(0, 10);
  if (days === 0) return { key, label: "Today", detail: short };
  if (days === 1) return { key, label: "Yesterday", detail: short };
  if (days < 7) return { key, label: WEEKDAYS[date.getUTCDay()], detail: short };
  return { key, label: short, detail: String(date.getUTCFullYear()) };
}

export const diffKey = (d: Diff) => `${d.repo}#${d.number}`;
export const findDiff = (key: string) => DIFFS.find((d) => diffKey(d) === key);
export const findRepo = (slug: string) => REPOS.find((r) => r.slug === slug);

/** Whether a diff could merge now: approved, nobody asking for changes, checks green and no conflicts. */
export const mergeable = (d: Diff) =>
  d.state === "open" &&
  d.reviewers.some((r) => r.verdict === "approved") &&
  !d.reviewers.some((r) => r.verdict === "changes") &&
  d.checks.every((c) => c.state === "passed" || c.state === "skipped") &&
  !d.conflicts;
const changesAsked = (d: Diff) => d.state === "open" && d.reviewers.some((r) => r.verdict === "changes");
const mine = (d: Diff) => d.author === ME;

/** The For me sections Reviews starts with: what needs you now. The rest are a switch away in Settings › Reviews. */
export const DEFAULT_FOCUS = ["requested", "changes", "ready", "waiting"];

/**
 * The Reviews groups, in Linear's "focus" order: what needs you first. Only
 * work in flight: merged and closed diffs, and reviews you've finished, stay
 * out of focus (a repo's Diffs tab has them). A diff sits in the first group that
 * takes it, so the order is the priority. `glyph` is the group's icon.
 */
export type FocusGlyph = "requested" | "changes" | "approved" | "reviewing" | "waiting" | "draft" | "open" | "merged" | "closed";
export const REVIEW_GROUPS: {
  id: string;
  name: string;
  glyph: FocusGlyph;
  match: (d: Diff) => boolean;
  tab: "mine" | "created";
  /** what the section holds, for the settings page */
  detail?: string;
}[] = [
  // For me: what's waiting on you as a reviewer, then your own diffs by what they need next; Settings › Reviews picks which show
  { id: "requested", name: "Needs your review", glyph: "requested", match: (d) => d.state === "open" && d.review === "requested", tab: "mine", detail: "Diffs someone asked you to review" },
  { id: "changes", name: "Changes requested", glyph: "changes", match: (d) => mine(d) && changesAsked(d), tab: "mine", detail: "Your diffs a reviewer asked you to change" },
  { id: "failing", name: "Checks failing", glyph: "changes", match: (d) => mine(d) && d.state === "open" && d.checks.some((c) => c.state === "failed"), tab: "mine", detail: "Your diffs with a failing check" },
  { id: "ready", name: "Ready to merge", glyph: "approved", match: (d) => mine(d) && mergeable(d), tab: "mine", detail: "Your diffs that are approved, with checks passing and no conflicts" },
  { id: "reviewing", name: "You’re reviewing", glyph: "reviewing", match: (d) => d.state === "open" && d.review === "reviewing", tab: "mine", detail: "Reviews you've started and not finished" },
  { id: "author", name: "Waiting on the author", glyph: "changes", match: (d) => d.state === "open" && d.review === "changes", tab: "mine", detail: "Diffs you asked to change, until their author updates them" },
  { id: "waiting", name: "Waiting for review", glyph: "waiting", match: (d) => mine(d) && d.state === "open", tab: "mine", detail: "Your diffs no one has reviewed yet" },
  { id: "drafts", name: "Drafts", glyph: "draft", match: (d) => mine(d) && d.state === "draft", tab: "mine", detail: "Your drafts" },
  // Created: just your own, by what they need next
  { id: "created-changes", name: "Changes requested", glyph: "changes", match: (d) => mine(d) && changesAsked(d), tab: "created" },
  { id: "created-ready", name: "Ready to merge", glyph: "approved", match: (d) => mine(d) && mergeable(d), tab: "created" },
  { id: "created-waiting", name: "Waiting for review", glyph: "waiting", match: (d) => mine(d) && d.state === "open", tab: "created" },
  { id: "created-drafts", name: "Drafts", glyph: "draft", match: (d) => mine(d) && d.state === "draft", tab: "created" },
];
