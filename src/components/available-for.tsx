"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const INTERVAL_MS = 4000;
const EASE_OUT = [0.2, 0.7, 0.2, 1] as const;

// Each style wraps a word with its own decoration, sized in em so it scales
// with the title. --title-em on the h1 is the widest second line in em
// ("product engineering work.") plus 4%; update it if you add a longer word.

/** Measures its element's rendered size, in CSS px. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      setSize({ width: r.width, height: r.height });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const REDLINE = "#f24822";

/** Figma redline: a dimension line under the word, labeled with its real width. */
function Redline({ children }: { children: string }) {
  const [ref, { width }] = useSize<HTMLSpanElement>();
  // One progress value drives both the line and its label, so the number
  // always equals the line's current length and lands as it hits the ticks.
  const progress = useMotionValue(0);
  const measured = useMotionValue(0);
  const label = useTransform(() =>
    Math.round(progress.get() * measured.get()),
  );

  useEffect(() => {
    measured.set(width);
  }, [measured, width]);

  useEffect(() => {
    const controls = animate(progress, 1, {
      duration: 0.6,
      delay: 0.25,
      ease: EASE_OUT,
    });
    return () => controls.stop();
  }, [progress]);

  const tick = {
    initial: { scaleY: 0 },
    animate: { scaleY: 1 },
    transition: { duration: 0.2, delay: 0.05, ease: EASE_OUT },
  };

  return (
    <span ref={ref} className="relative">
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-[0.42em] h-[0.3em]"
      >
        <motion.span
          className="absolute top-0 left-0 h-full w-[1.5px] origin-top"
          style={{ background: REDLINE }}
          {...tick}
        />
        <motion.span
          className="absolute top-0 right-0 h-full w-[1.5px] origin-top"
          style={{ background: REDLINE }}
          {...tick}
        />
        <motion.span
          className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2"
          style={{ background: REDLINE, scaleX: progress }}
        />
        <motion.span
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[0.1em] px-[0.16em] font-sans text-[0.32em] leading-[1.45] font-medium tracking-normal text-white tabular-nums"
          style={{ background: REDLINE }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: 0.25, ease: EASE_OUT }}
        >
          {label}
        </motion.span>
      </span>
    </span>
  );
}

/** A git diff "added" line: green band, darker gutter, and a + sign. */
function Diff({ children }: { children: string }) {
  return (
    <span className="relative isolate">
      <motion.span
        aria-hidden
        className="absolute -inset-y-[0.05em] -right-[0.14em] -left-[1em] -z-10 overflow-hidden rounded-[0.1em] bg-[#dafbe1] dark:bg-[#12261e]"
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: 0.5, delay: 0.1, ease: EASE_OUT }}
      >
        {/* Gutter, with a drawn + centered in it (a typed + sits on the
            font's math axis, not the box center) */}
        <span className="absolute inset-y-0 left-0 flex w-[0.78em] items-center justify-center bg-[#aceebb] text-[#1a7f37] dark:bg-[#1b4721] dark:text-[#3fb950]">
          <svg viewBox="0 0 10 10" className="size-[0.36em]">
            <path
              d="M5 0.75 V9.25 M0.75 5 H9.25"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </svg>
        </span>
      </motion.span>
      {children}
    </span>
  );
}

const trim = (n: number) => String(Math.round(n * 10) / 10);

/** Chrome DevTools "inspect element": box-model overlay plus its tooltip. */
function Inspect({ children }: { children: string }) {
  const [ref, { width, height }] = useSize<HTMLSpanElement>();
  return (
    <span
      ref={ref}
      className="relative isolate font-mono text-[0.92em] leading-[0.8] font-normal tracking-[-0.04em]"
    >
      <motion.span
        aria-hidden
        className="absolute -inset-x-[0.12em] -inset-y-[0.08em] -z-10 bg-[rgb(147_196_125/0.55)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <span className="absolute inset-x-[0.12em] inset-y-[0.08em] bg-[rgb(111_168_220/0.66)]" />
      </motion.span>
      {children}
      <motion.span
        aria-hidden
        className="absolute top-[calc(100%+0.36em)] -left-[0.12em] rounded-[0.14em] bg-white px-[0.28em] py-[0.14em] font-sans text-[0.36em] leading-[1.35] font-normal tracking-normal whitespace-nowrap text-[#5f6368] shadow-[0_1px_4px_rgb(0_0_0/0.25)] dark:bg-[#292a2d] dark:text-[#9aa0a6]"
        initial={{ opacity: 0, y: "-0.2em" }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25, ease: EASE_OUT }}
      >
        <span className="absolute -top-[0.38em] left-[0.7em] border-x-[0.4em] border-b-[0.4em] border-x-transparent border-b-white dark:border-b-[#292a2d]" />
        <span className="text-[#881280] dark:text-[#5db0d7]">span</span>
        <span className="text-[#1a1aa6] dark:text-[#f29766]">.frontend</span>
        <span className="ml-[0.6em] tabular-nums">
          {trim(width)} × {trim(height)}
        </span>
      </motion.span>
    </span>
  );
}

