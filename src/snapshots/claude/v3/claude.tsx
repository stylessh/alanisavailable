import "./styles.css";
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
