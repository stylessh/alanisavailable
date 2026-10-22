import type { Block, DiffLine } from "./conversation";

// The other sessions in the sidebar, each with a conversation of its own, so
// opening one shows where it stands: a short exchange that ends the way its
// dot says, on a question for you (waiting), on work still going (running),
// or on a summary of what it did (done). They're made-up projects, written to
// read like real work without being anyone's.

const IMG = "/snapshots/claude/v1/sessions";

const lines = (start: number, rows: [DiffLine["kind"], string][]): DiffLine[] => {
  let n = start;
  return rows.map(([kind, text]) => ({ n: kind === "del" ? n : n++, kind, text }));
};

export const CONVERSATIONS: Record<string, Block[]> = {
  "homepage-hero": [
    {
      kind: "user",
      text: "The hero feels crowded on small screens. Can you give the headline more room and move the case studies into a two-column grid on desktop?",
    },
    {
      kind: "tools",
      runs: ["Read 2 files, edited ", { strong: "hero.tsx" }],
      added: 14,
      removed: 9,
      calls: [
        { kind: "read", file: "hero.tsx" },
        { kind: "read", file: "case-studies.tsx" },
        {
          kind: "edit",
          file: "hero.tsx",
          path: "src/components/hero.tsx",
          added: 3,
          removed: 2,
          lines: lines(18, [
            ["ctx", "  return ("],
            ["del", '    <section className="px-4 pt-10">'],
            ["add", '    <section className="px-6 pt-16 sm:pt-24">'],
            ["del", '      <h1 className="text-4xl">{title}</h1>'],
            ["add", '      <h1 className="max-w-[14ch] text-4xl text-balance sm:text-6xl">'],
            ["add", "        {title}"],
            ["add", "      </h1>"],
          ]),
        },
      ],
    },
    {
      kind: "text",
      runs: [
        "The headline now wraps at 14 characters with balanced lines, and gets 24pt more space above it from ",
        { code: "sm" },
        " up. Case studies sit in two columns from ",
        { code: "lg" },
        ", one below that.",
      ],
    },
    { kind: "footer", time: "Yesterday" },
  ],

  "dark-mode": [
    { kind: "user", text: "Run a contrast pass on dark mode. Some of the muted text is hard to read, especially the intro under the headline." },
    {
      kind: "tools",
      runs: ["Ran 2 commands, read ", { strong: "contrast-before.png" }],
      thumbnails: [`${IMG}/contrast-before.webp`],
      calls: [
        {
          kind: "bash",
          command: "pnpm dev & npx playwright screenshot --color-scheme=dark http://localhost:3000 contrast-before.png",
          output: "Saved contrast-before.png (1200×760)",
        },
        {
          kind: "bash",
          command: "npx wcag-contrast --theme dark src/app/globals.css",
          output: "6 pairs below 4.5:1\n  --muted on --bg       3.1:1\n  --faint on --bg       2.6:1\n  --link on --surface   3.8:1\n  …",
          failed: true,
        },
        { kind: "read", file: "contrast-before.png", image: `${IMG}/contrast-before.webp` },
      ],
    },
    {
      kind: "text",
      runs: [
        "Six text colors fall short of ",
        { strong: "4.5:1" },
        " on the dark background. The worst are the intro paragraph (",
        { code: "--muted" },
        ", 3.1:1) and the footer line (",
        { code: "--faint" },
        ", 2.6:1). The cards are fine: their text sits on the gradients, which are light enough.",
      ],
    },
    {
      kind: "tools",
      runs: ["Edited 3 files, ran a command"],
      added: 9,
      removed: 9,
      calls: [
        {
          kind: "edit",
          file: "globals.css",
          path: "src/app/globals.css",
          added: 3,
          removed: 3,
          lines: lines(40, [
            ["del", "    --muted: #7a7a7a;"],
            ["add", "    --muted: #a3a3a3;"],
            ["del", "    --faint: #5c5c5c;"],
            ["add", "    --faint: #8a8a8a;"],
            ["del", "    --link: #4a7fd6;"],
            ["add", "    --link: #7aa7f0;"],
          ]),
        },
        { kind: "bash", command: "npx wcag-contrast --theme dark src/app/globals.css", output: "✓ every pair at 4.5:1 or above (large text 3:1)" },
      ],
    },
    { kind: "images", srcs: [`${IMG}/contrast-before.webp`, `${IMG}/contrast-after.webp`] },
    {
      kind: "list",
      items: [
        ["Every text pair now clears ", { strong: "4.5:1" }, ", and large text clears 3:1."],
        ["Borders and the cards' gradients kept their tone; only text colors moved."],
        ["Light mode is untouched."],
      ],
    },
    { kind: "text", runs: ["Opened ", { strong: "#11" }, " with the before and after in its description."] },
    { kind: "footer", time: "2 days ago" },
  ],
  "contact-form": [
    { kind: "user", text: "Wire the contact form up so messages actually reach my inbox, with a rate limit so it doesn't get spammed." },
    {
      kind: "tools",
      runs: ["Read 3 files, edited 2 files"],
      added: 58,
      removed: 4,
      calls: [
        { kind: "read", file: "contact-form.tsx" },
        { kind: "read", file: "route.ts" },
        { kind: "read", file: ".env.example" },
        {
          kind: "edit",
          file: "route.ts",
          path: "src/app/api/contact/route.ts",
          added: 4,
          removed: 0,
          lines: lines(12, [
            ["ctx", "export async function POST(req: Request) {"],
            ["add", '  const ip = req.headers.get("x-forwarded-for") ?? "local";'],
            ["add", "  if (!(await limit(ip))) {"],
            ["add", '    return Response.json({ error: "Too many messages" }, { status: 429 });'],
            ["add", "  }"],
          ]),
        },
      ],
    },
    {
      kind: "text",
      runs: [
        "The form posts to ",
        { code: "/api/contact" },
        ", which sends the message on and allows 5 per hour from one address. One thing before I finish: which address should replies come from? Your own address shows it's you, while a ",
        { code: "noreply@" },
        " address keeps your inbox out of the headers.",
      ],
    },
  ],

  "og-images": [
    { kind: "user", text: "Generate OG images for every product page, using the product's name and its icon." },
    {
      kind: "tools",
      runs: ["Created ", { strong: "opengraph-image.tsx" }, ", ran a command"],
      added: 42,
      calls: [{ kind: "bash", command: "npm run build", output: "✓ Generated 9 OG images\n✓ Compiled in 18.2s" }],
    },
    { kind: "text", runs: ["Each product page now has a 1200×630 card, generated at build time: its icon, its name, and the site's name at the foot."] },
    { kind: "footer", time: "3 days ago" },
  ],

  checkout: [
    {
      kind: "user",
      text: "People lose their cart when they sign in halfway through checkout. Keep it, and while you're in there, split the other checkout fixes into their own sessions so they can go in parallel.",
    },
    {
      kind: "tools",
      runs: ["Read 4 files, searched the code"],
      calls: [
        { kind: "read", file: "cart.ts" },
        { kind: "read", file: "page.tsx" },
        { kind: "read", file: "schema.prisma" },
        { kind: "bash", command: 'rg -n "getCart\\(" src', output: "src/app/checkout/page.tsx:15\nsrc/app/cart/page.tsx:9\nsrc/components/cart-button.tsx:12" },
      ],
    },
    {
      kind: "text",
      runs: [
        "A guest's cart is keyed by their session, and an account's by its user, and nothing connects the two: signing in switches to the account's cart, which is usually empty. I'll merge the guest cart into the account's on sign-in, keeping the larger quantity when both have the same item.",
      ],
    },
    {
      kind: "text",
      runs: [
        "The other fixes don't touch the cart, so they each have a session: ",
        { session: "Add saved payment methods" },
        ", ",
        { session: "Fix the coupon rounding bug" },
        ", ",
        { session: "Lazy-load product images" },
        " and ",
        { session: "Order confirmation emails" },
        ".",
      ],
    },
    {
      kind: "tools",
      runs: ["Edited 3 files, ran the tests"],
      added: 83,
      removed: 5,
      calls: [
        {
          kind: "edit",
          file: "cart.ts",
          path: "src/lib/cart.ts",
          added: 4,
          removed: 1,
          lines: lines(20, [
            ["ctx", "  for (const item of guest.items) {"],
            ["add", "    const same = account.items.find((i) => i.productId === item.productId && i.variant === item.variant);"],
            ["add", "    // the same thing in both carts: keep the larger quantity, not the sum"],
            ["del", "    await db.cartItem.create({ data: { ...item, cartId: account.id } });"],
            ["add", "    if (same) await db.cartItem.update({ where: { id: same.id }, data: { quantity: Math.max(same.quantity, item.quantity) } });"],
            ["add", "    else await db.cartItem.create({ data: { ...pick(item), cartId: account.id } });"],
          ]),
        },
        {
          kind: "bash",
          command: "pnpm vitest run cart",
          output: "✓ src/lib/cart.test.ts (7 tests) 41ms\n\nTest Files  1 passed (1)\n     Tests  7 passed (7)",
        },
      ],
    },
    {
      kind: "tools",
      runs: ["Ran a command, read 2 files"],
      thumbnails: [`${IMG}/checkout-desktop.webp`, `${IMG}/checkout-mobile.webp`],
      calls: [
        {
          kind: "bash",
          command: "npx playwright test checkout --project=desktop --project=iphone",
          output: "✓ 2 passed (6.1s)\nScreenshots: checkout-desktop.png, checkout-mobile.png",
        },
        { kind: "read", file: "checkout-desktop.png", image: `${IMG}/checkout-desktop.webp` },
        { kind: "read", file: "checkout-mobile.png", image: `${IMG}/checkout-mobile.webp` },
      ],
    },
    { kind: "images", srcs: [`${IMG}/checkout-desktop.webp`, `${IMG}/checkout-mobile.webp`] },
    {
      kind: "text",
      runs: [
        "Signed in on the cart step, the three items carry over and a note says so, and the total already has the coupon fix in it. The cart change is up as ",
        { strong: "#43" },
        ", with saved payment methods stacked on it as ",
        { strong: "#44" },
        ".",
      ],
    },
    {
      kind: "tasks",
      items: [
        { label: "Merge the guest cart into the account's on sign-in", status: "completed" },
        { label: "Keep the larger quantity when both carts have an item", status: "completed" },
        { label: "Test sign-in from every checkout step", status: "in_progress" },
        { label: "Show the note only when something carried over", status: "pending" },
      ],
    },
    {
      kind: "tools",
      runs: ["Running the end-to-end tests"],
      live: true,
    },
  ],
  "saved-payments": [
    { kind: "user", text: "Let customers save a card for next time, through the payment provider so we never store card numbers." },
    {
      kind: "tools",
      runs: ["Read 2 files, created a migration"],
      added: 31,
      calls: [
        { kind: "read", file: "schema.prisma" },
        { kind: "read", file: "checkout.ts" },
        {
          kind: "bash",
          command: "npx prisma migrate dev --create-only --name saved_payment_methods",
          output: "Created migration 20261022_saved_payment_methods",
        },
      ],
    },
    {
      kind: "text",
      runs: [
        "The migration adds a ",
        { code: "payment_methods" },
        " table holding only the provider's token, the card's brand and its last four digits. Should I run it on staging now? It locks the ",
        { code: "customers" },
        " table for a moment while it adds the foreign key.",
      ],
    },
  ],

  "coupon-rounding": [
    { kind: "user", text: "A 15% coupon on $19.99 shows $16.99 at checkout but charges $16.98. Find out why." },
    {
      kind: "tools",
      runs: ["Ran 2 commands, edited ", { strong: "pricing.ts" }],
      added: 9,
      removed: 3,
      calls: [
        { kind: "bash", command: "npm test -- pricing", output: "✘ applies a percentage coupon\n  expected 1699, received 1698", failed: true },
        {
          kind: "edit",
          file: "pricing.ts",
          path: "src/lib/pricing.ts",
          added: 2,
          removed: 1,
          lines: lines(27, [
            ["ctx", "export function applyCoupon(cents: number, percent: number) {"],
            ["del", "  return Math.floor(cents * (1 - percent / 100));"],
            ["add", "  // round half up, to the cent, the way the receipt shows it"],
            ["add", "  return Math.round(cents * (100 - percent) / 100);"],
          ]),
        },
        { kind: "bash", command: "npm test -- pricing", output: "✓ 12 passed" },
      ],
    },
    {
      kind: "text",
      runs: [
        "The charge rounded down while the page rounded to the nearest cent. Both now use the same rounding, with tests for 12 prices and coupons, including the one you found.",
      ],
    },
    { kind: "footer", time: "1 hour ago" },
  ],

  "lazy-images": [
    { kind: "user", text: "Product pages are slow on mobile. Load the gallery images only when they're about to scroll into view." },
    {
      kind: "tools",
      runs: ["Edited ", { strong: "gallery.tsx" }, ", ran a command"],
      added: 7,
      removed: 4,
      calls: [
        {
          kind: "bash",
          command: "npx lighthouse http://localhost:3000/products/canvas-tote --only-categories=performance",
          output: "Performance: 91 (was 74)\nLCP: 1.9s (was 2.7s)",
        },
      ],
    },
    {
      kind: "text",
      runs: [
        "The first image still loads right away, since it's what people see first. The rest load as they near the screen. On a throttled phone, the largest image now paints 0.8s sooner.",
      ],
    },
    { kind: "footer", time: "2 hours ago" },
  ],

  "order-emails": [
    { kind: "user", text: "Send a confirmation email when an order is placed: items, total and shipping address." },
    {
      kind: "tools",
      runs: ["Created 2 files, ran a command"],
      added: 96,
      calls: [{ kind: "bash", command: "npm run email:preview", output: "Preview server on http://localhost:3001\n✓ order-confirmation rendered" }],
    },
    {
      kind: "list",
      items: [
        ["The email goes out when payment succeeds, not when the order is created."],
        ["Checked in Gmail, Apple Mail and Outlook, light and dark."],
        ["A plain-text version goes with it."],
      ],
    },
    { kind: "footer", time: "3 hours ago" },
  ],

  "inventory-sync": [
    { kind: "user", text: "Pull stock levels from the warehouse API every 15 minutes, and mark products out of stock when they hit zero." },
    {
      kind: "tools",
      runs: ["Read the API docs, created ", { strong: "sync-inventory.ts" }],
      added: 64,
    },
    {
      kind: "text",
      runs: [
        "A scheduled job runs every 15 minutes and updates stock in batches of 100. A product at zero is marked out of stock and hidden from search, but its page stays up so links keep working.",
      ],
    },
    { kind: "footer", time: "Last week" },
  ],

  "offline-sync": [
    { kind: "user", text: "Notes should work offline and sync when the connection comes back. What happens if the same note changed in two places?" },
    {
      kind: "text",
      runs: [
        "Each note keeps a version number. When both copies changed, the app keeps both: the one edited last stays the note, and the other is saved alongside it as a ",
        { strong: "conflict copy" },
        " for you to merge or delete. Nothing is overwritten silently.",
      ],
    },
    { kind: "footer", time: "Last week" },
  ],

  "markdown-shortcuts": [
    { kind: "user", text: "Add markdown shortcuts to the editor: # for headings, - for lists, > for quotes." },
    {
      kind: "tools",
      runs: ["Edited ", { strong: "editor.ts" }],
      added: 38,
      removed: 2,
    },
    {
      kind: "text",
      runs: [
        "Typing ",
        { code: "# " },
        ", ",
        { code: "- " },
        " or ",
        { code: "> " },
        " at the start of a line turns it into a heading, a list item or a quote. ⌘Z right after puts the characters back.",
      ],
    },
    { kind: "footer", time: "2 weeks ago" },
  ],

  "share-links": [
    { kind: "user", text: "Let people share a note with a link that stops working after a set time." },
    {
      kind: "text",
      runs: [
        "Sharing creates a link that lasts 1 day, 7 days or 30 days. Each link is its own token, so turning one off doesn't affect the others, and an expired link shows a short page saying so instead of an error.",
      ],
    },
    { kind: "footer", time: "2 weeks ago" },
  ],
};
