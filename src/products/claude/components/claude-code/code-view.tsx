import type { CSSProperties, ReactNode } from "react";

// Claude's code views (Files and Diff panels): Anthropic Mono at 12.25px on
// a 17pt line, line numbers right-aligned in a gutter, 1pt indent guides.
// The palette is sampled from the recording.
export const CODE_LINE = 17;

const COLORS = {
  tag: "var(--cc-syn-tag)",
  attr: "var(--cc-syn-attr)",
  string: "var(--cc-syn-string)",
  keyword: "var(--cc-syn-keyword)",
  number: "var(--cc-syn-number)",
  property: "var(--cc-syn-property)",
  comment: "var(--cc-syn-comment)",
  punct: "var(--cc-syn-punct)",
  plain: "var(--cc-syn-plain)",
} as const;

type Kind = keyof typeof COLORS;

const RULES: [Kind, RegExp][] = [
  ["comment", /^(\/\/.*|\/\*.*?\*\/|\/\*.*|^\s*\*.*)/],
  ["string", /^("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)/],
  ["tag", /^(?<=<\/?)[A-Za-z][\w.]*/],
  ["keyword", /^(import|from|export|default|function|return|const|let|type|as|if|else|for|of|in|new|async|await)\b/],
  ["property", /^(--[\w-]+|@[\w-]+)/],
  ["number", /^(#[0-9a-fA-F]{3,8}\b|\d+(\.\d+)?(px|pt|em|%)?)/],
  ["attr", /^[A-Za-z_][\w-]*(?==)/],
  ["plain", /^[A-Za-z_$][\w$-]*/],
  ["punct", /^[<>/{}()[\]=;:,.?!&|+*-]+/],
];

/** Splits a line into colored runs (a tokenizer just good enough for TSX, CSS and JSON). */
function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = line;
  let prev = "";
  while (rest.length) {
    const ws = rest.match(/^\s+/);
    if (ws) {
      out.push(ws[0]);
      rest = rest.slice(ws[0].length);
      continue;
    }
    let matched = false;
    for (const [kind, re] of RULES) {
      // tag names follow "<" or "</"
      if (kind === "tag" && !/<\/?$/.test(prev)) continue;
      const m = rest.match(kind === "tag" ? /^[A-Za-z][\w.]*/ : re);
      if (m && m[0]) {
        out.push(
          <span key={out.length} style={{ color: COLORS[kind], fontStyle: kind === "comment" ? "italic" : undefined }}>
            {m[0]}
          </span>,
        );
        prev = m[0];
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      out.push(rest[0]);
      prev = rest[0];
      rest = rest.slice(1);
    }
  }
  return out;
}

/** One line of code: its number, the indent guides under its leading spaces, and its runs. */
export function CodeLine({
  n,
  text,
  gutter = 40,
  marker,
  wrap = true,
  style,
}: {
  n: number | "";
  text: string;
  gutter?: number;
  /** a sign between the number and the code (the Diff panel's "+") */
  marker?: ReactNode;
  /** long lines wrap under their first character (the editor's Word wrap) */
  wrap?: boolean;
  style?: CSSProperties;
}) {
  const indent = text.match(/^ */)?.[0].length ?? 0;
  return (
    <div className="relative flex whitespace-pre" style={{ minHeight: CODE_LINE, lineHeight: `${CODE_LINE}px`, ...style }}>
      <span className="flex-none pr-[12px] text-right select-none" style={{ width: gutter, color: "var(--cc-gutter)" }}>
        {n}
      </span>
      {marker}
      <span className={`relative min-w-0 flex-1 ${wrap ? "whitespace-pre-wrap" : "whitespace-pre"}`} style={{ color: COLORS.plain }}>
        {Array.from({ length: Math.floor(indent / 2) }, (_, i) => (
          <span key={i} aria-hidden className="absolute inset-y-0 w-px" style={{ left: `${i * 2}ch`, background: "var(--cc-indent-guide)" }} />
        ))}
        {highlight(text)}
      </span>
    </div>
  );
}

/** A whole source: every line numbered from 1. */
export function CodeView({ source, wrap }: { source: string; wrap?: boolean }) {
  const lines = source.replace(/\n$/, "").split("\n");
  return (
    <div className="text-[12.25px]" style={{ fontFamily: "var(--cc-mono)" }}>
      {lines.map((l, i) => (
        <CodeLine key={i} n={i + 1} text={l} wrap={wrap} />
      ))}
    </div>
  );
}
