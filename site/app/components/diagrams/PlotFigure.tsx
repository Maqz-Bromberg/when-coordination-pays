"use client";

import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";

type Row = Record<string, number | string>;

/** Small set of chart kinds the result pages need; specs stay serializable so pages can be server components. */
export type ChartSpec =
  | { kind: "loglog"; data: Row[]; x: string; y: string; series: string; xLabel: string; yLabel: string; refSlope?: number }
  | { kind: "heatmap"; data: Row[]; x: string; y: string; fill: string; label: string; scheme?: string; domain?: [number, number] }
  | { kind: "lines"; data: Row[]; x: string; y: string; series: string; xLabel: string; yLabel: string; logX?: boolean;
      xTicks?: number[]; colors?: Record<string, string> }
  | { kind: "regimes"; data: Row[]; x: string; y: string; fill: string; colors: Record<string, string>; xLabel: string;
      yLabel: string; xTicks?: number[]; lines?: { data: Row[]; label: string; dash?: boolean; dy?: number }[] };

export default function PlotFigure({ spec, caption, wide = false }: { spec: ChartSpec; caption?: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const width = Math.min(ref.current.clientWidth || 640, wide ? 1080 : 720);
    const tall = wide ? 1.35 : 1;
    let chart: ReturnType<typeof Plot.plot>;
    if (spec.kind === "loglog") {
      chart = Plot.plot({
        width, height: 340 * tall, grid: true,
        x: { type: "log", label: spec.xLabel }, y: { type: "log", label: spec.yLabel },
        color: { legend: true },
        marks: [
          Plot.line(spec.data, { x: spec.x, y: spec.y, stroke: spec.series }),
          Plot.dot(spec.data, { x: spec.x, y: spec.y, fill: spec.series, r: 2.5 }),
        ],
      });
    } else if (spec.kind === "lines") {
      chart = Plot.plot({
        width, height: 320 * tall, grid: true, marginRight: 24,
        x: { type: spec.logX ? "log" : "linear", label: spec.xLabel, ticks: spec.xTicks,
             tickFormat: (d: number) => String(+d.toPrecision(3)) },
        y: { label: spec.yLabel },
        color: spec.colors
          ? { legend: true, domain: Object.keys(spec.colors), range: Object.values(spec.colors) }
          : { legend: true },
        marks: [
          Plot.line(spec.data, { x: spec.x, y: spec.y, stroke: spec.series }),
          Plot.dot(spec.data, { x: spec.x, y: spec.y, fill: spec.series, r: 2.5, tip: true }),
        ],
      });
    } else if (spec.kind === "regimes") {
      const lineMarks = (spec.lines ?? []).flatMap((l) => [
        Plot.line(l.data, { x: spec.x, y: spec.y, stroke: "currentColor", strokeWidth: 1.6,
                            strokeDasharray: l.dash ? "5 4" : undefined }),
        Plot.text(l.data.slice(-1), { x: spec.x, y: spec.y, text: () => l.label, dx: 8, dy: l.dy ?? 0, textAnchor: "start",
                                      fill: "currentColor", fontSize: 11 }),
      ]);
      chart = Plot.plot({
        width, height: 230 * tall, marginRight: 70, grid: true,
        x: { type: "log", label: spec.xLabel, ticks: spec.xTicks, tickFormat: (d: number) => String(+d.toPrecision(2)) },
        y: { label: spec.yLabel, domain: [-0.1, 0.7] },
        color: { legend: true, domain: Object.keys(spec.colors), range: Object.values(spec.colors) },
        marks: [
          Plot.dot(spec.data, { x: spec.x, y: spec.y, fill: spec.fill, symbol: "square", r: 7, tip: true }),
          ...lineMarks,
        ],
      });
    } else {
      chart = Plot.plot({
        width, height: 300, padding: 0,
        x: { label: spec.x, tickFormat: (d: number) => d.toFixed(1) },
        y: { label: spec.y, tickFormat: (d: number) => d.toFixed(2) },
        color: { legend: true, label: spec.label, scheme: (spec.scheme ?? "viridis") as Plot.ColorScheme, domain: spec.domain },
        marks: [Plot.cell(spec.data, { x: spec.x, y: spec.y, fill: spec.fill, inset: 0.5, tip: true })],
      });
    }
    ref.current.replaceChildren(chart);
    return () => chart.remove();
  }, [spec, wide]);
  return (
    <div ref={ref} className="plot" aria-label={caption ? String(caption) : undefined} />
  );
}
