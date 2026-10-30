"use client";

import { useState } from "react";
import { ArrowBackIcon, ChevronsRightIcon, TuneIcon } from "../icons";
import { Button, IconButton } from "../ui/button";
import { Segmented } from "../ui/segmented";
import { Select } from "../ui/select";
import { useTheme, type Theme } from "../theme";
import { AXES, DEFAULT, isPwyw, setScenario, type Scenario } from "./scenario";

// The state picker: one select per axis of the checkout (STATES.md), the
// theme and the viewport, floating over the page's corner. It's the draft's
// tooling, not part of Polar's checkout, so it reads as a popover would.

const AFTER_PAYING = ["confirming", "confirm-action", "failed", "granting", "success", "expired"];

/** Why an axis doesn't show in the current state, if it doesn't */
function hidden(s: Scenario, key: keyof Scenario): string | null {
  if (key === "step" || key === "offer") return null;
  if (AFTER_PAYING.includes(s.step)) return "Not on this page";
  const free = s.offer === "free" || s.offer === "pwyw-free";
  if (key === "discount" && (s.offer === "free" || isPwyw(s.offer))) return "Doesn't apply to this price";
  if (key === "tax" && s.offer === "free") return "Nothing to tax";
  if (key === "payment" && free) return "Not needed for a free order";
  if ((key === "business" || key === "address") && s.offer === "free" && s.address !== "full" && s.address !== "full-errors")
    return key === "address" ? "Only when the seller requires it" : "Only with a billing address";
  return null;
}

export function Picker({ s }: { s: Scenario }) {
  const [open, setOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 900);
  const [theme, setTheme] = useTheme();
  const changed = (Object.keys(DEFAULT) as (keyof Scenario)[]).filter((k) => s[k] !== DEFAULT[k]).length;

  if (!open)
    return (
      <div className="fixed top-4 right-4 z-40">
        <Button variant="secondary" size="md" icon={<TuneIcon />} onClick={() => setOpen(true)} className="shadow-(--pl-shadow-md)!">
          States{changed ? ` · ${changed}` : ""}
        </Button>
      </div>
    );

  // docked beside the checkout, so it never covers it; on a narrow window it floats over the page's right edge
  return (
    <aside
      aria-label="Checkout states"
      className="z-40 flex w-[300px] shrink-0 flex-col bg-(--pl-popover) shadow-[inset_0.5px_0_0_var(--pl-hairline)] max-[900px]:fixed max-[900px]:inset-y-0 max-[900px]:right-0 max-[900px]:shadow-(--pl-shadow-lg)"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 py-3 pr-2 pl-4 shadow-[inset_0_-0.5px_0_var(--pl-hairline)]">
        <span className="flex flex-col">
          <span className="text-sm leading-5 font-[550] tracking-[0.01em] text-(--pl-text)">Checkout states</span>
          <a href="#" className="flex w-fit items-center gap-1 rounded-(--pl-radius-xs) text-xs leading-4 text-(--pl-text-muted) hover:text-(--pl-text)">
            <ArrowBackIcon size={12} />
            Dashboard
          </a>
        </span>
        <span className="flex items-center gap-1">
          {changed > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setScenario(DEFAULT)}>
              Reset
            </Button>
          )}
          <IconButton size={32} label="Hide states" onClick={() => setOpen(false)}>
            <ChevronsRightIcon />
          </IconButton>
        </span>
      </header>
      {/* the bottom padding keeps the last select clear of the site's version bar */}
      <div className="pl-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4 pb-16">
        <div className="flex flex-col gap-2">
          <Segmented
            size="sm"
            variant="tabs"
            label="Theme"
            value={theme === "system" ? "system" : theme}
            onChange={(t: Theme) => setTheme(t)}
            options={[
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
              { id: "system", label: "Auto" },
            ]}
          />
          <Segmented
            size="sm"
            variant="tabs"
            label="Viewport"
            value={s.viewport}
            onChange={(viewport) => setScenario({ viewport })}
            options={[
              { id: "desktop", label: "Desktop" },
              { id: "mobile", label: "Mobile" },
            ]}
          />
        </div>
        {AXES.map((axis) => {
          const why = hidden(s, axis.key);
          return (
            <label key={axis.key} className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between gap-2 text-xs leading-4">
                <span className="font-medium text-(--pl-text-secondary)">{axis.label}</span>
                {why && <span className="truncate text-(--pl-text-faint)">{why}</span>}
              </span>
              <Select
                size="sm"
                label={axis.label}
                options={axis.options as { id: string; label: string }[]}
                value={s[axis.key]}
                onChange={(v) => setScenario({ [axis.key]: v } as Partial<Scenario>)}
                className={why ? "opacity-60" : ""}
              />
            </label>
          );
        })}
      </div>
    </aside>
  );
}
