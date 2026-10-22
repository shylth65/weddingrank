#!/usr/bin/env python3
"""WeddingRank price source audit. Read-only: never update prices based on HTTP responses."""
import datetime as dt
import json
import pathlib
import re
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONFIG = (ROOT / "config.js").read_text(encoding="utf-8")
def cfg(key):
    match = re.search(r"\b" + re.escape(key) + r'\s*:\s*"([^"]+)"', CONFIG)
    if not match:
        raise RuntimeError("Missing public configuration: " + key)
    return match.group(1)
BASE = cfg("SUPABASE_URL").rstrip("/")
KEY = cfg("SUPABASE_PUBLISHABLE_KEY")
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
OUT = ROOT / "reports" / "prices"
OUT.mkdir(parents=True, exist_ok=True)

def fetch(table, fields, extra="", limit=1000):
    query = "select=" + urllib.parse.quote(fields, safe=",*") + "&limit=" + str(limit)
    if extra:
        query += "&" + extra
    req = urllib.request.Request(BASE + "/rest/v1/" + table + "?" + query,
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "Accept": "application/json",
                 "User-Agent": "WeddingRank-PriceAudit/1.0"})
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.load(response)

def probe(url):
    if not isinstance(url, str) or not url.startswith(("http://", "https://")):
        return {"status": "invalid_url"}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; WeddingRankPriceAudit/1.0)"})
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read(350000).decode("utf-8", errors="replace")
            clean = re.sub(r"<[^>]+>", " ", body)
            clean = re.sub(r"\s+", " ", clean)
            return {"status": "http_ok", "http_status": response.status,
                    "price_terms_present": bool(re.search(r"식대|대관료|웨딩.*가격|만원|₩|\\d[\\d,]*\s*원", clean)),
                    "note": "Text presence does not prove any stored amount is current."}
    except urllib.error.HTTPError as ex:
        return {"status": "http_" + str(ex.code)}
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        return {"status": "unreachable"}

def main():
    halls = fetch("wedding_halls", "hall_id,name,is_public", limit=500)
    names = {h["hall_id"]: h["name"] for h in halls}
    prices = fetch("wedding_prices", "hall_id,effective_date,rental_fee,meal_price_per_person,source_name,source_url", "order=effective_date.desc", 1000)
    rows = []
    for p in prices:
        date = p.get("effective_date")
        try:
            age = (TODAY - dt.date.fromisoformat(date)).days if date else None
        except ValueError:
            age = None
        rows.append({"hall_id": p.get("hall_id"), "hall_name": names.get(p.get("hall_id"), ""),
            "effective_date": date, "days_since_effective_date": age,
            "source_name": p.get("source_name"), "source_url": p.get("source_url"),
            "stored_rental_fee": p.get("rental_fee"), "stored_meal_price": p.get("meal_price_per_person")})
    candidates = [r for r in rows if r["days_since_effective_date"] is not None and r["days_since_effective_date"] > 30]
    # Rotate through distinct sources. Keep traffic bounded and never scrape restricted pages.
    sources = list({r["source_url"]: r for r in candidates if r.get("source_url")}.values())
    sources.sort(key=lambda r: (r["source_url"] or ""))
    offset = (TODAY.toordinal() * 12) % max(len(sources), 1)
    selected = (sources + sources)[offset:offset + 12]
    checks = [{**r, **probe(r["source_url"])} for r in selected]
    report = {"date_kst": TODAY.isoformat(), "mode": "read_only", "total_price_records": len(rows),
        "stale_over_30_days": len(candidates), "source_url_probes": checks,
        "database_writes": 0, "automatic_price_updates": 0,
        "warning": "Effective date is not source verification date. HTTP status and price terms do not verify stored amounts. Human/source-level comparison required before updates."}
    (OUT / "latest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["## WeddingRank price source audit — " + TODAY.isoformat(), "",
        "- Price records: " + str(len(rows)), "- Effective dates older than 30 days: " + str(len(candidates)),
        "- Source links checked: " + str(len(checks)), "- Database writes: **0**",
        "- HTTP success does not verify the listed prices.", "", "### Source checks"]
    lines += ["- " + r["hall_name"] + " | " + r["status"] + " | " + str(r.get("price_terms_present", "unknown")) + " | " + r["source_url"] for r in checks]
    summary = "\n".join(lines) + "\n"
    (OUT / "latest.md").write_text(summary, encoding="utf-8")
    print(summary)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
