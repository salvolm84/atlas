#!/usr/bin/env python3
"""Map each catalogue object to its English Wikipedia article title.

Writes lib/wikipedia-titles.json as {object id: article title}. Only titles are
stored; the summary text itself is fetched live by the browser, credited, and
never committed. Candidates are tried in order -- Messier, NGC/IC, Sharpless,
Barnard, Caldwell, then the common name with a type suffix -- and a match is
accepted only when Wikipedia's short description reads as astronomical, so a
bare name can never land on an unrelated article ("Lion" is a cat).

Uses the batched Action API (50 titles per request) with a descriptive
User-Agent, as Wikimedia asks. Re-run after catalogue changes:

    python3 scripts/build-wikipedia-titles.py
"""
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "public/data/catalog.json"
OUT = ROOT / "lib/wikipedia-titles.json"
API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "DeepSkyAtlas/1.0 (https://github.com/salvolm84/atlas)"}
ASTRONOMICAL = re.compile(
    r"galax|nebul|cluster|star|remnant|constellation|asterism|cloud|H II|region", re.I
)

try:  # python.org builds on macOS ship without system roots
    import certifi

    CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CONTEXT = ssl.create_default_context()


def candidates(o):
    out = []
    if o["messier"]:
        out.append(f"Messier {o['messier']}")
    for alias in o["aliases"]:
        if m := re.fullmatch(r"(NGC|IC)(\d+)([A-Z]?)", alias):
            out.append(f"{m[1]} {m[2]}{m[3]}")
        elif m := re.fullmatch(r"Sh2-(\d+)", alias):
            out.append(f"Sh2-{m[1]}")
        elif m := re.fullmatch(r"B(\d+)", alias):
            out.append(f"Barnard {m[1]}")
    if o["caldwell"]:
        out.append(f"Caldwell {o['caldwell']}")
    if o["name"] != o["key"]:
        out += [o["name"] + suffix for suffix in (" Nebula", " Galaxy", " Cluster")]
    return out


def query(titles):
    params = {
        "action": "query",
        "format": "json",
        "formatversion": "2",
        "redirects": "1",
        "prop": "description|pageprops",
        "ppprop": "disambiguation",
        "titles": "|".join(titles),
        "maxlag": "5",
    }
    request = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers=HEADERS)
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=30, context=CONTEXT) as response:
                return json.load(response)["query"]
        except urllib.error.HTTPError:
            time.sleep(20 * (attempt + 1))  # rate limited or lagged: back off
    sys.exit("Wikipedia kept refusing the request; try again later.")


def main():
    objects = json.loads(CATALOG.read_text())
    wanted = sorted({t for o in objects for t in candidates(o)})
    found = {}
    for i in range(0, len(wanted), 50):
        chunk = wanted[i : i + 50]
        q = query(chunk)
        normalized = {n["from"]: n["to"] for n in q.get("normalized", [])}
        redirects = {r["from"]: r["to"] for r in q.get("redirects", [])}
        pages = {p["title"]: p for p in q["pages"]}
        for t in chunk:
            page = pages.get(redirects.get(normalized.get(t, t), normalized.get(t, t)))
            if (
                page
                and not page.get("missing")
                and "disambiguation" not in page.get("pageprops", {})
                and ASTRONOMICAL.search(page.get("description", ""))
            ):
                found[t] = page["title"]
        time.sleep(1)
    titles = {}
    for o in objects:
        match = next((found[t] for t in candidates(o) if t in found), None)
        if match:
            titles[o["id"]] = match
    OUT.write_text(json.dumps(titles, indent=2, ensure_ascii=False) + "\n")
    missing = [o["key"] for o in objects if o["id"] not in titles]
    print(f"{len(titles)} of {len(objects)} objects mapped; no article for: {', '.join(missing) or 'none'}")


if __name__ == "__main__":
    main()
