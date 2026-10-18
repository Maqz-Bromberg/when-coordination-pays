"use client";
/** A regime map whose cells preview the network they produced. Hover a square (click to hold it) to see that run's
 *  attention network beside the map; the slider and play button step through how it formed, from the random start
 *  to round 3000, at log-spaced rounds. The previews are the seed-0 runs of each cell: the final network from
 *  data/site/e5_structures.json, the evolution from data/site/e5_evolution/<schedule>.json, fetched when the map
 *  scrolls into view. */
import * as Plot from "@observablehq/plot";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { withBase } from "../../lib/base";
import { useThemeKey } from "../../lib/ramp";

type Cell = { T: number; kappa: number; regime: string; tracking: number; commitment: number };
type Net = { kappa: number; T: number; source: number; links: number[][] };
type Frame = { source: number; tracking: number; links: number[][] };
type Evolution = { n: number; frames: number[]; cells: { kappa: number; T: number; frames: Frame[] }[] };
type Line = { data: { T: number; kappa: number }[]; label: string; dash?: boolean; dy?: number };

const LABEL: Record<string, string> = { distributed: "spread out", hierarchy: "coordinated hierarchy", "over-betting": "lock-in on a stale hub" };
const STEP_MS = 520;
const sameCell = (a: { kappa: number; T: number }, b: { kappa: number; T: number }) => a.kappa === b.kappa && Math.abs(a.T - b.T) < 1e-9;

/** [i, k, w] links from a frame's compact form (per listener i: k1, w1, k2, w2, …). */
function expand(frame: Frame): number[][] {
  return frame.links.flatMap((row, i) => Array.from({ length: row.length / 2 }, (_, j) => [i, row[2 * j], row[2 * j + 1]]));
}

/** Node positions held fixed for a cell across all frames: a ring with the final source at the top, and the final
 *  hub in the centre when it holds a large share, so the hub can be seen forming in place. */
function layout(final: { links: number[][]; source: number }, n: number, S: number) {
  const received = Array(n).fill(0);
  final.links.forEach(([, k, w]) => { received[k] += w; });
  const hub = received.indexOf(Math.max(...received));
  const central = received[hub] / (n - 1) > 0.25;
  const c = S / 2, R = S * 0.42;
  const ring = Array.from({ length: n }, (_, i) => i).filter((i) => !(central && i === hub));
  const start = Math.max(0, ring.indexOf(final.source));
  const pos: [number, number][] = Array(n);
  ring.forEach((node, j) => {
    const a = -Math.PI / 2 + (2 * Math.PI * ((j - start + ring.length) % ring.length)) / ring.length;
    pos[node] = [c + R * Math.cos(a), c + R * Math.sin(a)];
  });
  if (central) pos[hub] = [c, c];
  return pos;
}

function NetPreview({ links, source, pos, n, note }: { links: number[][]; source: number; pos: [number, number][]; n: number; note: string }) {
  const received = Array(n).fill(0);
  links.forEach(([, k, w]) => { received[k] += w; });
  const hub = received.indexOf(Math.max(...received));
  const strongHub = received[hub] / (n - 1) > 0.25;
  const sorted = [...links].sort((a, b) => a[2] - b[2]);
  return (
    <svg viewBox="0 0 240 240" className="rm-net" role="img" aria-label="Attention network of this run">
      {sorted.map(([i, k, w], j) => (
        <line key={j} x1={pos[k][0]} y1={pos[k][1]} x2={pos[i][0]} y2={pos[i][1]}
          className={k === source ? "rm-link rm-link-src" : "rm-link"} strokeWidth={0.4 + 2.6 * w} strokeOpacity={0.15 + 0.75 * w} />
      ))}
      {Array.from({ length: n }, (_, k) => (
        <circle key={k} cx={pos[k][0]} cy={pos[k][1]} r={2.4 + 8 * Math.sqrt(received[k] / (n - 1))}
          className={k === source ? "rm-node rm-src" : k === hub && strongHub ? "rm-node rm-hub" : "rm-node"} />
      ))}
      <title>{note}</title>
    </svg>
  );
}

