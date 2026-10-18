"use client";
/**
 * Interactive maximize: the figure itself goes full-viewport, in place.
 *
 * Why in place: a lightbox that copies a figure's markup (or renders a second instance) loses everything live about
 * it: tooltips, hover previews, sliders, carousels, WebGL camera, and whatever the reader had already set. Here the
 * frame around the figure switches to `position: fixed` and fills the viewport; the React subtree is never copied,
 * moved or remounted, so state and event handling stay exactly as they were. A placeholder keeps the page from
 * jumping while the figure is out.
 *
 * Contract for figure content (what makes a child work well maximized):
 *  - size from the container, not the window: read it with `useElementSize` (ResizeObserver) and redraw on change;
 *  - optionally take more room when `useMaximized()` is true (taller charts, larger previews);
 *  - no ancestor with transform, filter, contain or will-change: those make `position: fixed` relative to that
 *    ancestor instead of the viewport. In development a warning names the offending ancestor.
 *
 * Keyboard: Esc closes; while open, `isAnyMaximized()` lets page-level shortcuts stand aside. Focus moves to the
 * close button and returns to the opener on close; page scroll is locked.
 *
 * Ported to remystifying-science as app/components/ui/max-frame.tsx (MUI and token version).
 *
 * Self-contained apart from lucide-react icons and ./maximize.css, which reads five tokens: --surface, --rule, --ink,
 * --accent and --f-display. Inside the frame, style content with `.mx-on <selector>` to give it more room.
 */
import { Minimize2 } from "lucide-react";
import "./maximize.css";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

/* ---------------------------------------------------------------- shared state */
const MaximizedContext = createContext(false);
/** True inside a maximized frame. */
export const useMaximized = () => useContext(MaximizedContext);

let openCount = 0;
const listeners = new Set<() => void>();
const bump = (d: number) => { openCount += d; listeners.forEach((f) => f()); };
/** Whether any frame on the page is maximized (for page-level keyboard shortcuts). */
export const isAnyMaximized = () => openCount > 0;
export const useAnyMaximized = () =>
  useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, () => openCount > 0, () => false);

/* ---------------------------------------------------------------- sizing */
/** Width and height of an element, kept current with a ResizeObserver. */
export function useElementSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize((s) => {
      const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight);
      return s.width === w && s.height === h ? s : { width: w, height: h };
    });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

function warnTrappingAncestor(el: HTMLElement) {
  if (process.env.NODE_ENV === "production") return;
  for (let a = el.parentElement; a; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (cs.transform !== "none" || cs.filter !== "none" || (cs.contain && cs.contain !== "none") || /transform|filter/.test(cs.willChange)) {
      console.warn("MaxFrame: an ancestor creates a containing block, so the maximized frame will not cover the viewport:", a);
      return;
    }
  }
}

/* ---------------------------------------------------------------- the frame */
export type MaxControls = { maximized: boolean; open: () => void; close: () => void };

export function MaxFrame({ title, children, bar, className }: {
  title: string;
  children: React.ReactNode;
  /** Extra toolbar buttons shown while maximized (e.g. a zoomable snapshot, download). */
  bar?: (c: MaxControls) => React.ReactNode;
  className?: string;
}) {
  const [max, setMax] = useState(false);
  const [holdHeight, setHoldHeight] = useState<number | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    if (!frame.current) return;
    opener.current = document.activeElement as HTMLElement | null;
    setHoldHeight(frame.current.offsetHeight);
    warnTrappingAncestor(frame.current);
    setMax(true);
  }, []);
  const close = useCallback(() => setMax(false), []);

  useEffect(() => {
    if (!max) return;
    bump(1);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Esc closes only the topmost modal: a viewer opened from inside this frame closes first
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const modals = document.querySelectorAll('[aria-modal="true"]');
      if (modals[modals.length - 1] !== frame.current) return;
      e.preventDefault();
      setMax(false);
    };
    window.addEventListener("keydown", onKey);
    closeBtn.current?.focus();
    return () => {
      bump(-1);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      setHoldHeight(null);
      opener.current?.focus?.();
    };
  }, [max]);

  const controls = { maximized: max, open, close };
  return (
    <MaxFrameControls.Provider value={controls}>
      <div className="mx" style={holdHeight ? { minHeight: holdHeight } : undefined}>
        {max && <div className="mx-backdrop" onClick={close} aria-hidden />}
        <div ref={frame} className={`${className ?? ""} mx-frame${max ? " mx-on" : ""}`}
          role={max ? "dialog" : undefined} aria-modal={max || undefined} aria-label={max ? title : undefined}>
          {max && (
            <div className="mx-bar">
              <span className="mx-title">{title}</span>
              <span className="mx-gap" />
              {bar?.(controls)}
              <button ref={closeBtn} type="button" className="mx-btn" onClick={close} aria-label="Leave full screen (Esc)" title="Leave full screen (Esc)">
                <Minimize2 size={15} />
              </button>
            </div>
          )}
          <MaximizedContext.Provider value={max}>
            <div className="mx-body">{children}</div>
          </MaximizedContext.Provider>
        </div>
      </div>
    </MaxFrameControls.Provider>
  );
}

const MaxFrameControls = createContext<MaxControls>({ maximized: false, open: () => {}, close: () => {} });
/** Open/close the enclosing MaxFrame from inside it (e.g. an inline maximize button). */
export const useMaxControls = () => useContext(MaxFrameControls);
