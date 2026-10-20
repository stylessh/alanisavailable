"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { ACCOUNT } from "./content";
import { Icon } from "./icon";
import { Menu, MenuItem, MenuLabel, MenuNote, MenuSeparator, Surface, Tag } from "./popover";

// Every menu in the window, as the screen recording shows them: their rows,
// widths (pt) and which side their submenus open on. The composer's picks
// (model, effort, permission mode) are shared state, so the footer under
// the prompt shows what the menus chose.

export const MODELS = ["Opus 5.5", "Fable 5.1", "Sonnet 5.5", "Haiku 5.5"] as const;
const MORE_MODELS = ["Haiku 4.5", "Sonnet 5", "Opus 5", "Fable 5", "Opus 4.8", "Opus 4.7", "Opus 4.6", "Sonnet 4.6"];
export const EFFORTS = ["Low", "Medium", "High", "Extra", "Max", "Ultracode"] as const;
export const MODES = [
  {
    label: "Auto",
    description: "Claude handles permission decisions",
    recommended: true,
  },
  { label: "Manual", description: "Always ask before making changes" },
  { label: "Accept edits", description: "Automatically accept all file edits" },
  { label: "Plan", description: "Create a plan before making changes" },
  { label: "Bypass permissions", description: "Accepts all permissions" },
] as const;

export type Effort = (typeof EFFORTS)[number];

type ComposerSettings = {
  model: string;
  effort: Effort;
  mode: string;
  fast: boolean;
  set: (patch: Partial<Omit<ComposerSettings, "set">>) => void;
};

const SettingsContext = createContext<ComposerSettings | null>(null);

