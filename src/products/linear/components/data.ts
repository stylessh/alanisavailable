// The workspace on screen: the "AS Mobbin" team's issues as the reference
// shows them. Label colors are Linear's default label palette; status hues
// are the ones the live app tints each group header with.

export type StatusId = "started" | "unstarted" | "backlog";
export type Priority = "none" | "high" | "medium";

export type Status = {
  id: StatusId;
  name: string;
  /** the status icon's stroke */
  color: string;
  /** group header hue (lch), light and dark */
  hue: [number, number];
  /** chroma of the group header's tinted edge, light and dark */
  tint: [number, number];
};

export const STATUSES: Status[] = [
  { id: "started", name: "In Progress", color: "lch(80% 90 85)", hue: [69.967, 76.437], tint: [1.6, 1.509] },
  { id: "unstarted", name: "Todo", color: "lch(67.969% 0 139.088)", hue: [281.999, 271.994], tint: [0.489, 0.757] },
  { id: "backlog", name: "Backlog", color: "lch(67.969% 3.577 260.65)", hue: [279.067, 270.292], tint: [0.564, 0.887] },
];

export type Label = { name: string; color: string };

export const LABELS = {
  research: { name: "Research", color: "#4cb782" },
  ux: { name: "UX", color: "#26b5ce" },
  feature: { name: "Feature", color: "#bb87fc" },
  newLabel: { name: "New", color: "#26b5ce" },
  documentation: { name: "Documentation", color: "#f2994a" },
  analytics: { name: "Analytics", color: "#5e6ad2" },
  // used on diffs
  frontend: { name: "Frontend", color: "#4ea7fc" },
  bug: { name: "Bug", color: "#eb5757" },
  performance: { name: "Performance", color: "#f2c94c" },
} satisfies Record<string, Label>;

/** A project's icon is either an emoji or one of Linear's glyphs. */
export type Project = { name: string; emoji?: string; icon?: "headphones" };

const DASHBOARD: Project = { name: "User Insight & Behavior Analytics Dashboard", emoji: "📑" };
const ASSISTANT: Project = { name: "AI UX Research Assistant", icon: "headphones" };

export type Issue = {
  id: string;
  title: string;
  status: StatusId;
  priority: Priority;
  labels?: Label[];
  project?: Project;
  /** shown as a chip with the due-date calendar */
  due?: string;
  created: string;
};

export const ISSUES: Issue[] = [
  { id: "AS-11", title: "Create user personas (internal users)", status: "started", priority: "high", labels: [LABELS.research, LABELS.ux], project: DASHBOARD, created: "Mar 31" },
  { id: "AS-9", title: "Define problem statement & hypothesis", status: "started", priority: "high", labels: [LABELS.feature], project: DASHBOARD, due: "Tomorrow", created: "Mar 31" },
  { id: "AS-25", title: "Write problem statement & product vision", status: "started", priority: "none", project: ASSISTANT, created: "Apr 1" },
  { id: "AS-23", title: "Define target users & personas", status: "started", priority: "none", project: ASSISTANT, created: "Apr 1" },
  { id: "AS-24", title: "Conduct competitor benchmarking", status: "started", priority: "none", project: ASSISTANT, created: "Apr 1" },

  { id: "AS-5", title: "New Project Logo", status: "unstarted", priority: "high", labels: [LABELS.newLabel], project: DASHBOARD, created: "Mar 30" },
  { id: "AS-12", title: "Create alignment summary document", status: "unstarted", priority: "medium", labels: [LABELS.documentation], project: DASHBOARD, created: "Mar 31" },
  { id: "AS-10", title: "Define success metrics (KPIs)", status: "unstarted", priority: "medium", labels: [LABELS.analytics, LABELS.feature], project: DASHBOARD, due: "Apr 8", created: "Mar 31" },
  { id: "AS-1", title: "Get familiar with Linear", status: "unstarted", priority: "none", created: "Mar 30" },
  { id: "AS-2", title: "Set up your teams", status: "unstarted", priority: "none", created: "Mar 30" },
  { id: "AS-3", title: "Connect your tools", status: "unstarted", priority: "none", created: "Mar 30" },
  { id: "AS-4", title: "Import your data", status: "unstarted", priority: "none", created: "Mar 30" },

  { id: "AS-29", title: "Define product requirements (PRD)", status: "backlog", priority: "none", project: ASSISTANT, created: "Apr 1" },
  { id: "AS-28", title: "Create user flow diagram", status: "backlog", priority: "none", project: ASSISTANT, created: "Apr 1" },
  { id: "AS-27", title: "Prioritize features (MVP vs future scope)", status: "backlog", priority: "none", project: ASSISTANT, created: "Apr 1" },
  { id: "AS-26", title: "Define MVP feature list", status: "backlog", priority: "none", project: ASSISTANT, created: "Apr 1" },
];

export const TEAM = { name: "AS Mobbin", key: "AS", color: "#26b5ce" };
export const WORKSPACE = { name: "AS Mobbin", initials: "AM", color: "#049850" };

export const VIEWS = [
  { id: "all", name: "All issues" },
  { id: "active", name: "Active", statuses: ["started", "unstarted"] as StatusId[] },
  { id: "backlog", name: "Backlog", statuses: ["backlog"] as StatusId[] },
];
