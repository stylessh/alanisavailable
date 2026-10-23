"use client";

import { PageHeader, Crumb } from "./chrome";
import { DEFAULT_FOCUS, REVIEW_GROUPS } from "./code-data";
import { FocusIcon, Switch } from "./diff-list";
import { useFocusSections } from "./focus-prefs";
import { useApp } from "./router";

// Settings › Reviews, in the shape of Linear's settings pages: a centred
// 640px column, a 24px title with a muted line under it, then a labelled
// card of rows, each an icon, a name with what it means under it, and a
// switch on the right.

export function SettingsView() {
  const { go } = useApp();
  const [on, setOn] = useFocusSections();
  const sections = REVIEW_GROUPS.filter((g) => g.tab === "mine");
  const toggle = (id: string) => setOn(on.includes(id) ? on.filter((x) => x !== id) : [...on, id]);
  const isDefault = on.length === DEFAULT_FOCUS.length && DEFAULT_FOCUS.every((id) => on.includes(id));
  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        <Crumb onClick={() => go({ page: "reviews", tab: "mine" })}>Reviews</Crumb>
        <h1>Settings</h1>
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto max-w-[640px] pt-16 pb-16">
          <h2 className="text-2xl leading-8 font-semibold text-(--ln-text)">Reviews</h2>
          <p className="mt-1 text-[13px] font-[450] text-(--ln-text-muted)">How Reviews sorts the diffs that involve you.</p>

          <div className="mt-8 mb-3 flex items-end">
            <div>
              <h3 className="text-[13px] font-medium text-(--ln-text)">Focus sections</h3>
              <p className="mt-0.5 text-xs font-[450] text-(--ln-text-muted)">
                The sections For me shows, in this order. A diff sits in the first one it fits; one that fits none stays out of the list.
              </p>
            </div>
            <button
              type="button"
              disabled={isDefault}
              onClick={() => setOn(DEFAULT_FOCUS)}
              className="ml-4 h-7 shrink-0 rounded-full px-2.5 text-xs font-medium text-(--ln-text-header) hover:bg-(--ln-ghost-hover) disabled:text-(--ln-icon-faint) disabled:hover:bg-transparent"
            >
              Restore defaults
            </button>
          </div>
          <ul className="divide-y-[0.5px] divide-(--ln-card-border) rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card)">
            {sections.map((g) => (
              <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-3.5 shrink-0">
                  <FocusIcon glyph={g.glyph} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-(--ln-text)">{g.name}</span>
                  <span className="block truncate text-xs font-[450] text-(--ln-text-muted)">{g.detail}</span>
                </span>
                <Switch label={g.name} on={on.includes(g.id)} onChange={() => toggle(g.id)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
