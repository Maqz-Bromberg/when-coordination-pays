"use client";
// Hover card on the ported usePopover (remystifying-science @ f578288): opens on hover intent or keyboard focus,
// stays open while the pointer is on the card, toggles on tap for touch, closes on Escape or an outside tap.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { calcPopoverPosition, clampPopoverWidth, usePopover } from "./usePopover";

export default function HoverCard({ trigger, card, color, className, width = 340 }: {
  trigger: React.ReactNode; card: React.ReactNode; color?: string; className?: string; width?: number;
}) {
  const p = usePopover<HTMLSpanElement>();
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; showBelow: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!p.isOpen || !p.rect) return;
    setPos(calcPopoverPosition(p.rect, clampPopoverWidth(width)));
  }, [p.isOpen, p.rect, width]);

  useEffect(() => {
    if (!p.isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") p.close(); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!cardRef.current?.contains(t) && !p.triggerRef.current?.contains(t)) p.close();
    };
    const onScroll = () => p.close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); window.removeEventListener("scroll", onScroll); };
  }, [p.isOpen, p]);

  return (
    <>
      <span ref={p.triggerRef} className={className} tabIndex={0} role="button" aria-expanded={p.isOpen}
        style={color ? ({ "--c": color } as React.CSSProperties) : undefined}
        onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onFocus={p.open} onBlur={p.onMouseLeave}
        onClick={(e) => { if ((e.nativeEvent as PointerEvent).pointerType !== "mouse") p.toggle(); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.toggle(); } }}>
        {trigger}
      </span>
      {p.isOpen && pos && createPortal(
        <div ref={cardRef} className="hovercard" role="tooltip"
          onMouseEnter={p.keepOpen} onMouseLeave={p.onMouseLeave}
          style={{ top: pos.top, left: pos.left, width: clampPopoverWidth(width), transform: pos.showBelow ? undefined : "translateY(-100%)",
                   ...(color ? { "--c": color } : {}) } as React.CSSProperties}>
          {card}
        </div>,
        document.body,
      )}
    </>
  );
}
