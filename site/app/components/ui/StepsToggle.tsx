"use client";

import { useRef, useState } from "react";

/** Opens or closes every step of the derivation it sits in (the step <details> after it in the same fold). */
export default function StepsToggle() {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const toggle = () => {
    const list = ref.current?.parentElement?.nextElementSibling;
    list?.querySelectorAll<HTMLDetailsElement>("details.step").forEach((d) => { d.open = !open; });
    setOpen(!open);
  };
  return (
    <button ref={ref} type="button" className="steps-toggle" onClick={toggle} aria-expanded={open}>
      {open ? "Close all steps" : "Open all steps"}
    </button>
  );
}
