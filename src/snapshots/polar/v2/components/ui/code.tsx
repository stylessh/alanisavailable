"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "../icons";
import { IconButton } from "./button";
import { FramedCard } from "./card";
import { Tooltip } from "./overlay";

// A block of JSON (an event's payload), the design system's way to show
// code, built as a FramedCard: the tinted frame titled in sans with a copy
// button on the right, and the code on the raised card inside, 13px/22px
// Geist Mono (the one place mono is used), 16px in, indented by two,
// highlighted quietly: keys in the text color, strings green, numbers amber,
// null and booleans violet, punctuation faint.

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const Punct = ({ children }: { children: React.ReactNode }) => <span className="text-(--pl-code-punct)">{children}</span>;

function Value({ value, depth }: { value: Json; depth: number }) {
  if (value === null || typeof value === "boolean") return <span className="text-(--pl-code-literal)">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-(--pl-code-number)">{value}</span>;
  if (typeof value === "string") return <span className="text-(--pl-code-string)">{JSON.stringify(value)}</span>;
  const pad = "  ".repeat(depth + 1);
  const close = "  ".repeat(depth);
  if (Array.isArray(value)) {
    if (!value.length) return <Punct>[]</Punct>;
    return (
      <>
        <Punct>[</Punct>
        {"\n"}
        {value.map((v, i) => (
          <span key={i}>
            {pad}
            <Value value={v} depth={depth + 1} />
            {i < value.length - 1 && <Punct>,</Punct>}
            {"\n"}
          </span>
        ))}
        {close}
        <Punct>]</Punct>
      </>
    );
  }
  const entries = Object.entries(value);
  if (!entries.length) return <Punct>{"{}"}</Punct>;
  return (
    <>
      <Punct>{"{"}</Punct>
      {"\n"}
      {entries.map(([k, v], i) => (
        <span key={k}>
          {pad}
          <span className="text-(--pl-code-key)">{JSON.stringify(k)}</span>
          <Punct>: </Punct>
          <Value value={v} depth={depth + 1} />
          {i < entries.length - 1 && <Punct>,</Punct>}
          {"\n"}
        </span>
      ))}
      {close}
      <Punct>{"}"}</Punct>
    </>
  );
}

export function JsonBlock({ title = "Payload", value }: { title?: string; value: Json }) {
  const [copied, setCopied] = useState(false);
  const label = copied ? "Copied" : `Copy ${title.toLowerCase()}`;
  return (
    <FramedCard
      title={title}
      action={
        <Tooltip content={label}>
          <IconButton
            label={label}
            size={32}
            onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(value, null, 2)).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </IconButton>
        </Tooltip>
      }
    >
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-[22px] text-(--pl-code-key)">
        <code>
          <Value value={value} depth={0} />
        </code>
      </pre>
    </FramedCard>
  );
}

export type { Json };
