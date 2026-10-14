#!/usr/bin/env python3
"""Refresh data/reports.json and data/reports.js with the newest central and state survey releases.

Run daily by .github/workflows/update-reports.yml (or by hand: python scripts/update_reports.py).
Safe by design: if a source can't be fetched or parsed, its previous items are kept and the failure
is recorded in "status" — the site never ends up empty because one website was down.
Needs: pip install beautifulsoup4
"""
import json, re, sys, datetime as dt, urllib.request, urllib.parse
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MONTHS = {m: i for i, m in enumerate(["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"], 1)}
RX_ISO = re.compile(r"\b(20\d\d)-(\d\d)-(\d\d)\b")
RX_DMY = re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?[\s-]+(20\d\d)\b", re.I)
RX_NUM = re.compile(r"\b(\d{1,2})[./-](\d{1,2})[./-](20\d\d)\b")
SKIP_TEXT = {"home", "contact us", "sitemap", "feedback", "login", "rti", "next", "previous", "more", "read more", "download", "click here"}
TODAY = dt.date.today()

def find_date(text):
    m = RX_ISO.search(text)
    if m: return safe_date(m.group(1), m.group(2), m.group(3))
    m = RX_DMY.search(text)
    if m: return safe_date(m.group(3), MONTHS[m.group(2).lower()[:3]], m.group(1))
    m = RX_NUM.search(text)
    if m: return safe_date(m.group(3), m.group(2), m.group(1))
    return None

def safe_date(y, m, d):
    try: return dt.date(int(y), int(m), int(d)).isoformat()
    except ValueError: return None

def fetch(url, tries=3):
    last = None
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (survey-dashboard release-checker)"})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read().decode(r.headers.get_content_charset() or "utf-8", "replace")
        except Exception as e:  # noqa
            last = e
    raise last

def parse(html, base, src):
    """Walk the page in order; remember the last date seen and attach it to the next report-like link."""
    soup = BeautifulSoup(html, "html.parser")
    inc = [s.lower() for s in src.get("include", [])]
    exc = [s.lower() for s in src.get("exclude", [])]
    out, seen, last_date = [], set(), None
    for node in soup.descendants:
        if isinstance(node, NavigableString):
            d = find_date(str(node))
            if d: last_date = d
            continue
        if not isinstance(node, Tag) or node.name != "a" or not node.get("href"):
            continue
        text = " ".join(node.get_text(" ", strip=True).split())
        href = node["href"].strip()
        if len(text) < 12 or text.lower() in SKIP_TEXT or href.startswith(("#", "javascript:", "mailto:")):
            continue
        low = text.lower()
        if inc and not any(k in low for k in inc): continue
        if any(k in low for k in exc): continue
        url = urllib.parse.urljoin(base, href)
        if url in seen: continue
        seen.add(url)
        d = find_date(text) or last_date
        out.append({"org": src["org"], "title": text[:200], "url": url, "date": d or "", "kind": "Release", "source": src["id"]})
        if len(out) >= src.get("limit", 25): break
    return out

def load_json(p, default):
    try: return json.loads(Path(p).read_text(encoding="utf-8"))
    except Exception: return default

def main(sources_file=None):
    cfg = load_json(sources_file or DATA / "sources.json", {"sources": []})
    pinned = load_json(DATA / "pinned.json", {"items": [], "upcoming": []})
    old = load_json(DATA / "reports.json", {"items": [], "status": {}})
    old_by_url = {i["url"]: i for i in old.get("items", [])}
    status, found = {}, []
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    for src in cfg["sources"]:
        try:
            items = parse(fetch(src["url"]), src["url"], src)
            if not items: raise ValueError("page loaded but no matching report links were found (layout may have changed)")
            found += items
            status[src["id"]] = {"ok": True, "checked": now, "count": len(items), "name": src["name"], "url": src["url"]}
        except Exception as e:  # keep what we had for this source
            kept = [i for i in old.get("items", []) if i.get("source") == src["id"]]
            found += kept
            prev = old.get("status", {}).get(src["id"], {})
            status[src["id"]] = {"ok": False, "checked": now, "error": str(e)[:200], "lastOk": prev.get("lastOk") or (prev.get("checked") if prev.get("ok") else None), "name": src["name"], "url": src["url"], "count": len(kept)}
            print(f"[warn] {src['id']}: {e}", file=sys.stderr)
        if status[src["id"]]["ok"]: status[src["id"]]["lastOk"] = now
    merged, urls = [], set()
    for it in found:
        if it["url"] in urls: continue
        urls.add(it["url"])
        it["firstSeen"] = old_by_url.get(it["url"], {}).get("firstSeen") or TODAY.isoformat()
        it["isNew"] = (TODAY - dt.date.fromisoformat(it["firstSeen"])).days <= 7 and it["url"] not in old_by_url or old_by_url.get(it["url"], {}).get("isNew", False) and (TODAY - dt.date.fromisoformat(it["firstSeen"])).days <= 7
        merged.append(it)
    merged.sort(key=lambda i: i.get("date") or i["firstSeen"], reverse=True)
    result = {"generated": now, "items": merged[:80], "pinned": pinned["items"], "upcoming": pinned.get("upcoming", []),
              "upcoming_source": pinned.get("upcoming_source", ""), "status": status}
    (DATA / "reports.json").write_text(json.dumps(result, indent=1, ensure_ascii=False), encoding="utf-8")
    (DATA / "reports.js").write_text("window.SURVEY_REPORTS=" + json.dumps(result, ensure_ascii=False) + ";", encoding="utf-8")
    print(f"wrote {len(result['items'])} items; sources: " + ", ".join(f"{k}={'ok' if v['ok'] else 'FAILED'}" for k, v in status.items()))

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
