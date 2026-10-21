import "./styles.css";
import { Desktop } from "./components/desktop";
import { rexMono } from "./fonts";

/** The Superlogical page: Rex running on a macOS desktop. */
export function SuperlogicalDesktop() {
  return (
    <div className={`superlogical ${rexMono.variable}`}>
      <Desktop />
    </div>
  );
}
