"use client";

import { X } from "lucide-react";
import { interpolateLab } from "d3-interpolate";
import { useEffect, useRef, useState } from "react";
import { rampColors, useThemeKey, type Ramp } from "../../lib/ramp";
import { useMaximized } from "../figure/maximize";

export type PathPoint = { v: number; T: number; F: number; O: number; n: number };
export type PathGroup = {
  id: string; label: string; section: string; variable: string; by: string; note: string;
  lines: { name: string; points: PathPoint[] }[];
};

const PALETTE = ["#3A4BA6", "#2B7351", "#A3621A", "#7A3E7A", "#B5462E", "#4F8FA8", "#8A8A2E"];
const MAX_OVERLAY = PALETTE.length;

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

type PlotlyLike = {
  react: (el: HTMLElement, data: unknown[], layout: unknown, config: unknown) => Promise<unknown>;
  relayout: (el: HTMLElement, update: unknown) => Promise<unknown>;
  purge: (el: HTMLElement) => void;
};
type Mode = "pair" | "overlay";

/** Paths through the (T, F, O) morphospace, from a small hollow marker at the lowest value of the varied quantity to a
 *  large filled one at the highest. One graph (the default): several experiments overlaid in one panel, one hue per
 *  experiment, its lines shaded from light to deep along the second factor; past two experiments their labels shrink
 *  to coloured dots that expand on hover or focus. Side by side: one experiment per panel, identical true-scale axes
 *  and a shared camera; each line is one level of the group's second factor, coloured along that factor's ramp. */
