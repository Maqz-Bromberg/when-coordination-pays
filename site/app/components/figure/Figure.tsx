"use client";

import { Maximize2 } from "lucide-react";
import { useRef } from "react";
import { openEnlarged } from "./lightbox-store";

const STYLE_PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-opacity", "stroke-linecap",
  "opacity", "font-family", "font-size", "font-weight", "font-style", "letter-spacing", "color"];

/** The SVG with every computed style written inline, so a downloaded file looks as it does on the page. */
function standaloneSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...Array.from(svg.querySelectorAll("*"))];
  const dst = [clone, ...Array.from(clone.querySelectorAll("*"))];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const style = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";");
    (dst[i] as Element).setAttribute("style", style);
    (dst[i] as Element).removeAttribute("class");
  });
  const bg = getComputedStyle(document.body).getPropertyValue("--surface") || "#fff";
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const r = svg.getBoundingClientRect();
  if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  clone.insertAdjacentHTML("afterbegin", `<rect width="100%" height="100%" fill="${bg.trim()}"/>`);
  return new XMLSerializer().serializeToString(clone);
}

/** A figure that can be enlarged. Static figures are captured as markup and shown in the zoomable lightbox; `live`
 *  figures (WebGL) are re-rendered at full size by `large` (or their children). `id` names the figure for the
 *  print export that feeds the LaTeX paper. */
export default function Figure({ title, caption, children, live = false, large, wide = false, id }: {
  title: string; caption?: React.ReactNode; children: React.ReactNode; live?: boolean; large?: React.ReactNode;
  wide?: boolean; id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const outer = useRef<HTMLElement>(null);
  /** "Figure 3.2: title", matching the CSS counter in the caption. */
  const numbered = () => {
    const fig = outer.current, main = fig?.closest("[data-chapter]");
    if (!fig || !main) return title;
    const n = Array.from(main.querySelectorAll("figure.fig")).indexOf(fig) + 1;
    return `Figure ${main.getAttribute("data-chapter")}.${n}: ${title}`;
  };
  const enlarge = () => {
    if (live) { openEnlarged({ kind: "node", node: large ?? children, title: numbered() }); return; }
    const body = ref.current;
    if (!body) return;
    const svgs = body.querySelectorAll("svg");
    const plotFigure = body.querySelector("figure");
    const target = (plotFigure ?? (svgs.length === 1 ? svgs[0] : body.firstElementChild)) as HTMLElement | null;
    if (!target) return;
    const r = target.getBoundingClientRect();
    const main = (target.tagName.toLowerCase() === "svg" ? target : target.querySelector("svg:last-of-type")) as SVGSVGElement | null;
    openEnlarged({ kind: "markup", markup: target.outerHTML, w: r.width, h: r.height, title: numbered(),
                   download: main ? standaloneSvg(main) : target.outerHTML });
  };
  return (
    <figure ref={outer} className={wide ? "fig fig-wide" : "fig"} data-figure-id={id}>
      <div className="fig-frame">
        <button type="button" className="fig-max" onClick={enlarge} aria-label={`Enlarge: ${title}`} title="Enlarge">
          <Maximize2 size={15} />
        </button>
        <div className="fig-content" ref={ref}>{children}</div>
      </div>
      <figcaption><span className="fig-n" /><b>{title}.</b>{caption && <> {caption}</>}</figcaption>
    </figure>
  );
}
