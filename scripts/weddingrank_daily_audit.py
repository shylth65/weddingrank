#!/usr/bin/env python3
"""Daily WeddingRank public-data audit. Never invents evidence or writes to Supabase."""
import datetime as dt
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "reports" / "daily"
OUT.mkdir(parents=True, exist_ok=True)
config = (ROOT / "config.js").read_text(encoding="utf-8")
def public_config(name):
    match = re.search(r"\b" + re.escape(name) + r'\s*:\s*"([^"]+)"', config)
    if not match:
        raise RuntimeError("Missing public configuration " + name)
    return match.group(1)
URL = public_config("SUPABASE_URL").rstrip("/")
KEY = public_config("SUPABASE_PUBLISHABLE_KEY")
TODAY = dt.datetime.now(dt.timezone.utc).astimezone(dt.timezone(dt.timedelta(hours=9))).date()
def fetch(table, fields, extra="", limit=1000):
    query = "select=" + urllib.parse.quote(fields, safe=",*") + "&limit=" + str(limit)
    if extra:
        query += "&" + extra
    req = urllib.request.Request(URL + "/rest/v1/" + table + "?" + query,
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY,
                 "Accept": "application/json", "User-Agent": "WeddingRank-DailyAudit/1.0"})
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.load(response)

def evidence(item):
    return bool(item.get("verified_at")) and str(item.get("source_url") or "").startswith(("https://", "http://"))
def recent(item):
    dates = [item.get("verified_at"), item.get("source_updated_at")]
    try:
        return any(0 <= (TODAY - dt.date.fromisoformat(str(d)[:10])).days <= 365 for d in dates if d)
    except ValueError:
        return False
def index(h, prices, rooms):
    return (15 if h.get("road_address") else 0) + (10 if h.get("phone") else 0) + (10 if h.get("website") else 0) + (25 if any(map(evidence, prices)) else 0) + (25 if any(map(evidence, rooms)) else 0) + (15 if recent(h) else 0)
def check_url(url):
    if not isinstance(url, str) or not url.startswith(("https://", "http://")):
        return "missing_or_invalid"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "WeddingRank-public-link-check/1.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            return "ok" if 200 <= r.status < 400 else "http_" + str(r.status)
    except urllib.error.HTTPError as ex:
        return "http_" + str(ex.code)
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return "unreachable"

def run():
    featured = fetch("weddingrank_featured_top100", "hall_id,name,sido,selection_rank", "order=selection_rank.asc", 200)
    halls = fetch("wedding_halls", "hall_id,name,sido,road_address,phone,website,verified_at,source_updated_at,operation_status,is_public", "is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81", 1000)
    prices = fetch("wedding_prices", "hall_id,source_url,verified_at", limit=1000)
    rooms = fetch("hall_rooms", "hall_id,source_url,verified_at", limit=1000)
    specialist = fetch("weddingrank_top30_competition", "hall_id,rank_position,source_count,evidence_publication_dates_complete", limit=100)
    hm = {str(x["hall_id"]): x for x in halls}
    pm, rm = {}, {}
    for item in prices:
        pm.setdefault(str(item["hall_id"]), []).append(item)
    for item in rooms:
        rm.setdefault(str(item["hall_id"]), []).append(item)
    candidates = []
    for f in featured:
        hid = str(f["hall_id"])
        if hid not in hm:
            continue
        h = hm[hid]
        candidates.append({"hall_id": hid, "name": h["name"], "sido": h.get("sido"),
            "information_index": index(h, pm.get(hid, []), rm.get(hid, [])),
            "previous_editorial_rank": f.get("selection_rank") or 9999})
    candidates.sort(key=lambda x: (-x["information_index"], x["previous_editorial_rank"]))
    top30 = candidates[:30]
    # This index measures evidence completeness only, not service quality.
    specialist_verified = [x for x in specialist if int(x.get("source_count") or 0) >= 3 and x.get("evidence_publication_dates_complete") is True]
    # Probe a rotating, bounded subset of official websites each day. No scraping or writes.
    start = (TODAY.toordinal() * 10) % max(len(candidates), 1)
    sample = (candidates + candidates)[start:start+10]
    link_checks = []
    for candidate in sample:
        hall = hm[candidate["hall_id"]]
        link_checks.append({"hall_id": candidate["hall_id"], "name": candidate["name"],
            "website_status": check_url(hall.get("website"))})
    report = {"date_kst": TODAY.isoformat(), "mode": "read_only",
        "methodology": "information-evidence-completeness-100-v1",
        "not_quality_or_satisfaction_ranking": True,
        "featured_candidates": len(candidates), "recommended_top30_count": len(top30),
        "specialist_records": len(specialist), "specialist_minimum_evidence_count": len(specialist_verified),
        "recommended_top30": top30, "website_checks": link_checks,
        "automatic_source_verifications": 0, "database_writes": 0,
        "notes": "Source HTTP responses alone do not verify prices, raw scores, samples or independent reviews. No source content is automatically approved."}
    (OUT / "latest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = ["## WeddingRank daily TOP30 audit — " + TODAY.isoformat(),
        "", "- Read-only; no Supabase updates, no PICKRANK synchronization",
        "- Public editorial candidates: **" + str(len(candidates)) + "**",
        "- Recommended TOP30 candidates: **" + str(len(top30)) + "/30**",
        "- Specialist records: **" + str(len(specialist)) + "**; minimum evidence/date flags: **" + str(len(specialist_verified)) + "**",
        "- Official website probes: **" + str(len(link_checks)) + "**",
        "- Database changes: **0** (source validation required before publishing)",
        "- Information index is NOT a quality or satisfaction rating.",
        "", "### Link checks"]
    summary += ["- " + x["name"] + ": " + x["website_status"] for x in link_checks]
    output = "\n".join(summary) + "\n"
    (OUT / "latest.md").write_text(output, encoding="utf-8")
    print(output)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as fh:
            fh.write(output)
    if len(top30) < 30:
        print("WARNING: fewer than 30 eligible recommended candidates", file=sys.stderr)
    return 0
if __name__ == "__main__":
    try:
        sys.exit(run())
    except Exception as exc:
        print("ERROR: WeddingRank daily audit failed: " + str(exc), file=sys.stderr)
        sys.exit(1)
