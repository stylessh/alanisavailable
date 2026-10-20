// What the side panels show. Fixtures in the shape of this repository, not
// copies of anyone's files: the tree, a few short sources and the diff are
// written for the replica.

export type TreeNode = { name: string; children?: TreeNode[] };

export const FILE_TREE: TreeNode[] = [
  { name: ".claude", children: [{ name: "launch.json" }] },
  { name: ".next", children: [] },
  { name: "node_modules", children: [] },
  { name: "public", children: [{ name: "products", children: [{ name: "claude", children: [{ name: "dock-icon.png" }] }] }] },
  { name: "scripts", children: [{ name: "shoot.sh" }] },
  {
    name: "src",
    children: [
      {
        name: "app",
        children: [
          { name: "[slug]", children: [{ name: "page.tsx" }] },
          { name: "favicon.ico" },
          { name: "globals.css" },
          { name: "layout.tsx" },
          { name: "page.tsx" },
        ],
      },
      { name: "components", children: [{ name: "card.tsx" }, { name: "container.tsx" }] },
      { name: "os", children: [{ name: "macos", children: [{ name: "traffic-lights.tsx" }, { name: "window.tsx" }] }] },
      { name: "products", children: [{ name: "claude", children: [{ name: "claude.tsx" }, { name: "styles.css" }] }] },
      { name: "mdx-components.tsx" },
    ],
  },
  { name: ".gitignore" },
  { name: "AGENTS.md" },
  { name: "eslint.config.mjs" },
  { name: "next-env.d.ts" },
  { name: "next.config.ts" },
  { name: "package.json" },
  { name: "pnpm-lock.yaml" },
  { name: "pnpm-workspace.yaml" },
  { name: "README.md" },
  { name: "tsconfig.json" },
];

/** Sources the Files panel can open (by path); anything else opens as "binary or too large". */
export const FILES: Record<string, string> = {
  "src/app/page.tsx": `import { Card } from "@/components/card";
import { Container } from "@/components/container";
import { products } from "@/products";

export default function Home() {
  return (
    <Container>
      <Section>
        <h1 className="text-2xl font-medium">Alan is available</h1>
        <p className="text-muted-foreground">
          I rebuild products I like, then add something of my own.
        </p>
      </Section>

      <Section className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <Card key={product.slug} href={\`/\${product.slug}\`}>
            {product.title}
          </Card>
        ))}
      </Section>

      <Section className="mt-auto pb-0">
        <p className="text-normal text-muted-foreground">
          Wanna reach out? Send me an{" "}
          <a href="mailto:alan@example.com" className="link text-foreground">
            email
          </a>
          .
        </p>
      </Section>
    </Container>
  );
}

function Section({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={\`py-8 \${className}\`}>{children}</section>;
}
`,
  "src/app/globals.css": `@import "tailwindcss";
@plugin "@tailwindcss/typography";

@layer base {
  :root {
    color-scheme: light dark;

    --background: #fbfbfb;
    --foreground: #171717;
    --muted-foreground: #737373;
    --border: #e5e5e5;
    --accent: #ffb162;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --background: #0a0a0a;
      --foreground: #fafafa;
      --muted-foreground: #a3a3a3;
      --border: #262626;
    }
  }

  body {
    @apply bg-background text-[14px] text-foreground;
  }

  ::selection {
    @apply bg-accent text-accent-foreground;
  }
}
`,
  "src/app/layout.tsx": `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alan is available",
  description: "Products I like, rebuilt, with something of my own.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
`,
};

export const OPEN_FILE = "src/app/page.tsx";

/** The working branch's changes, file by file, as the Diff panel lists them. */
export type DiffLine = { kind: "add" | "del" | "ctx"; n: number; text: string };
export type DiffFile = { name: string; dir: string; added: number; removed: number; hunks?: (DiffLine[] | { skipped: number })[] };

export const BRANCH = { base: "main", head: "claude-code-desktop" };

