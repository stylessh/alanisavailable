"use client";

import { useState } from "react";
import { COMPOSER, SLASH_COMMANDS } from "./content";
import { FILE_TREE, type TreeNode } from "./panel-content";
import { FileMark } from "./side-panel";
import { Icon } from "./icon";
import { AttachMenu, effortColor, ModeMenu, ModelMenu, UsagePopover, useComposerSettings } from "./menus";
import { Menu, MenuItem, Popover } from "./popover";

/** How much of the context window the session has used: a 14pt ring, 2pt thick, with a blue arc from 12 o'clock. */
function ContextMeter({ used }: { used: number }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg aria-hidden viewBox="0 0 14 14" className="size-[14px]">
      <circle cx={7} cy={7} r={r} fill="none" stroke="var(--cc-ring-track)" strokeWidth={2} />
      <circle
        cx={7}
        cy={7}
        r={r}
        fill="none"
        stroke="var(--cc-ring)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${used * c} ${c}`}
        transform="rotate(-90 7 7)"
      />
    </svg>
  );
}

/** A footer control: plain text that gets a 21pt rounded chip under the pointer and while its menu is open. */
function Chip({ open, toggle, label, children }: { open: boolean; toggle: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={toggle}
      className="flex h-[21px] items-center rounded-[6px] px-[6px] hover:bg-(--cc-chip-hover)"
      style={{ background: open ? "var(--cc-chip-hover)" : undefined }}
    >
      {children}
    </button>
  );
}

type Suggestion = { key: string; label: string; detail?: string; mark?: React.ReactNode; insert: string };

/** Every file and folder in the fixture tree, as "@" offers them: files first, shallowest first, then folders. */
const MENTIONABLE: Suggestion[] = (function walk(nodes: TreeNode[], dir: string, depth: number): (Suggestion & { depth: number; isDir: boolean })[] {
  return nodes.flatMap((n) => {
    const path = dir ? `${dir}/${n.name}` : n.name;
    const self = {
      key: path,
      label: n.name,
      detail: dir || undefined,
      mark: n.children ? <Icon name="folder" size={14} style={{ color: "var(--cc-text-muted)" }} /> : <FileMark name={n.name} />,
      insert: `@${path}${n.children ? "/" : ""} `,
      depth,
      isDir: !!n.children,
    };
    return [self, ...(n.children ? walk(n.children, path, depth + 1) : [])];
  });
})(FILE_TREE, "", 0).sort((a, b) => Number(a.isDir) - Number(b.isDir) || a.depth - b.depth);

/**
 * What the prompt suggests for the word being typed: slash commands after a
 * leading "/" (a 239pt list at the composer's left), files and folders
 * after "@" (a wide list lined up with the text, icons first).
 */
function suggestionsFor(text: string): { kind: "slash" | "mention"; items: Suggestion[]; replaceFrom: number } | null {
  if (text.startsWith("/") && !text.includes(" ")) {
    const q = text.slice(1);
    return { kind: "slash", replaceFrom: 0, items: SLASH_COMMANDS.filter((c) => c.startsWith(q)).map((c) => ({ key: c, label: c, insert: `/${c} ` })) };
  }
  const at = text.match(/(^|\s)@(\S*)$/);
  if (at) {
    const q = at[2].toLowerCase();
    const items = MENTIONABLE.filter((m) => m.key.toLowerCase().includes(q)).slice(0, 40);
    return { kind: "mention", replaceFrom: text.length - at[2].length - 1, items };
  }
  return null;
}

function Suggestions({ kind, items, active, onPick }: { kind: "slash" | "mention"; items: Suggestion[]; active: number; onPick: (s: Suggestion) => void }) {
  if (!items.length) return null;
  const mention = kind === "mention";
  return (
    <div className="absolute z-50" style={mention ? { left: 34, width: "min(558px, 100% - 76px)", bottom: "100%" } : { left: 18, bottom: "100%" }}>
      <Menu
        width={mention ? 0 : 239}
        className={`max-h-[440px] overflow-y-auto ${mention ? "!w-full text-[14px]" : ""}`}
        style={{ scrollbarWidth: mention ? "thin" : "none" }}
      >
        {items.map((s, i) => (
          <div key={s.key} data-active={i === active % items.length || undefined} className="[&[data-active]>div]:bg-(--cc-menu-row)">
            <MenuItem
              inset={false}
              label={
                <span className="flex items-center gap-[7px]">
                  {s.mark}
                  {s.label}
                  {s.detail && <span style={{ color: "var(--cc-text-muted)" }}>{s.detail}</span>}
                </span>
              }
              onSelect={() => onPick(s)}
            />
          </div>
        ))}
      </Menu>
    </div>
  );
}

