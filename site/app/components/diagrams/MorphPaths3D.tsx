"use client";

import { useEffect, useRef, useState } from "react";
import { rampColors, useThemeKey, type Ramp } from "../../lib/ramp";

export type PathPoint = { v: number; T: number; F: number; O: number; n: number };
export type PathGroup = {
  id: string; label: string; section: string; variable: string; by: string; note: string;
  lines: { name: string; points: PathPoint[] }[];
};

const PALETTE = ["#3A4BA6", "#2B7351", "#A3621A", "#7A3E7A", "#B5462E", "#4F8FA8", "#8A8A2E"];

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

/** Paths through the (T, F, O) morphospace, one panel per selector, identical true-scale axes and a shared camera.
 *  Each line is one level of the group's second factor; points follow the varied quantity in order, from a small
 *  hollow start marker to a large filled end marker. */
export default function MorphPaths3D({ groups, initial, height = 560 }: { groups: PathGroup[]; initial: [string, string]; height?: number }) {
  const [sel, setSel] = useState<[string, string]>(initial);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const themeKey = useThemeKey();
  const camera = useRef<unknown>({ eye: { x: 2.1, y: 2.0, z: 1.15 }, center: { x: 0, y: 0, z: -0.08 } });

  useEffect(() => {
    let cancelled = false;
    const nodes = refs.current.filter(Boolean) as HTMLDivElement[];
    import("plotly.js-dist-min").then((mod) => {
      if (cancelled) return;
      const P = ((mod as { default?: unknown }).default ?? mod) as PlotlyLike;
      const ink = cssVar("--ink", "#17201C");
      const muted = cssVar("--muted", "#55625B");
      const rule = cssVar("--rule", "#D3DBD6");
      const surface = cssVar("--surface", "#FFFFFF");
      const axis = (title: string, range: [number, number]) => ({
        title: { text: title, font: { color: ink } }, range, gridcolor: rule, zerolinecolor: muted,
        tickfont: { color: muted }, backgroundcolor: surface, showbackground: true,
      });
      let syncing = false;
      sel.forEach((id, i) => {
        const el = nodes[i];
        const g = groups.find((x) => x.id === id);
        if (!el || !g) return;
        // lines along a continuous factor (κ, noise, group size) take that factor's ramp, light to deep
        const ramp: Ramp | null = g.by.includes("ν") ? "noise" : g.by.includes("κ") ? "kappa" : g.by === "N" ? "size" : null;
        const ramped = ramp ? rampColors(ramp, g.lines.length) : null;
        const traces = g.lines.map((ln, j) => {
          const color = ramped ? ramped[j] : PALETTE[j % PALETTE.length];
          const k = ln.points.length;
          return {
            type: "scatter3d", mode: "lines+markers", name: ln.name,
            x: ln.points.map((p) => p.T), y: ln.points.map((p) => p.F), z: ln.points.map((p) => p.O),
            customdata: ln.points.map((p) => [p.v, p.n]),
            hovertemplate: `${g.variable} = %{customdata[0]}<br>T %{x:.2f} · F %{y:.2f} · O %{z:.2f}`
              + `<br>%{customdata[1]} runs<extra>${ln.name}</extra>`,
            line: { color, width: 4 },
            marker: {
              color: ln.points.map((_, m) => (m === 0 ? surface : color)),
              line: { color, width: 2 },
              size: ln.points.map((_, m) => 3 + (6 * m) / Math.max(1, k - 1)),
            },
          };
        });
        const layout = {
          paper_bgcolor: "rgba(0,0,0,0)", margin: { l: 0, r: 0, t: 10, b: 60 }, height,
          legend: { font: { color: ink }, orientation: "h", x: 0, y: 0, yanchor: "top",
                    title: { text: g.by + ": ", font: { color: muted } } },
          hoverlabel: { bgcolor: surface, bordercolor: rule, font: { color: ink } },
          uirevision: "keep",
          scene: {
            xaxis: axis("treeness T", [-1, 1]), yaxis: axis("feedforwardness F", [0, 1]),
            zaxis: axis("orderability O", [0, 1]),
            aspectmode: "manual", aspectratio: { x: 2, y: 1, z: 1 },
            camera: camera.current,
          },
        };
        P.react(el, traces, layout, { displaylogo: false, responsive: true, displayModeBar: "hover" }).then(() => {
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
    return () => { cancelled = true; };
  }, [groups, sel, height, themeKey]);

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
  return (
    <div>
      <div className="grid2">
        {sel.map((id, i) => {
          const g = groups.find((x) => x.id === id);
          return (
            <div key={i}>
              <div className="controls">
                <label>
                  {i === 0 ? "left" : "right"}
                  <select value={id} onChange={(e) => setSel((s) => (i === 0 ? [e.target.value, s[1]] : [s[0], e.target.value]))}>
                    {sections.map((sec) => (
                      <optgroup key={sec} label={sec}>
                        {groups.filter((x) => x.section === sec).map((x) => (
                          <option key={x.id} value={x.id}>{x.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </div>
              <div className="plot" ref={(el) => { refs.current[i] = el; }} aria-label={g?.label} />
              {g?.note && <div className="caption">{g.note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
