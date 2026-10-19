"use client";

/* eslint-disable @next/next/no-img-element */
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { DOCK_H, type DockItem } from "./data";
import { useOS } from "./window-manager";

// One point. The screen scales as a whole on small viewports, so the dock
// itself always uses real points.
const U = "var(--u)";

const TILE = 68; // resting tile size, pt
const MAGNIFIED = 96; // tile size right under the cursor, pt
const REACH = 3; // tiles on each side of the cursor that grow
const EASE_IN_MS = 60; // time constants for magnification fading in/out
const EASE_OUT_MS = 90;

// Tile size in points, from a CSS variable the magnifier updates.
const size = (pt: number) => `calc(var(--size) * ${pt / TILE} * ${U})`;

/**
 * macOS 27 Liquid Glass dock with 68pt tiles and hover magnification.
 * Clicking an app with windows brings its frontmost window back (restoring
 * it if minimized or closed); clicking Finder focuses the desktop.
 */
export function Dock({ items, hidden = false }: { items: DockItem[]; hidden?: boolean }) {
  const listRef = useRef<HTMLUListElement>(null);
  useMagnification(listRef);
  const { state, dispatch } = useOS();
  const hasWindows = (app: string) => Object.values(state.windows).some((w) => w.app.id === app);

  return (
    <motion.div
      initial={false}
      animate={{ y: hidden ? DOCK_H + 12 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 40 }}
      className="mac-dock absolute inset-x-0 bottom-[calc(5.5*var(--u))] z-[1000] flex justify-center [--u:1px]"
      role="toolbar"
      aria-label="Dock"
    >
      <ul
        ref={listRef}
        className="relative flex items-end rounded-[calc(36*var(--u))] [corner-shape:superellipse(1.4)] backdrop-blur-[20px] backdrop-brightness-[0.7] backdrop-saturate-[1.6]"
        style={{
          // Dark appearance (measured on a dark-mode capture): near-black
          // glass with a faint rim all around.
          background: "light-dark(rgb(92 93 97 / 0.6), rgb(31 32 33 / 0.6))",
          boxShadow: [
            "inset 0 0 0 1px light-dark(rgb(255 255 255 / 0.05), rgb(255 255 255 / 0.14))",
            "inset 0 1px 0.5px light-dark(rgb(255 255 255 / 0.36), rgb(255 255 255 / 0.16))",
            "inset 0 -1px 0.5px light-dark(rgb(255 255 255 / 0.36), rgb(255 255 255 / 0.16))",
            "0 8px 24px rgb(0 0 0 / 0.2)",
          ].join(", "),
          height: `calc(88 * ${U})`,
          paddingInline: `calc(7.75 * ${U})`,
          paddingBottom: `calc(10 * ${U})`,
        }}
      >
        {items.map((item, i) =>
          item === "separator" ? (
            <li
              key={`sep-${i}`}
              aria-hidden
              className="self-center bg-black"
              style={{
                width: `calc(1 * ${U})`,
                height: `calc(62 * ${U})`,
                marginInline: `calc(15.5 * ${U})`,
                translate: `0 calc(1 * ${U})`,
              }}
            />
          ) : (
            <li
              key={item.id}
              data-tile
              data-dock-app={item.id}
              className="relative [--size:68]"
              style={{
                width: size(TILE),
                height: size(TILE),
                marginInline: `calc(2 * ${U})`,
              }}
            >
              <button
                type="button"
                aria-label={item.name}
                title={item.name}
                tabIndex={-1}
                onClick={() =>
                  item.id === "finder"
                    ? dispatch({ type: "focus", id: null })
                    : dispatch({ type: "activate-app", app: item.id })
                }
                className="block size-full cursor-default"
              >
                <img
                  src={item.icon}
                  alt=""
                  draggable={false}
                  className="size-full"
                  style={
                    item.offsetY
                      ? { translate: `0 ${size(item.offsetY)}` }
                      : undefined
                  }
                />
              </button>
              {item.badge && (
                <span
                  className="absolute flex items-center justify-center rounded-full bg-[#ee3b30] font-[-apple-system,BlinkMacSystemFont,Inter,sans-serif] leading-none font-normal text-white tabular-nums"
                  style={{
                    width: size(27),
                    height: size(27),
                    left: size(41),
                    top: size(-0.25),
                    fontSize: size(13.5),
                  }}
                >
                  {item.badge}
                </span>
              )}
              {(item.running || hasWindows(item.id)) && (
                <span
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 rounded-full"
                  style={{
                    background: "light-dark(#000, #919292)",
                    width: `calc(4 * ${U})`,
                    height: `calc(4 * ${U})`,
                    top: `calc(100% + 2 * ${U})`,
                  }}
                />
              )}
            </li>
          ),
        )}
      </ul>
    </motion.div>
  );
}

/**
 * Grows tiles near the pointer along a cosine falloff. Distances use each
 * tile's resting center, so the wave doesn't chase its own layout changes.
 */
function useMagnification(listRef: React.RefObject<HTMLUListElement | null>) {
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const tiles = Array.from(list.querySelectorAll<HTMLElement>("[data-tile]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let centers: number[] = []; // resting tile centers, viewport x
    let unit = 1; // px per pt at rest
    let amount = 0; // 0 = resting, 1 = fully magnified
    let target = 0;
    let pointerX = 0;
    let frame = 0;
    let last = 0;

    const measure = () => {
      if (amount > 0) return;
      const rects = tiles.map((t) => t.getBoundingClientRect());
      centers = rects.map((r) => r.left + r.width / 2);
      unit = rects[0].width / TILE;
    };

    const apply = () => {
      const reach = REACH * TILE * unit;
      tiles.forEach((tile, i) => {
        const d = Math.abs(pointerX - centers[i]);
        const falloff = d < reach ? (1 + Math.cos((Math.PI * d) / reach)) / 2 : 0;
        const pt = TILE + (MAGNIFIED - TILE) * amount * falloff;
        tile.style.setProperty("--size", pt.toFixed(3));
      });
    };

    const tick = (now: number) => {
      const dt = last ? now - last : 16;
      last = now;
      if (reduceMotion.matches) {
        amount = target;
      } else {
        const tau = target > amount ? EASE_IN_MS : EASE_OUT_MS;
        amount += (target - amount) * (1 - Math.exp(-dt / tau));
        if (Math.abs(target - amount) < 0.001) amount = target;
      }
      apply();
      if (amount !== target || target === 1) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        last = 0;
      }
    };

    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      measure();
      pointerX = e.clientX;
      target = 1;
      start();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointerX = e.clientX;
      if (target !== 1) onEnter(e);
    };
    const onLeave = () => {
      target = 0;
      start();
    };

    measure();
    list.addEventListener("pointerenter", onEnter);
    list.addEventListener("pointermove", onMove);
    list.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      list.removeEventListener("pointerenter", onEnter);
      list.removeEventListener("pointermove", onMove);
      list.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
    };
  }, [listRef]);
}
