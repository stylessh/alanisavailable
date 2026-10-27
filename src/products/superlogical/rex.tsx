import "./styles.css";
import { Desktop } from "./components/desktop";
import { RexWindowEmbedded } from "./components/rex/rex-window";
import { RexProvider } from "./components/rex/store";
import { rexMono } from "./fonts";

/** The Superlogical page: Rex running on a macOS desktop, with its iPhone app mirrored beside it. */
export function SuperlogicalDesktop() {
  return (
    <div className={`superlogical ${rexMono.variable}`}>
      <Desktop />
    </div>
  );
}

/** The Rex window alone, filling the page: what trypane.app frames on its canvas. */
export function RexEmbed() {
  return (
    <div className={`superlogical ${rexMono.variable}`}>
      <RexProvider>
        <RexWindowEmbedded />
      </RexProvider>
    </div>
  );
}
