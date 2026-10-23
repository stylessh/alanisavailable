import { PriorityHighIcon, PriorityMediumIcon, PriorityNoneIcon } from "./icons";
import type { Priority, Status } from "./data";

// The status circle, drawn the way the live app draws it: a 1.5px ring
// (solid, or dashed for Backlog) and a pie of the status's progress, made
// by a thick dashed stroke on a r=2 circle.
const PIE = 12.189379495928398;
const PROGRESS: Record<Status["id"], number> = { backlog: 0, unstarted: 0, started: 0.5 };

export function StatusIcon({ status, size = 14 }: { status: Status; size?: number }) {
  const dashed = status.id === "backlog";
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-label={status.name} role="img">
      <circle
        cx="7"
        cy="7"
        r="6"
        stroke={status.color}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "1.4 1.74" : "3.14 0"}
        strokeDashoffset={dashed ? "0.65" : "-0.7"}
      />
      <circle
        cx="7"
        cy="7"
        r="2"
        stroke={status.color}
        strokeWidth="4"
        strokeDasharray={`${PIE} ${PIE * 2}`}
        strokeDashoffset={PIE * (1 - PROGRESS[status.id])}
        transform="rotate(-90 7 7)"
      />
    </svg>
  );
}

const PRIORITY = { none: PriorityNoneIcon, high: PriorityHighIcon, medium: PriorityMediumIcon };
const PRIORITY_NAME = { none: "No priority", high: "High priority", medium: "Medium priority" };

export function PriorityIcon({ priority }: { priority: Priority }) {
  const Icon = PRIORITY[priority];
  return <Icon aria-label={PRIORITY_NAME[priority]} role="img" aria-hidden={false} />;
}

/** The due-date chip's calendar: an outlined card with a filled header, drawn from the reference (no live sample). */
export function DueDateIcon({ size = 14, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1.75" y="1.75" width="10.5" height="10.5" rx="2.5" stroke={color} strokeWidth="1.5" />
      <path d="M1 4.25C1 2.45 2.45 1 4.25 1h5.5C11.55 1 13 2.45 13 4.25V5H1v-.75Z" fill={color} />
    </svg>
  );
}
