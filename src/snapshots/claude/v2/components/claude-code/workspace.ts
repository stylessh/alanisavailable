import { ACTIVE_SESSION, EVERY_SESSION, SESSION_DETAILS } from "./content";
import { CHECKOUT_PAGE, NOTES_PAGE } from "./mock-pages";
import { BRANCH, BROWSER, DIFF, type DiffFile, type DiffLine, FILE_TREE, FILES, OPEN_FILE, SHELL, type TreeNode } from "./panel-content";
import { CONVERSATIONS } from "./sessions";
import { useSidebar } from "./sidebar-state";

// What surrounds the open session: its project's files, terminal and
// browser, and its own branch, diff and details card. The session this
// replica was built in has the repository's own; the others have their
// made-up project's, and a diff of the edits in their conversation. Two of
// them (the checkout and the dark mode pass) have more.

export type Workspace = {
  tree: TreeNode[];
  files: Record<string, string>;
  openFile: string;
  shell: { prompt: string; replies: Record<string, string> };
  browser: { title: string; url: string; src?: string; srcDoc?: string };
  branch: { base: string; head: string };
  diff: DiffFile[];
  details: {
    folder: string;
    parent: string;
    branch: string;
    context: number;
    connectorsToReconnect: number;
    outputs: string[];
    added: number;
    removed: number;
  };
};

type Project = Pick<Workspace, "tree" | "files" | "openFile" | "shell" | "browser"> & { parent: string };

const shell = (name: string, path: string, ls: string, branch: string) => ({
  prompt: `alan@macbook ${name} %`,
  replies: {
    pwd: path,
    whoami: "alan",
    ls,
    "git status": `On branch ${branch}\nnothing to commit, working tree clean`,
    "git branch --show-current": branch,
    help: "This terminal is part of the replica. Try ls, pwd, git status, echo or clear.",
  } as Record<string, string>,
});

const CART_TS = `import { db } from "./db";
import type { CartItem } from "./types";

/** A signed-out shopper's cart lives under their session; signing in brings it along. */
export async function mergeGuestCart(sessionId: string, userId: string) {
  const guest = await db.cart.findUnique({ where: { sessionId }, include: { items: true } });
  if (!guest?.items.length) return;

  const account = await db.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: { items: true },
  });

  for (const item of guest.items) {
    const same = account.items.find((i) => i.productId === item.productId && i.variant === item.variant);
    // the same thing in both carts: keep the larger quantity, not the sum
    if (same) await db.cartItem.update({ where: { id: same.id }, data: { quantity: Math.max(same.quantity, item.quantity) } });
    else await db.cartItem.create({ data: { ...pick(item), cartId: account.id } });
  }

  await db.cart.delete({ where: { sessionId } });
}

const pick = ({ productId, variant, quantity }: CartItem) => ({ productId, variant, quantity });
`;

const PRICING_TS = `/** A percentage off, to the cent, rounded half up: the way the receipt shows it. */
export function applyCoupon(cents: number, percent: number) {
  return Math.round((cents * (100 - percent)) / 100);
}

export function formatPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
`;

const SYNC_TS = `import { db, type Note } from "./db";

/**
 * Sends what changed offline and takes what changed elsewhere. When both
 * sides changed a note, the one edited last wins and the other is kept as a
 * conflict copy, so nothing is lost.
 */
export async function sync(remote: Note[]) {
  for (const theirs of remote) {
    const ours = await db.notes.get(theirs.id);
    if (!ours || ours.version === theirs.base) await db.notes.put(theirs);
    else if (ours.version !== theirs.version) await keepBoth(ours, theirs);
  }
}

async function keepBoth(ours: Note, theirs: Note) {
  const [winner, loser] = ours.editedAt > theirs.editedAt ? [ours, theirs] : [theirs, ours];
  await db.notes.put(winner);
  await db.notes.put({ ...loser, id: crypto.randomUUID(), title: \`\${loser.title} (conflict copy)\` });
}
`;

