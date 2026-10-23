"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckStateIcon, DiffStateIcon } from "./glyphs";
import { AskLinearIcon, ChevronDownIcon, GitHubIcon, SearchIcon } from "./icons";
import { Switch } from "./diff-list";
import { useApp } from "./router";

// Import from GitHub, paced like Linear's onboarding (one calm centred step at
// a time, the app chrome gone, step dots at the window's foot) but built from
// this product's own parts: the timeline's cards (hairline border, 8px corners,
// full-width dividers, rows 16px in), the toolbar's pill buttons (a raised
// neutral pill for the step's action, a ghost button beside it for the way back), 13px
// rows with 12px muted detail, and the Display options switch.

type Account = { id: string; name: string; kind: "Personal account" | "Organization"; color: string; repos: GitRepo[] };
type GitRepo = { name: string; private: boolean; language: string; color: string; updated: string; imported?: boolean };

const ACCOUNTS: Account[] = [
  {
    id: "asmobbin",
    name: "asmobbin",
    kind: "Organization",
    color: "#049850",
    repos: [
      { name: "insight-dashboard", private: true, language: "TypeScript", color: "#3178c6", updated: "2d", imported: true },
      { name: "ux-research-assistant", private: true, language: "Python", color: "#3572a5", updated: "1d", imported: true },
      { name: "marketing-site", private: false, language: "TypeScript", color: "#3178c6", updated: "3h" },
      { name: "mobile-app", private: true, language: "Swift", color: "#f05138", updated: "5h" },
      { name: "api-gateway", private: true, language: "Go", color: "#00add8", updated: "1d" },
      { name: "data-pipelines", private: true, language: "Python", color: "#3572a5", updated: "4d" },
      { name: "email-templates", private: false, language: "HTML", color: "#e34c26", updated: "2w" },
    ],
  },
  {
    id: "alexsmith",
    name: "alexsmith",
    kind: "Personal account",
    color: "#8e67d9",
    repos: [
      { name: "dotfiles", private: false, language: "Shell", color: "#89e051", updated: "1w" },
      { name: "chart-experiments", private: true, language: "TypeScript", color: "#3178c6", updated: "3w" },
      { name: "notes", private: true, language: "Markdown", color: "#083fa1", updated: "2mo" },
    ],
  },
  {
    id: "mobbin-labs",
    name: "mobbin-labs",
    kind: "Organization",
    color: "#e0752f",
    repos: [
      { name: "prototype-kit", private: false, language: "TypeScript", color: "#3178c6", updated: "6d" },
      { name: "figma-sync", private: true, language: "TypeScript", color: "#3178c6", updated: "1mo" },
    ],
  },
];

const SYNC = [
  { id: "diffs", title: "Pull requests and diffs", detail: "Open, update and merge from either side" },
  { id: "reviews", title: "Reviews and comments", detail: "Approvals, requested changes and threads, both ways" },
  { id: "issues", title: "GitHub Issues", detail: "Mirror them as Linear issues, and back" },
  { id: "labels", title: "Labels", detail: "Keep label names and colors the same in both" },
  { id: "branches", title: "Branch rules", detail: "Use GitHub's protection rules as merge requirements" },
] as const;

const STEPS = ["connect", "account", "repos", "sync", "import", "done"] as const;
type Step = (typeof STEPS)[number] | "authorizing";

/* The pieces every step is made of */

function Mark({ children }: { children: ReactNode }) {
  return <div className="flex h-8 items-center justify-center text-(--ln-text)">{children}</div>;
}

function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <h1 className="mt-6 text-center text-xl leading-7 font-semibold text-(--ln-text)">{title}</h1>
      {children && <p className="mx-auto mt-2 max-w-[440px] text-center text-[13px] leading-5 font-[450] text-(--ln-text-muted)">{children}</p>}
    </>
  );
}

function OnboardingCard({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 w-[520px] max-w-full divide-y-[0.5px] divide-(--ln-card-border) overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) shadow-(--ln-main-shadow)">
      {children}
    </div>
  );
}

/** A row in a step's card, as the merge card's: 16px in, the card's dividers between rows. */
function CardRow({ children, onClick, selected }: { children: ReactNode; onClick?: () => void; selected?: boolean }) {
  const cls = "flex w-full items-center gap-3 px-4 py-3 text-left";
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`${cls} ${selected ? "bg-(--ln-item-hover)" : "hover:bg-(--ln-item-hover)"}`}>
      {children}
    </button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

/** The step's actions in one row: a ghost button for the way back or out, the raised pill for going on. */
function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-8 flex items-center gap-2">{children}</div>;
}

function Primary({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="ln-pill flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-(--ln-text) disabled:opacity-45"
    >
      {children}
    </button>
  );
}

