// Vector versions of Rex's UI glyphs. Each viewBox is the glyph's ink box
// measured on the 2x reference (in points), so a component placed at the
// measured top-left lines up exactly. Strokes use currentColor.
type P = { className?: string; style?: React.CSSProperties };

const svg = (w: number, h: number, p: P, children: React.ReactNode, filled = false) => (
  <svg
    aria-hidden
    width={w}
    height={h}
    viewBox={`0 0 ${w} ${h}`}
    fill={filled ? "currentColor" : "none"}
    stroke={filled ? "none" : "currentColor"}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={p.className}
    style={{ overflow: "visible", ...p.style }}
  >
    {children}
  </svg>
);

/** External drive (host chip). 14×8pt */
export const HostIcon = (p: P) =>
  svg(14, 8, p, <>
    <rect x={0.6} y={0.6} width={12.8} height={6.8} rx={1.9} strokeWidth={1.2} />
    <circle cx={3.1} cy={5} r={0.45} fill="currentColor" stroke="none" />
    <circle cx={4.4} cy={5} r={0.45} fill="currentColor" stroke="none" />
    <path d="M5.9 5h2.2" strokeWidth={0.9} />
    <circle cx={10.9} cy={5} r={0.5} fill="currentColor" stroke="none" />
  </>);

/** ⌘ 11.5×11.5pt (Lucide "command" geometry, scaled to the measured box) */
export const CommandIcon = (p: P) =>
  svg(11.5, 11.5, p,
    <g transform="translate(-1.917 -1.917) scale(0.639)">
      {/* 1.72 here is 1.1pt once scaled, the weight of Rex's other glyphs */}
      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" strokeWidth={1.72} />
    </g>);

/** + in the same 11.5pt box as ⌘, so the two title bar actions read as a pair */
export const PlusIcon = (p: P) =>
  svg(11.5, 11.5, p, <path d="M5.75 0.75v10M0.75 5.75h10" strokeWidth={1.1} />);

/** Split right: rectangle with a vertical divider. 12×9.5pt */
export const SplitRightIcon = (p: P) =>
  svg(12, 9.5, p, <>
    <rect x={0.55} y={0.55} width={10.9} height={8.4} rx={1.8} strokeWidth={1.1} />
    <path d="M6 0.8v7.9" strokeWidth={1.1} />
  </>);

/** Split down: rectangle with a horizontal divider. 12×9.5pt */
export const SplitDownIcon = (p: P) =>
  svg(12, 9.5, p, <>
    <rect x={0.55} y={0.55} width={10.9} height={8.4} rx={1.8} strokeWidth={1.1} />
    <path d="M0.8 4.75h10.4" strokeWidth={1.1} />
  </>);

/** Maximize: arrows to the top-left and bottom-right corners. 10×10pt */
export const MaximizeIcon = (p: P) =>
  svg(10, 10, p, <g strokeWidth={1.2}>
    <path d="M0.6 4V0.6H4M0.6 0.6l3.6 3.6" />
    <path d="M9.4 6v3.4H6M9.4 9.4L5.8 5.8" />
  </g>);

/** Close. 8×8pt */
export const CloseIcon = (p: P) =>
  svg(8, 8, p, <path d="M0.6 0.6l6.8 6.8M7.4 0.6L0.6 7.4" strokeWidth={1.2} />);

/** Git changes: ± in a circle. 13×12.5pt */
export const PlusMinusCircleIcon = (p: P) =>
  svg(13, 12.5, p, <>
    <circle cx={6.5} cy={6.25} r={5.7} strokeWidth={1.1} />
    <path d="M6.5 3.3v4.1M4.45 5.35h4.1M4.3 8.8h4.4" strokeWidth={1.1} />
  </>);

/** Node process: a hexagonal block with a lighter right face. 11.5×13.5pt */
export const NodeIcon = (p: P) =>
  svg(11.5, 13.5, p, <>
    <path d="M5.75 0.2 11.3 3.45v6.6L5.75 13.3 0.2 10.05v-6.6z" fill="currentColor" stroke="currentColor" strokeWidth={0.4} />
    <path d="M5.75 6.75 11.3 3.45v6.6L5.75 13.3z" fill="#fff" fillOpacity={0.09} stroke="none" />
  </>, true);

