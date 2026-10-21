// How Rex draws each program it detects: the pane header glyph (placed at its
// measured ink box) and the cards it uses in a tab's chip stack. The codex,
// lazygit, node, bun and shell styles come from the reference; codex's and
// claude's back cards, and claude's front card, are our own extrapolations.
import { ClaudeIcon, NodeIcon, OpenAIIcon, PlusMinusCircleIcon, TerminalIcon } from "./icons";
import type { ProgramKind } from "./model";

const BUN_HEADER: React.CSSProperties = { filter: "grayscale(1) contrast(1.4)", mixBlendMode: "multiply", opacity: 0.9 };
/** soft on the chip, as the reference draws it (fitted: multiply at 55%) */
const BUN_CHIP: React.CSSProperties = { filter: "grayscale(1)", mixBlendMode: "multiply", opacity: 0.55 };

const BunLogo = ({ size, header = false }: { size: number; header?: boolean }) => (
  // svgl.app/library/bun.svg, monochrome like Rex draws it. On the chip the
  // bun keeps its filled face (the reference shows it, tuft and all); in the
  // header, multiply lets its fills take the pane's color.
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/snapshots/superlogical/v1/rex/bun.svg"
    alt=""
    width={size}
    height={size * 0.875}
    // on a dark pane, multiply would erase it: the header mark inverts instead
    className={`max-w-none ${header ? "rex-bun-header" : ""}`}
    style={header ? BUN_HEADER : BUN_CHIP}
  />
);

/** A brand logo, in its own colors (svgl.app). */
const Logo = ({ name, w, h = w }: { name: string; w: number; h?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`/snapshots/superlogical/v1/rex/logos/${name}.svg`} alt="" width={w} height={h} draggable={false} className="max-w-none" />
);

/** A logo drawn in the ink of the pane header, like Rex's other header glyphs. */
const Mono = ({ name, size = 13 }: { name: string; size?: number }) => (
  <span
    aria-hidden
    className="block"
    style={{
      width: size,
      height: size,
      background: "var(--rex-icon)",
      maskImage: `url(/snapshots/superlogical/v1/rex/logos/${name}.svg)`,
      WebkitMaskImage: `url(/snapshots/superlogical/v1/rex/logos/${name}.svg)`,
      maskSize: "contain",
      maskRepeat: "no-repeat",
      maskPosition: "center",
    }}
  />
);

/** Light cards, as Rex draws Codex's. */
const LIGHT = "linear-gradient(#fbfbfc, #f0f0f1)";
/** Node's own dark card, its green hexagon on it. */
const NODE_FRONT = "linear-gradient(#3b3d40, #26282b)";

const Prompt = () => (
  <svg aria-hidden width={10} height={7.3} viewBox="0 0 11 8" fill="none" stroke="#5fbf5f" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M0.8 0.8 4 3.4 0.8 6" />
    <path d="M5.6 7.2h4.6" />
  </svg>
);

type ProgramStyle = {
  /** pane header glyph and its pane-relative position */
  icon: { node: React.ReactNode; x: number; y: number };
  /** the chip's front card when this program is the tab's focused pane */
  front: string;
  logo: React.ReactNode;
  /** the card this program adds behind another pane's chip */
  back: string;
};

export const PROGRAMS: Record<ProgramKind, ProgramStyle> = {
  codex: {
    icon: { node: <OpenAIIcon style={{ color: "var(--rex-icon-strong)" }} />, x: 11, y: 10 },
    front: "linear-gradient(#fbfbfc, #f0f0f1)",
    logo: <OpenAIIcon size={11} style={{ color: "#3a3b3d" }} />,
    back: "#3b3c3f",
  },
  lazygit: {
    icon: { node: <PlusMinusCircleIcon style={{ color: "var(--rex-icon-soft)" }} />, x: 11, y: 10.5 },
    front: "linear-gradient(#7cc275, #62a95b)",
    logo: <PlusMinusCircleIcon style={{ color: "#fff", transform: "scale(0.82)" }} />,
    back: "#6fb768",
  },
  // a Node program: Node's card in front; the back card is the reference's
  snake: {
    icon: { node: <NodeIcon style={{ color: "var(--rex-icon)" }} />, x: 12, y: 10 },
    front: NODE_FRONT,
    logo: <Logo name="nodejs" w={10} h={11.4} />,
    back: "#4f8a4b",
  },
  node: {
    icon: { node: <NodeIcon style={{ color: "var(--rex-icon)" }} />, x: 12, y: 10 },
    front: NODE_FRONT,
    logo: <Logo name="nodejs" w={10} h={11.4} />,
    back: "#5fa04e",
  },
  python: {
    icon: { node: <Mono name="python" />, x: 11, y: 10.5 },
    front: LIGHT,
    logo: <Logo name="python" w={11} />,
    // Python's two colors, split
    back: "linear-gradient(#3e7cb1 0 50%, #ffd43b 50%)",
  },
  bun: {
    icon: { node: <BunLogo size={13} header />, x: 11, y: 11 },
    front: "linear-gradient(#f6f2ea, #ece6da)",
    logo: <BunLogo size={10} />,
    back: "#ddd0b4",
  },
  shell: {
    icon: { node: <TerminalIcon style={{ color: "var(--rex-icon)" }} />, x: 11, y: 11 },
    front: "linear-gradient(#45474b, #2a2c2f)",
    logo: <Prompt />,
    back: "#5d85b2",
  },
  // Claude's clay card, its spark in white
  claude: {
    icon: { node: <ClaudeIcon style={{ color: "var(--rex-icon)" }} />, x: 11.5, y: 10.5 },
    front: "linear-gradient(#e1876a, #d2714f)",
    logo: <ClaudeIcon size={11} style={{ color: "#fff" }} />,
    // the reference's: behind fish in the macos-client-ui tab
    back: "linear-gradient(#e7b562, #ea7a5a 50%, #a66dd0)",
  },
  cursor: {
    icon: { node: <Mono name="cursor" />, x: 11, y: 10.5 },
    front: "linear-gradient(#34332e, #1e1d19)",
    logo: <Logo name="cursor" w={9.6} h={11} />,
    back: "#3a3933",
  },
  gemini: {
    icon: { node: <Mono name="gemini" />, x: 11, y: 10.5 },
    front: LIGHT,
    logo: <Logo name="gemini" w={11} />,
    back: "linear-gradient(135deg, #3186ff, #9a6cff)",
  },
  opencode: {
    icon: { node: <Mono name="opencode" size={12} />, x: 11.5, y: 11 },
    front: LIGHT,
    logo: <Logo name="opencode" w={9} />,
    back: "#1e1f24",
  },
};
