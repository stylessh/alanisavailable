// Each product's app on its own, filling the page, for /embed/<slug>:
// trypane.app frames these as windows on its canvas. Only products that
// have a window to show are here; the key is the URL slug.
import { ClaudeEmbed } from "./claude/claude";
import { LinearEmbed } from "./linear/linear";
import { PolarEmbed } from "./polar/polar";
import { RexEmbed } from "./superlogical/rex";

export const EMBEDS: Record<string, { name: string; Embed: React.ComponentType; background: string }> = {
  linear: { name: "Linear", Embed: LinearEmbed, background: "#08090A" },
  polar: { name: "Polar", Embed: PolarEmbed, background: "#F3F4F6" },
  claude: { name: "Claude Code", Embed: ClaudeEmbed, background: "#262624" },
  superlogical: { name: "Rex", Embed: RexEmbed, background: "#0c0c0e" },
};