const PROJECTS: Record<string, Project> = {
  alanisavailable: { tree: FILE_TREE, files: FILES, openFile: OPEN_FILE, shell: SHELL, browser: BROWSER, parent: "~/Dev" },
  storefront: {
    parent: "~/Projects",
    tree: [
      { name: "node_modules", children: [] },
      { name: "prisma", children: [{ name: "migrations", children: [] }, { name: "schema.prisma" }] },
      {
        name: "src",
        children: [
          {
            name: "app",
            children: [
              { name: "checkout", children: [{ name: "page.tsx" }, { name: "steps.tsx" }] },
              { name: "products", children: [{ name: "[slug]", children: [{ name: "page.tsx" }, { name: "gallery.tsx" }] }] },
              { name: "layout.tsx" },
              { name: "page.tsx" },
            ],
          },
          { name: "emails", children: [{ name: "order-confirmation.tsx" }] },
          { name: "lib", children: [{ name: "cart.ts" }, { name: "cart.test.ts" }, { name: "db.ts" }, { name: "pricing.ts" }, { name: "types.ts" }] },
        ],
      },
      { name: ".env.example" },
      { name: "package.json" },
      { name: "README.md" },
      { name: "tsconfig.json" },
    ],
    files: { "src/lib/cart.ts": CART_TS, "src/lib/pricing.ts": PRICING_TS },
    openFile: "src/lib/cart.ts",
    shell: shell("storefront", "/Users/alan/Projects/storefront", "README.md  package.json  prisma  src  tsconfig.json", "checkout-cart"),
    browser: { title: "Northwind Supply", url: "localhost:3000/checkout", srcDoc: CHECKOUT_PAGE },
  },
  "field-notes": {
    parent: "~/Projects",
    tree: [
      { name: "node_modules", children: [] },
      { name: "src", children: [{ name: "db.ts" }, { name: "editor.ts" }, { name: "share.ts" }, { name: "sync.ts" }, { name: "main.tsx" }] },
      { name: "index.html" },
      { name: "package.json" },
      { name: "vite.config.ts" },
    ],
    files: { "src/sync.ts": SYNC_TS },
    openFile: "src/sync.ts",
    shell: shell("field-notes", "/Users/alan/Projects/field-notes", "index.html  package.json  src  vite.config.ts", "main"),
    browser: { title: "Field Notes", url: "localhost:5173", srcDoc: NOTES_PAGE },
  },
};

const hunk = (start: number, rows: [DiffLine["kind"], string][]): DiffLine[] => {
  let n = start;
  return rows.map(([kind, text]) => ({ kind, n: kind === "del" ? n : n++, text }));
};