/** The prompt field and, under it, the permission mode, model, effort and context used. */
export function Composer() {
  const { mode, model, effort } = useComposerSettings();
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const suggest = suggestionsFor(text);
  const matches = suggest?.items ?? [];
  const pick = (s: Suggestion) => setText(text.slice(0, suggest?.replaceFrom ?? 0) + s.insert);

  return (
    <div className="pb-[12px]">
      <div
        className="relative flex h-[44px] items-center rounded-[14px] text-[14px]"
        style={{
          background: "var(--cc-composer)",
          boxShadow: "inset 0 0 0 1px var(--cc-composer-border)",
        }}
      >
        <Popover
          placement="top-start"
          offset={12}
          align={-2}
          className="absolute"
          style={{ left: 10 }}
          trigger={({ open, toggle }) => (
            <button
              type="button"
              aria-label="Attach"
              aria-expanded={open}
              onClick={toggle}
              className="flex size-6 items-center justify-center rounded-md hover:bg-(--cc-button-hover)"
              style={{
                background: open ? "var(--cc-button-hover)" : undefined,
              }}
            >
              <Icon name="plus" size={18} style={{ color: "var(--cc-icon)" }} />
            </button>
          )}
        >
          <AttachMenu />
        </Popover>
        <input
          aria-label="Prompt"
          value={text}
          placeholder={COMPOSER.placeholder}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (!matches.length) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
            } else if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              pick(matches[active % matches.length]);
            } else if (e.key === "Escape") setText("");
          }}
          className="absolute inset-y-0 right-[80px] bg-transparent outline-none placeholder:text-(--cc-text-muted)"
          style={{
            left: 42.25,
            color: "var(--cc-text-strong)",
            caretColor: "var(--cc-text-strong)",
          }}
        />
        {suggest && <Suggestions kind={suggest.kind} items={suggest.items} active={active} onPick={pick} />}
        <button
          type="button"
          aria-label="Stop"
          className="absolute flex size-6 items-center justify-center rounded-md hover:bg-(--cc-button-hover)"
          style={{ right: 46 }}
        >
          <Icon name="stop" size={18.5} style={{ color: "var(--cc-composer-icon)" }} />
        </button>
        <button
          type="button"
          aria-label="Dictate"
          className="absolute flex size-6 items-center justify-center rounded-md hover:bg-(--cc-button-hover)"
          style={{ right: 10 }}
        >
          <Icon name="microphone" size={17} style={{ color: "var(--cc-composer-icon)" }} />
        </button>
      </div>
      <div className="relative mt-[12.5px] flex h-[20px] items-center text-[13px]" style={{ color: "var(--cc-text)" }}>
        <Popover
          placement="top-start"
          offset={9.5}
          className="absolute"
          style={{ left: 10.25 }}
          trigger={({ open, toggle }) => (
            <Chip open={open} toggle={toggle} label="Permission mode">
              <span className="tracking-[-0.01em]">{mode}</span>
            </Chip>
          )}
        >
          <ModeMenu />
        </Popover>
        <Popover
          placement="top-end"
          offset={8}
          className="absolute"
          style={{ right: 39 }}
          trigger={({ open, toggle }) => (
            <Chip open={open} toggle={toggle} label="Model and effort">
              <span className="flex items-center gap-[7.5px]">
                {model}
                <span
                  style={{
                    color: effortColor(effort) ?? "var(--cc-text-muted)",
                  }}
                >
                  {effort}
                </span>
              </span>
            </Chip>
          )}
        >
          <ModelMenu />
        </Popover>
        <Popover
          placement="top-end"
          offset={10}
          align={-5.5}
          className="absolute"
          style={{ right: 11.25 }}
          trigger={({ open, toggle }) => (
            <button
              type="button"
              aria-label={`${Math.round(COMPOSER.contextUsed * 100)}% of context used`}
              aria-expanded={open}
              onClick={toggle}
              className="flex size-[22px] items-center justify-center rounded-[6px] hover:bg-(--cc-chip-hover)"
              style={{ background: open ? "var(--cc-chip-hover)" : undefined }}
            >
              <ContextMeter used={COMPOSER.contextUsed} />
            </button>
          )}
        >
          <UsagePopover />
        </Popover>
      </div>
    </div>
  );
}