export default function RegimeMap({ cells, nets, lines, colors, xTicks, xLabel, n, minW, evolution }: {
  cells: Cell[]; nets: Net[]; lines: Line[]; colors: Record<string, string>; xTicks: number[]; xLabel: string; n: number;
  minW: number; evolution: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const themeKey = useThemeKey();
  const initial = useMemo(() => {
    const h = cells.filter((c) => c.regime === "hierarchy");
    return h.find((c) => c.kappa === 0.2) ?? h[0] ?? cells[0];
  }, [cells]);
  const [sel, setSel] = useState<Cell>(initial);
  const [hover, setHover] = useState(false);
  const [evo, setEvo] = useState<Evolution | null>(null);
  const [failed, setFailed] = useState(false);
  const [frame, setFrame] = useState<number | null>(null); // null: the final network
  const [playing, setPlaying] = useState(false);

  // fetch the evolution once the map comes near the viewport
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let done = false;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting || done) return;
      done = true;
      io.disconnect();
      fetch(withBase(`/data/e5_evolution/${evolution}.json`)).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(setEvo).catch(() => setFailed(true));
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [evolution]);

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
      color: { legend: true, domain: Object.keys(colors), range: Object.values(colors), tickFormat: (d: string) => LABEL[d] ?? d },
      marks: [
        Plot.dot(cells, { x: "T", y: "kappa", fill: "regime", symbol: "square", r: 8 }),
        // Plot's pointer: hover selects, a click holds the selection until the next click
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

  // playback: step through the frames, then stop on the last one
  useEffect(() => {
    if (!playing || !evo) return;
    const last = evo.frames.length - 1;
    const id = setInterval(() => {
      setFrame((f) => {
        const next = (f ?? -1) + 1;
        if (next >= last) { setPlaying(false); return last; }
        return next;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [playing, evo]);

  const final = nets.find((x) => sameCell(x, sel));
  const evCell = evo?.cells.find((x) => sameCell(x, sel));
  const lastIdx = evo ? evo.frames.length - 1 : 0;
  const idx = frame ?? lastIdx;
  const shown = evCell ? evCell.frames[idx] : null;
  const S = 240;
  const pos = useMemo(() => {
    if (evCell) { const f = evCell.frames[evCell.frames.length - 1]; return layout({ links: expand(f), source: f.source }, n, S); }
    return final ? layout(final, n, S) : null;
  }, [evCell, final, n]);

  const links = shown ? expand(shown) : final?.links ?? [];
  const source = shown ? shown.source : final?.source ?? 0;
  const round = evo ? evo.frames[idx] : 3000;
  const play = () => {
    if (!evo) return;
    if (idx >= lastIdx) setFrame(0);
    setPlaying((p) => !p || idx >= lastIdx);
  };

  return (
    <div className="rm" ref={root}>
      <div ref={ref} className="plot rm-map" />
      <aside className="rm-panel" data-export-skip aria-live="polite">
        <div className="rm-kicker">{hover ? "hovered cell · click to hold" : "example cell · hover a square, click to hold"}</div>
        <div className="rm-regime" style={{ color: colors[sel.regime] }}>{LABEL[sel.regime] ?? sel.regime}</div>
        <div className="rm-params">κ = {sel.kappa} · T = {+sel.T.toPrecision(2)}</div>
        {pos ? <NetPreview links={links} source={source} pos={pos} n={n}
          note={shown ? "Each agent's three strongest links (at least 3% of its attention)" : `Links holding at least ${minW} of a listener's attention`} />
          : <div className="rm-net" />}
        <div className="rm-time">
          <button type="button" className="icon-btn" onClick={play} disabled={!evo} aria-label={playing ? "Pause" : "Play the formation of this network"}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <input type="range" min={0} max={lastIdx || 17} step={1} value={evo ? idx : 17} disabled={!evo}
            onChange={(e) => { setPlaying(false); setFrame(+e.target.value); }} aria-label="Round of the simulation"
            aria-valuetext={`round ${round}`} />
          <button type="button" className="icon-btn" onClick={() => { setPlaying(false); setFrame(null); }} disabled={!evo || frame === null}
            aria-label="Back to the final network"><RotateCcw size={14} /></button>
        </div>
        <div className="rm-readout">{failed ? "evolution unavailable" : !evo ? "loading the evolution…" : `round ${round} of ${evo.frames[lastIdx]}`}</div>
        <div className="rm-stats">
          {shown ? <>tracking now {shown.tracking.toFixed(2)}</> : <>tracking {sel.tracking.toFixed(2)} · commitment {sel.commitment.toFixed(2)}</>}
        </div>
        <div className="rm-legend"><i className="rm-dot rm-src" /> source now <i className="rm-dot rm-hub" /> hub</div>
      </aside>
    </div>
  );
}
