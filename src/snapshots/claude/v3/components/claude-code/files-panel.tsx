"use client";

import { useMemo, useState } from "react";
import { CodeView } from "./code-view";
import { Icon } from "./icon";
import type { TreeNode } from "./panel-content";
import { useWorkspace } from "./workspace";
import { Menu, MenuItem, MenuSeparator, Popover } from "./popover";
import { BarButton, FileMark, PanelFrame, PanelTab } from "./side-panel";

// The Files panel (pt, from the recording): a #0a0a0a card with open files
// as tabs (a file opened by a single click is a preview, in italics, until
// it's edited or opened again), the open file's path and source on the
// left, and on the right a 241pt tree under a 26pt filter field. Tree rows
// are 24pt apart, 10pt of indent per level; the open file's row is lit.
const TREE_W = 241;
const INDENT = 10;

type Tab = { path: string; preview: boolean };

function TreeRows({
  nodes,
  depth,
  dir,
  open,
  toggle,
  selected,
  onOpen,
  filter,
}: {
  nodes: TreeNode[];
  depth: number;
  dir: string;
  open: Set<string>;
  toggle: (path: string) => void;
  selected: string | null;
  onOpen: (path: string, pin: boolean) => void;
  filter: string;
}) {
  return nodes.map((n) => {
    const path = dir ? `${dir}/${n.name}` : n.name;
    const isDir = !!n.children;
    const expanded = isDir && (open.has(path) || (!!filter && n.children!.length > 0));
    if (filter && !isDir && !path.toLowerCase().includes(filter)) return null;
    return (
      <div key={path}>
        <div
          role="treeitem"
          aria-expanded={isDir ? expanded : undefined}
          aria-selected={path === selected}
          onClick={() => (isDir ? toggle(path) : onOpen(path, false))}
          onDoubleClick={() => !isDir && onOpen(path, true)}
          className="mx-[5px] flex h-[24px] cursor-default items-center gap-[6px] rounded-[6px] hover:bg-(--cc-button-hover)"
          style={{ paddingLeft: 12 + depth * INDENT, background: path === selected ? "var(--cc-tree-selected)" : undefined, color: "var(--cc-text)" }}
        >
          {isDir ? (
            <Icon name={expanded ? "chevronDown" : "chevronRight"} size={11} className="w-[14px] text-center" style={{ color: "var(--cc-text-muted)" }} />
          ) : (
            <FileMark name={n.name} />
          )}
          <span className="truncate">{n.name}</span>
        </div>
        {expanded && (
          <TreeRows nodes={n.children!} depth={depth + 1} dir={path} open={open} toggle={toggle} selected={selected} onOpen={onOpen} filter={filter} />
        )}
      </div>
    );
  });
}

function EditorMenu({ settings, set }: { settings: Record<string, boolean>; set: (key: string) => void }) {
  const check = (key: string, label: string, hint?: string) => (
    <MenuItem inset={false} label={label} checked={settings[key]} hint={hint} onSelect={() => set(key)} />
  );
  return (
    <Menu width={216}>
      {check("tree", "Show file tree", "⇧⌘Y")}
      <MenuItem
        inset={false}
        label="File tree position"
        hint="Automatic"
        submenu={{
          content: (
            <Menu width={120}>
              {["Automatic", "Left", "Right"].map((p) => (
                <MenuItem key={p} inset={false} label={p} checked={p === "Automatic"} />
              ))}
            </Menu>
          ),
        }}
      />
      <MenuSeparator />
      {check("previewTabs", "Preview tabs")}
      {check("autoSave", "Auto save")}
      {check("tabIndents", "Tab key indents")}
      <MenuSeparator />
      {check("wrap", "Word wrap")}
      {check("guides", "Indent guides")}
      {check("whitespace", "Show whitespace")}
      {check("pastEnd", "Scroll past end")}
      <MenuItem
        inset={false}
        label="Tab size"
        hint="4"
        submenu={{
          content: (
            <Menu width={80}>
              {["2", "4", "8"].map((n) => (
                <MenuItem key={n} inset={false} label={n} checked={n === "4"} />
              ))}
            </Menu>
          ),
        }}
      />
    </Menu>
  );
}

