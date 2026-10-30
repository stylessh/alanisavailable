"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Content that changes in place (a checkout moving from processing to its
// receipt, a card filling in once its data arrives), moved between instead
// of swapped. Its height follows what's inside, animating whenever that
// grows or shrinks. When `id` says the content is something else now, the
// old content fades out on top while the new one fades in under it. The
// same id keeps the same content mounted, so updates within it stay updates.
//
// It clips to its height while that animates, with 16px of margin so
// shadows and focus outlines inside it aren't cut.

export function Morph({ id, className = "", children }: { id: string; className?: string; children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  // what was on screen last, for the copy that fades out when the id changes
  const last = useRef({ id, node: children });
  const [shown, setShown] = useState(id);
  const [leaving, setLeaving] = useState<{ node: React.ReactNode; n: number } | null>(null);
  if (id !== shown) {
    setShown(id);
    setLeaving((l) => ({ node: last.current.node, n: (l?.n ?? 0) + 1 }));
  }
  useEffect(() => {
    last.current = { id, node: children };
  });
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(null), 220);
    return () => clearTimeout(t);
  }, [leaving]);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    setHeight(el.offsetHeight);
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown]);

  return (
    <div
      className={`relative transition-[height] duration-(--pl-slow) ease-(--pl-ease) ${className}`}
      style={{ height, overflow: "clip", overflowClipMargin: 16 }}
    >
      <div ref={inner} key={shown} className={leaving ? "pl-morph-in" : undefined}>
        {children}
      </div>
      {leaving && (
        <div key={leaving.n} aria-hidden inert className="pl-morph-out pointer-events-none absolute inset-x-0 top-0">
          {leaving.node}
        </div>
      )}
    </div>
  );
}
