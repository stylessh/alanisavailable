import "./styles.css";
import { MacDesktop } from "./components/macos/desktop";
import { FitWindow } from "./components/rex/fit-window";
import { RexWindow, WINDOW } from "./components/rex/rex-window";
import { rexMono } from "./fonts";

/** The Superlogical page: Rex running on a macOS desktop. */
export function SuperlogicalDesktop() {
  return (
    <div className={`superlogical ${rexMono.variable}`}>
      <MacDesktop>
        <FitWindow width={WINDOW.w} height={WINDOW.h}>
          <RexWindow />
        </FitWindow>
      </MacDesktop>
    </div>
  );
}
