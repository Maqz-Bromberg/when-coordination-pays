"use client";
// Adapted from remystifying-science app/lib/hooks/usePopover.ts @ f578288.
//
// Hover cards are built on this rather than a click popover on purpose: they open on hover intent, stay open
// while the pointer crosses into the card (rendered in a portal), and close on a short delay so a diagonal move
// from trigger to card does not drop them. Positioning is calcPopoverPosition below.

import { useCallback, useEffect, useRef, useState } from "react";

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function usePopover<T extends HTMLElement = HTMLElement>(delayMs = 180) {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const mounted = useMounted();
  const triggerRef = useRef<T>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setRect(triggerRef.current?.getBoundingClientRect() ?? null);
    setVisible(true);
  }, []);
  const onMouseEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(open, delayMs);
  }, [delayMs, open]);
  const onMouseLeave = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 250);
  }, []);
  const keepOpen = useCallback(() => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);
  const close = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => (visible ? setVisible(false) : open()), [visible, open]);

  return { triggerRef, onMouseEnter, onMouseLeave, keepOpen, close, toggle, open,
           isOpen: mounted && visible && rect !== null, rect, mounted };
}

/** Viewport edge inset for a popover: the gap it keeps from either side. */
export const POPOVER_EDGE_INSET = 8;

export function clampPopoverWidth(preferred: number): number {
  return Math.min(preferred, window.innerWidth - 2 * POPOVER_EDGE_INSET);
}

/** Position relative to the trigger. The horizontal clamp guards both edges: guarding only the right once hung
 *  popovers off-screen for triggers near the left edge of a narrow viewport. Fixed positioning (no scroll offset). */
export function calcPopoverPosition(rect: DOMRect, width: number, minSpaceBelow = 160, margin = POPOVER_EDGE_INSET) {
  const left = Math.max(POPOVER_EDGE_INSET, Math.min(rect.left, window.innerWidth - width - POPOVER_EDGE_INSET));
  const spaceBelow = window.innerHeight - rect.bottom;
  const showBelow = spaceBelow >= minSpaceBelow || rect.top < minSpaceBelow;
  const top = showBelow ? rect.bottom + margin : rect.top - margin;
  return { top, left, showBelow };
}
