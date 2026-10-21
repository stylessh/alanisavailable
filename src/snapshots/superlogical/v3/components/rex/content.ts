// What each pane shows, as rows on Rex's character grid. Columns and rows
// were read off the reference (7.1pt cells, 15.15pt rows).
import { type Row, s } from "./terminal";

const b = { b: true };

export const AGENT: Row[] = [
  [s("• ", "--t-bullet"), s("Ran ", "--t-strong", b), s("git", "--t-blue"), s(" diff ", "--t-slate"), s("--", "--t-teal"), s(" demo/snake.mjs ", "--t-slate"), s("&&", "--t-teal"), s(" "), s("git", "--t-blue"), s(" status ", "--t-slate"), s("--short", "--t-red")],
  [s("  └ diff --git a/demo/snake.mjs b/demo/snake.mjs", "--t-dim")],
  [s("    index a405d8c..333798e 100644", "--t-dim")],
  [s("    --- a/demo/snake.mjs", "--t-dim")],
  [s("    +76 lines (ctrl+t to view transcript)", "--t-dim")],
  [],
  [s("• ", "--t-bullet-dim"), s("## Review summary", "--t-strong", b)],
  [],
  [s("  I inspected ", "--t-fg"), s("demo/snake.mjs", "--t-green"), s(" and ran it in an interactive terminal. The", "--t-fg")],
  [s("  game uses a fixed 24×14 board and advances every 125 ms. It starts", "--t-fg")],
  [s("  with a three-segment snake, moves using arrow keys, grows and adds one", "--t-fg")],
  [s("  point when it eats food, ends on wall or body collision, and supports", "--t-fg")],
];

// lazygit: left column is 24 cells (0–23), right column 48 (24–71).
const bd = "--g-border";
const line = (n: number) => "─".repeat(n);
const right = (content: Row, width = 46): Row => {
  const used = content.reduce((n, seg) => n + seg.t.length, 0);
  return [s("│", bd), ...content, s(" ".repeat(Math.max(0, width - used))), s("│", bd)];
};

export const GIT: Row[] = [
  [s("──[1]─Status" + line(12), bd), s("╭─[0]─Unstaged changes" + line(25) + "╮", bd)],
  [s("╭─[2]─Files - Worktree─╮", bd), s("│", bd), s("diff --git a/demo/snake.mjs b/demo/snake.mjs", "--g-strong", b), s("  "), s("▐", "--g-strong")],
  [s("│", bd), s("▼ ", "--g-strong"), s("demo", "--g-strong", b), s(" ".repeat(16)), s("│", bd), ...right([s("index a405d8c..de604b3 100644", "--g-strong", b)])],
  [s("│", bd), s("   "), s("M", "--g-red"), s(" snake.mjs", "--g-fg"), s(" ".repeat(8)), s("│", bd), ...right([s("--- a/demo/snake.mjs", "--g-strong", b)])],
  [s("│" + " ".repeat(22) + "│", bd), ...right([s("+++ b/demo/snake.mjs", "--g-strong", b)])],
  [s("│" + " ".repeat(22) + "│", bd), ...right([s("@@ -1,8 +1,11 @@", "--g-cyan")])],
  [s("│" + " ".repeat(22) + "│", bd), ...right([s(" #!/usr/bin/env node", "--g-fg")])],
  [s("│" + " ".repeat(22) + "│", bd), ...right([])],
  [s("│" + " ".repeat(22) + "│", bd), ...right([s("-const WIDTH = 24;", "--g-red")])],
  [s("│" + " ".repeat(22) + "│", bd), ...right([s("-const HEIGHT = 14;", "--g-red")])],
  [s("│" + " ".repeat(22) + "│", bd), ...right([s("+let WIDTH = 24;", "--g-green")])],
  [s("│" + " ".repeat(22) + "│", bd), ...right([s("+let HEIGHT = 14;", "--g-green")])],
  [s("╰" + line(15) + "1 of 2─╯", bd), s("╰" + line(46) + "╯", bd)],
  [s("──[3]─Local bran1 of 1──", bd), s("╭─Command log" + line(34) + "╮", bd)],
  [s("──[4]─Commits - 1 of 1──", bd), ...right([s("  git commit -m \"Initial commit\"", "--g-fg")])],
  [s("──[5]─Stash" + line(6) + "0 of 0─", bd), s("╰" + line(46) + "╯", bd)],
  [
    s("Stage: <space> | Commit: c | Stash: s | …", "--g-blue"),
    s("     "),
    s("Donate", "--g-purple", { u: true }),
    s(" "),
    s("Ask Question", "--g-gold", { u: true }),
    s(" "),
    s("0.65.1", "--g-version"),
  ],
];

// Snake: a 58-column board (border at columns 0 and 57) on rows 1–31.
const SNAKE = [
  [17, 13], [19, 13], [21, 13], [23, 13], [25, 13], [27, 13],
  [17, 14], [27, 14], [15, 15], [17, 15], [27, 15], [27, 16],
];
const HEAD = [27, 17];
const FOOD = [
  [3, 4], [39, 7], [19, 9], [41, 10], [47, 17], [13, 23],
  [55, 23], [5, 24], [31, 24], [9, 25], [49, 27], [21, 28],
];

function boardRow(row: number): Row {
  const cells = new Map<number, [string, string]>();
  for (const [c, r] of SNAKE) if (r === row) cells.set(c, ["■", "--s-snake"]);
  for (const [c, r] of FOOD) if (r === row) cells.set(c, ["●", "--s-food"]);
  if (HEAD[1] === row) cells.set(HEAD[0], ["◆", "--s-head"]);
  const out: Row = [s("|", "--s-border")];
  let text = "";
  for (let c = 1; c < 57; c++) {
    const hit = cells.get(c);
    if (hit) {
      if (text) out.push(s(text));
      out.push(s(hit[0], hit[1]));
      text = "";
    } else text += " ";
  }
  if (text) out.push(s(text));
  out.push(s("|", "--s-border"));
  return out;
}

export const SNAKE_ROWS: Row[] = [
  [s("S N A K E   Score: 43", "--s-title")],
  [s("+" + "-".repeat(56) + "+", "--s-border")],
  ...Array.from({ length: 29 }, (_, i) => boardRow(i + 2)),
  [s("+" + "-".repeat(56) + "+", "--s-border")],
  [s("Paused · Space resume · R restart · Ctrl+C quit", "--s-footer")],
];
