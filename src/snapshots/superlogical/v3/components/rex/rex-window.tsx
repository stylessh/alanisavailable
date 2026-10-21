"use client";

import { useState } from "react";
import { MacWindow } from "../../os/macos";
import { REX_APP } from "./app";
import { spaceOf, WINDOW } from "./model";
import { useRex } from "./store";
import { Workspace } from "./workspace";

export { REX_APP };

/** The Rex window: a Liquid Glass surface holding the interactive workspace. */
export function RexWindow({ at }: { at?: (screen: { w: number; h: number }) => { x?: number; y?: number } }) {
  // The active space tints the window (styles.css mixes it into the glass,
  // panes and controls). Going back to a neutral space keeps the last hue and
  // only fades its strength, so the color doesn't drift through gray.
  const { tint } = spaceOf(useRex().state);
  const [hue, setHue] = useState(tint ?? "#808080");
  if (tint && tint !== hue) setHue(tint);
  return (
    <MacWindow
      id="rex"
      at={at}
      app={REX_APP}
      width={WINDOW.w}
      height={WINDOW.h}
      radius={21}
      className="rex-window select-none"
      style={{
        // the beam spills from the top rim into the glass
        background: "var(--rex-beam), var(--rex-glass-tint)",
        backdropFilter: "var(--rex-glass-filter)",
        WebkitBackdropFilter: "var(--rex-glass-filter)",
        boxShadow: "var(--rex-window-shadow)",
        ["--rex-tint" as string]: hue,
        ["--rex-tint-amount" as string]: tint ? 1 : 0,
      }}
      // full screen: the glass becomes a solid fill, without the beam under its top rim
      fullscreenStyle={{ background: "var(--rex-solid)" }}
    >
      <Workspace />
    </MacWindow>
  );
}
