import "./styles.css";
import { dockWith, MacOS } from "@/os/macos";
import { RexWindow } from "./components/rex/rex-window";
import { rexMono } from "./fonts";

/** The Superlogical page: Rex running on a macOS desktop. */
export function SuperlogicalDesktop() {
  return (
    <div className={`superlogical ${rexMono.variable}`}>
      <MacOS dock={dockWith({ id: "rex", name: "Rex", icon: "/products/superlogical/rex/dock-icon.png" })}>
        <RexWindow />
      </MacOS>
    </div>
  );
}