/** The composer's picks, shared by its menus and its footer. */
export function ComposerSettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    model: "Opus 5.5",
    effort: "High" as Effort,
    mode: "Bypass permissions",
    fast: false,
  });
  return (
    <SettingsContext.Provider
      value={{
        ...state,
        set: (patch) => setState((s) => ({ ...s, ...patch })),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useComposerSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useComposerSettings needs a ComposerSettingsProvider");
  return ctx;
}

/** Ultracode is set in Claude's violet wherever it shows. */
export const effortColor = (effort: Effort) => (effort === "Ultracode" ? "var(--cc-ultracode)" : undefined);

// --- Composer -------------------------------------------------------------

const CONNECTORS = ["Mobbin", "PostHog", "Render", "WorkOS", "agentation", "Claude in Chrome"];
const PLUGINS = ["Render", "Composio", "Vercel"];

function ConnectorsMenu() {
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(CONNECTORS.map((c) => [c, true])));
  return (
    <Menu width={196}>
      <MenuItem icon="books" label="Browse connectors" />
      <MenuItem icon="customize" label="Manage connectors" />
      <MenuSeparator />
      {CONNECTORS.map((c) => (
        <MenuItem
          key={c}
          icon="connector"
          label={c}
          toggle={{
            on: on[c],
            onChange: (v) => setOn((s) => ({ ...s, [c]: v })),
          }}
        />
      ))}
    </Menu>
  );
}

function PluginsMenu() {
  return (
    <Menu width={140}>
      {PLUGINS.map((p) => (
        // each plugin opens its own list in the app; the recording doesn't show one, so the row stops at its chevron
        <MenuItem key={p} inset={false} label={p} hint={<Icon name="chevronRight" size={12} />} />
      ))}
      <MenuSeparator />
      <MenuItem icon="customize" label="Manage plugins" />
      <MenuItem icon="plus" label="Browse plugins" />
    </Menu>
  );
}

/** The composer's + menu. */
export function AttachMenu() {
  return (
    <Menu width={199.5}>
      <MenuItem icon="paperclip" label="Add files or photos" hint="⌘U" />
      <MenuItem icon="folder" label="Add folder" />
      <MenuItem icon="slashBox" label="Slash commands" />
      <MenuItem icon="connector" label="Connectors" submenu={{ content: <ConnectorsMenu />, align: "end" }} />
      <MenuItem icon="plug" label="Plugins" submenu={{ content: <PluginsMenu />, align: "end" }} />
    </Menu>
  );
}

function EffortMenu() {
  const { effort, set } = useComposerSettings();
  return (
    <Menu width={318}>
      <MenuNote>Higher effort means more thorough responses, but takes longer and uses your limits faster.</MenuNote>
      {EFFORTS.map((e) => (
        <MenuItem
          key={e}
          inset={false}
          label={e}
          labelStyle={{ color: effortColor(e) }}
          badge={e === "Medium" ? <Tag>Recommended</Tag> : e === "Max" ? <Tag tone="warning">⚠ 3.5× or more usage</Tag> : undefined}
          checked={effort === e}
          onSelect={() => set({ effort: e })}
        />
      ))}
    </Menu>
  );
}

function MoreModelsMenu() {
  const { model, set } = useComposerSettings();
  return (
    <Menu width={104}>
      {MORE_MODELS.map((m) => (
        <MenuItem key={m} inset={false} label={m} checked={model === m} onSelect={() => set({ model: m })} />
      ))}
    </Menu>
  );
}

/** The model picker: models (⌘1–4), effort, more models and fast mode. */
export function ModelMenu() {
  const { model, effort, fast, set } = useComposerSettings();
  return (
    <Menu width={231.5}>
      {MODELS.map((m, i) => (
        <MenuItem key={m} inset={false} label={m} checked={model === m} hint={model === m ? undefined : i + 1} onSelect={() => set({ model: m })} />
      ))}
      <MenuSeparator />
      <MenuItem
        inset={false}
        label="Effort"
        hint={<span style={{ color: effortColor(effort) }}>{effort}</span>}
        submenu={{
          content: <EffortMenu />,
          side: "left",
          align: "end",
          gap: 4,
        }}
      />
      <MenuSeparator />
      <MenuItem inset={false} label="More models" submenu={{ content: <MoreModelsMenu />, align: "end" }} />
      <MenuSeparator />
      <MenuLabel>Fast mode</MenuLabel>
      <MenuItem
        inset={false}
        label="Enable fast mode"
        description="Requires usage credits"
        toggle={fast ? { on: true, onChange: (v) => set({ fast: v }) } : undefined}
        hint={fast ? undefined : <Tag tone="accent">Buy credits</Tag>}
        onSelect={() => set({ fast: true })}
      />
    </Menu>
  );
}

/** The permission mode picker. */
export function ModeMenu() {
  const { mode, set } = useComposerSettings();
  return (
    <Menu width={279.5}>
      <MenuLabel>Mode</MenuLabel>
      {MODES.map((m, i) => (
        <MenuItem
          key={m.label}
          inset={false}
          label={m.label}
          description={m.description}
          badge={"recommended" in m ? <Tag>Recommended</Tag> : undefined}
          checked={mode === m.label}
          hint={i + 1}
          onSelect={() => set({ mode: m.label })}
        />
      ))}
    </Menu>
  );
}

// --- Header ---------------------------------------------------------------

function OpenInMenu() {
  return (
    <Menu width={170}>
      <MenuItem inset={false} label="New window" hint={1} />
      <MenuSeparator />
      <MenuLabel>Open in</MenuLabel>
      <MenuItem inset={false} label="Cursor" hint={2} />
      <MenuItem inset={false} label="Windsurf" hint={3} />
      <MenuItem inset={false} label="Finder" hint={4} />
      <MenuSeparator />
      <MenuLabel>Continue in</MenuLabel>
      <MenuItem inset={false} label="Cloud" description="Runs without your computer" hint={5} />
    </Menu>
  );
}

function PickOne({ options, initial, width, extra }: { options: string[]; initial: string; width: number; extra?: ReactNode }) {
  const [value, setValue] = useState(initial);
  return (
    <Menu width={width}>
      {options.map((o) => (
        <MenuItem key={o} inset={false} label={o} checked={value === o} onSelect={() => setValue(o)} />
      ))}
      {extra}
    </Menu>
  );
}

/** The session title's menu. */
export function SessionMenu() {
  return (
    <Menu width={136.5}>
      <MenuItem inset={false} label="Open in" submenu={{ content: <OpenInMenu /> }} />
      <MenuSeparator />
      <MenuItem inset={false} label="Rename" hint="R" />
      <MenuItem inset={false} label="Fork" hint="F" />
      <MenuSeparator />
      <MenuItem inset={false} label="Detach to top level" />
      <MenuSeparator />
      <MenuItem
        inset={false}
        label="Transcript view"
        submenu={{
          content: <PickOne width={96} options={["Normal", "Thinking", "Verbose"]} initial="Normal" />,
        }}
      />
      <MenuItem
        inset={false}
        label="Output style"
        submenu={{
          content: (
            <PickOne
              width={112}
              options={["Default", "Proactive", "Concise", "Explanatory", "Learning"]}
              initial="Default"
              extra={
                <>
                  <MenuSeparator />
                  <MenuItem inset={false} label="New style…" />
                </>
              }
            />
          ),
        }}
      />
      <MenuSeparator />
      <MenuItem inset={false} label="Archive" hint="A" />
      <MenuItem inset={false} label="Delete" hint="D" danger />
    </Menu>
  );
}

/** The header's ⋮ menu. */
export function MoreMenu() {
  const [awake, setAwake] = useState(false);
  return (
    <Menu width={200}>
      <MenuItem icon="chats" label="Side chat" hint="⌘;" />
      <MenuItem icon="background" label="Background tasks" />
      <MenuItem icon="phone" label="iOS Simulator" />
      <MenuSeparator />
      <MenuItem inset={false} label="Keep computer awake" description="Only for this session" toggle={{ on: awake, onChange: setAwake }} />
    </Menu>
  );
}

// --- Sidebar --------------------------------------------------------------

/** The sidebar's More row. */
export function NavMoreMenu() {
  return (
    <Menu width={126.5}>
      <MenuItem icon="clock" label="Scheduled" />
      <MenuSeparator />
      <MenuItem label="Edit sidebar…" />
    </Menu>
  );
}

function LearnMoreMenu() {
  return (
    <Menu width={205}>
      <MenuItem inset={false} label="About Anthropic" external />
      <MenuSeparator />
      <MenuItem inset={false} label="Claude Academy" />
      <MenuItem inset={false} label="Usage policy" external />
      <MenuItem inset={false} label="Privacy policy" external />
      <MenuItem inset={false} label="Terms of service" external />
      <MenuItem inset={false} label="Your privacy choices" />
      <MenuSeparator />
      <MenuItem inset={false} label="Keyboard shortcuts" hint="⌘/" />
    </Menu>
  );
}

/** The account menu, opened from the name in the sidebar's footer. */
export function AccountMenu() {
  return (
    <Menu width={271}>
      <MenuLabel>{ACCOUNT.email}</MenuLabel>
      <MenuItem icon="gear" label="Settings" hint="⌘," />
      <MenuItem icon="gauge" label="Usage" />
      <MenuItem icon="globe" label="Language" />
      <MenuItem icon="help" label="Get help" />
      <MenuSeparator />
      <MenuItem icon="checklist" label="View all plans" />
      <MenuItem icon="apps" label="Get apps and extensions" />
      <MenuItem icon="changelog" label="View changelog" />
      <MenuItem icon="info" label="Learn more" submenu={{ content: <LearnMoreMenu />, align: "end" }} />
      <MenuSeparator />
      <MenuItem icon="key" label="Get API keys" external />
      <MenuSeparator />
      <MenuItem icon="logout" label="Log out" />
    </Menu>
  );
}

// --- Context usage --------------------------------------------------------

// The usage card (pt, from the recording): 358.5 × 166.5, 12px text on
// 18pt lines, 4pt bars 2.5–5pt under their labels.
function Meter({ label, detail, value, accent, barGap = 2.5 }: { label: ReactNode; detail: ReactNode; value: number; accent?: boolean; barGap?: number }) {
  return (
    <div>
      <div className="flex h-[18px] items-center justify-between">
        <span className="flex items-center gap-[6px]" style={{ color: "var(--cc-menu-text)" }}>
          {label}
        </span>
        <span className="flex gap-[8px]" style={{ color: "var(--cc-text-muted)" }}>
          {detail}
        </span>
      </div>
      <div className="h-[4px] overflow-hidden rounded-full" style={{ marginTop: barGap, background: accent ? "#152a4d" : "#2e2e2e" }}>
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: "var(--cc-toggle-on)" }} />
      </div>
    </div>
  );
}