export const DIFF: DiffFile[] = [
  {
    name: "launch.json",
    dir: ".claude",
    added: 14,
    removed: 0,
    hunks: [
      [
        { kind: "add", n: 1, text: "{" },
        { kind: "add", n: 2, text: '  "version": "0.0.1",' },
        { kind: "add", n: 3, text: '  "configurations": [' },
        { kind: "add", n: 4, text: "    {" },
        { kind: "add", n: 5, text: '      "name": "dev",' },
        { kind: "add", n: 6, text: '      "runtimeExecutable": "pnpm",' },
        { kind: "add", n: 7, text: '      "runtimeArgs": ["run", "dev"],' },
        { kind: "add", n: 8, text: '      "port": 3000' },
        { kind: "add", n: 9, text: "    }" },
        { kind: "add", n: 10, text: "  ]" },
        { kind: "add", n: 11, text: "}" },
      ],
    ],
  },
  { name: "dock-icon.png", dir: "public/products/claude", added: 0, removed: 0 },
  {
    name: "traffic-lights.tsx",
    dir: "src/os/macos",
    added: 13,
    removed: 6,
    hunks: [
      { skipped: 18 },
      [
        { kind: "ctx", n: 19, text: "// window shows them in a floating row when the" },
        { kind: "ctx", n: 20, text: "// pointer reaches the top edge." },
        { kind: "ctx", n: 21, text: "" },
        { kind: "del", n: 22, text: "const SIZE = 13;" },
        { kind: "add", n: 22, text: "/** light diameter and center-to-center pitch (pt) */" },
        { kind: "add", n: 23, text: "const SIZE = 13;" },
        { kind: "add", n: 24, text: "const PITCH = 22;" },
        { kind: "ctx", n: 25, text: "/** letting go of a stretched light: it" },
        { kind: "ctx", n: 26, text: "    snaps back and wobbles */" },
        { kind: "ctx", n: 27, text: 'const SNAP = { type: "spring", stiffness: 380 };' },
      ],
      { skipped: 118 },
    ],
  },
  { name: "claude.tsx", dir: "src/products/claude", added: 12, removed: 0 },
  { name: "fonts.ts", dir: "src/products/claude", added: 27, removed: 0 },
  { name: "index.mdx", dir: "src/products/claude", added: 4, removed: 1 },
  { name: "styles.css", dir: "src/products/claude", added: 126, removed: 0 },
  { name: "desktop.tsx", dir: "src/products/claude/components", added: 13, removed: 0 },
  { name: "app.ts", dir: "src/products/claude/components/claude-code", added: 8, removed: 0 },
  { name: "claude-window.tsx", dir: "src/products/claude/components/claude-code", added: 34, removed: 0 },
  { name: "composer.tsx", dir: "src/products/claude/components/claude-code", added: 59, removed: 0 },
  { name: "content.ts", dir: "src/products/claude/components/claude-code", added: 118, removed: 0 },
  { name: "header.tsx", dir: "src/products/claude/components/claude-code", added: 44, removed: 0 },
  { name: "icon.tsx", dir: "src/products/claude/components/claude-code", added: 50, removed: 0 },
  { name: "main.tsx", dir: "src/products/claude/components/claude-code", added: 60, removed: 0 },
  { name: "sidebar.tsx", dir: "src/products/claude/components/claude-code", added: 251, removed: 0 },
  { name: "transcript.tsx", dir: "src/products/claude/components/claude-code", added: 139, removed: 0 },
  { name: "anthropic-mono.woff2", dir: "src/products/claude/fonts", added: 0, removed: 0 },
  { name: "anthropic-sans.woff2", dir: "src/products/claude/fonts", added: 0, removed: 0 },
];

/** The terminal's prompt and the few commands it answers. */
export const SHELL = {
  prompt: "alan@macbook alanisavailable %",
  replies: {
    pwd: "/Users/alan/Dev/alanisavailable",
    whoami: "alan",
    ls: "AGENTS.md  README.md  next.config.ts  package.json  public  scripts  src  tsconfig.json",
    "git status": "On branch claude-code-desktop\nnothing to commit, working tree clean",
    "git branch --show-current": "claude-code-desktop",
    help: "This terminal is part of the replica. Try ls, pwd, git status, echo or clear.",
  } as Record<string, string>,
};

/** What the Browser panel opens on. */
export const BROWSER = { title: "Alan is available", url: "alanisavailable.com", src: "/" };
