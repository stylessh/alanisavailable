"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { LegendDot } from "./status";
import type { Point } from "../data";

// Polar draws its metrics with Recharts (components/Charts/GenericChart.tsx).
// This is the same picture in plain SVG, from the live chart's DOM: the plot
// sits 24px in from the left, right and top and 30px up from the bottom;
// dashed (6 6) gray-200 verticals at half strength mark each labelled day; the
// line is 1.5px blue-600 over a gradient of itself (50% → 2.5%, at 60%); the
// dates are 12px #666, centered 14px under the plot, as many as fit with 5px
// between them, always keeping the first.

/** The element's width, kept current. It's read once on mount too: a page in a background tab gets no ResizeObserver callbacks until it's shown. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const PAD = { left: 24, right: 24, top: 24, bottom: 30 };
const tick = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
/** Recharts' "equidistantPreserveStart": the smallest step at which labels stop touching */
const stepFor = (spacing: number, labelWidth = 38) => Math.max(1, Math.ceil((labelWidth + 5) / Math.max(spacing, 1)));

function Ticks({ points, x, y }: { points: Point[]; x: (i: number) => number; y: number }) {
  const step = stepFor(points.length > 1 ? x(1) - x(0) : Infinity);
  return (
    <g>
      {points.map((p, i) =>
        i % step === 0 ? (
          <text key={i} x={x(i)} y={y} dy="0.71em" textAnchor="middle" fill="var(--pl-chart-tick)" fontSize={12}>
            {tick(p.date)}
          </text>
        ) : null,
      )}
    </g>
  );
}

/**
 * The hover card (shadcn ChartTooltipContent, indicator "dot"): gray-50, a
 * half-strength gray-200 border, 9.6px corners, 10px by 6px of padding,
 * shadow-xl, at least 128px wide; a 12px/500 date, then each series as a
 * 10px square-cornered dot, its name in gray-500 and its value in 500 mono
 * figures on the right.
 */
export function ChartTooltip({
  label,
  rows,
  style,
}: {
  label: React.ReactNode;
  rows: { name: string; value: string; color?: string }[];
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className="pointer-events-none grid min-w-32 items-start gap-1.5 rounded-[9.6px] border border-(--pl-border)/50 bg-(--pl-subtle) px-2.5 py-1.5 text-xs leading-4 text-(--pl-text-strong) shadow-(--pl-shadow-xl)"
    >
      <div className="font-medium">{label}</div>
      {rows.map((r) => (
        <div key={r.name} className="flex w-full items-center gap-2">
          <LegendDot variant="dot" color={r.color ?? "var(--pl-chart)"} />
          <div className="flex flex-1 items-center justify-between gap-4 leading-none">
            <span className="text-(--pl-text-muted)">{r.name}</span>
            <span className="font-mono font-medium text-(--pl-text-strong) tabular-nums">{r.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** the hovered point's index, from the pointer's x over the plot */
function useHover(count: number, x0: number, plotW: number) {
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    const py = e.clientY - box.top;
    const i = count > 1 ? Math.round(((px - x0) / plotW) * (count - 1)) : 0;
    setHover({ i: Math.max(0, Math.min(count - 1, i)), px, py });
  };
  return { hover, onPointerMove, onPointerLeave: () => setHover(null) };
}

export function AreaChart({
  points,
  height = 200,
  format = (v) => String(v),
  series = "Current",
}: {
  points: Point[];
  height?: number;
  /** how a value reads in the hover card */
  format?: (value: number) => string;
  series?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const id = useId();
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) => PAD.left + (points.length > 1 ? (i / (points.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH * 0.92;
  const step = stepFor(points.length > 1 ? x(1) - x(0) : Infinity);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join("");
  const area = `${line}L${x(points.length - 1).toFixed(2)},${PAD.top + plotH}L${PAD.left},${PAD.top + plotH}Z`;
  const { hover, ...track } = useHover(points.length, PAD.left, plotW);
  const active = hover ? points[hover.i] : undefined;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Chart" className="block overflow-visible" {...track}>
          <defs>
            <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--pl-chart)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--pl-chart)" stopOpacity={0.025} />
            </linearGradient>
          </defs>
          <g>
            {points.map((_, i) =>
              i % step === 0 ? (
                <line
                  key={i}
                  x1={x(i)}
                  x2={x(i)}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  stroke="var(--pl-chart-grid)"
                  strokeDasharray="6 6"
                />
              ) : null,
            )}
          </g>
          <path d={area} fill={`url(#area-${id})`} fillOpacity={0.6} />
          {/* the hover line: solid 1px #e5e7eb through the plot (GenericChart's ReferenceLine) */}
          {hover && <line x1={x(hover.i)} x2={x(hover.i)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--pl-chart-cursor)" />}
          <path d={line} fill="none" stroke="var(--pl-chart)" strokeWidth={1.5} strokeLinejoin="round" />
          {/* Recharts' active dot: 4px radius in the series color, ringed white */}
          {hover && active && (
            <circle cx={x(hover.i)} cy={y(active.value)} r={4} fill="var(--pl-chart)" stroke="#fff" strokeWidth={2} />
          )}
          <Ticks points={points} x={x} y={PAD.top + plotH + 14} />
        </svg>
      )}
      {hover && active && (
        <ChartTooltip
          label={tick(active.date)}
          rows={[{ name: series, value: format(active.value) }]}
          style={{
            position: "absolute",
            top: Math.max(0, hover.py - 60),
            left: hover.px + 10,
            transform: hover.px > width - 160 ? "translateX(calc(-100% - 20px))" : undefined,
          }}
        />
      )}
    </div>
  );
}

/**
 * The Customers overview's bars: a 0–max axis down the left, a blue-600 bar per
 * day, and a 2px stub on days with none so the baseline still reads.
 */
export function BarChart({ points, height = 240 }: { points: Point[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const left = 32;
  const plotW = Math.max(0, width - left - 8);
  const plotH = height - 12 - 30;
  const max = Math.max(4, ...points.map((p) => p.value));
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((max / 4) * i));
  const slot = plotW / points.length;
  const x = (i: number) => left + slot * (i + 0.5);
  const y = (v: number) => 12 + plotH - (v / max) * plotH;
  const barW = Math.max(2, Math.min(10, slot * 0.4));
  const step = stepFor(slot);

  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="New customers per day" className="block overflow-visible">
          {yTicks.map((t) => (
            <text key={t} x={left - 14} y={y(t)} dy="0.32em" textAnchor="end" fill="var(--pl-chart-tick)" fontSize={12}>
              {t}
            </text>
          ))}
          {points.map((p, i) =>
            i % step === 0 ? (
              <line key={i} x1={x(i)} x2={x(i)} y1={12} y2={12 + plotH} stroke="var(--pl-chart-grid)" strokeDasharray="6 6" />
            ) : null,
          )}
          {points.map((p, i) => {
            const h = Math.max(2, (p.value / max) * plotH);
            return <rect key={i} x={x(i) - barW / 2} y={12 + plotH - h} width={barW} height={h} fill="var(--pl-chart)" rx={1} />;
          })}
          <Ticks points={points} x={x} y={12 + plotH + 14} />
        </svg>
      )}
    </div>
  );
}
