import { useEffect, useSyncExternalStore } from "react";
import { DARK_QUERY as DARK, THEME_KEY as KEY } from "./theme-script";

// The theme, as Polar keeps it (GeneralSettings.tsx): System until you pick
// Light or Dark, remembered in localStorage. It's drawn as data-theme on the
// .polar root, which styles.css reads; the menus and dialogs portal into
// that root, so they follow it too. An inline script (theme-script.ts) sets
// it before the first paint.
export type Theme = "system" | "light" | "dark";

const listeners = new Set<() => void>();

function stored(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

const resolve = (theme: Theme) => (theme === "system" ? (matchMedia(DARK).matches ? "dark" : "light") : theme);

function apply() {
  document.querySelector(".polar")?.setAttribute("data-theme", resolve(stored()));
}

export function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  apply();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The chosen theme (not what it resolves to), and the setter */
export function useTheme() {
  return [useSyncExternalStore(subscribe, stored, () => "system" as Theme), setTheme] as const;
}

/**
 * Keeps data-theme current: applies it when the app mounts (the inline
 * script doesn't run on a client-side navigation) and follows the system
 * while the choice is System.
 */
export function useThemeSync() {
  useEffect(() => {
    apply();
    const media = matchMedia(DARK);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
}
