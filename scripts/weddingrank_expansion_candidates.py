#!/usr/bin/env python3
"""Weekly evidence-first candidate report. Never publishes halls or edits prices."""
import csv
import datetime as dt
import io
import json
import pathlib
import urllib.parse
from weddingrank_daily_audit import fetch, check_url

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "reports" / "expansion"
OUT.mkdir(parents=True, exist_ok=True)
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()

def all_rows(table, fields):
    rows = []
    for offset in range(0, 3000, 500):
        batch = fetch(table, fields, "offset=" + str(offset), 500)
        rows.extend(batch)
        if len(batch) < 500:
            break
    return rows

def run():
    halls = all_rows("wedding_halls", "hall_id,name,sido,sigungu,road_address,phone,website,source_url,verified_at,verification_status,operation_status,public_grade,is_public")
    prices = all_rows("wedding_prices", "hall_id,source_url,verified_at,effective_date")
    priced = {p["hall_id"] for p in prices if p.get("source_url")}
    pending = [h for h in halls if h.get("is_public") is False and h.get("operation_status") == "운영"]
    def score(h):
        return (30 if h.get("verification_status") == "공식확인" else 0) + (15 if h.get("road_address") else 0) + (10 if h.get("phone") else 0) + (10 if h.get("website") else 0) + (15 if h.get("source_url") else 0) + (10 if h.get("verified_at") else 0) + (10 if h["hall_id"] in priced else 0)
    pending.sort(key=lambda h: (-score(h), str(h.get("name") or "")))
    # Probe at most 8 distinct URLs weekly to minimize free-tier use.
    checks = {}
    for h in pending[:30]:
        url = h.get("website") or h.get("source_url")
        if url and url not in checks and len(checks) < 8:
            checks[url] = check_url(url)
    candidates = []
    for h in pending[:100]:
        url = h.get("website") or h.get("source_url")
        candidates.append({"hall_id": h["hall_id"], "name": h.get("name"), "sido": h.get("sido"), "score": score(h), "verification_status": h.get("verification_status"), "has_price_source": h["hall_id"] in priced, "link_check": checks.get(url, "not_checked"), "review_required": True})
    report = {"date_kst": TODAY.isoformat(), "mode": "read_only", "total_halls": len(halls), "public_halls": sum(h.get("is_public") is True for h in halls), "unpublished_operating": len(pending), "priced_halls": len(priced), "checked_urls": len(checks), "candidates": candidates, "database_writes": 0}
    (OUT / "latest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# WeddingRank weekly expansion candidates", "", "Date: " + TODAY.isoformat(), "Unpublished operating venues: " + str(len(pending)), "Price-source venue count: " + str(len(priced)), "URL checks: " + str(len(checks)), "All candidates require source verification before public release.", "", "| Venue | Evidence score | Price source | URL check |", "|---|---:|---|---|"]
    for h in candidates[:30]:
        lines.append("| " + str(h["name"]).replace("|", "/") + " | " + str(h["score"]) + " | " + ("yes" if h["has_price_source"] else "no") + " | " + h["link_check"] + " |")
    (OUT / "latest.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines[:12]))
if __name__ == "__main__":
    run()
