import "./styles.css";
import { ClaudeWindowEmbedded } from "./components/claude-code/claude-window";
import { Desktop } from "./components/desktop";
import { anthropicMono, anthropicons, anthropicSans } from "./fonts";

/** The Claude page: the Claude desktop app's Code tab running on a macOS desktop. */
export function ClaudeDesktop() {
  return (
    <div className={`claude ${anthropicSans.variable} ${anthropicMono.variable} ${anthropicons.variable}`}>
      <Desktop />
    </div>
  );
}

/** The Claude window alone, filling the page: what trypane.app frames on its canvas. */
export function ClaudeEmbed() {
  return (
    <div className={`claude ${anthropicSans.variable} ${anthropicMono.variable} ${anthropicons.variable}`}>
      <ClaudeWindowEmbedded />
    </div>
  );
}
