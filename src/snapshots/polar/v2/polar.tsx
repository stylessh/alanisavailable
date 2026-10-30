import "./styles.css";
import { Root } from "./components/root";
import { THEME_SCRIPT } from "./components/theme-script";
import { geistMono, neueMontreal } from "./fonts";

/**
 * The Polar page: Polar's merchant dashboard, filling the browser, on a
 * made-up organization (Acme) so every chart and table has something in it.
 * At #design-system it's the playground for its design system instead.
 */
export function PolarApp() {
  return (
    // data-theme is set before paint by the script, so it never matches the server's render
    <div
      className={`polar ${neueMontreal.variable} ${geistMono.variable} fixed inset-0 overflow-hidden`}
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <Root />
    </div>
  );
}

/** Polar framed by another site: the same app, which already fills the page. */
export const PolarEmbed = PolarApp;
