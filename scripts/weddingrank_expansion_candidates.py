#!/usr/bin/env python3
"""Daily evidence-first candidate report. Never publishes halls or edits prices."""
import csv
import datetime as dt
import io
import json
import os
import pathlib
import urllib.parse
import weddingrank_daily_audit as audit
from weddingrank_daily_audit import check_url

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "reports" / "expansion"
OUT.mkdir(parents=True, exist_ok=True)
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()

def all_rows(table, fields):
    rows = []
    for offset in range(0, 3000, 500):
        batch = audit.fetch(table, fields, "offset=" + str(offset), 500)
        rows.extend(batch)
        if len(batch) < 500:
            break
    return rows

def run():
    if not os.environ.get('WEDDINGRANK_PRICE_WRITE_KEY'):
        raise RuntimeError('Private candidate audit requires existing authorized credential; public API hides unpublished halls')
    audit.KEY = os.environ['WEDDINGRANK_PRICE_WRITE_KEY']
    halls = all_rows("wedding_halls", "hall_id,name,sido,sigungu,road_address,phone,website,source_url,verified_at,verification_status,operation_status,public_grade,is_public")
    prices = all_rows("wedding_prices", "hall_id,source_url,verified_at,effective_date")
    priced = {p["hall_id"] for p in prices if p.get("source_url")}
    pending = [h for h in halls if h.get("is_public") is False and h.get("operation_status") == "운영"]
    published = [h for h in halls if h.get("is_public") is True]
    if not pending:
        raise RuntimeError("Private candidate query returned zero operating unpublished halls; check credential/RLS rather than reporting zero")
    def norm_address(h):
        import re
        a = re.sub(r"\s+", "", h.get("road_address") or "")
        for long, short in (("서울특별시","서울"),("경기도","경기"),("경상남도","경남"),("경상북도","경북"),("충청북도","충북"),("충청남도","충남"),("전라남도","전남"),("전라북도","전북")):
            a = a.replace(long, short, 1) if a.startswith(long) else a
        return a
    published_addresses = {norm_address(h) for h in published if norm_address(h)}
    published_names = {str(h.get("name") or "").replace(" ", "").lower() for h in published}
    def score(h):
        return (30 if h.get("verification_status") == "공식확인" else 0) + (15 if h.get("road_address") else 0) + (10 if h.get("phone") else 0) + (10 if h.get("website") else 0) + (15 if h.get("source_url") else 0) + (10 if h.get("verified_at") else 0) + (10 if h["hall_id"] in priced else 0)
    pending.sort(key=lambda h: (-score(h), str(h.get("name") or "")))
    # Probe at most 8 distinct URLs per day to minimize free-tier use.
    checks = {}
    rotation = (TODAY.toordinal() * 8) % len(pending)
    rotating = (pending + pending)[rotation:rotation + min(len(pending), 30)]
    for h in rotating:
        url = h.get("website") or h.get("source_url")
        if url and url not in checks and len(checks) < 8:
            checks[url] = check_url(url)
    candidates = []
    for h in pending:
        url = h.get("website") or h.get("source_url")
        duplicate = norm_address(h) in published_addresses or str(h.get("name") or "").replace(" ", "").lower() in published_names
        status = "duplicate_review" if duplicate else ("source_review" if h.get("verification_status") == "공식확인" and h.get("road_address") and url else "missing_evidence")
        venue_type_review = any(term in str(h.get("name") or "") for term in ("공원", "복지관", "광장", "캠퍼스", "체육관", "인재개발원", "시민대학", "문화비축기지", "새활용플라자", "예술청", "아트센터", "수상레포츠센터"))
        candidates.append({"venue_type_review": venue_type_review, "road_address": h.get("road_address"), "website": h.get("website"), "source_url": h.get("source_url"), "hall_id": h["hall_id"], "name": h.get("name"), "sido": h.get("sido"), "score": score(h), "verification_status": h.get("verification_status"), "has_price_source": h["hall_id"] in priced, "link_check": checks.get(url, "not_checked"), "review_required": True, "review_status": status})
    status_counts = {key: sum(c["review_status"] == key for c in candidates) for key in ("duplicate_review", "source_review", "missing_evidence")}
    top100_counts = {key: sum(c["review_status"] == key for c in candidates[:100]) for key in status_counts}
    report = {"date_kst": TODAY.isoformat(), "review_status_counts_all": status_counts, "venue_type_review_count": sum(c["venue_type_review"] for c in candidates), "review_status_counts_top100": top100_counts, "newly_published_by_job": 0, "mode": "read_only", "total_halls": len(halls), "public_halls": sum(h.get("is_public") is True for h in halls), "unpublished_operating": len(pending), "priced_halls": len(priced), "checked_urls": len(checks), "candidates": candidates, "database_writes": 0}
    (OUT / "latest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# WeddingRank daily expansion candidates", "", "Date: " + TODAY.isoformat(), "Unpublished operating venues: " + str(len(pending)), "Price-source venue count: " + str(len(priced)), "URL checks: " + str(len(checks)), "All candidates require source verification before public release.", "All operating unpublished review status counts: " + json.dumps(status_counts, ensure_ascii=False), "Top 100 review status counts: " + json.dumps(top100_counts, ensure_ascii=False), "Venue-type manual review flags: " + str(sum(c["venue_type_review"] for c in candidates)), "", "| Venue | Evidence score | Review status | Venue type review | Price source | URL check |", "|---|---:|---|---|---|---|"]
    for h in candidates:
        lines.append("| " + str(h["name"]).replace("|", "/") + " | " + str(h["score"]) + " | " + h["review_status"] + " | " + ("yes" if h["venue_type_review"] else "no") + " | " + ("yes" if h["has_price_source"] else "no") + " | " + h["link_check"] + " |")
    (OUT / "latest.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines[:12]))
if __name__ == "__main__":
    run()
