"use client";
/** Colours for a series along a continuous variable: n samples of the theme's ramp (--ramp-<name> in tokens.css),
 *  interpolated in Lab so steps look even. Read at render time, so they follow the theme. */
import { interpolateLab, piecewise } from "d3-interpolate";
import { useEffect, useState } from "react";

export type Ramp = "noise" | "size" | "kappa";

export function rampColors(name: Ramp, n: number): string[] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--ramp-${name}`);
  const stops = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (stops.length < 2) return Array(n).fill("currentColor");
  const f = piecewise(interpolateLab, stops);
  return Array.from({ length: n }, (_, i) => f(n === 1 ? 1 : i / (n - 1)));
}

/** Series labels in the order of the number they contain ("N = 16" before "N = 128"), others alphabetically. */
export function naturalOrder(labels: string[]): string[] {
  const num = (s: string) => { const m = s.match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
  return [...labels].sort((a, b) => {
    const x = num(a), y = num(b);
    return Number.isNaN(x) || Number.isNaN(y) ? a.localeCompare(b) : x - y;
  });
}

/** Changes whenever the theme does (explicit choice or the system setting), so charts can redraw their colours. */
export function useThemeKey(): number {
  const [k, setK] = useState(0);
  useEffect(() => {
    const bump = () => setK((v) => v + 1);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", bump);
    return () => { mo.disconnect(); mq.removeEventListener("change", bump); };
  }, []);
  return k;
}
