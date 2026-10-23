"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BakedImage } from "./scratchpad";

// What's attached to the composer. For now that's scratched pictures: Done in
// the scratchpad bakes the picture's marks and numbered dots into a new image
// and attaches it here, with its notes alongside, so the message says which
// spot of which image each note means without naming it in the prompt.

/** An image attached to the composer: the baked picture and its notes, and the picture it was made from. */
export type Attachment = BakedImage & { id: string; from: string };

type Attachments = {
  attachments: Attachment[];
  /** attach an image; one made from the same picture replaces it */
  attach: (a: Omit<Attachment, "id">) => void;
  remove: (id: string) => void;
  /** everything attached went out with a message: the list empties, and the images live on in the message */
  clear: () => void;
  /** the picture a baked image was made from (itself if it wasn't), so scratching it again starts from the original */
  originOf: (src: string) => string;
};

const AttachmentsContext = createContext<Attachments>({ attachments: [], attach: () => {}, remove: () => {}, clear: () => {}, originOf: (src) => src });

/** a replaced image may still be on screen for a moment (the viewer flying shut), so it's let go a little later */
const release = (src: string) => setTimeout(() => URL.revokeObjectURL(src), 2000);

export const useAttachments = () => useContext(AttachmentsContext);

export function AttachmentsProvider({ children }: { children: ReactNode }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const ids = useRef(0);
  // every baked image's original, kept after it's sent so a sent image can be scratched again too
  const origins = useRef(new Map<string, string>());
  const attach = useCallback((a: Omit<Attachment, "id">) => {
    const id = `attachment-${++ids.current}`;
    origins.current.set(a.src, a.from);
    setAttachments((list) => {
      const old = list.find((x) => x.from === a.from);
      return old ? list.map((x) => (x === old ? { ...a, id } : x)) : [...list, { ...a, id }];
    });
  }, []);
  // what's replaced or removed before it's sent is let go; what's sent stays, in its message
  const shown = useRef<Attachment[]>([]);
  const sent = useRef(new Set<string>());
  useEffect(() => {
    const now = new Set(attachments.map((a) => a.src));
    for (const a of shown.current) if (!now.has(a.src) && !sent.current.has(a.src)) release(a.src);
    shown.current = attachments;
  }, [attachments]);
  const remove = useCallback((id: string) => setAttachments((list) => list.filter((x) => x.id !== id)), []);
  const clear = useCallback(() => {
    for (const a of shown.current) sent.current.add(a.src);
    setAttachments([]);
  }, []);
  const originOf = useCallback((src: string) => origins.current.get(src) ?? src, []);
  const value = useMemo(() => ({ attachments, attach, remove, clear, originOf }), [attachments, attach, remove, clear, originOf]);
  return <AttachmentsContext.Provider value={value}>{children}</AttachmentsContext.Provider>;
}
