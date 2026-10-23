import "./styles.css";
import { App } from "./components/app";
import { interVariable } from "./fonts";

/**
 * The Linear page: Linear's web app on a team's Issues view, filling the
 * browser. It follows the system's light or dark appearance, as Linear does.
 */
export function LinearApp() {
  return (
    <div className={`linear ${interVariable.variable} fixed inset-0 overflow-hidden`}>
      <App />
    </div>
  );
}
