"""Check the references in references.bib against Crossref and add DOIs.

Only entries marked note={unverified} are queried (by title). An entry counts as verified when Crossref's best match has
a near-identical title, the same year and the same first-author surname; its DOI is then added and the note becomes
"verified via Crossref". Anything else is reported for manual review and left unchanged.

    conda run -n nichenet python tools/crossref_verify.py [--write]
"""

import difflib
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

BIB = Path(__file__).resolve().parents[1] / "references.bib"
API = "https://api.crossref.org/works?rows=3&query.bibliographic="
UA = "nichenet-reference-check/0.1 (research tooling)"


def field(entry, name):
    m = re.search(rf"{name}\s*=\s*\{{((?:[^{{}}]|\{{[^{{}}]*\}})*)\}}", entry)
    return m.group(1) if m else None


def plain(s):
    s = re.sub(r"\\[\"'`^~=.]\{?(\w)\}?", r"\1", s or "")
    s = re.sub(r"[{}\\]", "", s)
    return re.sub(r"\s+", " ", s).strip().lower()


def query(title):
    req = urllib.request.Request(API + urllib.parse.quote(title), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["message"]["items"]


def check(entry):
    title, year, author = field(entry, "title"), field(entry, "year"), field(entry, "author")
    surname = plain(author.split(" and ")[0].split(",")[0]) if author else ""
    best = None
    for item in query(plain(title)):
        t = plain((item.get("title") or [""])[0])
        score = difflib.SequenceMatcher(None, t, plain(title)).ratio()
        y = (item.get("issued", {}).get("date-parts") or [[None]])[0][0]
        fam = plain((item.get("author") or [{}])[0].get("family", ""))
        cand = dict(doi=item.get("DOI"), title=t, year=y, family=fam, venue=(item.get("container-title") or [""])[0],
                    score=score)
        if best is None or score > best["score"]:
            best = cand
    ok = bool(best and best["score"] > 0.9 and str(best["year"]) == str(year) and surname and surname in best["family"])
    return ok, best


def main(write=False):
    text = BIB.read_text()
    entries = re.findall(r"^@\w+\{[^\n]*note=\{unverified\}\}$", text, flags=re.M)
    report = []
    for e in entries:
        key = re.match(r"@\w+\{([^,]+),", e).group(1)
        try:
            ok, best = check(e)
        except Exception as exc:  # network problems: report, do not modify
            report.append((key, "error", str(exc)))
            continue
        if ok:
            new = e.replace("note={unverified}", f"doi={{{best['doi']}}}, note={{verified via Crossref}}")
            text = text.replace(e, new)
            report.append((key, "verified", best["doi"]))
        else:
            report.append((key, "check", json.dumps(best, ensure_ascii=False)))
        time.sleep(1.0)  # be polite to the public API
    for key, status, info in report:
        print(f"{status:9s} {key:26s} {info}")
    if write:
        BIB.write_text(text)
        print(f"updated {BIB}")


if __name__ == "__main__":
    main(write="--write" in sys.argv)
