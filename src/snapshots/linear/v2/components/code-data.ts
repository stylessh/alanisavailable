// The code side of the AS Mobbin workspace, for the explorations of Linear
// hosting repositories: repos tied to the workspace's projects, and diffs
// (Linear's name for pull requests) that resolve its issues. People and
// agents are invented; issue keys and projects are the ones on the Issues page.
import type { FileKind } from "./code-icons";
import type { StatusId } from "./data";

export type Person = { name: string; initials: string; color: string; agent?: boolean };

export const ME: Person = { name: "Alex Smith", initials: "AS", color: "#8e67d9" };
export const PEOPLE = {
  maya: { name: "Maya Chen", initials: "MC", color: "#e0752f" },
  jordan: { name: "Jordan Lee", initials: "JL", color: "#2f8fd8" },
  priya: { name: "Priya Patel", initials: "PP", color: "#d4498a" },
  sam: { name: "Sam Ortiz", initials: "SO", color: "#3aa57a" },
  cursor: { name: "Cursor", initials: "C", color: "#1f1f1f", agent: true },
  linear: { name: "Linear", initials: "L", color: "#5e6ad2", agent: true },
} satisfies Record<string, Person>;

export type Language = { name: string; color: string; share: number };

export type TreeEntry = { name: string; kind: FileKind; folder?: boolean; message: string; age: string };

export type Repo = {
  slug: string;
  description: string;
  languages: Language[];
  project?: { name: string; emoji?: string; icon?: "headphones" };
  defaultBranch: string;
  visibility: "Private" | "Internal";
  updated: string;
  branches: number;
  commits: number;
  tree: TreeEntry[];
  /** a small markdown subset: #, ##, -, ``` fences, `code` and paragraphs */
  readme: string;
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
    project: { name: "User Insight & Behavior Analytics Dashboard", emoji: "📑" },
    defaultBranch: "main",
    visibility: "Private",
    updated: "1h ago",
    branches: 14,
    commits: 312,
    tree: [
      { name: "apps", kind: "folder", folder: true, message: "Persona cards on the insights overview", age: "1h" },
      { name: "docs", kind: "folder-docs", folder: true, message: "Problem statement and hypothesis", age: "3h" },
      { name: "packages", kind: "folder-src", folder: true, message: "Share chart tooltips across views", age: "2d" },
      { name: "tests", kind: "folder-test", folder: true, message: "Snapshot the KPI table", age: "4d" },
      { name: ".gitignore", kind: "git", message: "Ignore local exports", age: "3w" },
      { name: "README.md", kind: "markdown", message: "Document the metrics pipeline", age: "4d" },
      { name: "package.json", kind: "nodejs", message: "Bump charts to 4.2", age: "2d" },
      { name: "pnpm-lock.yaml", kind: "lock", message: "Bump charts to 4.2", age: "2d" },
      { name: "tsconfig.json", kind: "tsconfig", message: "Strict null checks", age: "1w" },
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
    project: { name: "AI UX Research Assistant", icon: "headphones" },
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
    project: { name: "Smart User Onboarding Optimization System", emoji: "🧭" },
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
    readme: `# onboarding-flows

Each onboarding flow is a list of steps with an exit condition. Flows run as experiments, so every change ships behind a flag and reports its completion rate.

- Add a flow in \`flows/\` and register it in \`flows/index.ts\`
- Events go through \`track()\`, never straight to the warehouse`,
  },
  {
    slug: "design-system",
    description: "Shared React components, tokens and icons",
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
    readme: `# design-system

Components and tokens shared by every app in the workspace.

- Tokens live in \`tokens/\` and compile to CSS variables
- Components never hard-code a color, a radius or a space`,
  },
  {
    slug: "infra",
    description: "Terraform, deploy pipelines and preview environments",
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
    readme: `# infra

Everything that runs the workspace's apps. Every diff gets its own preview environment, linked from the diff in Linear.`,
  },
];

export type DiffState = "open" | "draft" | "merged" | "closed";
export type ReviewState = "requested" | "reviewing" | "changes" | "approved" | "waiting" | "done";

export type Line = { kind: "ctx" | "add" | "del" | "gap"; text: string; old?: number; new?: number; skipped?: number };
export type DiffFile = { path: string; kind: FileKind; additions: number; deletions: number; lines: Line[] };

export type Check = { name: string; state: "passed" | "failed" | "running" | "skipped" };
export type Event = { who: Person; what: string; age: string; comment?: string };

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
  reviewers: { who: Person; verdict?: "approved" | "changes" | "commented" }[];
  checks: Check[];
  age: string;
  /** the description, in the README's markdown subset */
  body: string;
  files: DiffFile[];
  activity: Event[];
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
function file(path: string, kind: FileKind, lines: Line[]): DiffFile {
  return { path, kind, additions: count(lines, "add"), deletions: count(lines, "del"), lines };
}

const PASSING: Check[] = [
  { name: "Build", state: "passed" },
  { name: "Lint", state: "passed" },
  { name: "Unit tests", state: "passed" },
];

