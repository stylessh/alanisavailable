"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_FOCUS } from "./code-data";

// Which For me sections Reviews shows: a preference that outlives the page,
// kept in the browser (a viewer's own convenience, nothing shared), and read
// by both Reviews and its settings page.

const KEY = "linear:focus-sections";
const listeners = new Set<() => void>();
let current: string[] | null = null;

function read(): string[] {
  if (current) return current;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    current = Array.isArray(saved) ? saved : DEFAULT_FOCUS;
  } catch {
    current = DEFAULT_FOCUS;
  }
  return current;
}

function write(ids: string[]) {
  current = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // private windows and blocked storage keep the choice for this visit only
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useFocusSections(): [string[], (ids: string[]) => void] {
  const ids = useSyncExternalStore(subscribe, read, () => DEFAULT_FOCUS);
  return [ids, write];
}