// Stepped easing: jumps between n flat levels, like an 8-bit fade.
const stepped =
  (n: number) =>
  (t: number): number =>
    Math.min(1, Math.floor(t * n) / (n - 1));

// 2px checkerboard (a 50% ordered dither), used as a mask.
const DITHER: React.CSSProperties = {
  maskImage:
    "conic-gradient(#000 25%, transparent 0 50%, #000 0 75%, transparent 0)",
  maskSize: "4px 4px",
};

/** Bold pixel type with a dithered 1-bit drop shadow and a stepped reveal. */
function Pixel({ children }: { children: string }) {
  return (
    <span className="relative isolate font-pixel text-[1.04em] leading-[0.8] font-semibold tracking-[0.03em]">
      <motion.span
        aria-hidden
        className="absolute top-0 left-0 -z-10 bg-muted-foreground bg-clip-text text-transparent"
        style={DITHER}
        initial={{ opacity: 0, x: 0, y: 0 }}
        animate={{ opacity: 0.4, x: "0.08em", y: "0.08em" }}
        transition={{ duration: 0.4, delay: 0.2, ease: stepped(3) }}
      >
        {children}
      </motion.span>
      <motion.span
        className="inline-block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: stepped(4) }}
      >
        {children}
      </motion.span>
    </span>
  );
}

const HANDLES = [
  "-top-[0.095em] -left-[0.095em]",
  "-top-[0.095em] -right-[0.095em]",
  "-bottom-[0.095em] -left-[0.095em]",
  "-bottom-[0.095em] -right-[0.095em]",
];

/** Figma selection: a blue box with corner handles. */
function Selection({ children }: { children: string }) {
  return (
    <span className="relative px-[0.14em]">
      {children}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-[0.02em] -bottom-[0.06em] border-[1.5px] border-[#0d99ff]"
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.1, ease: EASE_OUT }}
      >
        {HANDLES.map((pos) => (
          <span
            key={pos}
            className={`absolute size-[0.19em] border-[1.5px] border-[#0d99ff] bg-background ${pos}`}
          />
        ))}
      </motion.span>
    </span>
  );
}

const WORDS = [
  { label: "design engineering", Style: Redline },
  { label: "product engineering", Style: Diff },
  { label: "frontend", Style: Inspect },
  { label: "UI engineering", Style: Pixel },
  { label: "design systems", Style: Selection },
] as const;

const SPOKEN = `Alan is available for ${WORDS.slice(0, -1)
  .map((w) => w.label)
  .join(", ")} and ${WORDS.at(-1)!.label} work.`;

/**
 * "Alan is available for / [word] work." The title is always exactly two
 * lines of fixed height, and no word can change a line box, so swapping
 * words never moves anything vertically.
 */
export function AvailableFor() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [widths, setWidths] = useState<number[] | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Measure every word, so the slot can animate its width. The font size
  // follows the container, so re-measure whenever the title resizes.
  useLayoutEffect(() => {
    const title = titleRef.current;
    const el = measureRef.current;
    if (!title || !el) return;
    const measure = () =>
      setWidths(
        Array.from(el.children, (c) => (c as HTMLElement).offsetWidth),
      );
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(title);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % WORDS.length),
      INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const { label, Style } = WORDS[index];

  return (
    <div className="@container">
      <h1
        ref={titleRef}
        className="relative text-[min(32px,calc(100cqw/var(--title-em)))] leading-[1.1] font-medium tracking-[-0.03em] text-foreground [--title-em:12.4]"
      >
        <span className="sr-only">{SPOKEN}</span>
        <span aria-hidden className="block h-[1.1em] whitespace-nowrap">
          Alan is available for
        </span>
        <span aria-hidden className="block h-[1.1em] whitespace-nowrap">
          <motion.span
            className="relative inline-block leading-none"
            initial={false}
            animate={widths ? { width: widths[index] } : undefined}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={label}
                className="inline-block"
                initial={{ opacity: 0, y: "0.2em", filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: "-0.2em", filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <Style>{label}</Style>
              </motion.span>
            </AnimatePresence>
          </motion.span>{" "}
          work.
        </span>

        {/* Invisible copies of every word, for width measurement only */}
        <span
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 h-0 w-0 overflow-hidden leading-none whitespace-nowrap"
        >
          {WORDS.map(({ label, Style }) => (
            <span key={label} className="inline-block">
              <Style>{label}</Style>
            </span>
          ))}
        </span>
      </h1>
    </div>
  );
}
