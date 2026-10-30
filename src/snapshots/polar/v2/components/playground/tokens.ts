"use client";

import { useEffect, useState } from "react";
import { POLAR_V1 } from "./polar-v1";

// The tokens the playground can change, grouped as styles.css groups them.
// A variation is a name and a set of overrides on these; the canvas draws
// every frame once per variation with its overrides applied.

export type TokenKind = "color" | "length" | "shadow";
export type Token = { name: string; label: string; kind: TokenKind };

const color = (name: string, label: string): Token => ({ name, label, kind: "color" });
const length = (name: string, label: string): Token => ({ name, label, kind: "length" });
const shadow = (name: string, label: string): Token => ({ name, label, kind: "shadow" });

export const TOKEN_GROUPS: { title: string; tokens: Token[] }[] = [
  {
    title: "Gray scale",
    tokens: [
      color("--pl-white", "White"),
      ...[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => color(`--pl-gray-${n}`, `Gray ${n}`)),
    ],
  },
  {
    title: "Surfaces",
    tokens: [
      color("--pl-surface", "Surface"),
      color("--pl-subtle", "Subtle"),
      color("--pl-shell", "Shell"),
      color("--pl-border", "Border"),
      color("--pl-rule", "Rule"),
      color("--pl-highlight", "Highlight"),
      color("--pl-popover", "Popover"),
    ],
  },
  {
    title: "Text",
    tokens: [
      color("--pl-text", "Text"),
      color("--pl-text-secondary", "Secondary"),
      color("--pl-text-muted", "Muted"),
      color("--pl-text-faint", "Faint"),
    ],
  },
  {
    title: "Actions",
    tokens: [
      color("--pl-primary", "Primary"),
      color("--pl-secondary", "Secondary"),
      color("--pl-secondary-hover", "Secondary hover"),
      color("--pl-ghost-hover", "Ghost hover"),
      color("--pl-destructive", "Destructive"),
      color("--pl-destructive-light", "Destructive hover"),
      color("--pl-link", "Link"),
    ],
  },
  {
    title: "Accent and focus",
    tokens: [
      color("--pl-accent", "Accent"),
      color("--pl-legend", "Legend"),
      color("--pl-focus", "Focus"),
      color("--pl-error", "Error"),
      color("--pl-chart", "Chart"),
    ],
  },
  {
    title: "Status",
    tokens: [
      color("--pl-success", "Success"),
      color("--pl-success-bg", "Success fill"),
      color("--pl-warning", "Warning"),
      color("--pl-warning-bg", "Warning fill"),
      color("--pl-danger", "Danger"),
      color("--pl-danger-bg", "Danger fill"),
      color("--pl-info", "Info"),
      color("--pl-info-bg", "Info fill"),
    ],
  },
  {
    title: "Radii",
    tokens: [
      length("--pl-radius-xs", "xs"),
      length("--pl-radius-sm", "sm"),
      length("--pl-radius-md", "md"),
      length("--pl-radius-lg", "lg"),
      length("--pl-radius-xl", "xl"),
      length("--pl-radius-full", "full"),
    ],
  },
  {
    title: "Shadows",
    tokens: [
      shadow("--pl-shadow-xs", "xs"),
      shadow("--pl-shadow-sm", "sm"),
      shadow("--pl-shadow-md", "md"),
      shadow("--pl-shadow-lg", "lg"),
    ],
  },
];

export const TOKENS = TOKEN_GROUPS.flatMap((g) => g.tokens);
export const tokenOf = (name: string) => TOKENS.find((t) => t.name === name);

export type Variation = { id: string; name: string; overrides: Record<string, string> };

/** Version 1, frozen: today's components drawn with the tokens Polar had then, the reference */
export const V1: Variation = { id: "v1", name: "Version 1", overrides: POLAR_V1 };
/** Live: styles.css as it is now, where decided changes land */
export const LIVE: Variation = { id: "live", name: "Live", overrides: {} };
/** the two columns that aren't yours to edit */
export const isFixed = (v: Variation) => v.id === V1.id || v.id === LIVE.id;

let probe: HTMLElement | null = null;
/** A length or shadow as the browser computes it */
function drawn(token: Token, value: string) {
  if (!probe) {
    probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
    document.body.append(probe);
  }
  const prop = token.kind === "length" ? "borderTopLeftRadius" : "boxShadow";
  probe.style[prop] = "";
  probe.style[prop] = value;
  return getComputedStyle(probe)[prop];
}

/**
 * Two values of a token the same as drawn: colors by their painted RGB (the
 * CSS build turns Polar's oklch into lab, which reads as a different string),
 * within a step for rounding; lengths and shadows as the browser computes them.
 */
export function sameValue(token: Token, a: string, b: string) {
  if (a === b) return true;
  if (token.kind !== "color") return drawn(token, a) === drawn(token, b);
  const [x, y] = [toHex(a), toHex(b)].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  return x.every((n, i) => Math.abs(n - y[i]) <= 1);
}

/** What styles.css has changed since version 1: [token, then, now] */
export function liveChanges(baseline: Record<string, string>): [Token, string, string][] {
  return TOKENS.filter((t) => baseline[t.name] && !sameValue(t, POLAR_V1[t.name], baseline[t.name])).map((t) => [
    t,
    POLAR_V1[t.name],
    baseline[t.name],
  ]);
}

/** The values styles.css gives every token, read from the live .polar root */
export function readBaseline(root: Element | null): Record<string, string> {
  if (!root) return {};
  const style = getComputedStyle(root);
  return Object.fromEntries(TOKENS.map((t) => [t.name, style.getPropertyValue(t.name).trim()]));
}

/** Any CSS color as #rrggbb, by painting it (oklch included), for the color well */
export function toHex(value: string): string {
  if (typeof document === "undefined") return "#000000";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#000000";
  ctx.fillStyle = "#000";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** A length token in px, for the slider ("7.6px" → 7.6; "9999px" stays 9999) */
export const toPx = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

/** The overrides as CSS, to paste into styles.css */
export function toCss(v: Variation) {
  const lines = Object.entries(v.overrides).map(([k, val]) => `  ${k}: ${val};`);
  return `/* ${v.name} */\n.polar {\n${lines.join("\n")}\n}\n`;
}

const KEY = "alanisavailable:polar:playground";

type Saved = { v: 1; variations: Variation[] };

function load(): Variation[] {
  try {
    const doc = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    if (doc?.v === 1 && Array.isArray(doc.variations)) return doc.variations.filter((v) => v?.id && v.overrides);
  } catch {
    // nothing saved, or storage blocked: start with no variations
  }
  return [];
}

/**
 * The variations you've made, remembered in this browser. Saved per viewer:
 * the playground is for trying things; what's decided goes into styles.css.
 * The playground only mounts in the browser (it opens from the URL's hash),
 * so storage can be read as it starts.
 */
export function useVariations() {
  const [variations, setVariations] = useState<Variation[]>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, variations } satisfies Saved));
    } catch {
      // storage full or blocked: the playground works the same, it just won't remember
    }
  }, [variations]);
  return [variations, setVariations] as const;
}
