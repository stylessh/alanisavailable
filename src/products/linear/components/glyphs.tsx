import { PullRequestOpenIcon } from "./code-icons";
import { PriorityHighIcon, PriorityMediumIcon, PriorityNoneIcon } from "./icons";
import type { DiffState } from "./code-data";
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

// A diff's state glyph. Open and closed are Linear's own (the review page's
// "Opened" chip and its Closed status); merged is drawn from their strokes
// and the ring-and-stem of Linear's branch icon, the branch curving into a
// ring on the right; draft is open in gray.
const RING_BR =
  "M12.4999 9.99994C13.8806 10 14.9999 11.1193 14.9999 12.4999C14.9999 13.8805 13.8805 14.9999 12.4999 14.9999C11.1193 14.9999 10 13.8806 9.99994 12.4999C9.99994 11.1192 11.1192 9.99994 12.4999 9.99994ZM12.4999 11.4999C11.9477 11.4999 11.4999 11.9477 11.4999 12.4999C11.5 13.0522 11.9477 13.4999 12.4999 13.4999C13.0521 13.4999 13.4999 13.0521 13.4999 12.4999C13.4999 11.9477 13.0522 11.5 12.4999 11.4999Z";
const LINE_UP =
  "M9.99994 2.74994C11.7948 2.75004 13.2499 4.20507 13.2499 5.99994V10.7499C13.2499 11.164 12.914 11.4999 12.4999 11.4999C12.0858 11.4999 11.75 11.1641 11.7499 10.7499V5.99994C11.7499 5.0335 10.9664 4.25004 9.99994 4.24994H7.99994C7.58579 4.24994 7.25004 3.91408 7.24994 3.49994C7.24994 3.08573 7.58573 2.74994 7.99994 2.74994H9.99994Z";
const STEM_LOW =
  "M3.49994 7.49994C3.91406 7.50006 4.24994 7.8358 4.24994 8.24994V14.249C4.24977 14.663 3.91395 14.9989 3.49994 14.999C3.08584 14.999 2.75012 14.663 2.74994 14.249V8.24994C2.74994 7.83573 3.08573 7.49994 3.49994 7.49994Z";
const X_TL =
  "M4.71967 1.21967C5.01256 0.926777 5.48732 0.926777 5.78022 1.21967C6.07294 1.51258 6.07305 1.98738 5.78022 2.28022L4.56049 3.49994L5.78022 4.71967C6.07288 5.01258 6.07303 5.4874 5.78022 5.78022C5.4874 6.07303 5.01258 6.07288 4.71967 5.78022L3.49994 4.56049L2.28022 5.78022C1.98738 6.073 1.51256 6.07292 1.21967 5.78022C0.926796 5.48734 0.926834 5.01257 1.21967 4.71967L2.4394 3.49994L1.21967 2.28022C0.926777 1.98732 0.926777 1.51256 1.21967 1.21967C1.51256 0.926777 1.98732 0.926777 2.28022 1.21967L3.49994 2.4394L4.71967 1.21967Z";
const RING_STEM_TL =
  "M3.5 1C4.88043 1.00021 5.99974 2.11959 6 3.5C5.99983 4.61924 5.26408 5.56623 4.25 5.88477V14.251C4.24971 14.6649 3.91396 15.0009 3.5 15.001C3.08597 15.001 2.75029 14.6649 2.75 14.251V5.88477C1.73602 5.56608 1.00017 4.61906 1 3.5C1.00026 2.11962 2.11962 1.00026 3.5 1ZM3.5 2.48535C2.93987 2.48561 2.48561 2.93987 2.48535 3.5C2.48556 4.06017 2.93984 4.51439 3.5 4.51465C4.0602 4.51444 4.51444 4.0602 4.51465 3.5C4.51439 2.93984 4.06017 2.48556 3.5 2.48535Z";
const RING_R = "M12.5 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z";
const MERGE_CURVE = "M3.5 5.25a.75.75 0 0 1 .75.75c0 2.07 1.68 3.75 3.75 3.75h2a.75.75 0 0 1 0 1.5H8A5.24 5.24 0 0 1 4.25 9.1v5.15a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z";

const DIFF_PATHS: Record<"closed" | "merged", string[]> = {
  closed: [RING_BR, STEM_LOW, LINE_UP, X_TL],
  merged: [RING_STEM_TL, MERGE_CURVE, RING_R],
};

export function DiffStateIcon({ state, size = 16, mono = false }: { state: DiffState; size?: number; mono?: boolean }) {
  const color = mono ? "currentColor" : `var(--ln-diff-${state})`;
  if (state === "open" || state === "draft")
    return <PullRequestOpenIcon size={size} aria-label={state} role="img" className="shrink-0" style={{ color }} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-label={state}
      role="img"
      className="shrink-0"
      style={{ color }}
      fill="currentColor"
    >
      {DIFF_PATHS[state].map((d) => (
        <path key={d} fillRule="evenodd" clipRule="evenodd" d={d} />
      ))}
    </svg>
  );
}