/** OpenAI mark (svgl.app/library/openai.svg), cropped to its ink box. */
export const OpenAIIcon = ({ size = 13.5, ...p }: P & { size?: number }) => (
  <svg
    aria-hidden
    width={size}
    height={size}
    viewBox="108 108 395 395"
    fill="currentColor"
    className={p.className}
    style={p.style}
  >
    <path fillRule="evenodd" clipRule="evenodd" d="M252.794 108.802C289.191 99.0484 326.265 110.305 351.148 135.135C385.113 126.072 422.85 134.862 449.492 161.505C476.136 188.149 484.925 225.888 475.862 259.85V259.854C500.696 284.735 511.95 321.81 502.198 358.207C492.447 394.602 464.161 421.084 430.215 430.217C421.083 464.162 394.603 492.448 358.206 502.199C321.812 511.951 284.734 500.693 259.852 475.864C225.887 484.927 188.15 476.137 161.507 449.495C134.864 422.851 126.073 385.111 135.136 351.149C110.304 326.266 99.0496 289.192 108.801 252.795C118.552 216.4 146.84 189.918 180.784 180.785C189.917 146.841 216.396 118.553 252.794 108.802ZM374.292 407.145C374.292 411.271 372.092 415.086 368.517 417.148L283.723 466.102C302.487 480.585 327.555 486.459 352.217 479.852C386.997 470.532 410.068 439.312 410.555 405.006V317.717C410.555 315.08 409.125 312.621 406.843 311.303L374.292 292.509V407.145ZM251.868 415.897C248.296 417.959 243.893 417.959 240.317 415.897L155.526 366.942C152.366 390.436 159.811 415.08 177.866 433.136H177.863C203.325 458.594 241.896 462.962 271.85 446.232L347.449 402.586C349.735 401.268 351.148 398.8 351.148 396.163V358.579L251.868 415.897ZM368.602 220.628C366.319 219.309 363.474 219.318 361.191 220.637L328.641 239.431L427.921 296.749C431.496 298.811 433.697 302.627 433.697 306.752V404.661C455.622 395.654 473.244 376.881 479.851 352.218C489.169 317.442 473.668 281.85 444.201 264.274L368.602 220.628ZM177.303 206.34C155.377 215.348 137.756 234.122 131.148 258.783C121.832 293.561 137.331 329.153 166.799 346.727L242.398 390.373C244.68 391.692 247.525 391.684 249.807 390.366L282.357 371.572L183.078 314.253C179.504 312.189 177.303 308.375 177.303 304.251V206.34ZM259.849 279.145V331.858L305.5 358.213L351.15 331.858V279.145L305.5 252.789L259.849 279.145ZM327.276 144.9C308.512 130.418 283.445 124.543 258.782 131.15C224.002 140.471 200.931 171.691 200.445 205.995V293.286C200.445 295.923 201.875 298.381 204.158 299.7L236.707 318.493V203.856C236.707 199.731 238.909 195.916 242.483 193.853L327.276 144.9ZM433.137 177.867C407.675 152.407 369.103 148.038 339.149 164.769L263.55 208.415C261.265 209.734 259.852 212.202 259.852 214.838V252.423L359.132 195.105C362.703 193.041 367.108 193.041 370.682 195.105L455.473 244.06C458.635 220.567 451.189 195.922 433.135 177.867H433.137Z" />
  </svg>
);

/** Shell: a >_ prompt in a rounded window. 13×11pt */
export const TerminalIcon = (p: P) =>
  svg(13, 11, p, <>
    <rect x={0.55} y={0.55} width={11.9} height={9.9} rx={2.2} strokeWidth={1.1} />
    <path d="M3.3 3.9 5.3 5.5 3.3 7.1M6.6 7.4h3" strokeWidth={1.1} />
  </>);

/** Claude mark (svgl.app/library/claude-ai-icon.svg), monochrome. */
export const ClaudeIcon = ({ size = 12, ...p }: P & { size?: number }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 256 257" fill="currentColor" className={p.className} style={p.style}>
    <path d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z" />
  </svg>
);

/** Sidebar toggle: a squircle window split by its left column (the 24pt
    "sidebar left" glyph, its 18pt ink box drawn at 13.5pt). */
export const SidebarIcon = (p: P) =>
  svg(13.5, 13.5, p, <g transform="scale(0.75) translate(-3 -3)" strokeWidth={1.5}>
    <path d="M13 3H11C7.22876 3 5.34315 3 4.17157 4.17157C3 5.34315 3 7.22876 3 11V13C3 16.7712 3 18.6569 4.17157 19.8284C5.34315 21 7.22876 21 11 21H13C16.7712 21 18.6569 21 19.8284 19.8284C21 18.6569 21 16.7712 21 13V11C21 7.22876 21 5.34315 19.8284 4.17157C18.6569 3 16.7712 3 13 3Z" />
    <path d="M9 3V21" />
  </g>);

/** Activity Mode: an eye. 15×10pt */
export const EyeIcon = (p: P) =>
  svg(15, 10, p, <>
    <path d="M0.8 5C2.4 2.2 4.8 0.7 7.5 0.7S12.6 2.2 14.2 5c-1.6 2.8-4 4.3-6.7 4.3S2.4 7.8 0.8 5z" strokeWidth={1.1} />
    <circle cx={7.5} cy={5} r={1.9} fill="currentColor" stroke="none" />
  </>);


/** Appearance: a disc half lit. 11×11pt */
export const AppearanceIcon = (p: P) =>
  svg(11, 11, p, <>
    <circle cx={5.5} cy={5.5} r={4.9} strokeWidth={1.1} />
    <path d="M5.5 0.6a4.9 4.9 0 0 1 0 9.8z" fill="currentColor" stroke="none" />
  </>);
