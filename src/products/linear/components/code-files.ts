import type { Repo, TreeEntry } from "./code-data";

// What a file holds, for the code view. The files a reader is likely to open
// are written out; anything else gets a plausible body for its kind, so every
// file in a tree opens to something real looking.

const FILES: Record<string, string> = {
  "insight-dashboard:apps/web/src/components/kpi-table.tsx": `import type { Kpi } from "@as/metrics";
import { KPIS } from "@as/metrics";
import { MetricRow } from "./metric-row";
import { ProblemCallout } from "./problem-callout";

/** The KPI table: every success metric with its owner and how it's trending. */
export function KpiTable({ filter }: { filter: Filter }) {
  const rows = KPIS.map((kpi: Kpi) => ({ kpi, value: useMetric(kpi, filter) }));
  return (
    <section className="kpi-table">
      <ProblemCallout />
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Owner</th>
            <th>Last 30 days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ kpi, value }) => (
            <MetricRow key={kpi.id} metric={kpi} value={value} />
          ))}
        </tbody>
      </table>
    </section>
  );
}`,
  "insight-dashboard:apps/web/src/components/metric-row.tsx": `import type { Kpi } from "@as/metrics";

export function MetricRow({ metric, value }: { metric: Kpi; value?: Trend }) {
  const arrow = !value ? "" : value.change > 0 ? "▲" : value.change < 0 ? "▼" : "–";
  return (
    <tr>
      <td>{metric.label}</td>
      <td>{metric.owner}</td>
      <td className={value && value.change < 0 ? "down" : "up"}>
        {value ? \`\${arrow} \${Math.abs(value.change)}%\` : "No data yet"}
      </td>
    </tr>
  );
}`,
  "insight-dashboard:apps/web/src/components/problem-callout.tsx": `import { Callout } from "@as/design-system";
import { useHypothesis } from "../hooks/use-hypothesis";

export function ProblemCallout() {
  const hypothesis = useHypothesis();
  if (!hypothesis) return null;
  return <Callout title="Hypothesis">{hypothesis.statement}</Callout>;
}`,
  "insight-dashboard:apps/web/src/views/insights-overview.tsx": `import { Charts } from "../charts";
import { KpiTable } from "../components/kpi-table";
import { useInsights } from "../hooks/use-insights";

export function InsightsOverview({ filter }: { filter: Filter }) {
  const insights = useInsights(filter);
  return (
    <main className="overview">
      <KpiTable filter={filter} />
      <Charts data={insights} />
    </main>
  );
}`,
  "insight-dashboard:apps/web/src/queries/funnel.ts": `import { sql } from "@as/warehouse";

/** People who reached each onboarding step, in order, for the funnel chart. */
export const funnel = (filter: Filter) => sql\`
  select step, count(distinct user_id) as people
  from onboarding_events
  where occurred_at between \${filter.from} and \${filter.to}
  group by step
  order by min(step_index)
\`;`,
  "insight-dashboard:apps/web/src/queries/sessions.ts": `import { sql } from "@as/warehouse";

// sessions per day, bucketed in the viewer's timezone so a day ends at their midnight
export const sessionsByDay = (filter: Filter) => sql\`
  select date_trunc('day', started_at at time zone \${filter.tz}) as day, count(*) as sessions
  from sessions
  where started_at between \${filter.from} and \${filter.to}
  group by 1
  order by 1
\`;`,
  "insight-dashboard:apps/web/src/main.tsx": `import { createRoot } from "react-dom/client";
import { RouterProvider } from "./router";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<RouterProvider />);`,
  "insight-dashboard:apps/web/src/styles.css": `.overview {
  display: grid;
  gap: 24px;
  padding: 32px;
}

.kpi-table th {
  color: var(--text-muted);
  font-weight: 500;
}

.kpi-table .down {
  color: var(--red);
}`,
  "insight-dashboard:packages/metrics/kpis.ts": `export type Kpi = { id: string; label: string; owner: string; query: Query };

/** The success metrics, each with the person who owns it. */
export const KPIS: Kpi[] = [
  { id: "activation", label: "Activation rate", owner: "Maya Chen", query: activationQuery },
  { id: "retention", label: "Week 4 retention", owner: "Jordan Lee", query: retentionQuery },
  { id: "time-to-insight", label: "Time to first insight", owner: "Priya Patel", query: timeToInsightQuery },
];`,
  "insight-dashboard:tests/kpi-table.test.tsx": `import { render } from "@testing-library/react";
import { KpiTable } from "../apps/web/src/components/kpi-table";

test("renders every KPI with its owner", () => {
  const { container } = render(<KpiTable filter={lastThirtyDays} />);
  expect(container).toMatchSnapshot();
});`,
  "insight-dashboard:docs/success-metrics.md": `# Success metrics

Each metric has one owner, who answers for it in the weekly review.

## Activation rate

Share of new workspaces that create a dashboard in their first week. Owner: Maya Chen.

## Week 4 retention

Share of active workspaces still active four weeks later. Owner: Jordan Lee.`,
};

const kindOf = (name: string) => name.slice(name.lastIndexOf(".") + 1);

/** A body for a file that isn't written out, from its name and the repo it's in. */
function plausible(repo: Repo, name: string): string {
  if (name === ".gitignore") return "node_modules\n.next\ndist\ncoverage\n*.log\n.env*.local\nexports/";
  if (name === "package.json")
    return `{
  "name": "@as/${repo.slug}",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "@as/charts": "^4.2.0",
    "react": "^19.1.0"
  }
}`;
  if (name === "tsconfig.json")
    return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "strictNullChecks": true,
    "jsx": "react-jsx"
  }
}`;
  if (name === "pnpm-lock.yaml") return "lockfileVersion: '9.0'\n\nsettings:\n  autoInstallPeers: true\n\nimporters:\n  .:\n    dependencies:\n      react:\n        specifier: ^19.1.0\n        version: 19.1.0";
  if (name === "next.config.ts") return 'import type { NextConfig } from "next";\n\nexport default { typedRoutes: true } satisfies NextConfig;';
  if (name.endsWith(".svg")) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">\n  <rect width="32" height="32" rx="8" fill="#5e6ad2" />\n</svg>';
  if (name.endsWith(".md")) return `# ${name.replace(/\.md$/, "").replace(/-/g, " ")}\n\nNotes for ${repo.slug}.`;
  if (name.endsWith(".py")) return `def main() -> None:\n    """Entry point for ${name}."""\n    ...`;
  return `// ${name}\nexport {};`;
}

/** The text of the file at `path` in `repo`. */
export function fileContent(repo: Repo, path: string[], entry: TreeEntry): string {
  if (path.length === 1 && entry.name === "README.md") return repo.readme;
  return FILES[`${repo.slug}:${path.join("/")}`] ?? plausible(repo, entry.name);
}

/** Which highlighter a file reads with. */
export function langOf(name: string): "code" | "css" | "markdown" {
  const ext = kindOf(name);
  return ext === "css" ? "css" : ext === "md" ? "markdown" : "code";
}
