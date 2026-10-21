// The snake game from demo/snake.mjs, playable. Pure state + rendering so the
// workspace reducer can own it. Each board cell is two terminal columns wide,
// like the original (pieces sit on odd columns).
import { type Row, s } from "./terminal";

export type Point = [number, number];
export type SnakeState = {
  w: number;
  h: number;
  /** head first */
  body: Point[];
  dir: Point;
  /** direction queued for the next tick, so two quick turns can't reverse */
  next: Point;
  food: Point[];
  score: number;
  status: "paused" | "running" | "over";
  seed: number;
};

// The frame in the reference: 28×29 cells, score 43, paused, heading down.
const cell = (col: number, row: number): Point => [(col - 1) / 2, row - 2];
export const INITIAL_SNAKE: SnakeState = {
  w: 28,
  h: 29,
  body: [
    [27, 17], [27, 16], [27, 15], [27, 14], [27, 13], [25, 13], [23, 13],
    [21, 13], [19, 13], [17, 13], [17, 14], [17, 15], [15, 15],
  ].map(([c, r]) => cell(c, r)),
  dir: [0, 1],
  next: [0, 1],
  food: [
    [3, 4], [39, 7], [19, 9], [41, 10], [47, 17], [13, 23],
    [55, 23], [5, 24], [31, 24], [9, 25], [49, 27], [21, 28],
  ].map(([c, r]) => cell(c, r)),
  score: 43,
  status: "paused",
  seed: 7,
};

const rand = (seed: number) => {
  const next = (seed * 1103515245 + 12345) % 2147483648;
  return [next, next / 2147483648] as const;
};

const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];

function placeFood(st: SnakeState): SnakeState {
  let seed = st.seed;
  for (let tries = 0; tries < 200; tries++) {
    const [s1, rx] = rand(seed);
    const [s2, ry] = rand(s1);
    seed = s2;
    const p: Point = [Math.floor(rx * st.w), Math.floor(ry * st.h)];
    if (!st.body.some((b) => same(b, p)) && !st.food.some((f) => same(f, p))) {
      return { ...st, food: [...st.food, p], seed };
    }
  }
  return { ...st, seed };
}

/** A fresh game sized to fit `cols` × `rows` terminal cells. */
export function newSnake(cols: number, rows: number, seed = 11): SnakeState {
  const w = Math.max(8, Math.min(40, Math.floor((cols - 2) / 2)));
  const h = Math.max(6, Math.min(40, rows - 4));
  const y = Math.floor(h / 2);
  const x = Math.floor(w / 3);
  let st: SnakeState = {
    w,
    h,
    body: [[x + 2, y], [x + 1, y], [x, y]],
    dir: [1, 0],
    next: [1, 0],
    food: [],
    score: 0,
    // waits for the first arrow key, so a new game doesn't run into a wall
    // before anyone is looking
    status: "paused",
    seed,
  };
  const count = Math.max(3, Math.round((w * h) / 60));
  for (let i = 0; i < count; i++) st = placeFood(st);
  return st;
}

export function steer(st: SnakeState, d: Point): SnakeState {
  // no reversing into yourself
  if (d[0] === -st.dir[0] && d[1] === -st.dir[1]) return st;
  const status = st.status === "paused" ? "running" : st.status;
  return { ...st, next: d, status };
}

export function tickSnake(st: SnakeState): SnakeState {
  if (st.status !== "running") return st;
  const dir = st.next;
  const head: Point = [st.body[0][0] + dir[0], st.body[0][1] + dir[1]];
  const eat = st.food.findIndex((f) => same(f, head));
  const body = eat >= 0 ? st.body : st.body.slice(0, -1);
  const out = head[0] < 0 || head[1] < 0 || head[0] >= st.w || head[1] >= st.h;
  if (out || body.some((b) => same(b, head))) return { ...st, dir, status: "over" };
  let next: SnakeState = { ...st, dir, body: [head, ...body] };
  if (eat >= 0) {
    next = placeFood({ ...next, score: st.score + 1, food: st.food.filter((_, i) => i !== eat) });
  }
  return next;
}

const FOOTER = {
  paused: "Paused · Space resume · R restart · Ctrl+C quit",
  running: "Arrows move · Space pause · R restart · Ctrl+C quit",
  over: "Game over · R restart · Ctrl+C quit",
};

export function snakeRows(st: SnakeState): Row[] {
  const glyphs = new Map<string, [string, string]>();
  for (const [x, y] of st.body.slice(1)) glyphs.set(`${x},${y}`, ["■", "--s-snake"]);
  for (const [x, y] of st.food) glyphs.set(`${x},${y}`, ["●", "--s-food"]);
  glyphs.set(`${st.body[0][0]},${st.body[0][1]}`, ["◆", "--s-head"]);

  const rows: Row[] = [
    [s(`S N A K E   Score: ${st.score}`, "--s-title")],
    [s("+" + "-".repeat(st.w * 2) + "+", "--s-border")],
  ];
  for (let y = 0; y < st.h; y++) {
    const row: Row = [s("|", "--s-border")];
    let text = "";
    for (let col = 0; col < st.w * 2; col++) {
      const hit = col % 2 === 0 ? glyphs.get(`${col / 2},${y}`) : undefined;
      if (hit) {
        if (text) row.push(s(text));
        row.push(s(hit[0], hit[1]));
        text = "";
      } else text += " ";
    }
    if (text) row.push(s(text));
    row.push(s("|", "--s-border"));
    rows.push(row);
  }
  rows.push([s("+" + "-".repeat(st.w * 2) + "+", "--s-border")]);
  rows.push([s(FOOTER[st.status], "--s-footer")]);
  return rows;
}
