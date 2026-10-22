"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspace, type Workspace } from "./workspace";
import { Menu, MenuItem, Popover } from "./popover";
import { BarButton, PanelFrame, PanelTab } from "./side-panel";

// The Terminal panel (pt, from the recording): a #161616 card. One terminal
// shows as a plain "Terminal" title; more show as tabs. Text is Anthropic
// Mono at 12px on a 17pt line, 9pt from the card's left edge, the first
// line 15pt under the bar. The cursor is a block that blinks.

type Line = { prompt?: boolean; text: string };
type Term = { id: number; lines: Line[] };

const CURSOR_STYLES = ["Block", "Underline", "Bar"] as const;
const SCROLLBACK = ["1,000 lines", "10,000 lines", "100,000 lines"];

function reply(cmd: string, shell: Workspace["shell"]): string | null {
  if (cmd === "") return null;
  if (cmd.startsWith("echo ")) return cmd.slice(5);
  return shell.replies[cmd] ?? `zsh: command not found: ${cmd.split(" ")[0]}`;
}

function Settings({
  cursor,
  setCursor,
  blink,
  setBlink,
}: {
  cursor: (typeof CURSOR_STYLES)[number];
  setCursor: (c: (typeof CURSOR_STYLES)[number]) => void;
  blink: boolean;
  setBlink: (b: boolean) => void;
}) {
  const [copyOnSelect, setCopyOnSelect] = useState(false);
  const [scrollback, setScrollback] = useState("10,000 lines");
  return (
    <Menu width={190}>
      <MenuItem
        inset={false}
        label="Cursor style"
        hint={cursor}
        submenu={{
          content: (
            <Menu width={112}>
              {CURSOR_STYLES.map((c) => (
                <MenuItem key={c} inset={false} label={c} checked={cursor === c} onSelect={() => setCursor(c)} />
              ))}
            </Menu>
          ),
        }}
      />
      <MenuItem inset={false} label="Blink cursor" checked={blink} onSelect={() => setBlink(!blink)} />
      <MenuItem inset={false} label="Copy on select" checked={copyOnSelect} onSelect={() => setCopyOnSelect(!copyOnSelect)} />

      <MenuItem
        inset={false}
        label="Scrollback"
        hint={scrollback}
        submenu={{
          content: (
            <Menu width={130}>
              {SCROLLBACK.map((s) => (
                <MenuItem key={s} inset={false} label={s} checked={scrollback === s} onSelect={() => setScrollback(s)} />
              ))}
            </Menu>
          ),
        }}
      />
    </Menu>
  );
}

/** A terminal that answers a few commands, with tabs for more of them. */
export function TerminalPanel({ expanded, onExpand, onClose }: { expanded: boolean; onExpand: () => void; onClose: () => void }) {
  const { shell } = useWorkspace();
  const [terms, setTerms] = useState<Term[]>([{ id: 1, lines: [] }]);
  const [active, setActive] = useState(1);
  const [input, setInput] = useState("");
  const [cursor, setCursor] = useState<(typeof CURSOR_STYLES)[number]>("Block");
  const [blink, setBlink] = useState(true);
  const field = useRef<HTMLInputElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const term = terms.find((t) => t.id === active) ?? terms[0];

  useEffect(() => {
    screen.current?.scrollTo({ top: screen.current.scrollHeight });
  }, [term.lines.length]);

  const run = () => {
    const cmd = input.trim();
    setTerms((ts) =>
      ts.map((t) => {
        if (t.id !== term.id) return t;
        if (cmd === "clear") return { ...t, lines: [] };
        const out = reply(cmd, shell);
        return { ...t, lines: [...t.lines, { prompt: true, text: input }, ...(out === null ? [] : out.split("\n").map((text) => ({ text })))] };
      }),
    );
    setInput("");
  };

  const addTab = () => {
    const id = Math.max(...terms.map((t) => t.id)) + 1;
    setTerms((ts) => [...ts, { id, lines: [] }]);
    setActive(id);
  };

  const closeTab = (id: number) => {
    const rest = terms.filter((t) => t.id !== id);
    if (!rest.length) return onClose();
    setTerms(rest);
    if (active === id) setActive(rest[rest.length - 1].id);
  };

  const cursorStyle =
    cursor === "Block"
      ? { width: "0.6em", height: 15, background: "var(--cc-terminal-text)" }
      : cursor === "Underline"
        ? { width: "0.6em", height: 2, marginTop: 13, background: "var(--cc-terminal-text)" }
        : { width: 1.5, height: 15, background: "var(--cc-terminal-text)" };

  return (
    <PanelFrame
      expanded={expanded}
      onExpand={onExpand}
      onClose={onClose}
      background="var(--cc-terminal)"
      title={
        <div role="tablist" aria-label="Terminals" className="flex items-center gap-[4px]">
          {terms.length === 1 ? (
            <span className="pl-[9px]" style={{ color: "var(--cc-text-muted)" }}>
              Terminal
            </span>
          ) : (
            terms.map((t, i) => (
              <PanelTab key={t.id} active={t.id === active} label={`Terminal ${i + 1}`} onSelect={() => setActive(t.id)} onClose={() => closeTab(t.id)} />
            ))
          )}
          <BarButton icon="plus" label="New terminal" size={14} onClick={addTab} />
        </div>
      }
      actions={
        <Popover
          placement="bottom-end"
          offset={6}
          trigger={({ open, toggle }) => <BarButton icon="moreVertical" label="Terminal settings" active={open} tone="gray" onClick={toggle} />}
        >
          <Settings cursor={cursor} setCursor={setCursor} blink={blink} setBlink={setBlink} />
        </Popover>
      }
    >
      <div
        ref={screen}
        className="absolute inset-0 overflow-y-auto px-[9px] pt-[6.5px] pb-[9px] text-[12px] leading-[17px]"
        style={{ fontFamily: "var(--cc-mono)", color: "var(--cc-terminal-text)", scrollbarWidth: "none" }}
        onClick={() => field.current?.focus()}
      >
        {term.lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {l.prompt ? `${shell.prompt} ${l.text}` : l.text}
          </div>
        ))}
        <label className="relative flex items-center whitespace-pre">
          {shell.prompt} <span>{input}</span>
          <span aria-hidden className={`inline-block flex-none ${blink ? "cc-cursor-blink" : ""}`} style={cursorStyle} />
          <input
            ref={field}
            aria-label="Terminal input"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            className="absolute inset-0 opacity-0"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
      </div>
    </PanelFrame>
  );
}
