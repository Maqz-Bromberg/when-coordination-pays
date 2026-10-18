import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import { BASE } from "./base";

/** Heading anchor: lower case, punctuation dropped, spaces to hyphens. */
export function slug(text: string): string {
  return text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
}

/** Links in the research docs point at the private research site; map them onto this site's pages. */
const LINKS: [RegExp, string][] = [
  [/^\/results\/coordination\/#kl-reward/, "/appendix/e9/"],
  [/^\/results\/coordination\/#analysis/, "/appendix/analysis/"],
  [/^\/results\/coordination\/?.*/, "/appendix/e8/"],
  [/^\/results\/e5\/?/, "/appendix/e5/"],
  [/^\/results\/e6\/?/, "/appendix/e6/"],
  [/^\/results\/#e1-.*/, "/appendix/e1/"],
  [/^\/results\/#e2-.*/, "/appendix/e2/"],
  [/^\/results\/#e4-.*/, "/appendix/e4/"],
  [/^\/results\/#bridges.*/, "/appendix/bridges/"],
  [/^\/results\/?.*/, "/appendix/e8/"],
  [/^\/errata\/?/, "/appendix/errata/"],
  [/^\/validation\/?/, "/appendix/validation/"],
  [/^\/results\/source-structure\/?/, "/appendix/validation/"],
];

function mapLink(href: string): string {
  if (!href.startsWith("/")) return href;
  for (const [re, to] of LINKS) if (re.test(href)) return `${BASE}${to}`;
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

export function render(markdown: string): string {
  // inline links to the research site that only make sense there ("Interactive version ...") are dropped
  const cleaned = markdown.replace(/^Interactive version[^\n]*\n(?:[^\n]+\n)*?\n/m, "");
  return md.parse(cleaned, { async: false }) as string;
}
