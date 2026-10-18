"use client";
/** A regime map whose cells preview the network they produced: hover (or tap) a square to see the final attention
 *  network of that run beside the map. The preview is the seed-0 run of the cell (data/site/e5_structures.json). */
import * as Plot from "@observablehq/plot";
import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeKey } from "../../lib/ramp";

type Cell = { T: number; kappa: number; regime: string; tracking: number; commitment: number };
type Net = { kappa: number; T: number; source: number; links: number[][] };
type Line = { data: { T: number; kappa: number }[]; label: string; dash?: boolean; dy?: number };

const LABEL: Record<string, string> = { distributed: "spread out", hierarchy: "coordinated hierarchy", "over-betting": "lock-in on a stale hub" };

function NetPreview({ net, n, minW }: { net: Net; n: number; minW: number }) {
  const received = Array(n).fill(0);
  net.links.forEach(([, k, w]) => { received[k] += w; });
  const hub = received.indexOf(Math.max(...received));
  const central = received[hub] / (n - 1) > 0.25;
  const S = 220, c = S / 2, R = 92;
  // ring in index order, rotated so the true source sits at the top; a strong hub moves to the centre
  const ring = Array.from({ length: n }, (_, i) => i).filter((i) => !(central && i === hub));
  const start = ring.indexOf(net.source) >= 0 ? ring.indexOf(net.source) : 0;
  const pos: Record<number, [number, number]> = {};
  ring.forEach((node, j) => {
    const a = -Math.PI / 2 + (2 * Math.PI * ((j - start + ring.length) % ring.length)) / ring.length;
    pos[node] = [c + R * Math.cos(a), c + R * Math.sin(a)];
  });
  if (central) pos[hub] = [c, c];
  const links = [...net.links].sort((a, b) => a[2] - b[2]);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="rm-net" role="img" aria-label="Final attention network of this run">
      {links.map(([i, k, w], j) => (
        <line key={j} x1={pos[k][0]} y1={pos[k][1]} x2={pos[i][0]} y2={pos[i][1]}
          className={k === net.source ? "rm-link rm-link-src" : "rm-link"} strokeWidth={0.4 + 2.6 * w} strokeOpacity={0.15 + 0.75 * w} />
      ))}
      {Array.from({ length: n }, (_, k) => (
        <circle key={k} cx={pos[k][0]} cy={pos[k][1]} r={2.4 + 8 * Math.sqrt(received[k] / (n - 1))}
          className={k === net.source ? "rm-node rm-src" : k === hub && central ? "rm-node rm-hub" : "rm-node"} />
      ))}
      <title>{`Links holding at least ${minW} of a listener's attention`}</title>
    </svg>
  );
}

export default function RegimeMap({ cells, nets, lines, colors, xTicks, xLabel, n, minW }: {
  cells: Cell[]; nets: Net[]; lines: Line[]; colors: Record<string, string>; xTicks: number[]; xLabel: string; n: number; minW: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const themeKey = useThemeKey();
  const initial = useMemo(() => {
    const h = cells.filter((c) => c.regime === "hierarchy");
    return (h.find((c) => c.kappa === 0.2) ?? h[0] ?? cells[0]);
  }, [cells]);
  const [sel, setSel] = useState<Cell>(initial);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const width = Math.min(ref.current.clientWidth || 640, 820);
    const lineMarks = lines.flatMap((l) => [
      Plot.line(l.data, { x: "T", y: "kappa", stroke: "currentColor", strokeWidth: 1.6, strokeDasharray: l.dash ? "5 4" : undefined }),
      Plot.text(l.data.slice(-1), { x: "T", y: "kappa", text: () => l.label, dx: 8, dy: l.dy ?? 0, textAnchor: "start", fill: "currentColor", fontSize: 11 }),
    ]);
    const chart = Plot.plot({
      width, height: 280, marginRight: 60, grid: true,
      x: { type: "log", label: xLabel, ticks: xTicks, tickFormat: (d: number) => String(+d.toPrecision(2)) },
      y: { label: "κ", domain: [-0.1, 0.7] },
      color: { legend: true, domain: Object.keys(colors), range: Object.values(colors),
               tickFormat: (d: string) => LABEL[d] ?? d },
      marks: [
        Plot.dot(cells, { x: "T", y: "kappa", fill: "regime", symbol: "square", r: 8 }),
        Plot.dot(cells, Plot.pointer({ x: "T", y: "kappa", symbol: "square", r: 10, stroke: "currentColor", strokeWidth: 2, fill: "none" })),
        ...lineMarks,
      ],
    });
    const onInput = () => {
      const v = (chart as unknown as { value: Cell | null }).value;
      if (v) { setSel(v); setHover(true); } else setHover(false);
    };
    chart.addEventListener("input", onInput);
    ref.current.replaceChildren(chart);
    return () => { chart.removeEventListener("input", onInput); chart.remove(); };
  }, [cells, lines, colors, xTicks, xLabel, themeKey]);

  const net = nets.find((x) => x.kappa === sel.kappa && Math.abs(x.T - sel.T) < 1e-9);
  return (
    <div className="rm">
      <div ref={ref} className="plot rm-map" />
      <aside className="rm-panel" data-export-skip aria-live="polite">
        <div className="rm-kicker">{hover ? "hovered cell" : "example cell · hover or tap the map"}</div>
        <div className="rm-regime" style={{ color: colors[sel.regime] }}>{LABEL[sel.regime] ?? sel.regime}</div>
        <div className="rm-params">κ = {sel.kappa} · T = {+sel.T.toPrecision(2)}</div>
        {net ? <NetPreview net={net} n={n} minW={minW} /> : <div className="rm-net" />}
        <div className="rm-stats">tracking {sel.tracking.toFixed(2)} · commitment {sel.commitment.toFixed(2)}</div>
        <div className="rm-legend"><i className="rm-dot rm-src" /> source at the end <i className="rm-dot rm-hub" /> hub</div>
      </aside>
    </div>
  );
}