function Secondary({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium text-(--ln-text-muted) hover:bg-(--ln-ghost-hover) hover:text-(--ln-text)">
      {children}
    </button>
  );
}

function SyncIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.75 6.25a5.25 5.25 0 0 1 9.5-2.25M13.25 9.75a5.25 5.25 0 0 1-9.5 2.25M12.5 1.75V4.5H9.75M3.5 14.25V11.5h2.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tick() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0 text-(--ln-accent)">
      <path d="m2.75 7.25 2.75 2.75 5.75-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AccountAvatar({ account, size = 28 }: { account: Account; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-semibold text-white ${account.kind === "Organization" ? "rounded-md" : "rounded-full"}`}
      style={{ width: size, height: size, background: account.color, fontSize: Math.round(size * 0.42) }}
    >
      {account.name[0].toUpperCase()}
    </span>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span className={`ml-auto flex size-4 shrink-0 items-center justify-center rounded-full ${on ? "bg-(--ln-accent)" : "ring-1 ring-(--ln-icon-faint) ring-inset"}`}>
      {on && <span className="size-1.5 rounded-full bg-white" />}
    </span>
  );
}

function Box({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <span
      className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] ${
        on ? "bg-(--ln-accent) text-white" : "ring-1 ring-(--ln-icon-faint) ring-inset"
      } ${disabled ? "opacity-40" : ""}`}
    >
      {on && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="m2 5.25 2 2 4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/* The flow */

export function ImportFlow() {
  const { go } = useApp();
  const [step, setStep] = useState<Step>("connect");
  const [account, setAccount] = useState(ACCOUNTS[0].id);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(["marketing-site", "mobile-app", "api-gateway"]));
  const [q, setQ] = useState("");
  // everything syncs unless you turn it off
  const [sync, setSync] = useState<Set<string>>(() => new Set(SYNC.map((x) => x.id)));
  const [done, setDone] = useState(0);
  const acct = ACCOUNTS.find((a) => a.id === account)!;
  const picked = acct.repos.filter((r) => chosen.has(r.name));
  const shown = acct.repos.filter((r) => r.name.includes(q.trim().toLowerCase()));
  const leave = () => go({ page: "repos" });

  // GitHub's authorization, then each repository importing in turn
  useEffect(() => {
    if (step === "authorizing") {
      const t = setTimeout(() => setStep("account"), 1400);
      return () => clearTimeout(t);
    }
    if (step === "import") {
      if (done >= picked.length) {
        const t = setTimeout(() => setStep("done"), 700);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setDone((n) => n + 1), 900);
      return () => clearTimeout(t);
    }
  }, [step, done, picked.length]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const dot = STEPS.indexOf(step === "authorizing" ? "connect" : step);

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-(--ln-main)">
      <div className="flex h-14 shrink-0 items-center justify-between px-5 text-xs font-[450] text-(--ln-text-muted)">
        <button type="button" onClick={leave} className="flex h-7 items-center gap-1 rounded-full pr-2.5 pl-2 font-medium hover:bg-(--ln-ghost-hover) hover:text-(--ln-text)">
          <ChevronDownIcon size={8} className="rotate-90" />
          Back to Linear
        </button>
        {step !== "connect" && step !== "authorizing" && (
          <span className="flex items-center gap-1.5">
            <GitHubIcon size={14} />
            Connected as <span className="text-(--ln-text-header)">alexsmith</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        {step === "connect" && (
          <>
            <Mark>
              <GitHubIcon size={32} />
            </Mark>
            <Heading title="Import from GitHub">Bring your repositories into Linear and keep them in sync with GitHub, so your team can work from either.</Heading>
            <OnboardingCard>
              {[
                "Repositories come over with their branches, history and open pull requests.",
                "Pull requests become diffs, with their reviews and comments.",
                "Changes sync both ways, so Linear and GitHub always agree.",
              ].map((line) => (
                <CardRow key={line}>
                  <Tick />
                  <span className="text-[13px] leading-5 font-[450] text-(--ln-text)">{line}</span>
                </CardRow>
              ))}
            </OnboardingCard>
            <Actions>
              <Secondary onClick={leave}>I’ll do this later</Secondary>
              <Primary onClick={() => setStep("authorizing")}>
                <GitHubIcon size={14} />
                Authenticate with GitHub
              </Primary>
            </Actions>
          </>
        )}

        {step === "authorizing" && (
          // as Linear's "Setting up your workspace": a small spinner and one quiet line
          <div className="flex flex-col items-center gap-3 text-xs font-[450] text-(--ln-text-muted)">
            <CheckStateIcon state="running" size={16} />
            Waiting for GitHub…
          </div>
        )}

        {step === "account" && (
          <>
            <Mark>
              <GitHubIcon size={32} />
            </Mark>
            <Heading title="Where are your repositories?">Choose your personal account or an organization you belong to.</Heading>
            <OnboardingCard>
              {ACCOUNTS.map((a) => (
                <CardRow key={a.id} selected={account === a.id} onClick={() => setAccount(a.id)}>
                  <AccountAvatar account={a} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-(--ln-text)">{a.name}</span>
                    <span className="block text-xs font-[450] text-(--ln-text-muted)">
                      {a.kind} · {a.repos.length} repositories
                    </span>
                  </span>
                  <Radio on={account === a.id} />
                </CardRow>
              ))}
            </OnboardingCard>
            <a href="https://github.com/apps" target="_blank" rel="noreferrer" className="mt-4 text-[13px] font-[450] text-(--ln-text-muted) hover:text-(--ln-text-header)">
              Don’t see an organization? Install Linear on it ↗
            </a>
            <Actions>
              <Primary onClick={() => setStep("repos")}>Continue</Primary>
            </Actions>
          </>
        )}

        {step === "repos" && (
          <>
            <Mark>
              <AccountAvatar account={acct} size={32} />
            </Mark>
            <Heading title="Choose repositories">Pick the ones your team works in. You can add more later from Repositories.</Heading>
            <OnboardingCard>
              <div className="flex h-10 items-center gap-2 px-4">
                <SearchIcon size={14} className="text-(--ln-text-muted)" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Search ${acct.name}…`}
                  className="ln-search min-w-0 flex-1 bg-transparent text-[13px] font-[450] text-(--ln-text) caret-(--ln-accent) placeholder:text-(--ln-text-muted)"
                />
                <button
                  type="button"
                  onClick={() => {
                    const open = acct.repos.filter((r) => !r.imported).map((r) => r.name);
                    setChosen(open.every((n) => chosen.has(n)) ? new Set() : new Set(open));
                  }}
                  className="text-xs font-medium text-(--ln-text-muted) hover:text-(--ln-text)"
                >
                  {acct.repos.filter((r) => !r.imported).every((r) => chosen.has(r.name)) ? "Select none" : "Select all"}
                </button>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {shown.map((r) => (
                  <button
                    key={r.name}
                    type="button"
                    disabled={r.imported}
                    onClick={() => setChosen(toggle(chosen, r.name))}
                    className="flex h-10 w-full items-center gap-3 px-4 text-left hover:bg-(--ln-item-hover) disabled:hover:bg-transparent"
                  >
                    <Box on={!!r.imported || chosen.has(r.name)} disabled={r.imported} />
                    <span className={`truncate text-[13px] font-medium ${r.imported ? "text-(--ln-text-muted)" : "text-(--ln-text)"}`}>{r.name}</span>
                    {r.private && <span className="rounded-full border-[0.5px] border-(--ln-chip-border) px-1.5 text-[11px] font-medium text-(--ln-text-muted)">Private</span>}
                    <span className="ml-auto shrink-0 text-xs font-[450] text-(--ln-text-muted)">{r.imported ? "Already in Linear" : `Updated ${r.updated} ago`}</span>
                  </button>
                ))}
                {shown.length === 0 && <p className="px-4 py-3 text-[13px] text-(--ln-text-muted)">No repository matches “{q}”</p>}
              </div>
            </OnboardingCard>
            <Actions>
              <Secondary onClick={() => setStep("account")}>Back</Secondary>
              <Primary disabled={picked.length === 0} onClick={() => setStep("sync")}>
                Continue with {picked.length} {picked.length === 1 ? "repository" : "repositories"}
              </Primary>
            </Actions>
          </>
        )}

        {step === "sync" && (
          <>
            <Mark>
              {/* the two sides, linked */}
              <span className="flex items-center gap-3">
                <GitHubIcon size={26} />
                {/* both ways: one arrow out, one back, 6px apart so they read as two */}
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden className="text-(--ln-icon-faint)">
                  <path d="M2 4h15m-3.25-3L17 4l-3.25 3M18 10H3m3.25-3L3 10l3.25 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <svg width="24" height="24" viewBox="0 0 100 100" fill="currentColor" aria-hidden>
                  <path d="M1.225 61.523c-.222-.949.908-1.546 1.597-.857l36.512 36.512c.69.69.092 1.82-.857 1.597-18.425-4.323-32.93-18.827-37.252-37.252ZM.002 46.889a.99.99 0 0 0 .29.76L52.35 99.71c.201.2.478.307.76.29 2.37-.149 4.695-.46 6.963-.927.765-.157 1.03-1.096.478-1.648L2.576 39.448c-.552-.551-1.491-.286-1.648.479a50.067 50.067 0 0 0-.926 6.962ZM4.21 29.705a.988.988 0 0 0 .208 1.1l64.776 64.776c.289.29.726.375 1.1.208a49.908 49.908 0 0 0 5.185-2.684.981.981 0 0 0 .183-1.54L8.436 24.336a.981.981 0 0 0-1.541.183 49.896 49.896 0 0 0-2.684 5.185Zm8.448-11.631a.986.986 0 0 1-.045-1.354C21.78 6.46 35.111 0 49.952 0 77.592 0 100 22.407 100 50.048c0 14.84-6.46 28.172-16.72 37.338a.986.986 0 0 1-1.354-.045L12.659 18.074Z" />
                </svg>
              </span>
            </Mark>
            <Heading title="Keep them in sync">Changes made in Linear show up on GitHub, and changes on GitHub show up here. Choose what stays in step.</Heading>
            <OnboardingCard>
              {SYNC.map((s) => (
                <CardRow key={s.id}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-(--ln-text)">{s.title}</span>
                    <span className="block text-xs font-[450] text-(--ln-text-muted)">{s.detail}</span>
                  </span>
                  <Switch label={s.title} on={sync.has(s.id)} onChange={() => setSync(toggle(sync, s.id))} />
                </CardRow>
              ))}
            </OnboardingCard>
            <Actions>
              <Secondary onClick={() => setStep("repos")}>Back</Secondary>
              <Primary
                onClick={() => {
                  setDone(0);
                  setStep("import");
                }}
              >
                Start import
              </Primary>
            </Actions>
          </>
        )}

        {step === "import" && (
          <>
            <Mark>
              <CheckStateIcon state="running" size={28} />
            </Mark>
            <Heading title={`Importing ${picked.length} ${picked.length === 1 ? "repository" : "repositories"}`}>
              Bringing over branches, history and open pull requests. You can leave this page; it carries on.
            </Heading>
            <OnboardingCard>
              {picked.map((r, i) => (
                <CardRow key={r.name}>
                  <CheckStateIcon state={i < done ? "passed" : "running"} />
                  <span className="text-[13px] font-medium text-(--ln-text)">
                    {acct.name}/{r.name}
                  </span>
                  <span className="ml-auto text-xs font-[450] text-(--ln-text-muted)">{i < done ? "Imported" : i === done ? "Importing…" : "Waiting"}</span>
                </CardRow>
              ))}
            </OnboardingCard>
          </>
        )}

        {step === "done" && (
          <>
            <Mark>
              <CheckStateIcon state="passed" size={34} />
            </Mark>
            <Heading title="You’re all set">
              {picked.length} {picked.length === 1 ? "repository is" : "repositories are"} in Linear and syncing with GitHub.
            </Heading>
            {/* as Linear's "You're good to go": three next steps in a row of cells, hairlines between */}
            <div className="mt-8 grid w-[720px] max-w-full grid-cols-3 divide-x-[0.5px] divide-(--ln-card-border) overflow-hidden rounded-lg border-[0.5px] border-(--ln-card-border) bg-(--ln-card) shadow-(--ln-main-shadow) max-[760px]:grid-cols-1 max-[760px]:divide-x-0 max-[760px]:divide-y-[0.5px]">
              {[
                { icon: <DiffStateIcon state="open" size={16} mono />, title: "Review open diffs", detail: "Pull requests came over as diffs, with their reviews." },
                { icon: <AskLinearIcon size={16} />, title: "Hand work to an agent", detail: "Ask Linear or Cursor to take on a change in any repo." },
                { icon: <SyncIcon />, title: "Sync settings", detail: "Change what syncs any time in a repository's settings." },
              ].map((c) => (
                <div key={c.title} className="p-5">
                  {/* each with its muted glyph above, as Linear's "You're good to go" cells have */}
                  <div className="mb-3 flex text-(--ln-icon-faint)">{c.icon}</div>
                  <div className="text-[13px] font-medium text-(--ln-text)">{c.title}</div>
                  <div className="mt-1 text-xs leading-[18px] font-[450] text-(--ln-text-muted)">{c.detail}</div>
                </div>
              ))}
            </div>
            {/* the import lands where the work starts: Linear Agent, in the first repo brought over */}
            <Actions>
              <Secondary onClick={leave}>Open repositories</Secondary>
              <Primary onClick={() => go({ page: "agent", repo: picked[0]?.name })}>Start a coding session</Primary>
            </Actions>
          </>
        )}
      </div>

      {/* the steps as dots at the window's foot, the current one darker */}
      <div className="flex h-14 shrink-0 items-center justify-center gap-3">
        {STEPS.map((s, i) => (
          <span key={s} className={`size-[5px] rounded-full ${i === dot ? "bg-(--ln-text-muted)" : "bg-(--ln-chip-border)"}`} />
        ))}
      </div>
    </div>
  );
}
