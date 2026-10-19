import fs from "node:fs";
import path from "node:path";
import katex from "katex";
import { Marked } from "marked";
import { BASE } from "./base";

/** Heading anchor: lower case, punctuation dropped, spaces to hyphens. */
export function slug(text: string): string {
  return text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
}

/** Site-absolute links get the base path. */
function mapLink(href: string): string {
  if (!href.startsWith("/")) return href;
  return `${BASE}${href}`;
}

const md = new Marked({
  renderer: {
    heading({ tokens, depth, text }) {
      return `<h${depth} id="${slug(text)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
    link({ href, tokens }) {
      return `<a href="${mapLink(href)}">${this.parser.parseInline(tokens)}</a>`;
    },
  },
});

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), "..", "docs", file), "utf8");
}

/** The markdown from a heading (matched by its start) to the next heading of the same or a higher level. */
export function section(file: string, startsWith: string, shift = 0): string {
  const lines = read(file).split("\n");
  const i = lines.findIndex((l) => /^#{1,6} /.test(l) && l.replace(/^#+ /, "").startsWith(startsWith));
  if (i < 0) throw new Error(`${file}: no heading starting "${startsWith}"`);
  const level = lines[i].match(/^#+/)![0].length;
  let j = i + 1;
  while (j < lines.length && !(lines[j].match(/^#+ /) && lines[j].match(/^#+/)![0].length <= level)) j++;
  const body = lines.slice(i + 1, j).join("\n");
  // shift headings so the section's own subsections start at h2 on its page
  return shift ? body.replace(/^(#+) /gm, (_, h: string) => `${"#".repeat(Math.max(2, h.length + shift))} `) : body;
}

export function whole(file: string): string {
  return read(file).replace(/^# .*\n/, "");
}

/** TeX in the appendix text: $$…$$ for display, $…$ inline, rendered with KaTeX at build time. The formulas are
 *  swapped for placeholders before markdown parsing (so _ and \ inside them stay TeX) and put back afterwards. */
function math(markdown: string) {
  const out: string[] = [];
  const keep = (html: string) => `§§${out.push(html) - 1}§§`;
  const tex = (s: string, displayMode: boolean) => katex.renderToString(s.trim(), { displayMode, throwOnError: false, output: "html" });
  const src = markdown
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, s: string) => `\n\n${keep(`<div class="tex-block">${tex(s, true)}</div>`)}\n\n`)
    .replace(/\$([^$\n]+?)\$/g, (_, s: string) => keep(tex(s, false)));
  const restore = (html: string) => html.replace(/<p>§§(\d+)§§<\/p>/g, (_, i: string) => out[+i])
    .replace(/§§(\d+)§§/g, (_, i: string) => out[+i]);
  return { src, restore };
}

export function render(markdown: string): string {
  const { src, restore } = math(markdown);
  // the research text writes exponents as ^{…}; outside code spans, show them as superscripts
  const html = md.parse(src, { async: false }) as string;
  return restore(html.split(/(<code>[\s\S]*?<\/code>)/).map((part) => (part.startsWith("<code>") ? part
    : part.replace(/\^\{([^{}<]+)\}/g, "<sup>$1</sup>"))).join(""));
}

/** One line of markdown (a step title), with inline TeX. */
export function renderInline(markdown: string): string {
  const { src, restore } = math(markdown);
  return restore(md.parseInline(src, { async: false }) as string);
}
