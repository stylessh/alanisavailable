"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { type Camera, fit, lerp, type Rect, sane, zoomAt } from "./camera";
import { Inspector } from "./inspector";
import { SPECIMENS } from "./specimens";
import { isFixed, LIVE, readBaseline, useVariations, V1, type Variation } from "./tokens";

// The design-system playground: one infinite canvas, the same one the
// versions use (pan, zoom, click a frame to fly to it). Each column is a set
// of tokens: version 1, frozen, as the reference; Live, styles.css as it is
// now; then your variations, each a set of changes on top of Live. Each row
// is a part of the system (Buttons, Fields, …), drawn with that column's
// tokens, so a change shows everywhere it lands, next to where it started.
// (Changes to the components themselves show against the frozen version on
// /polar/versions; this canvas compares tokens.)
//
// Frames are live: click, type, open menus. The canvas moves when you drag
// the space between frames, Space-drag or middle-drag anywhere, scroll or
// two-finger to pan, and ⌘-scroll or pinch to zoom. 1 fits everything,
// + and − zoom, and a frame's name flies to it.

const PAD = 72; // screen pixels around everything when fitting it all
const STEP = 1.25; // zoom per key press
const COL_GAP = 160; // world pixels between variations
const ROW_GAP = 120; // and between frames
const LABEL = 44; // a frame's name above it, in world pixels at 100%
const SAVE = "alanisavailable:polar:playground-camera";

const ease = (t: number) => 1 - (1 - t) ** 3;

function loadCamera(): Camera | null {
  try {
    const c = JSON.parse(localStorage.getItem(SAVE) ?? "null");
    return c && [c.x, c.y, c.z].every((n) => typeof n === "number") ? sane(c) : null;
  } catch {
    return null;
  }
}

const newId = () => Math.random().toString(36).slice(2, 9);

