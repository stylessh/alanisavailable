import "./styles.css";
import { App } from "./components/app";
import { geistMono, neueMontreal } from "./fonts";

/**
 * The Polar page: Polar's merchant dashboard, filling the browser, on a
 * made-up organization (Acme) so every chart and table has something in it.
 */
export function PolarApp() {
  return (
    <div className={`polar ${neueMontreal.variable} ${geistMono.variable} fixed inset-0 overflow-hidden`}>
      <App />
    </div>
  );
}

/** Polar framed by another site: the same app, which already fills the page. */
export const PolarEmbed = PolarApp;