export const DIFFS: Diff[] = [
  {
    number: 14,
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
    activity: [
      { who: PEOPLE.maya, what: "opened the diff", age: "1h" },
      { who: PEOPLE.maya, what: "requested a review from Alex Smith", age: "1h" },
    ],
  },
  {
    number: 9,
    repo: "ux-research-assistant",
    title: "Competitor benchmark matrix",
    author: PEOPLE.cursor,
    branch: "cursor/as-24-benchmark-matrix",
    state: "open",
    review: "requested",
    issue: "AS-24",
    reviewers: [{ who: ME }, { who: PEOPLE.priya }],
    checks: [...PASSING.slice(0, 2), { name: "Unit tests", state: "running" }],
    age: "2h",
    body: `## Summary

Builds a benchmark matrix from the competitor notes: one row per product, one column per research question, each cell linking to its source.`,
    files: [
      file("assistant/benchmark.py", "python", hunk(41, `  def summarize(notes: list[Note]) -> Summary:
-     return Summary.from_notes(notes)
+     matrix = BenchmarkMatrix.from_notes(notes)
+     return Summary.from_notes(notes, matrix=matrix)`)),
    ],
    activity: [{ who: PEOPLE.cursor, what: "opened the diff on behalf of Priya Patel", age: "2h" }],
  },
  {
    number: 21,
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
    activity: [{ who: PEOPLE.jordan, what: "opened the diff", age: "5h" }],
  },
  {
    number: 12,
    repo: "insight-dashboard",
    title: "Persona cards on the insights overview",
    author: PEOPLE.priya,
    branch: "priya/as-11-persona-cards",
    state: "open",
    review: "changes",
    issue: "AS-11",
    reviewers: [{ who: ME, verdict: "changes" }, { who: PEOPLE.maya, verdict: "approved" }],
    checks: [
      { name: "Build", state: "passed" },
      { name: "Lint", state: "failed" },
      { name: "Unit tests", state: "passed" },
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
    ],
    activity: [
      { who: PEOPLE.priya, what: "opened the diff", age: "1d" },
      { who: PEOPLE.maya, what: "approved", age: "6h" },
      {
        who: ME,
        what: "requested changes",
        age: "4h",
        comment: "Cards look great. Can we show an empty state when a persona has no metrics yet? Right now it renders three zeros.",
      },
      { who: PEOPLE.linear, what: "Lint failed on persona-card.tsx", age: "4h" },
    ],
  },
  {
    number: 7,
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
    activity: [
      { who: PEOPLE.sam, what: "opened the diff", age: "2d" },
      { who: ME, what: "commented", age: "1d", comment: "Should --space-3 be 12 or 14? The card used 14." },
    ],
  },
  {
    number: 11,
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
    activity: [
      { who: PEOPLE.maya, what: "opened the diff", age: "3d" },
      { who: ME, what: "approved", age: "2d" },
      { who: PEOPLE.maya, what: "merged into main", age: "2d" },
    ],
  },
  {
    number: 5,
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
    activity: [
      { who: PEOPLE.jordan, what: "opened the diff", age: "5d" },
      { who: PEOPLE.jordan, what: "closed the diff", age: "4d" },
    ],
  },
  {
    number: 15,
    repo: "insight-dashboard",
    title: "Alignment summary document template",
    author: ME,
    branch: "alex/as-12-alignment",
    state: "draft",
    review: "waiting",
    issue: "AS-12",
    reviewers: [],
    checks: [{ name: "Build", state: "running" }],
    age: "20m",
    body: `Draft: a template for the alignment summary, so every project starts from the same questions.`,
    files: [
      file("docs/templates/alignment.md", "markdown", hunk(1, `+ # Alignment summary
+
+ - What problem are we solving?
+ - Who is it for?
+ - How will we know it worked?`)),
    ],
    activity: [{ who: ME, what: "opened the diff as a draft", age: "20m" }],
  },
  {
    number: 3,
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
    activity: [
      { who: ME, what: "opened the diff", age: "3h" },
      { who: ME, what: "requested a review from Priya Patel", age: "3h" },
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
};

export const diffKey = (d: Diff) => `${d.repo}#${d.number}`;
export const findDiff = (key: string) => DIFFS.find((d) => diffKey(d) === key);
export const findRepo = (slug: string) => REPOS.find((r) => r.slug === slug);

/** The Reviews groups, in Linear's "focus" order: what needs you first. */
export const REVIEW_GROUPS: { id: string; name: string; match: (d: Diff) => boolean; tab: "mine" | "created" }[] = [
  { id: "requested", name: "Needs your review", match: (d) => d.review === "requested", tab: "mine" },
  { id: "reviewing", name: "You’re reviewing", match: (d) => d.review === "reviewing" || d.review === "changes", tab: "mine" },
  { id: "completed", name: "Completed", match: (d) => d.review === "done" && d.author !== ME, tab: "mine" },
  { id: "drafts", name: "Drafts", match: (d) => d.author === ME && d.state === "draft", tab: "created" },
  { id: "waiting", name: "Waiting for review", match: (d) => d.author === ME && d.state === "open", tab: "created" },
];