/** What two sessions have beyond the usual: a richer diff, outputs, and how much of the context they've used. */
const RICH: Record<string, Partial<Pick<Workspace, "diff">> & Partial<Workspace["details"]> & { head?: string }> = {
  checkout: {
    head: "checkout-cart",
    context: 0.58,
    connectorsToReconnect: 0,
    outputs: ["checkout-desktop.png", "checkout-mobile.png", "cart-merge-cases.md"],
    diff: [
      {
        name: "cart.ts",
        dir: "src/lib",
        added: 28,
        removed: 3,
        hunks: [
          hunk(4, [
            ["add", "/** A signed-out shopper's cart lives under their session; signing in brings it along. */"],
            ["add", "export async function mergeGuestCart(sessionId: string, userId: string) {"],
            ["add", "  const guest = await db.cart.findUnique({ where: { sessionId }, include: { items: true } });"],
            ["add", "  if (!guest?.items.length) return;"],
            ["ctx", ""],
          ]),
          { skipped: 11 },
          hunk(20, [
            ["ctx", "  for (const item of guest.items) {"],
            ["add", "    const same = account.items.find((i) => i.productId === item.productId && i.variant === item.variant);"],
            ["add", "    // the same thing in both carts: keep the larger quantity, not the sum"],
            ["del", "    await db.cartItem.create({ data: { ...item, cartId: account.id } });"],
            ["add", "    if (same) await db.cartItem.update({ where: { id: same.id }, data: { quantity: Math.max(same.quantity, item.quantity) } });"],
            ["add", "    else await db.cartItem.create({ data: { ...pick(item), cartId: account.id } });"],
            ["ctx", "  }"],
          ]),
        ],
      },
      {
        name: "cart.test.ts",
        dir: "src/lib",
        added: 46,
        removed: 0,
        hunks: [
          hunk(1, [
            ["add", 'import { describe, expect, it } from "vitest";'],
            ["add", 'import { mergeGuestCart } from "./cart";'],
            ["add", ""],
            ["add", 'describe("mergeGuestCart", () => {'],
            ["add", '  it("keeps the larger quantity when both carts have the item", async () => {'],
            ["add", '    await seed({ guest: [["mug", 2]], account: [["mug", 1]] });'],
            ["add", '    await mergeGuestCart("s1", "u1");'],
            ["add", '    expect(await quantities("u1")).toEqual({ mug: 2 });'],
            ["add", "  });"],
          ]),
        ],
      },
      {
        name: "page.tsx",
        dir: "src/app/checkout",
        added: 9,
        removed: 2,
        hunks: [
          hunk(14, [
            ["ctx", "export default async function CheckoutPage() {"],
            ["del", "  const cart = await getCart();"],
            ["add", "  const { sessionId, userId } = await currentShopper();"],
            ["add", "  // signed in since the cart was filled: bring the guest cart along first"],
            ["add", "  if (userId) await mergeGuestCart(sessionId, userId);"],
            ["add", "  const cart = await getCart({ sessionId, userId });"],
          ]),
        ],
      },
      { name: "steps.tsx", dir: "src/app/checkout", added: 12, removed: 6 },
    ],
  },
  "dark-mode": {
    head: "dark-mode-contrast",
    context: 0.41,
    connectorsToReconnect: 0,
    outputs: ["contrast-before.png", "contrast-after.png", "contrast-report.txt"],
    diff: [
      {
        name: "globals.css",
        dir: "src/app",
        added: 6,
        removed: 6,
        hunks: [
          hunk(38, [
            ["ctx", "@media (prefers-color-scheme: dark) {"],
            ["ctx", "  :root {"],
            ["del", "    --muted: #7a7a7a;"],
            ["add", "    --muted: #a3a3a3;"],
            ["del", "    --faint: #5c5c5c;"],
            ["add", "    --faint: #8a8a8a;"],
            ["del", "    --link: #4a7fd6;"],
            ["add", "    --link: #7aa7f0;"],
            ["ctx", "  }"],
          ]),
        ],
      },
      { name: "card.tsx", dir: "src/components", added: 2, removed: 2 },
      { name: "page.tsx", dir: "src/app", added: 1, removed: 1 },
    ],
  },
};

/** the edits a session's conversation shows, as its diff */
function diffOf(id: string): DiffFile[] {
  const files: DiffFile[] = [];
  for (const block of CONVERSATIONS[id] ?? []) {
    if (block.kind !== "tools") continue;
    for (const call of block.calls ?? []) {
      if (call.kind !== "edit") continue;
      const dir = call.path.split("/").slice(0, -1).join("/");
      files.push({ name: call.file, dir, added: call.added, removed: call.removed, hunks: [call.lines] });
    }
  }
  return files;
}

const sum = (diff: DiffFile[], key: "added" | "removed") => diff.reduce((n, f) => n + f[key], 0);

/** A small number from a session's id, so each session's context meter differs but stays put. */
const seeded = (id: string) => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 997, 7) / 997;

export function workspaceOf(id: string): Workspace {
  const entry = EVERY_SESSION.find((e) => e.session.id === id);
  const projectName = entry?.project ?? "alanisavailable";
  const project = PROJECTS[projectName] ?? PROJECTS.alanisavailable;
  if (id === ACTIVE_SESSION) {
    return { ...project, branch: BRANCH, diff: DIFF, details: SESSION_DETAILS };
  }
  const rich = RICH[id];
  const head = rich?.head ?? id;
  const diff = rich?.diff ?? diffOf(id);
  return {
    ...project,
    shell:
      rich?.head || projectName !== "alanisavailable"
        ? {
            ...project.shell,
            replies: { ...project.shell.replies, "git status": `On branch ${head}\nnothing to commit, working tree clean`, "git branch --show-current": head },
          }
        : project.shell,
    branch: { base: "main", head },
    diff,
    details: {
      folder: projectName,
      parent: project.parent,
      branch: head,
      context: rich?.context ?? 0.06 + seeded(id) * 0.22,
      connectorsToReconnect: rich?.connectorsToReconnect ?? 0,
      outputs: rich?.outputs ?? [],
      added: sum(diff, "added"),
      removed: sum(diff, "removed"),
    },
  };
}

/** The open session's workspace. */
export function useWorkspace() {
  const { active } = useSidebar();
  return workspaceOf(active);
}