export function Playground() {
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const camera = useRef<Camera>({ x: 0, y: 0, z: 0.5 });
  const raf = useRef(0);
  const anim = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [zoom, setZoom] = useState(0.5);
  const [baseline, setBaseline] = useState<Record<string, string>>({});
  const [variations, setVariations] = useVariations();
  const [selectedId, setSelectedId] = useState(LIVE.id);
  const [inspector, setInspector] = useState(true);

  const columns: Variation[] = [V1, LIVE, ...variations];
  const selected = columns.find((v) => v.id === selectedId) ?? LIVE;

  // one transform write per frame, straight to the DOM: moving never rerenders the frames
  const apply = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const { x, y, z } = camera.current;
      world.current?.style.setProperty("transform", `translate3d(${x}px, ${y}px, 0) scale(${z})`);
      world.current?.style.setProperty("--inv", String(1 / z));
      setZoom(z);
    });
  }, []);

  const set = useCallback(
    (next: Camera) => {
      camera.current = sane(next);
      apply();
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(SAVE, JSON.stringify(camera.current));
        } catch {
          // the canvas works the same; it just won't remember the view
        }
      }, 400);
    },
    [apply],
  );

  const animateTo = useCallback(
    (to: Camera, ms = 450) => {
      cancelAnimationFrame(anim.current);
      const from = camera.current;
      const start = performance.now();
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        set(lerp(from, to, ease(t), cx, cy));
        if (t < 1) anim.current = requestAnimationFrame(tick);
      };
      anim.current = requestAnimationFrame(tick);
    },
    [set],
  );

  /** the room the canvas has, beside the inspector when it's open */
  const room = useCallback(() => ({ w: window.innerWidth - (inspector ? 352 : 0), h: window.innerHeight }), [inspector]);

  /** a world rect, from an element inside the world (layout sizes ignore the camera's scale) */
  const rectIn = (el: HTMLElement): Rect => {
    let x = 0;
    let y = 0;
    let n: HTMLElement | null = el;
    while (n && n !== world.current) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };

  const fitAll = useCallback(() => {
    const w = world.current;
    if (!w) return camera.current;
    const { w: vw, h: vh } = room();
    return fit({ x: 0, y: 0, w: w.scrollWidth, h: w.scrollHeight }, vw, vh, PAD);
  }, [room]);

  /** where it opens: every column across, from the top, at a size you can read */
  const home = useCallback(() => {
    const w = world.current;
    if (!w) return camera.current;
    const { w: vw } = room();
    const z = Math.min(0.6, (vw - PAD * 2) / w.scrollWidth);
    return sane({ x: (vw - w.scrollWidth * z) / 2, y: 0, z });
  }, [room]);

  const flyTo = (el: HTMLElement) => {
    const r = rectIn(el);
    const { w: vw, h: vh } = room();
    const top = { ...r, y: r.y - LABEL, h: Math.min(r.h + LABEL, (vh / vw) * r.w * 1.1) };
    animateTo(fit(top, vw, vh, 48));
  };

  // the baseline is whatever styles.css says now, read once the frames are on the page
  useLayoutEffect(() => {
    setBaseline(readBaseline(viewport.current?.closest(".polar") ?? null));
    set(loadCamera() ?? home());
    // set up once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gestures. Frames keep their clicks: only the space between them pans on a
  // plain drag; Space-drag and middle-drag pan anywhere.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    let drag: { id: number; x: number; y: number } | null = null;
    let space = false;
    let gestureZ = 1;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; z: number } | null = null;

    const onBackground = (t: EventTarget | null) =>
      t === el || t === world.current || (t instanceof HTMLElement && !!t.dataset.plCanvasGap);
    const down = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: camera.current.z };
          drag = null;
          return;
        }
      }
      if (!(e.button === 1 || (e.button === 0 && (space || onBackground(e.target))))) return;
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (pinch && pointers.has(e.pointerId)) {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = [...pointers.values()];
        const c = camera.current;
        set(zoomAt(c, (pinch.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d / c.z, (a.x + b.x) / 2, (a.y + b.y) / 2));
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      const c = camera.current;
      set({ ...c, x: c.x + e.clientX - drag.x, y: c.y + e.clientY - drag.y });
      drag = { ...drag, x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (drag?.id === e.pointerId) {
        drag = null;
        el.style.cursor = space ? "grab" : "";
      }
    };
    const wheel = (e: WheelEvent) => {
      // a popover or list that scrolls keeps its own wheel
      const t = e.target as HTMLElement;
      const scroller = t.closest?.("[data-pl-scrolls]") as HTMLElement | null;
      if (scroller && scroller.scrollHeight > scroller.clientHeight && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const c = camera.current;
      if (e.ctrlKey || e.metaKey) set(zoomAt(c, Math.exp((-e.deltaY * unit) / 200), e.clientX, e.clientY));
      else set({ ...c, x: c.x - e.deltaX * unit, y: c.y - e.deltaY * unit });
    };
    type GestureEvent = UIEvent & { scale: number; clientX: number; clientY: number };
    const gestureStart = (e: Event) => {
      e.preventDefault();
      gestureZ = camera.current.z;
    };
    const gestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as GestureEvent;
      set(zoomAt(camera.current, (gestureZ * g.scale) / camera.current.z, g.clientX, g.clientY));
    };
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName) || !!t.closest("[role=dialog]"));
    const keydown = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = camera.current;
      const center = [room().w / 2, room().h / 2] as const;
      if (e.key === " ") {
        space = true;
        el.style.cursor = "grab";
      } else if (e.key === "1") animateTo(fitAll(), 350);
      else if (e.key === "0") animateTo(zoomAt(c, 1 / c.z, ...center), 300);
      else if (e.key === "+" || e.key === "=") set(zoomAt(c, STEP, ...center));
      else if (e.key === "-" || e.key === "_") set(zoomAt(c, 1 / STEP, ...center));
      else return;
      e.preventDefault();
    };
    const keyup = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      space = false;
      if (!drag) el.style.cursor = "";
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("gesturestart", gestureStart);
    el.addEventListener("gesturechange", gestureChange);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("gesturestart", gestureStart);
      el.removeEventListener("gesturechange", gestureChange);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
    };
  }, [set, animateTo, fitAll, room]);

  useEffect(
    () => () => {
      // cleared too, so a remount (React's dev double mount) can schedule again
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      cancelAnimationFrame(anim.current);
      clearTimeout(saveTimer.current);
    },
    [],
  );

  const addVariation = (from: Variation) => {
    const n = variations.length + 1;
    const v = {
      id: newId(),
      name: isFixed(from) ? `Variation ${n}` : `${from.name} copy`,
      overrides: { ...from.overrides },
    };
    setVariations((list) => [...list, v]);
    setSelectedId(v.id);
    setInspector(true);
  };

  return (
    <>
      <div
        ref={viewport}
        tabIndex={-1}
        aria-label="Design system playground. Drag between frames to look around, scroll to pan, ⌘-scroll to zoom, 1 to see everything."
        className="fixed inset-0 touch-none overflow-hidden overscroll-none bg-[#f4f4f5] outline-none"
        style={{ letterSpacing: "0.24px" }}
      >
        <div
          ref={world}
          className="absolute top-0 left-0 grid origin-top-left will-change-transform"
          style={{
            ["--inv" as string]: 1,
            gridTemplateColumns: `repeat(${columns.length}, max-content)`,
            columnGap: COL_GAP,
            rowGap: ROW_GAP,
            padding: LABEL + 96,
          }}
        >
          {/* each variation's name, over its column */}
          {columns.map((v) => (
            <button
              key={`head-${v.id}`}
              type="button"
              onClick={() => {
                setSelectedId(v.id);
                setInspector(true);
              }}
              className={`-mb-6 flex cursor-pointer items-baseline gap-3 self-end text-left text-[56px] leading-none font-medium tracking-tight transition-colors ${
                v.id === selected.id ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {v.name}
              <span className="text-[24px] font-normal text-neutral-400">
                {v.id === V1.id
                  ? "frozen, the reference"
                  : v.id === LIVE.id
                    ? "styles.css"
                    : `${Object.keys(v.overrides).length} ${Object.keys(v.overrides).length === 1 ? "change" : "changes"}`}
              </span>
            </button>
          ))}
          {SPECIMENS.map((s) =>
            columns.map((v) => (
              <section
                key={`${s.id}-${v.id}`}
                className="relative"
                style={{ width: s.width }}
                aria-label={`${s.title}, ${v.name}`}
              >
                {/* the name stays the same size on screen at any zoom, and flies to the frame */}
                <button
                  type="button"
                  onClick={(e) => flyTo(e.currentTarget.parentElement!)}
                  className="absolute bottom-full left-0 flex origin-bottom-left cursor-pointer items-baseline gap-2 pb-2.5 text-[13px] whitespace-nowrap text-neutral-500 hover:text-neutral-900"
                  style={{ transform: "scale(var(--inv))", letterSpacing: 0 }}
                >
                  <span className="font-medium text-neutral-900">{s.title}</span>
                  <span>{v.name}</span>
                </button>
                <div
                  data-pl-scope
                  className="overflow-hidden bg-(--pl-surface) p-12 text-(--pl-text)"
                  style={{
                    ...(v.overrides as React.CSSProperties),
                    borderRadius: "calc(10px * var(--inv))",
                    boxShadow: `0 0 0 calc(1px * var(--inv)) ${v.id === selected.id && !isFixed(v) ? "#171717" : "#e5e5e5"}`,
                  }}
                >
                  <s.Component />
                </div>
              </section>
            )),
          )}
        </div>
      </div>

      {/* the toolbar, in the versions bar's dark glass */}
      <div
        className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-0.5 rounded-xl bg-neutral-900/85 p-1 text-[12.5px] font-medium text-white/70 shadow-lg ring-1 ring-white/10 backdrop-blur-xl"
        style={{ letterSpacing: 0, marginLeft: inspector ? -176 : 0 }}
      >
        <ToolButton label="See everything (1)" onClick={() => animateTo(fitAll(), 350)}>
          Fit
        </ToolButton>
        <ToolButton label="Zoom out (−)" onClick={() => set(zoomAt(camera.current, 1 / STEP, room().w / 2, room().h / 2))}>
          −
        </ToolButton>
        <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <ToolButton label="Zoom in (+)" onClick={() => set(zoomAt(camera.current, STEP, room().w / 2, room().h / 2))}>
          +
        </ToolButton>
        <span aria-hidden className="mx-1 h-4 w-px bg-white/15" />
        <ToolButton label="A new variation from the one selected" onClick={() => addVariation(selected)}>
          New variation
        </ToolButton>
        <ToolButton label="Tokens and changes" pressed={inspector} onClick={() => setInspector((o) => !o)}>
          Inspector
        </ToolButton>
        <span aria-hidden className="mx-1 h-4 w-px bg-white/15" />
        <a
          href="#"
          className="flex h-7 items-center rounded-lg px-2.5 hover:bg-white/10 hover:text-white"
          title="Back to the dashboard"
        >
          Dashboard
        </a>
      </div>

      {inspector && (
        <Inspector
          variations={columns}
          selected={selected}
          baseline={baseline}
          onSelect={setSelectedId}
          onUpdate={(v) => setVariations((list) => list.map((x) => (x.id === v.id ? v : x)))}
          onDuplicate={addVariation}
          onDelete={(v) => {
            setVariations((list) => list.filter((x) => x.id !== v.id));
            setSelectedId(LIVE.id);
          }}
          onClose={() => setInspector(false)}
        />
      )}
    </>
  );
}

function ToolButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-lg px-2.5 hover:bg-white/10 hover:text-white aria-pressed:bg-white/15 aria-pressed:text-white"
    >
      {children}
    </button>
  );
}
