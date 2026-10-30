"use client";

import { useState } from "react";
import { POLAR_V1 } from "./polar-v1";
import {
  isFixed,
  LIVE,
  liveChanges,
  sameValue,
  TOKEN_GROUPS,
  tokenOf,
  toCss,
  toHex,
  toPx,
  V1,
  type Token,
  type Variation,
} from "./tokens";

// The playground's side panel, in the canvas's own neutral chrome rather than
// Polar's tokens, so tweaking them never restyles the tools doing it.
//   Tokens   every token of the selected variation, edited in place
//   Changes  what Live has changed since version 1, and what each variation
//            changes on top of Live, with its CSS

const ROW = "flex min-h-8 items-center gap-2 px-3";
const INPUT =
  "h-7 min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 font-mono text-[11px] text-neutral-900 outline-none focus:border-neutral-400";

function Swatch({ value }: { value: string }) {
  return (
    <span className="size-4 shrink-0 rounded-[4px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]" style={{ background: value }} />
  );
}

function Reset({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Back to Live's value"
      aria-label="Back to Live's value"
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </button>
  );
}

function TokenRow({
  token,
  base,
  value,
  readOnly,
  differs,
  onChange,
}: {
  token: Token;
  base: string;
  value: string | undefined;
  readOnly: boolean;
  /** marks a fixed column's token as changed (Live, where it moved on from version 1) */
  differs?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  const current = value ?? base;
  const changed = differs ?? (value !== undefined && value !== base);
  return (
    <div className={`${ROW} ${changed ? "bg-blue-50/60" : ""}`}>
      <span
        className={`w-24 shrink-0 truncate ${changed ? "font-medium text-neutral-900" : "text-neutral-500"}`}
        title={token.name}
      >
        {token.label}
      </span>
      {token.kind === "color" && (
        <label className="relative shrink-0 cursor-pointer" title="Pick a color">
          <Swatch value={current} />
          <input
            type="color"
            disabled={readOnly}
            value={toHex(current)}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
            aria-label={`${token.label} color`}
          />
        </label>
      )}
      {token.kind === "length" ? (
        <>
          <input
            type="range"
            min={0}
            max={40}
            step={0.2}
            disabled={readOnly}
            value={Math.min(40, toPx(current))}
            onChange={(e) => onChange(`${e.target.value}px`)}
            className="min-w-0 flex-1 accent-neutral-900"
            aria-label={`${token.label} radius`}
          />
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onChange("9999px")}
            className={`h-6 shrink-0 cursor-pointer rounded-md px-1.5 text-[11px] disabled:cursor-default ${toPx(current) >= 999 ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}
          >
            Full
          </button>
          <span className="w-10 shrink-0 text-right font-mono text-[11px] text-neutral-700 tabular-nums">
            {toPx(current) >= 999 ? "full" : `${+toPx(current).toFixed(1)}`}
          </span>
        </>
      ) : (
        <input
          readOnly={readOnly}
          // colors read as hex until you type your own (the CSS compiles Polar's oklch to lab, which reads badly)
          value={token.kind === "color" && value === undefined ? toHex(base) : current}
          title={base}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
          aria-label={token.label}
          spellCheck={false}
        />
      )}
      {changed && !readOnly ? <Reset onClick={() => onChange(undefined)} /> : <span className="w-6 shrink-0" />}
    </div>
  );
}

export function Inspector({
  variations,
  selected,
  baseline,
  onSelect,
  onUpdate,
  onDuplicate,
  onDelete,
  onClose,
}: {
  /** version 1 and Live first, then yours */
  variations: Variation[];
  selected: Variation;
  baseline: Record<string, string>;
  onSelect: (id: string) => void;
  onUpdate: (v: Variation) => void;
  onDuplicate: (v: Variation) => void;
  onDelete: (v: Variation) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"tokens" | "changes">("tokens");
  const [copied, setCopied] = useState<string | null>(null);
  const fixed = isFixed(selected);
  const sinceV1 = liveChanges(baseline);
  const set = (name: string, value: string | undefined) => {
    const overrides = { ...selected.overrides };
    if (value === undefined || value === baseline[name]) delete overrides[name];
    else overrides[name] = value;
    onUpdate({ ...selected, overrides });
  };
  const changedCount = (v: Variation) => Object.keys(v.overrides).length;

  return (
    <aside
      aria-label="Inspector"
      className="fixed top-3 right-3 bottom-14 z-[60] flex w-[340px] flex-col overflow-hidden rounded-xl bg-white/95 text-[12px] text-neutral-900 shadow-[0_8px_32px_rgb(0_0_0/0.12)] ring-1 ring-black/8 backdrop-blur-xl"
      style={{ letterSpacing: 0 }}
      // the canvas behind pans on wheel and drag; the panel scrolls and clicks instead
      onWheel={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 border-b border-neutral-200 p-1.5">
        {(["tokens", "changes"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className="h-7 cursor-pointer rounded-md px-2.5 font-medium text-neutral-500 capitalize hover:text-neutral-900 aria-pressed:bg-neutral-100 aria-pressed:text-neutral-900"
          >
            {t}
          </button>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the inspector"
          className="flex size-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {tab === "tokens" ? (
        <>
          <div className="flex flex-col gap-2 border-b border-neutral-200 p-3">
            <div className="flex flex-wrap gap-1">
              {variations.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelect(v.id)}
                  aria-pressed={v.id === selected.id}
                  className="h-6 cursor-pointer rounded-md px-2 text-neutral-600 ring-1 ring-neutral-200 hover:text-neutral-900 aria-pressed:bg-neutral-900 aria-pressed:text-white aria-pressed:ring-neutral-900"
                >
                  {v.name}
                </button>
              ))}
            </div>
            {fixed ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 p-2.5 text-neutral-600">
                <span>
                  {selected.id === V1.id
                    ? "Version 1 is frozen: Polar as measured, the reference. Duplicate it to start from there."
                    : `Live is styles.css as it is${sinceV1.length ? `, ${sinceV1.length} ${sinceV1.length === 1 ? "token" : "tokens"} on from version 1` : ""}. Duplicate it to try changes.`}
                </span>
                <button
                  type="button"
                  onClick={() => onDuplicate(selected)}
                  className="h-7 shrink-0 cursor-pointer rounded-md bg-neutral-900 px-2.5 font-medium text-white hover:bg-neutral-700"
                >
                  Duplicate
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  value={selected.name}
                  onChange={(e) => onUpdate({ ...selected, name: e.target.value })}
                  aria-label="Variation name"
                  className="h-7 min-w-0 flex-1 rounded-md border border-neutral-200 px-2 text-[12.5px] font-medium outline-none focus:border-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => onDuplicate(selected)}
                  className="h-7 cursor-pointer rounded-md px-2 text-neutral-600 ring-1 ring-neutral-200 hover:text-neutral-900"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(selected)}
                  className="h-7 cursor-pointer rounded-md px-2 text-red-600 ring-1 ring-neutral-200 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pb-3">
            {TOKEN_GROUPS.map((g) => (
              <section key={g.title} className="pt-3">
                <h3 className="px-3 pb-1 text-[11px] font-medium tracking-wide text-neutral-400 uppercase">{g.title}</h3>
                {g.tokens.map((t) => (
                  <TokenRow
                    key={t.name}
                    token={t}
                    base={selected.id === V1.id ? POLAR_V1[t.name] : (baseline[t.name] ?? "")}
                    value={selected.id === V1.id ? undefined : selected.overrides[t.name]}
                    readOnly={fixed}
                    differs={
                      selected.id === LIVE.id && baseline[t.name] ? !sameValue(t, POLAR_V1[t.name], baseline[t.name]) : undefined
                    }
                    onChange={(v) => set(t.name, v)}
                  />
                ))}
              </section>
            ))}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <section className="mb-4 overflow-hidden rounded-lg ring-1 ring-neutral-200">
            <header className="flex items-center gap-2 bg-neutral-50 px-3 py-2">
              <span className="font-medium">Live</span>
              <span className="text-neutral-400">since version 1</span>
            </header>
            {sinceV1.length === 0 ? (
              <p className="border-t border-neutral-100 px-3 py-2 text-neutral-500">styles.css still matches version 1.</p>
            ) : (
              sinceV1.map(([t, then, now]) => (
                <div key={t.name} className="flex items-center gap-2 border-t border-neutral-100 px-3 py-1.5">
                  <span className="w-24 shrink-0 truncate text-neutral-600" title={t.name}>
                    {t.label}
                  </span>
                  {t.kind === "color" ? (
                    <span className="flex flex-1 items-center gap-1.5">
                      <Swatch value={then} />
                      <span className="text-neutral-400">→</span>
                      <Swatch value={now} />
                      <span className="truncate font-mono text-[11px] text-neutral-700">{toHex(now)}</span>
                    </span>
                  ) : (
                    <span className="flex-1 truncate font-mono text-[11px] text-neutral-700">
                      <span className="text-neutral-400">{then} → </span>
                      {now}
                    </span>
                  )}
                </div>
              ))
            )}
          </section>
          {variations.filter((v) => !isFixed(v)).length === 0 && (
            <p className="rounded-lg bg-neutral-50 p-3 text-neutral-600">
              No variations yet. Duplicate Live and change a token: each change shows up here against Live&apos;s value, with the
              CSS to make it real.
            </p>
          )}
          {variations
            .filter((v) => !isFixed(v))
            .map((v) => (
              <section key={v.id} className="mb-4 overflow-hidden rounded-lg ring-1 ring-neutral-200">
                <header className="flex items-center gap-2 bg-neutral-50 px-3 py-2">
                  <button type="button" onClick={() => onSelect(v.id)} className="cursor-pointer font-medium hover:underline">
                    {v.name}
                  </button>
                  <span className="text-neutral-400">
                    {changedCount(v)} {changedCount(v) === 1 ? "change" : "changes"}
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    disabled={changedCount(v) === 0}
                    onClick={() => {
                      navigator.clipboard?.writeText(toCss(v));
                      setCopied(v.id);
                      setTimeout(() => setCopied(null), 1500);
                    }}
                    className="h-6 cursor-pointer rounded-md px-2 text-neutral-600 ring-1 ring-neutral-200 hover:text-neutral-900 disabled:cursor-default disabled:opacity-40"
                  >
                    <span aria-live="polite">{copied === v.id ? "Copied" : "Copy CSS"}</span>
                  </button>
                </header>
                {Object.entries(v.overrides).map(([name, value]) => {
                  const t = tokenOf(name);
                  return (
                    <div key={name} className="flex items-center gap-2 border-t border-neutral-100 px-3 py-1.5">
                      <span className="w-24 shrink-0 truncate text-neutral-600" title={name}>
                        {t?.label ?? name}
                      </span>
                      {t?.kind === "color" ? (
                        <span className="flex flex-1 items-center gap-1.5">
                          <Swatch value={baseline[name]} />
                          <span className="text-neutral-400">→</span>
                          <Swatch value={value} />
                          <span className="truncate font-mono text-[11px] text-neutral-700">{value}</span>
                        </span>
                      ) : (
                        <span className="flex-1 truncate font-mono text-[11px] text-neutral-700">
                          <span className="text-neutral-400">{baseline[name]} → </span>
                          {value}
                        </span>
                      )}
                      <Reset
                        onClick={() => {
                          const overrides = { ...v.overrides };
                          delete overrides[name];
                          onUpdate({ ...v, overrides });
                        }}
                      />
                    </div>
                  );
                })}
              </section>
            ))}
        </div>
      )}
    </aside>
  );
}
