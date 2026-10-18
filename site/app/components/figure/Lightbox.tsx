"use client";
// Adapted from remystifying-science app/articles/registry/references.tsx (EnlargedGraphicLightbox,
// EnlargedGraphicModal) @ f578288.
//
// Changes from the source: the figure is the captured markup of an inline SVG/HTML figure, not an <img src>, so it
// is scaled with a CSS transform on a box of the figure's natural size (vector text stays sharp at any zoom); the
// download is that markup with computed styles inlined; no multi-view slider (our figures are single views); MUI
// Modal is replaced by a dialog that locks page scroll, closes on Escape, and returns focus on close. "Live" figures
// (the WebGL 3D plot) are re-rendered full size in the frame instead, and keep their own zoom.
//
// Gesture spec (readme §The enlarged viewer): default fits the whole figure, scaling up; Shrink resets to fit; the
// one fill-axis button that differs from fit fills that axis and scrolls the other; zoom ± floored at fit and
// capped at ZOOM_MAX; a click zooms in around the cursor, ctrl/⌘-click zooms out; shift-press is a pan from the
// first pixel; a press becomes a pan past DRAG_SLOP or HOLD_MS; wheel scrolls natively; the minimap appears only
// once something is off-screen.

import { Download, Shrink, UnfoldHorizontal, UnfoldVertical, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { closeEnlarged, useEnlarged, type Enlarged } from "./lightbox-store";

const LIGHTBOX_FILL = 0.88;
const ZOOM_STEP = 1.6;
const ZOOM_MAX = 8;
const MINIMAP_W = 168;
const DRAG_SLOP = 5;
const HOLD_MS = 200;
type FitMode = "contain" | "width" | "height" | "free";

function IconBtn({ onClick, label, active = false, children }: { onClick: () => void; label: string; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" className={active ? "lb-btn active" : "lb-btn"} onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function Scaled({ markup, w, h, scale }: { markup: string; w: number; h: number; scale: number }) {
  return (
    <div style={{ width: w * scale, height: h * scale, position: "relative", flexShrink: 0, margin: "auto" }}>
      <div className="lb-figure" style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "0 0", position: "absolute", left: 0, top: 0 }}
        dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  );
}