/** The project's files: a tree to pick from and tabs of what's open. */
export function FilesPanel({ expanded, onExpand, onClose }: { expanded: boolean; onExpand: () => void; onClose: () => void }) {
  const { tree, files, openFile: firstFile } = useWorkspace();
  const [tabs, setTabs] = useState<Tab[]>([{ path: firstFile, preview: true }]);
  const [active, setActive] = useState<string | null>(firstFile);
  const [open, setOpen] = useState<Set<string>>(new Set(["src", "src/app"]));
  const [filter, setFilter] = useState("");
  const [settings, setSettings] = useState<Record<string, boolean>>({
    tree: true,
    previewTabs: true,
    autoSave: true,
    tabIndents: true,
    wrap: true,
    guides: true,
    whitespace: false,
    pastEnd: false,
  });
  const source = active ? files[active] : undefined;
  const crumbs = useMemo(() => active?.split("/") ?? [], [active]);

  const openFile = (path: string, pin: boolean) => {
    setActive(path);
    setTabs((ts) => {
      if (ts.some((t) => t.path === path)) return ts.map((t) => (t.path === path && pin ? { ...t, preview: false } : t));
      // a preview tab is replaced by the next file opened with a single click
      const kept = settings.previewTabs && !pin ? ts.filter((t) => !t.preview) : ts;
      return [...kept, { path, preview: settings.previewTabs && !pin }];
    });
  };

  const closeTab = (path: string) => {
    const rest = tabs.filter((t) => t.path !== path);
    setTabs(rest);
    if (active === path) setActive(rest.at(-1)?.path ?? null);
  };

  return (
    <PanelFrame
      expanded={expanded}
      onExpand={onExpand}
      onClose={onClose}
      background="var(--cc-code-pane)"
      title={
        tabs.length ? (
          <div role="tablist" aria-label="Open files" className="flex min-w-0 items-center gap-[4px] overflow-hidden">
            {tabs.map((t) => (
              <PanelTab
                key={t.path}
                active={t.path === active}
                label={t.path.split("/").at(-1)!}
                italic={t.preview}
                icon={<FileMark name={t.path} />}
                onSelect={() => setActive(t.path)}
                onClose={() => closeTab(t.path)}
              />
            ))}
          </div>
        ) : (
          <span className="pl-[9px]" style={{ color: "var(--cc-text-muted)" }}>
            Files
          </span>
        )
      }
      actions={
        <>
          <BarButton icon="search" label="Search in files" />
          <BarButton icon="list" label="File tree" active={settings.tree} onClick={() => setSettings((s) => ({ ...s, tree: !s.tree }))} />
          <Popover
            placement="bottom-end"
            offset={6}
            trigger={({ open, toggle }) => <BarButton icon="moreVertical" label="Editor options" active={open} tone="gray" onClick={toggle} />}
          >
            <EditorMenu settings={settings} set={(k) => setSettings((s) => ({ ...s, [k]: !s[k] }))} />
          </Popover>
        </>
      }
    >
      <div className="absolute inset-0 flex">
        <div className="relative min-w-0 flex-1">
          {active ? (
            <div className="absolute inset-0 flex flex-col">
              <div className="flex h-[28px] flex-none items-center pl-[9px]" style={{ color: "var(--cc-text-muted)" }}>
                {crumbs.map((c, i) => (
                  <span key={i} style={{ color: i === crumbs.length - 1 ? "var(--cc-text-strong)" : undefined }}>
                    {i > 0 && <span className="px-[4px]">/</span>}
                    {c}
                  </span>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-[8px]" style={{ scrollbarWidth: "thin" }}>
                {source ? (
                  <div className={settings.guides ? "" : "[&_[aria-hidden]]:hidden"}>
                    <CodeView source={source} wrap={settings.wrap} />
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-[10px] text-[12px]" style={{ color: "var(--cc-text-muted)" }}>
                    This file looks like binary data and can&apos;t be previewed as text.
                    <div className="flex gap-[6px]">
                      {["Show in Finder", "View as text anyway"].map((b) => (
                        <button
                          key={b}
                          type="button"
                          className="rounded-[6px] px-[8px] leading-[22px] hover:brightness-125"
                          style={{ background: "var(--cc-tab)", color: "var(--cc-text-strong)" }}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Icon name="folder" size={18} style={{ color: "var(--cc-text-muted)" }} />
              <p className="mt-[12px]" style={{ color: "var(--cc-text-strong)" }}>
                Open files appear here
              </p>
              <p className="mt-[2px] max-w-[240px] text-[12px]" style={{ color: "var(--cc-text-muted)" }}>
                Pick a file in the tree, or click a file path in the conversation.
              </p>
            </div>
          )}
        </div>
        {settings.tree && (
          <div className="flex flex-none flex-col" style={{ width: TREE_W, borderLeft: "1px solid var(--cc-rule)" }}>
            <label
              className="mx-[8px] mt-[2px] mb-[3px] flex h-[26px] flex-none items-center gap-[7px] rounded-[8px] px-[9px] focus-within:shadow-[inset_0_0_0_1px_var(--cc-active)]"
              style={{ boxShadow: "inset 0 0 0 1px var(--cc-field-border)" }}
            >
              <Icon name="search" size={13} style={{ color: "var(--cc-text-muted)" }} />
              <input
                aria-label="Filter files"
                value={filter}
                onChange={(e) => setFilter(e.target.value.toLowerCase())}
                placeholder="Filter, or ? to search in files"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-(--cc-text-muted)"
                style={{ color: "var(--cc-text-strong)" }}
              />
            </label>
            <div role="tree" className="min-h-0 flex-1 overflow-y-auto pb-[8px]" style={{ scrollbarWidth: "none" }}>
              <TreeRows
                nodes={tree}
                depth={0}
                dir=""
                open={open}
                toggle={(p) =>
                  setOpen((s) => {
                    const next = new Set(s);
                    if (next.has(p)) next.delete(p);
                    else next.add(p);
                    return next;
                  })
                }
                selected={active}
                onOpen={openFile}
                filter={filter}
              />
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
