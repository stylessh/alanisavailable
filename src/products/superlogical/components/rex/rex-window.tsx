import { Workspace } from "./workspace";

// Measured from the reference (CSS px = pt).
export const WINDOW = { w: 1000, h: 604.5 };

/** The Rex window: a Liquid Glass surface holding the interactive workspace. */
export function RexWindow() {
  return (
    <div
      className="rex-window absolute overflow-hidden select-none"
      style={{
        width: WINDOW.w,
        height: WINDOW.h,
        borderRadius: "var(--rex-window-radius)",
        background: "var(--rex-glass-tint)",
        backdropFilter: "var(--rex-glass-filter)",
        WebkitBackdropFilter: "var(--rex-glass-filter)",
        // Glass rim: a bright specular edge on top, a soft one all around.
        boxShadow:
          "inset 0 1px 0 rgb(255 255 255 / 0.85), inset 0 0 0 1px rgb(255 255 255 / 0.35), 0 0 0 0.5px rgb(0 0 0 / 0.25), 0 24px 70px rgb(0 0 0 / 0.45), 0 8px 20px rgb(0 0 0 / 0.25)",
      }}
    >
      <Workspace />
    </div>
  );
}
