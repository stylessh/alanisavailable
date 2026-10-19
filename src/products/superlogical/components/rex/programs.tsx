// How Rex draws each program it detects: the pane header glyph (placed at its
// measured ink box) and the cards it uses in a tab's chip stack. The codex,
// lazygit, node, bun and shell styles come from the reference; codex's and
// claude's back cards, and claude's front card, are our own extrapolations.
import { ClaudeIcon, NodeIcon, OpenAIIcon, PlusMinusCircleIcon, TerminalIcon } from "./icons";
import type { ProgramKind } from "./model";

const BunLogo = ({ size, header = false }: { size: number; header?: boolean }) => (
  // svgl.app/library/bun.svg, monochrome like Rex draws it: grayscale, and
  // multiply so the logo's light fills take the card's color.
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/products/superlogical/rex/bun.svg"
    alt=""
    width={size}
    height={size * 0.875}
    // on a dark pane, multiply would erase it: the header mark inverts instead
    className={`max-w-none ${header ? "rex-bun-header" : ""}`}
    style={{ filter: "grayscale(1) contrast(1.4)", mixBlendMode: "multiply", opacity: 0.9 }}
  />
);

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
  snake: {
    icon: { node: <NodeIcon style={{ color: "var(--rex-icon)" }} />, x: 12, y: 10 },
    front: "linear-gradient(#5c9a57, #467f43)",
    logo: <NodeIcon style={{ color: "#fff", transform: "scale(0.78)" }} />,
    back: "#4f8a4b",
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
  claude: {
    icon: { node: <ClaudeIcon style={{ color: "var(--rex-icon)" }} />, x: 11.5, y: 10.5 },
    front: "linear-gradient(#fbf8f4, #f1ebe3)",
    logo: <ClaudeIcon size={10} style={{ color: "#3a3b3d" }} />,
    back: "linear-gradient(#e7b562, #ea7a5a 50%, #a66dd0)",
  },
};
