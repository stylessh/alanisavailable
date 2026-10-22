import type { BakedNote } from "./scratchpad";

// The open session's transcript. It follows the real session that built
// this replica (the recordings it was measured from scroll through it), so
// every component the Code tab draws shows up somewhere: prose with lists,
// inline code, file and session links; tool summaries that expand into a
// group, a Bash card or a diff; images that open in a viewer; the task
// list; turn footers; and the turn still in progress at the bottom.

/** Inline runs of a paragraph or list item; `pr` is a pull request this session opened (its number), which opens the PR panel. */
export type Run = string | { code: string } | { strong: string } | { link: string } | { session: string } | { pr: number };

export type Task = { label: string; status: "pending" | "in_progress" | "completed" };

export type DiffLine = { n: number; kind: "add" | "del" | "ctx"; text: string };

/** One tool call inside a summary row. */
export type ToolCall =
  | { kind: "bash"; command: string; output: string; failed?: boolean }
  | { kind: "edit"; file: string; path: string; added: number; removed: number; lines: DiffLine[] }
  | { kind: "read"; file: string; image?: string };

/** An image sent with a message: the picture as sent, and the notes pinned to it in the scratchpad, by the numbers on its dots. */
export type SentImage = { src: string; notes: BakedNote[] };

export type Block =
  | { kind: "user"; text: string; images?: SentImage[] }
  | { kind: "text"; runs: Run[] }
  | { kind: "list"; items: Run[][] }
  /** a collapsed group of tool calls: its summary, the +/- it made, thumbnails of images it read, and the calls it opens into */
  | { kind: "tools"; runs: Run[]; added?: number; removed?: number; thumbnails?: string[]; calls?: ToolCall[]; live?: boolean }
  /** images sent to the user, drawn large */
  | { kind: "images"; srcs: string[] }
  | { kind: "tasks"; items: Task[] }
  /** the end of a turn: copy, fork, pin, read aloud, and when it was */
  | { kind: "footer"; time: string };

const IMG = "/snapshots/claude/v3/transcript";

const WINDOW_EXCERPT = `        className={\`mac-window absolute overflow-hidden [corner-shape:superellipse(1.6)] \${className}\`}
        initial={false}
        animate={animate}
        transition={transition}
        onAnimationStart={() => !away && setHidden(false)}
        onAnimationComplete={() => {
          setHidden(away);
          setReveal(false);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onDoubleClick={onDoubleClick}
        style={{
          ...style,
          zIndex: z,
          borderRadius: win.mode === "fullscreen" ? 0 : radius,
          // Full screen has no window edges: no rims, highlights or shadow,
          // and nothing behind it to see through.
          ...(win.mode === "fullscreen" && { boxShadow: "none", backdropFilter: "none", WebkitBackdropFilter: "none", ...fullscreenStyle }),
          visibility: hidden && away ? "hidden" : undefined,
          pointerEvents: away ? "none" : style?.pointerEvents,`;

const POPOVER_FIX: DiffLine[] = [
  { n: 88, kind: "ctx", text: "" },
  { n: 89, kind: "ctx", text: "  return (" },
  { n: 90, kind: "ctx", text: "    <PopoverContext.Provider value={{ close: () => setOpen(false) }}>" },
  { n: 91, kind: "add", text: "      {/* the root anchors the surface; a caller that positions it absolutely keeps that */}" },
  { n: 91, kind: "del", text: "      <div ref={root} data-no-drag className={`relative ${className}`} style={style}>" },
  {
    n: 92,
    kind: "add",
    text: '      <div ref={root} data-no-drag className={`${/\\babsolute\\b/.test(className) ? "" : "relative "}${className}`} style={style}>',
  },
  { n: 93, kind: "ctx", text: "        {trigger({ open, toggle: () => setOpen((o) => !o) })}" },
  { n: 94, kind: "ctx", text: "        <AnimatePresence>" },
  { n: 95, kind: "ctx", text: "          {open && (" },
];

