import { MacWindow } from "@/os/macos";
import { REX_APP } from "./app";
import { WINDOW } from "./model";
import { Workspace } from "./workspace";

export { REX_APP };

/** The Rex window: a Liquid Glass surface holding the interactive workspace. */
export function RexWindow({ at }: { at?: (screen: { w: number; h: number }) => { x?: number; y?: number } }) {
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
      }}
      // full screen: the glass becomes a solid fill, without the beam under its top rim
      fullscreenStyle={{ background: "var(--rex-solid)" }}
    >
      <Workspace />
    </MacWindow>
  );
}