function MarkupViewer({ e }: { e: Extract<Enlarged, { kind: "markup" }> }) {
  const nat = { w: e.w, h: e.h };
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState(() => ({ w: typeof window === "undefined" ? 0 : window.innerWidth * LIGHTBOX_FILL,
                                           h: typeof window === "undefined" ? 0 : window.innerHeight * LIGHTBOX_FILL }));
  const [mode, setMode] = useState<FitMode>("contain");
  const [freeScale, setFreeScale] = useState(1);
  const [view, setView] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [mods, setMods] = useState({ grab: false, out: false });
  const [panning, setPanning] = useState(false);
  const anchor = useRef<{ cx: number; cy: number; prev: number } | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: number; held: boolean } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onResize = () => setBox({ w: window.innerWidth * LIGHTBOX_FILL, h: window.innerHeight * LIGHTBOX_FILL });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Shift turns a press into a grab and ctrl/cmd inverts the click, so the cursor must say so before the press.
  // `blur` matters: a modifier released outside the window never fires keyup here.
  useEffect(() => {
    const sync = (ev: KeyboardEvent) => setMods({ grab: ev.shiftKey, out: ev.ctrlKey || ev.metaKey });
    const clear = () => setMods({ grab: false, out: false });
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", clear);
    return () => { window.removeEventListener("keydown", sync); window.removeEventListener("keyup", sync); window.removeEventListener("blur", clear); };
  }, []);

  const fits = { contain: Math.min(box.w / nat.w, box.h / nat.h), width: box.w / nat.w, height: box.h / nat.h };
  const scale = mode === "free" ? freeScale : fits[mode];
  const imgW = nat.w * scale, imgH = nat.h * scale;
  const scrollable = imgW > box.w + 1 || imgH > box.h + 1;
  // `contain` always equals one of the two directional fits; only the larger one does something new.
  const overflowAxis: "width" | "height" | null = Math.abs(fits.width - fits.height) < 1e-9 ? null : fits.width > fits.height ? "width" : "height";

  const syncView = useCallback(() => {
    const el = boxRef.current;
    if (el) setView({ x: el.scrollLeft, y: el.scrollTop, w: el.clientWidth, h: el.clientHeight });
  }, []);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const a = anchor.current;
    if (a && a.prev > 0) {
      const ratio = scale / a.prev;
      el.scrollLeft = (el.scrollLeft + a.cx) * ratio - a.cx;
      el.scrollTop = (el.scrollTop + a.cy) * ratio - a.cy;
      anchor.current = null;
    }
    syncView();
  }, [scale, imgW, imgH, syncView]);

  const zoomTo = (next: number, cx?: number, cy?: number) => {
    const clamped = Math.min(Math.max(next, fits.contain), ZOOM_MAX);
    const el = boxRef.current;
    anchor.current = { cx: cx ?? (el ? el.clientWidth / 2 : 0), cy: cy ?? (el ? el.clientHeight / 2 : 0), prev: scale };
    setFreeScale(clamped);
    setMode("free");
  };

  const endHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = null; setPanning(false); };
  useEffect(() => endHold, []);

  const onPointerDown = (ev: React.PointerEvent) => {
    const el = boxRef.current!;
    drag.current = { x: ev.clientX, y: ev.clientY, left: el.scrollLeft, top: el.scrollTop, moved: 0, held: false };
    el.setPointerCapture(ev.pointerId);
    if (!scrollable) return;
    if (ev.shiftKey) { drag.current.held = true; setPanning(true); return; }
    holdTimer.current = setTimeout(() => { if (drag.current) drag.current.held = true; setPanning(true); }, HOLD_MS);
  };
  const onPointerMove = (ev: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
    d.moved = Math.max(d.moved, Math.abs(dx) + Math.abs(dy));
    if (!scrollable) return;
    if (d.moved > DRAG_SLOP && !panning) { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = null; setPanning(true); }
    const el = boxRef.current!;
    el.scrollLeft = d.left - dx;
    el.scrollTop = d.top - dy;
    syncView();
  };
  const onPointerUp = (ev: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    endHold();
    // Only a short, still press is a click: zoom in, or out with ctrl/cmd (read off the event, not the tracked key).
    if (d && (d.moved > DRAG_SLOP || d.held)) return;
    const r = boxRef.current!.getBoundingClientRect();
    zoomTo(ev.ctrlKey || ev.metaKey ? scale / ZOOM_STEP : scale * ZOOM_STEP, ev.clientX - r.left, ev.clientY - r.top);
  };

  const mapH = (MINIMAP_W * nat.h) / nat.w;
  const jumpTo = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    const el = boxRef.current;
    if (!el) return;
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    el.scrollLeft = ((ev.clientX - r.left) / MINIMAP_W) * imgW - el.clientWidth / 2;
    el.scrollTop = ((ev.clientY - r.top) / mapH) * imgH - el.clientHeight / 2;
    syncView();
  };
  const atContain = Math.abs(scale - fits.contain) < 1e-6;

  const download = () => {
    const blob = new Blob([e.download], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "figure"}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <div className="lb-bar" onClick={(ev) => ev.stopPropagation()}>
        <span className="lb-title">{e.title}</span>
        {overflowAxis === "width" && <IconBtn onClick={() => setMode("width")} label="Fill the width, scroll down" active={mode === "width"}><UnfoldHorizontal size={15} /></IconBtn>}
        {overflowAxis === "height" && <IconBtn onClick={() => setMode("height")} label="Fill the height, scroll across" active={mode === "height"}><UnfoldVertical size={15} /></IconBtn>}
        <IconBtn onClick={() => setMode("contain")} label="Fit whole figure" active={mode === "contain"}><Shrink size={15} /></IconBtn>
        <span className="lb-sep" />
        <IconBtn onClick={() => zoomTo(scale / ZOOM_STEP)} label="Zoom out"><ZoomOut size={15} /></IconBtn>
        <span className="lb-readout">{Math.round(scale * 100)}%</span>
        <IconBtn onClick={() => zoomTo(scale * ZOOM_STEP)} label="Zoom in"><ZoomIn size={15} /></IconBtn>
        <span className="lb-sep" />
        <IconBtn onClick={download} label="Download as SVG"><Download size={15} /></IconBtn>
        <IconBtn onClick={closeEnlarged} label="Close enlarged view"><X size={15} /></IconBtn>
      </div>
      <div ref={boxRef} className="lb-frame" onClick={(ev) => ev.stopPropagation()} onScroll={syncView}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; }}
        style={{
          width: box.w, height: box.h, overflow: scrollable ? "auto" : "hidden",
          // Centring is margin:auto on the child, not align/justify here: a flex item larger than its container
          // and centred by align-items has its leading overflow clipped and unreachable.
          display: "flex",
          cursor: panning ? "grabbing" : mods.grab ? (scrollable ? "grab" : "default")
            : mods.out ? (atContain ? "default" : "zoom-out") : scale >= ZOOM_MAX ? "default" : "zoom-in",
          touchAction: "none",
        }}>
        <Scaled markup={e.markup} w={nat.w} h={nat.h} scale={scale} />
      </div>
      {scrollable && (
        <div className="lb-minimap" onClick={jumpTo} style={{ width: MINIMAP_W, height: mapH }}>
          <Scaled markup={e.markup} w={nat.w} h={nat.h} scale={MINIMAP_W / nat.w} />
          <span style={{ position: "absolute", left: `${(view.x / imgW) * 100}%`, top: `${(view.y / imgH) * 100}%`,
                         width: `${Math.min(1, view.w / imgW) * 100}%`, height: `${Math.min(1, view.h / imgH) * 100}%` }} className="lb-view" />
        </div>
      )}
      {!atContain && <span className="lb-hint">shift-drag or scroll to pan · click to zoom in, ctrl-click to zoom out · Esc to close</span>}
    </>
  );
}

export default function LightboxHost() {
  const e = useEnlarged();
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!e) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") closeEnlarged(); };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => (document.querySelector(".lb-root .lb-btn:last-of-type") as HTMLElement | null)?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
      lastFocus.current?.focus?.();
    };
  }, [e]);

  if (!e) return null;
  return createPortal(
    <div className="lb-root" role="dialog" aria-modal="true" aria-label={`Enlarged: ${e.title}`} onClick={closeEnlarged}>
      {e.kind === "markup" ? <MarkupViewer key={e.markup.length + e.title} e={e} /> : (
        <>
          <div className="lb-bar" onClick={(ev) => ev.stopPropagation()}>
            <span className="lb-title">{e.title}</span>
            <IconBtn onClick={closeEnlarged} label="Close enlarged view"><X size={15} /></IconBtn>
          </div>
          <div className="lb-frame lb-live" onClick={(ev) => ev.stopPropagation()}>{e.node}</div>
        </>
      )}
    </div>,
    document.body,
  );
}