const POPOVER_NEW: DiffLine[] = [
  { n: 1, kind: "add", text: '"use client";' },
  { n: 2, kind: "add", text: "" },
  { n: 3, kind: "add", text: 'import { AnimatePresence, motion } from "motion/react";' },
  { n: 4, kind: "add", text: 'import { createContext, type CSSProperties, type ReactNode, useContext, useEffect, useRef, useState } from "react";' },
  { n: 5, kind: "add", text: 'import { Icon, type IconName } from "./icon";' },
  { n: 6, kind: "add", text: "" },
  { n: 7, kind: "add", text: "// Claude's menus and popovers (pt, from the screen recording at 2x): a" },
  { n: 8, kind: "add", text: "// #1d1d1d surface with a 1pt #2f2f2f rim and r 10 corners, 3pt of padding" },
  { n: 9, kind: "add", text: "export const ROW_H = 24;" },
  { n: 10, kind: "add", text: "const PAD_X = 3;" },
];

export const TRANSCRIPT: Block[] = [
  {
    kind: "user",
    text: "Hey, so this is a website to market myself. During my journey to looking into a full-time job, and what I'm doing is to basically recreating some of the popular products I like and then trying to add different things on my own to their actual prototype, so then I can just record a video and do a walkthrough of it . We build some stuff around superlogical Rex application, but now I want to start scaffolding the Claude Code desktop app. We still gonna borrow the macOS OS system and we're just gonna create a Claude Code application. What I want you to do is to actually record and get screenshots from my actual macOS so that you can see like and get like the Claude Code doc icon and then this aesthetics of the desktop app, and using the pixel perfect skill . We're gonna try and replicate as best as we can so that we can start working on those",
  },
  { kind: "tools", runs: ["Ran an agent, used a tool"] },
  {
    kind: "text",
    runs: [
      "The macOS shell and Rex live in ",
      { code: "/Users/alan/Dev/alanisavailable" },
      ", not this Redakt worktree — I’ll work there. Let me check its state and the Claude app on this Mac.",
    ],
  },
  {
    kind: "tools",
    runs: ["Ran 3 commands, read ", { strong: "claude-icon-512.png" }],
    thumbnails: ["/snapshots/claude/v3/dock-icon.png"],
    calls: [
      { kind: "bash", command: "ls /Applications | grep -i claude", output: "Claude.app" },
      {
        kind: "bash",
        command: "mdls -name kMDItemCFBundleIdentifier /Applications/Claude.app",
        output: 'kMDItemCFBundleIdentifier = "com.anthropic.claudefordesktop"',
      },
      { kind: "bash", command: "swift icon.swift /Applications/Claude.app ref/claude-icon-512.png 512", output: "wrote ref/claude-icon-512.png (512×512)" },
      { kind: "read", file: "claude-icon-512.png", image: "/snapshots/claude/v3/dock-icon.png" },
    ],
  },
  {
    kind: "text",
    runs: ["Got the real dock icon straight from the app bundle (system-rendered, not a screenshot crop). Now the window itself."],
  },
  { kind: "footer", time: "3 hours ago" },

  {
    kind: "user",
    text: "Now I want you to start interacting with the app and start opening menus, panels, items, and to see what their interactions are, and then you will replicate it here in our demo.",
  },
  {
    kind: "tools",
    runs: ["Ran a command, read 3 files"],
    thumbnails: [`${IMG}/model-menu.webp`, `${IMG}/account-menu.webp`, `${IMG}/panel-menu.webp`],
    calls: [
      { kind: "bash", command: 'ffmpeg -i rec.mov -vf "fps=1,scale=504:-1" thumb/t_%03d.png', output: "" },
      { kind: "read", file: "model-menu.png", image: `${IMG}/model-menu.webp` },
      { kind: "read", file: "account-menu.png", image: `${IMG}/account-menu.webp` },
      { kind: "read", file: "panel.png", image: `${IMG}/panel-menu.webp` },
    ],
  },
  { kind: "text", runs: ["The recording covers a lot of states. From the overview I can pick out:"] },
  {
    kind: "list",
    items: [
      [
        { strong: "Composer:" },
        " the + attach menu (with its Connectors and Plugins submenus), the model picker with its Effort submenu, the permission-mode picker, and the context-usage popover.",
      ],
      [{ strong: "Header:" }, " the session details panel, the Terminal, Diff, Browser and Files panels, and the More (⋮) menu."],
      [{ strong: "Sidebar:" }, " the More menu, the account menu, and the session title menu with its submenus."],
    ],
  },
  {
    kind: "tools",
    runs: ["Ran 2 commands (1 failed)"],
    calls: [
      {
        kind: "bash",
        failed: true,
        command: 'ffmpeg -i "/Users/alan/Desktop/Screen Recording 2026-10-20 at 1.03.19 AM.mov" -vf "fps=1" thumb/t_%03d.png',
        output:
          "Error opening input file /Users/alan/Desktop/Screen Recording 2026-10-20 at 1.03.19 AM.mov.\nError opening input files: No such file or directory",
      },
      { kind: "bash", command: 'ln -sf "$(ls -t ~/Desktop/Screen*.mov | head -1)" rec.mov && ffmpeg -i rec.mov -vf "fps=1" thumb/t_%03d.png', output: "" },
    ],
  },
  { kind: "text", runs: ["Menu specs from the frame (pt):"] },
  {
    kind: "list",
    items: [
      [{ strong: "Surface:" }, " fill ", { code: "#1d1d1d" }, ", 1pt border ", { code: "#2f2f2f" }, ", corner radius about 10."],
      [{ strong: "Rows:" }, " 24pt pitch, 4pt inset; the hover row is ", { code: "#2b2b2b" }, "."],
      [{ strong: "Submenu:" }, " opens 2pt to the right of its parent. Its toggles are 26pt wide, blue ", { code: "#246dd1" }, "."],
    ],
  },
  {
    kind: "tools",
    runs: ["Created ", { strong: "popover.tsx" }, ", ran 2 commands"],
    added: 318,
    removed: 0,
    calls: [
      {
        kind: "edit",
        file: "popover.tsx",
        path: "/Users/alan/Dev/alanisavailable/src/snapshots/claude/v3/components/claude-code/popover.tsx",
        added: 318,
        removed: 0,
        lines: POPOVER_NEW,
      },
      { kind: "bash", command: "npx tsc --noEmit -p .", output: "" },
      { kind: "bash", command: "npx eslint src/products/claude", output: "" },
    ],
  },
  {
    kind: "text",
    runs: [
      "Found the bug: Popover’s own ",
      { code: "relative" },
      " class overrides my ",
      { code: "absolute" },
      ", causing the model chip to overlap “Bypass permissions” in the footer. Fixing that plus the hover targets in my capture script.",
    ],
  },
  {
    kind: "tools",
    runs: ["Edited ", { strong: "popover.tsx" }],
    added: 2,
    removed: 1,
    calls: [
      {
        kind: "edit",
        file: "popover.tsx",
        path: "/Users/alan/Dev/alanisavailable/src/snapshots/claude/v3/components/claude-code/popover.tsx",
        added: 2,
        removed: 1,
        lines: POPOVER_FIX,
      },
    ],
  },
  {
    kind: "text",
    runs: ["Each menu from your recording next to the replica. First sheet: the composer’s menus. Second: the account menu and the session details panel."],
  },
  { kind: "images", srcs: [`${IMG}/model-menu.webp`, `${IMG}/account-menu.webp`] },
  {
    kind: "text",
    runs: [
      "The new code is ",
      { code: "popover.tsx" },
      " (the shared menu pieces), ",
      { code: "menus.tsx" },
      " and ",
      { code: "session-panel.tsx" },
      ", all in ",
      { link: "src/snapshots/claude/v3/components/claude-code/" },
      ". I’ve proposed the panels as ",
      { session: "Build Claude replica’s Terminal/Diff/Browser/Files panels" },
      ".",
    ],
  },
  { kind: "footer", time: "1 hour ago" },

  {
    kind: "user",
    text: "Okay, great. I need you to mimic the borders of the window, right? Assuming that we have some sort of glassy style. In this case, it's not really glassy because the app doesn't have transparency, but the borders, right? And the shadow of the window matters here.",
  },
  {
    kind: "tools",
    runs: ["Ran a command"],
    calls: [{ kind: "bash", command: "python3 -I -c \"from PIL import Image; print(Image.open('ref/window-shadow.png').size)\"", output: "(2888, 1852)" }],
  },
  {
    kind: "text",
    runs: ["The reference capture with shadow has the shadow in its alpha channel, so I can read the shadow’s falloff directly. Profiling the edges."],
  },
  {
    kind: "tools",
    runs: ["Ran sed…"],
    calls: [
      {
        kind: "bash",
        command: 'sed -n 300,360p src/os/macos/window.tsx; grep -rn "mac-window" src/app/*.css src/os/macos/*.css 2>/dev/null | head',
        output: WINDOW_EXCERPT,
      },
    ],
  },
  {
    kind: "text",
    runs: [
      "The window draws its own box-shadow, so I’ll keep the outline and drop shadow there, and draw the inner rim as an overlay on top of the window’s content, where the sidebar can’t cover it.",
    ],
  },
  {
    kind: "tools",
    runs: ["Ran a command, read ", { strong: "window-edge.png" }],
    thumbnails: [`${IMG}/window-edge.webp`],
    calls: [
      { kind: "bash", command: "sh shoot.sh", output: "screen (3024, 1964) rect 176.0 100.5 1160.0 720.0" },
      { kind: "read", file: "window-edge.png", image: `${IMG}/window-edge.webp` },
    ],
  },
  { kind: "text", runs: ["Window edge and shadow over white so you can see the shadow. Then the replica on the desktop."] },
  { kind: "images", srcs: [`${IMG}/window-edge.webp`, `${IMG}/replica-desktop.webp`] },
  {
    kind: "text",
    runs: ["The window’s border and shadow now match the real Claude window. You’re right that it isn’t glass. The edge is built from three layers:"],
  },
  {
    kind: "list",
    items: [
      [{ strong: "Outer line:" }, " a thin black outline (0.5pt, 93%) around the window."],
      [{ strong: "Inner rim:" }, " a 1pt line of white at 10% just inside the edge, the same on all four sides."],
      [{ strong: "Shadow:" }, " cast downward. It reaches about 16pt above the window, 28pt to the sides and 34pt below."],
    ],
  },
  {
    kind: "text",
    runs: [
      "The values live in ",
      { code: "--cc-window-shadow" },
      " and ",
      { code: "--cc-window-rim" },
      " in ",
      { link: "src/snapshots/claude/v3/styles.css" },
      ", and the rim overlay is in ",
      { code: "claude-window.tsx" },
      ".",
    ],
  },
  { kind: "text", runs: ["Committed and opened ", { pr: 6 }, " for review, and the panel work as ", { pr: 7 }, "."] },
  { kind: "footer", time: "12 minutes ago" },

  {
    kind: "user",
    text: "I just recorded another video that is on desktop, and it's basically showcasing all the interactions and the design in terms of the conversation renderer. Which I think we need to make it more rich with more like variation of content and different components.",
  },
  {
    kind: "tools",
    runs: ["Ran 2 commands"],
    calls: [
      {
        kind: "bash",
        command: "ls -lt ~/Desktop/*.mov | head -3",
        output: "-rw-------@ 1 alan  staff  163919368 Oct 20 11:10 Screen Recording 2026-10-20 at 11.09.11 AM.mov",
      },
      { kind: "bash", command: 'ffmpeg -i rec.mov -vf "fps=2,scale=756:-1" thumb/t_%03d.png', output: "" },
    ],
  },
  { kind: "text", runs: ["The recording scrolls through this very conversation and opens things along the way. Measuring each component at full resolution."] },
  {
    kind: "tasks",
    items: [
      { label: "Extract frames from the new recording", status: "in_progress" },
      { label: "Catalog every transcript component", status: "pending" },
      { label: "Measure each component", status: "pending" },
      { label: "Build the components and a richer fixture", status: "pending" },
      { label: "Compare against frames and fix", status: "pending" },
    ],
  },
];
