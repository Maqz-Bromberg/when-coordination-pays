import katex from "katex";

/** TeX rendered to HTML at build time (KaTeX); only the stylesheet ships to the browser. */
export default function Tex({ children, block = false }: { children: string; block?: boolean }) {
  const html = katex.renderToString(children, { displayMode: block, throwOnError: false, output: "html" });
  return block ? <div className="tex-block" dangerouslySetInnerHTML={{ __html: html }} />
               : <span dangerouslySetInnerHTML={{ __html: html }} />;
}
