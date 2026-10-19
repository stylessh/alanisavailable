"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";
import { DOCK_ITEMS } from "./data";

// One point. The dock keeps its real size and shrinks only when the
// viewport is narrower than the dock itself (407.5pt + 12pt each side).
const U = "var(--u)";

const TILE = 68; // resting tile size, pt
const MAGNIFIED = 96; // tile size right under the cursor, pt
const REACH = 3; // tiles on each side of the cursor that grow
const EASE_IN_MS = 60; // time constants for magnification fading in/out
const EASE_OUT_MS = 90;

// Tile size in points, from a CSS variable the magnifier updates.
const size = (pt: number) => `calc(var(--size) * ${pt / TILE} * ${U})`;

/** macOS 27 Liquid Glass dock with 68pt tiles and hover magnification. */
export function Dock() {
  const listRef = useRef<HTMLUListElement>(null);
  useMagnification(listRef);

  return (
    <div
      className="mac-dock absolute inset-x-0 bottom-[calc(5.5*var(--u))] flex justify-center [--u:min(1px,calc((100vw-24px)/407.5))]"
      role="toolbar"
      aria-label="Dock"
    >
      <ul
        ref={listRef}
        className="relative flex items-end rounded-[calc(28*var(--u))] bg-[rgb(92_93_97/0.6)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.05),inset_0_1px_0.5px_rgb(255_255_255/0.36),inset_0_-1px_0.5px_rgb(255_255_255/0.36),0_8px_24px_rgb(0_0_0/0.2)] backdrop-blur-[20px] backdrop-brightness-[0.7] backdrop-saturate-[1.6]"
        style={{
          height: `calc(88 * ${U})`,
          paddingInline: `calc(7.75 * ${U})`,
          paddingBottom: `calc(10 * ${U})`,
        }}
      >
        {DOCK_ITEMS.map((item, i) =>
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
              className="relative [--size:68]"
              style={{
                width: size(TILE),
                height: size(TILE),
                marginInline: `calc(2 * ${U})`,
              }}
            >
              <img
                src={`/products/superlogical/macos/dock/${item.id}.png`}
                alt={item.name}
                draggable={false}
                className="size-full"
                style={
                  item.offsetY
                    ? { translate: `0 ${size(item.offsetY)}` }
                    : undefined
                }
              />
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
              {item.running && (
                <span
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black"
                  style={{
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
    </div>
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
