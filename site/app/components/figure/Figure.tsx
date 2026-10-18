"use client";

import { Download, Maximize2, ZoomIn } from "lucide-react";
import { useRef } from "react";
import { openEnlarged } from "./lightbox-store";
import { MaxFrame, useMaxControls } from "./maximize";

const STYLE_PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-opacity", "stroke-linecap",
  "opacity", "font-family", "font-size", "font-weight", "font-style", "letter-spacing", "color"];

/** The SVG with every computed style written inline, so a downloaded file looks as it does on the page. */
function standaloneSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...Array.from(svg.querySelectorAll("*"))];
  const dst = [clone, ...Array.from(clone.querySelectorAll("*"))];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el);
    (dst[i] as Element).setAttribute("style", STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";"));
    (dst[i] as Element).removeAttribute("class");
  });
  const bg = getComputedStyle(document.body).getPropertyValue("--surface") || "#fff";
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const r = svg.getBoundingClientRect();
  if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  clone.insertAdjacentHTML("afterbegin", `<rect width="100%" height="100%" fill="${bg.trim()}"/>`);
  return new XMLSerializer().serializeToString(clone);
}

/** The main drawing inside a figure body: Plot's <figure> (chart + legend), the single SVG, or the first element. */
function mainElement(body: HTMLElement): HTMLElement | null {
  const plot = body.querySelector("figure");
  const svgs = body.querySelectorAll("svg");
  return (plot ?? (svgs.length === 1 ? svgs[0] : body.firstElementChild)) as HTMLElement | null;
}

function InlineOpen({ title }: { title: string }) {
  const { maximized, open } = useMaxControls();
  if (maximized) return null;
  return (
    <button type="button" className="fig-max" onClick={open} aria-label={`Full screen: ${title}`} title="Full screen (stays interactive)">
      <Maximize2 size={15} />
    </button>
  );
}

/** A figure that goes full screen in place and stays interactive (MaxFrame). While full screen, a snapshot of it
 *  can also be opened in the zoom-and-pan viewer, and the drawing downloaded as SVG. `id` names the figure for the
 *  print export that feeds the LaTeX paper. */
export default function Figure({ title, caption, children, wide = false, id }: {
  title: string; caption?: React.ReactNode; children: React.ReactNode; wide?: boolean; id?: string;
  /** @deprecated figures are always interactive when maximized now */ live?: boolean; large?: React.ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const outer = useRef<HTMLElement>(null);
  /** "Figure 3.2: title", matching the CSS counter in the caption. */
  const numbered = () => {
    const fig = outer.current, main = fig?.closest("[data-chapter]");
    if (!fig || !main) return title;
    const n = Array.from(main.querySelectorAll("figure.fig")).indexOf(fig) + 1;
    return `Figure ${main.getAttribute("data-chapter")}.${n}: ${title}`;
  };
  const snapshot = () => {
    const el = body.current && mainElement(body.current);
    if (!el || el.querySelector("canvas")) return;
    const r = el.getBoundingClientRect();
    const svg = (el.tagName.toLowerCase() === "svg" ? el : el.querySelector("svg:last-of-type")) as SVGSVGElement | null;
    openEnlarged({ kind: "markup", markup: el.outerHTML, w: r.width, h: r.height, title: numbered(), download: svg ? standaloneSvg(svg) : el.outerHTML });
  };
  const download = () => {
    const el = body.current && mainElement(body.current);
    const svg = el && ((el.tagName.toLowerCase() === "svg" ? el : el.querySelector("svg:last-of-type")) as SVGSVGElement | null);
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([standaloneSvg(svg)], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "figure"}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <figure ref={outer} className={wide ? "fig fig-wide" : "fig"} data-figure-id={id}>
      <MaxFrame title={title} className="fig-frame" bar={() => (
        <>
          <button type="button" className="mx-btn" onClick={snapshot} aria-label="Zoom into a snapshot" title="Zoom into a snapshot"><ZoomIn size={15} /></button>
          <button type="button" className="mx-btn" onClick={download} aria-label="Download as SVG" title="Download as SVG"><Download size={15} /></button>
        </>
      )}>
        <InlineOpen title={title} />
        <div className="fig-content" ref={body}>{children}</div>
      </MaxFrame>
      <figcaption><span className="fig-n" /><b>{title}.</b>{caption && <> {caption}</>}</figcaption>
    </figure>
  );
}
