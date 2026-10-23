// Anthropicons, the icon font claude.ai ships, keyed by what each glyph is.
// Its glyphs are unnamed Private Use Area code points; each one here was
// matched against the reference capture by rendering the whole font.
const GLYPHS = {
  plus: 0xe001,
  arrowLeft: 0xe00c,
  arrowRight: 0xe010,
  chevronDown: 0xe027,
  chevronRight: 0xe02a,
  diff: 0xe02d,
  chats: 0xe039,
  code: 0xe04b,
  terminal: 0xe051,
  more: 0xe061,
  moreVertical: 0xe062,
  folder: 0xe072,
  globe: 0xe082,
  tasks: 0xe08b,
  microphone: 0xe0ab,
  projects: 0xe0c9,
  search: 0xe0d3,
  sidebar: 0xe0dd,
  stop: 0xe0eb,
  customize: 0xe100,
  artifacts: 0xe017,
  bug: 0xe006,
  eye: 0xe069,
  branch: 0xe07e,
  /** the git branch in the session panel (the sidebar marks worktrees with `branch`) */
  gitBranch: 0xe078,
  check: 0xe03b,
  external: 0xe00e,
  paperclip: 0xe019,
  slashBox: 0xe0e1,
  connector: 0xe055,
  plug: 0xe0c5,
  books: 0xe096,
  background: 0xe11c,
  phone: 0xe0af,
  clock: 0xe043,
  gear: 0xe0d6,
  gauge: 0xe130,
  help: 0xe088,
  checklist: 0xe03f,
  apps: 0xe084,
  changelog: 0xe0d2,
  info: 0xe08f,
  key: 0xe091,
  logout: 0xe0a4,
  warning: 0xe109,
  laptop: 0xe093,
  image: 0xe08c,
  file: 0xe06c,
  pointer: 0xe059,
  copy: 0xe056,
  fork: 0xe012,
  pin: 0xe0bd,
  speaker: 0xe0e4,
  chevronLeft: 0xe029,
  arrowDown: 0xe009,
  expand: 0xe067,
  close: 0xe10f,
  list: 0xe09c,
  reload: 0xe11d,
  split: 0xe023,
  pen: 0xe064,
  square: 0xe0ea,
  text: 0xe14e,
  checkCircle: 0xe03c,
  pullRequest: 0xe07f,
  inbox: 0xe0c9,
  merged: 0xe07c,
  github: 0xe187,
} as const;

export type IconName = keyof typeof GLYPHS;

/** An Anthropicons glyph in a `size` square; its color is the text color. */
export function Icon({ name, size = 16, className = "", style }: { name: IconName; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span aria-hidden className={`cc-icon ${className}`} style={{ fontSize: size, ...style }}>
      {String.fromCodePoint(GLYPHS[name])}
    </span>
  );
}