/** What the context ring opens: the plan's usage limits and cloud credits. */
export function UsagePopover() {
  return (
    <Surface width={358.5} className="text-[12px]" style={{ padding: "12px 12.5px 8.5px" }}>
      <div className="flex h-[16px] items-center justify-between" style={{ color: "var(--cc-text-muted)" }}>
        Plan usage limits · Max (20x)
        <Icon name="gauge" size={12} style={{ color: "var(--cc-menu-text)" }} />
      </div>
      <div className="mt-[11px]">
        <Meter
          label="Session limit"
          detail={
            <>
              <span>Resets in 1 hr 7 min</span>
              <span>18%</span>
            </>
          }
          value={0.18}
        />
      </div>
      <div className="mt-[7.5px]">
        <Meter
          label="Weekly · all models"
          detail={
            <>
              <span>Resets Sun 4:00 PM</span>
              <span>12%</span>
            </>
          }
          value={0.12}
          barGap={3}
        />
      </div>
      <div className="mt-[15px]">
        <Meter
          label={
            <>
              Cloud session credits <Icon name="help" size={11} style={{ color: "var(--cc-text-muted)" }} />
            </>
          }
          detail="$197 of $250 left"
          value={0.21}
          accent
          barGap={5}
        />
      </div>
      <p className="mt-[4px] leading-[16px]" style={{ color: "var(--cc-text-muted)" }}>
        Expires 3:59 AM AST, November 5
      </p>
    </Surface>
  );
}
