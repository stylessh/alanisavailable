import type { ReactNode } from "react";

// Just enough syntax highlighting for the transcript's code: the Bash card
// colors command names and pipes violet and quoted strings green over gray
// arguments (sampled from the recording); diffs get a TSX palette.

const BASH = { command: "var(--cc-sh-command)", string: "var(--cc-sh-string)", text: "var(--cc-sh-text)" };
const TSX = {
  keyword: "var(--cc-syn-keyword)",
  string: "var(--cc-syn-string)",
  tag: "var(--cc-syn-tag)",
  fn: "var(--cc-syn-fn)",
  comment: "var(--cc-syn-comment)",
  number: "var(--cc-syn-number)",
  text: "var(--cc-syn-plain)",
};

function tokens(src: string, rules: [RegExp, string | ((m: string) => string)][], fallback: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let plain = "";
  const flush = () => {
    if (plain)
      out.push(
        <span key={out.length} style={{ color: fallback }}>
          {plain}
        </span>,
      );
    plain = "";
  };
  while (i < src.length) {
    let matched = false;
    for (const [re, color] of rules) {
      re.lastIndex = i;
      const m = re.exec(src);
      if (m && m.index === i && m[0].length) {
        flush();
        out.push(
          <span key={out.length} style={{ color: typeof color === "function" ? color(m[0]) : color }}>
            {m[0]}
          </span>,
        );
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) plain += src[i++];
  }
  flush();
  return out;
}

/** A shell command: the first word and every word after a pipe or ; && is a command. */
export function highlightBash(command: string): ReactNode[] {
  const out: ReactNode[] = [];
  let expectCommand = true;
  const re = /("[^"]*"|'[^']*')|(\|\||&&|[|;])|(\s+)|([^\s|;&"']+|&)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(command))) {
    const [t, str, op, space] = m;
    const color = str ? BASH.string : op ? BASH.command : space ? undefined : expectCommand ? BASH.command : BASH.text;
    if (op) expectCommand = true;
    else if (!space && !str) expectCommand = false;
    out.push(
      <span key={out.length} style={{ color: color ?? BASH.text }}>
        {t}
      </span>,
    );
  }
  return out;
}

const KEYWORDS = /\b(?:import|export|from|const|let|return|function|type|if|else|new|true|false|null|undefined|await|async)\b/y;

/** One line of TSX. */
export function highlightTsx(line: string): ReactNode[] {
  return tokens(
    line,
    [
      [/\/\/.*|\{\/\*.*?\*\/\}/y, TSX.comment],
      [/"[^"]*"|'[^']*'|`[^`]*`/y, TSX.string],
      [/<\/?[A-Za-z][\w.]*/y, TSX.tag],
      [KEYWORDS, TSX.keyword],
      [/\b\d+(?:\.\d+)?\b/y, TSX.number],
      [/\b[a-zA-Z_]\w*(?=\()/y, TSX.fn],
    ],
    TSX.text,
  );
}