export default function MorphPaths3D({ groups, initial, height = 560 }: { groups: PathGroup[]; initial: [string, string]; height?: number }) {
  const [mode, setMode] = useState<Mode>("overlay");
  const [sel, setSel] = useState<[string, string]>(initial);
  const [many, setMany] = useState<string[]>(initial);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const plotly = useRef<PlotlyLike | null>(null);
  const drawing = useRef(new WeakMap<HTMLElement, Promise<unknown>>()); // each plot's latest P.react
  const themeKey = useThemeKey();
  const maximized = useMaximized();
  const camera = useRef<unknown>({ eye: { x: 2.1, y: 2.0, z: 1.15 }, center: { x: 0, y: 0, z: -0.08 } });
  const panels: string[][] = mode === "pair" ? [[sel[0]], [sel[1]]] : [many];
  // the paper's figure export (window.__EXPORT_ALL__) prints the two panels its caption describes
  useEffect(() => { if ((window as unknown as { __EXPORT_ALL__?: boolean }).__EXPORT_ALL__) setMode("pair"); }, []);

  useEffect(() => {
    let cancelled = false;
    const nodes = refs.current.slice(0, panels.length).filter(Boolean) as HTMLDivElement[];
    import("plotly.js-dist-min").then((mod) => {
      if (cancelled) return;
      const P = ((mod as { default?: unknown }).default ?? mod) as PlotlyLike;
      plotly.current = P;
      const ink = cssVar("--ink", "#17201C");
      const muted = cssVar("--muted", "#55625B");
      const rule = cssVar("--rule", "#D3DBD6");
      const surface = cssVar("--surface", "#FFFFFF");
      const axis = (title: string, range: [number, number]) => ({
        title: { text: title, font: { color: ink } }, range, gridcolor: rule, zerolinecolor: muted,
        tickfont: { color: muted }, backgroundcolor: surface, showbackground: true,
      });
      const overlay = mode === "overlay";
      let syncing = false;
      panels.forEach((ids, i) => {
        const el = nodes[i];
        const gs = ids.map((id) => groups.find((x) => x.id === id)).filter(Boolean) as PathGroup[];
        if (!el) return;
        const traces = gs.flatMap((g, gi) => {
          let colors: string[];
          if (overlay) {
            // one hue per experiment; its lines shaded light to deep along the second factor
            const shade = interpolateLab(surface, PALETTE[gi % PALETTE.length]);
            colors = g.lines.map((_, j) => shade(g.lines.length === 1 ? 1 : 0.4 + (0.6 * j) / (g.lines.length - 1)));
          } else {
            // lines along a continuous factor (κ, noise, group size) take that factor's ramp, light to deep
            const ramp: Ramp | null = g.by.includes("ν") ? "noise" : g.by.includes("κ") ? "kappa" : g.by === "N" ? "size" : null;
            colors = ramp ? rampColors(ramp, g.lines.length) : g.lines.map((_, j) => PALETTE[j % PALETTE.length]);
          }
          return g.lines.map((ln, j) => {
            const color = colors[j];
            const k = ln.points.length;
            return {
              type: "scatter3d", mode: "lines+markers", name: ln.name,
              legendgroup: g.id, ...(overlay ? { legendgrouptitle: { text: g.label, font: { color: ink, size: 11 } } } : {}),
              x: ln.points.map((p) => p.T), y: ln.points.map((p) => p.F), z: ln.points.map((p) => p.O),
              customdata: ln.points.map((p) => [p.v, p.n]),
              hovertemplate: `${g.variable} = %{customdata[0]}<br>T %{x:.2f} · F %{y:.2f} · O %{z:.2f}`
                + `<br>%{customdata[1]} runs<extra>${overlay ? `${g.label}<br>` : ""}${ln.name}</extra>`,
              line: { color, width: 4 },
              marker: {
                color: ln.points.map((_, m) => (m === 0 ? surface : color)),
                line: { color, width: 2 },
                size: ln.points.map((_, m) => 3 + (6 * m) / Math.max(1, k - 1)),
              },
            };
          });
        });
        const narrow = el.clientWidth < 680;
        const side = overlay && !narrow; // legend beside the cube when there is room
        const layout = {
          paper_bgcolor: "rgba(0,0,0,0)", margin: { l: 0, r: 0, t: 10, b: side ? 10 : 60 },
          height: maximized ? Math.max(height, window.innerHeight - 230) : overlay ? height + 80 : height,
          legend: side
            ? { font: { color: ink, size: 11 }, orientation: "v", x: 1, xanchor: "right", y: 1, groupclick: "toggleitem", tracegroupgap: 10 }
            : { font: { color: ink }, orientation: "h", x: 0, y: 0, yanchor: "top", groupclick: "toggleitem",
                title: { text: overlay ? "" : `${gs[0]?.by ?? ""}: `, font: { color: muted } } },
          hoverlabel: { bgcolor: surface, bordercolor: rule, font: { color: ink } },
          uirevision: "keep",
          scene: {
            ...(side ? { domain: { x: [0, 0.74], y: [0, 1] } } : {}),
            xaxis: axis("treeness T", [-1, 1]), yaxis: axis("feedforwardness F", [0, 1]),
            zaxis: axis("orderability O", [0, 1]),
            aspectmode: "manual", aspectratio: { x: 2, y: 1, z: 1 },
            camera: camera.current,
          },
        };
        const drawn = P.react(el, traces, layout, { displaylogo: false, responsive: true, displayModeBar: "hover" });
        drawing.current.set(el, drawn);
        drawn.then(() => {
          const node = el as unknown as { on: (ev: string, cb: (e: Record<string, unknown>) => void) => void;
                                          removeAllListeners?: (ev: string) => void };
          node.removeAllListeners?.("plotly_relayout");
          node.on("plotly_relayout", (e) => {
            const cam = e["scene.camera"];
            if (!cam || syncing) return;
            camera.current = cam;
            syncing = true;
            Promise.all(nodes.filter((n) => n !== el).map((n) => P.relayout(n, { "scene.camera": cam })))
              .finally(() => { syncing = false; });
          });
        });
      });
    });
    return () => {
      cancelled = true;
      // plots whose element left the page with a layout switch; a still-connected one (Strict Mode's rehearsal
      // unmount, or a redraw with new settings) is kept, and P.react updates it in place
      // purged only once its draw has finished and a frame has passed: purging a 3D scene that is still being set up
      // (a quick switch right after load) makes Plotly's queued redraw hit a released WebGL context
      const P = plotly.current;
      if (P) nodes.forEach((n) => {
        if (n.isConnected) return;
        const done = drawing.current.get(n) ?? Promise.resolve();
        done.catch(() => {}).then(() => requestAnimationFrame(() => P.purge(n)));
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- panels is derived from mode, sel and many
  }, [groups, mode, sel, many, height, themeKey, maximized]);

  useEffect(() => {
    const nodes = refs.current;
    return () => {
      import("plotly.js-dist-min").then((mod) => {
        const P = ((mod as { default?: unknown }).default ?? mod) as PlotlyLike;
        nodes.forEach((n) => n && P.purge(n));
      });
    };
  }, []);

  const sections = Array.from(new Set(groups.map((g) => g.section)));
  const options = (exclude: string[] = []) => sections.map((sec) => (
    <optgroup key={sec} label={sec}>
      {groups.filter((x) => x.section === sec && !exclude.includes(x.id)).map((x) => (
        <option key={x.id} value={x.id}>{x.label}</option>
      ))}
    </optgroup>
  ));
  const surfaceColor = (gi: number) => PALETTE[gi % PALETTE.length];
  const setRef = (i: number) => (el: HTMLDivElement | null) => { refs.current[i] = el; };

  return (
    <div>
      <div className="mp-head">
        <div className="controls mp-chips">
          {mode === "overlay" && many.map((id, gi) => {
            const g = groups.find((x) => x.id === id);
            const chip = (
              <>
                <span className="mp-swatch" aria-hidden /><span className="mp-label">{g?.label}</span>
                <button type="button" className="mp-x" onClick={() => setMany((m) => m.filter((x) => x !== id))}
                  disabled={many.length === 1} aria-label={`Remove ${g?.label}`}><X size={13} /></button>
              </>
            );
            const style = { ["--c" as string]: surfaceColor(gi) };
            // past two experiments: a dot that expands into the full chip, drawn over its neighbours so nothing reflows
            return many.length > 2 ? (
              <span key={id} className="mp-dot" style={style} tabIndex={0} aria-label={g?.label} title={g?.label}>
                <span className="mp-swatch" aria-hidden />
                <span className="mp-chip mp-pop">{chip}</span>
              </span>
            ) : (
              <span key={id} className="mp-chip" style={style}>{chip}</span>
            );
          })}
          {mode === "overlay" && many.length < MAX_OVERLAY && (
            <label>
              add
              <select value="" onChange={(e) => { const v = e.target.value; if (v) setMany((m) => [...m, v]); }}>
                <option value="">choose an experiment…</option>
                {options(many)}
              </select>
            </label>
          )}
        </div>
        <div className="mp-mode" role="radiogroup" aria-label="Layout">
          {([["overlay", "One graph"], ["pair", "Side by side"]] as const).map(([m, label]) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? "mp-seg active" : "mp-seg"}
              onClick={() => setMode(m)}>{label}</button>
          ))}
        </div>
      </div>
      {mode === "pair" ? (
        <div className="grid2">
          {sel.map((id, i) => {
            const g = groups.find((x) => x.id === id);
            return (
              <div key={i}>
                <div className="controls">
                  <label>
                    {i === 0 ? "left" : "right"}
                    <select value={id} onChange={(e) => setSel((s) => (i === 0 ? [e.target.value, s[1]] : [s[0], e.target.value]))}>
                      {options()}
                    </select>
                  </label>
                </div>
                <div className="plot" ref={setRef(i)} aria-label={g?.label} />
                {g?.note && <div className="caption">{g.note}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="plot" ref={setRef(0)} aria-label="Selected experiments in one morphospace" />
          <div className="caption">
            One hue per experiment; within it, lighter to deeper follows the second factor. Click a legend entry to hide
            that line, or double-click to show it alone.
          </div>
        </div>
      )}
    </div>
  );
}
