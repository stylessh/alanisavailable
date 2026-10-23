import { Fragment, type ReactNode } from "react";

// Code and prose as Linear's diff view sets them: a light tokenizer for the
// languages in the workspace (TypeScript, Python, CSS, Markdown), colored
// with the live app's syntax tokens, and the small markdown subset READMEs
// and diff descriptions use.

const KEYWORDS = new Set(
  "import from export function return const let var if else for while in of new await async default as class def with pass and or not None True False null undefined true false".split(
    " ",
  ),
);
const TYPE_KEYWORDS = new Set("type interface struct func map enum extends implements".split(" "));

const TOKEN = new RegExp(
  [
    String.raw`(?<comment>\/\/.*|#(?!\s*[{[]).*$)`,
    String.raw`(?<string>"[^"]*"|'[^']*'|${"`"}[^${"`"}]*${"`"})`,
    String.raw`(?<tag><\/?[A-Za-z][\w.]*)`,
    String.raw`(?<number>\b\d+(?:\.\d+)?(?:px|ms)?\b)`,
    String.raw`(?<word>[A-Za-z_$][\w$-]*)`,
  ].join("|"),
  "gm",
);

/** One line of code, split into colored tokens. */
export function Highlight({ text, lang }: { text: string; lang: "code" | "css" | "markdown" }) {
  if (lang === "markdown") return <span className={text.startsWith("#") ? "tok-keyword" : undefined}>{text}</span>;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const g = m.groups ?? {};
    const value = m[0];
    const before = text.slice(0, at);
    const after = text.slice(at + value.length);
    let cls: string | undefined;
    if (g.comment) cls = "tok-comment";
    else if (g.string) cls = "tok-string";
    else if (g.tag) cls = "tok-tag";
    else if (g.number) cls = "tok-number";
    else if (lang === "css") cls = value.startsWith("--") || /^\s*$/.test(before) ? "tok-property" : undefined;
    else if (KEYWORDS.has(value)) cls = "tok-keyword";
    else if (TYPE_KEYWORDS.has(value)) cls = "tok-type-keyword";
    else if (/^[A-Z]/.test(value)) cls = "tok-type";
    else if (before.endsWith(".") || /^=/.test(after)) cls = "tok-property";
    else if (/^\s*\(/.test(after)) cls = "tok-call";
    else cls = "tok-variable";
    out.push(
      <span key={at} className={cls}>
        {value}
      </span>,
    );
    last = at + value.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** Inline markdown: `code` and **bold**. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("`") ? (
          <code key={i} className="ln-inline-code">
            {part.slice(1, -1)}
          </code>
        ) : part.startsWith("**") ? (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * The markdown subset READMEs and descriptions use, typeset like Linear's
 * editor: 15px/24px body, 19px and 17px semibold headings, inline code in
 * the mono face on a faint tint.
 */
export function Markdown({ source, compact = false }: { source: string; compact?: boolean }) {
  const blocks: ReactNode[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      while (++i < lines.length && !lines[i].startsWith("```")) code.push(lines[i]);
      blocks.push(
        <pre key={i} className="ln-code-block">
          {code.join("\n")}
        </pre>,
      );
    } else if (line.startsWith("# ")) {
      blocks.push(
        <h2 key={i} className={compact ? "text-[19px] leading-7 font-semibold" : "text-[22px] leading-8 font-semibold"}>
          <Inline text={line.slice(2)} />
        </h2>,
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={i} className={`${compact ? "text-[17px]" : "text-[19px] leading-7"} leading-6 font-semibold`}>
          <Inline text={line.slice(3)} />
        </h3>,
      );
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      for (; i < lines.length && lines[i].startsWith("- "); i++) items.push(lines[i].slice(2));
      i--;
      blocks.push(
        <ul key={i} className="list-disc pl-6 marker:text-(--ln-icon-faint)">
          {items.map((it, j) => (
            <li key={j}>
              <Inline text={it} />
            </li>
          ))}
        </ul>,
      );
    } else if (line.trim()) {
      blocks.push(
        <p key={i}>
          <Inline text={line} />
        </p>,
      );
    }
  }
  return <div className="ln-prose flex flex-col gap-3 text-[15px] leading-6 font-[450] text-(--ln-text-strong)">{blocks}</div>;
}