/**
 * A repository: a book with a ribbon at its foot, the mark people already
 * read as "repo", redrawn on Linear's outline grid (1.5px round strokes,
 * 16px box) to sit with the sidebar's icons.
 */
export function RepoIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M3 12.5v-9a1.75 1.75 0 0 1 1.75-1.75H12a1 1 0 0 1 1 1v8.5H4.75A1.75 1.75 0 0 0 3 13a1.25 1.25 0 0 0 1.25 1.25h2.5" />
      <path d="M9 11.25v3.5l1.25-.9 1.25.9v-3.5" />
    </svg>
  );
}

// A CI check's state in Linear's circle family: the 1.5px ring from its
// canceled-check icon (live capture, review panel), holding a check, a cross,
// a half-filled pie while it runs, or a dash when it was skipped.
const RING =
  "M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z";

/**
 * A check's state drawn exactly like the merge card's requirement dots, so a
 * check in the list matches the summary above it: a full 14px disc with its
 * glyph cut out (so it sits on any background), the glyph the dot's 1.5px
 * stroke with round caps and joins, traced to an outline: green with a check
 * when it passed, red with a cross when it failed, gray with a dash when
 * skipped. A running check is a loader, a faint track with a quarter arc
 * turning on it.
 */
const DISC = "M7 0a7 7 0 1 1 0 14A7 7 0 0 1 7 0Z";
const CUT = {
  passed: "M4.765 6.705 6.078 7.947l3.135-3.22a.75.75 0 0 1 1.074 1.046L6.637 9.523a.75.75 0 0 1-1.052.022l-1.85-1.75a.75.75 0 0 1 1.03-1.09Z",
  failed:
    "M9.78 8.72a.75.75 0 0 1-1.06 1.06L7 8.061 5.28 9.78a.75.75 0 0 1-1.06-1.06L5.939 7 4.22 5.28a.75.75 0 0 1 1.06-1.06L7 5.939l1.72-1.719a.75.75 0 0 1 1.06 1.06L8.061 7Z",
  skipped: "M4.5 6.25h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1 0-1.5Z",
} as const;

export function CheckStateIcon({ state, size = 14 }: { state: "passed" | "failed" | "running" | "skipped"; size?: number }) {
  if (state === "running")
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 14 14"
        fill="none"
        aria-label={state}
        role="img"
        className="shrink-0 animate-spin text-(--ln-check-running) [animation-duration:900ms] motion-reduce:animate-none"
      >
        <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeOpacity=".25" strokeWidth="1.5" />
        <path d="M7 .75A6.25 6.25 0 0 1 13.25 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  const color = { passed: "var(--ln-check-passed)", failed: "var(--ln-check-failed)", skipped: "var(--ln-text-muted)" }[state];
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-label={state} role="img" className="shrink-0" style={{ color }}>
      <path d={DISC + CUT[state]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/**
 * Where a review stands, in the same ring family as the checks: needs you (a
 * dot in the In Progress color), being reviewed (half filled), changes
 * requested (a cross), approved (a check), and waiting on someone (dashed).
 */
export function ReviewStateIcon({ state, size = 14 }: { state: "requested" | "reviewing" | "changes" | "approved" | "waiting"; size?: number }) {
  const color = {
    requested: "var(--ln-check-running)",
    reviewing: "var(--ln-check-running)",
    changes: "var(--ln-check-failed)",
    approved: "var(--ln-check-passed)",
    waiting: "var(--ln-text-muted)",
  }[state];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0" style={{ color }}>
      {state === "waiting" ? (
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.6 2.3" />
      ) : (
        <path d={RING} fill="currentColor" fillRule="evenodd" />
      )}
      {state === "requested" && <circle cx="8" cy="8" r="2.25" fill="currentColor" />}
      {state === "reviewing" && <path d="M8 4.25a3.75 3.75 0 0 1 0 7.5Z" fill="currentColor" />}
      {state === "changes" && <path d="m6 6 4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
      {state === "approved" && <path d="m5.5 8.15 1.75 1.7L10.6 6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

/**
 * A reviewer's verdict as a bare glyph, no ring: a check for approved, a cross
 * for changes requested, a speech bubble for a comment. Approved and changes
 * carry their color; a comment stays gray.
 */
export function VerdictGlyph({ verdict, size = 12 }: { verdict: "approved" | "changes" | "commented"; size?: number }) {
  if (verdict === "commented")
    return (
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden className="shrink-0 text-(--ln-text-muted)">
        <path d="M3.5 1.75h5A1.5 1.5 0 0 1 10 3.25v3.5a1.5 1.5 0 0 1-1.5 1.5H5.5l-2.25 2v-2H3.5A1.5 1.5 0 0 1 2 6.75v-3.5a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className="shrink-0"
      style={{ color: verdict === "approved" ? "var(--ln-check-passed)" : "var(--ln-check-failed)" }}
    >
      {verdict === "approved" ? (
        <path d="m2.25 6.25 2.5 2.5 5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m3 3 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}
