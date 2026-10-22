#!/usr/bin/env python3
"""Apply explicitly verified wedding prices only. No guessed prices or date-only freshness."""
import datetime as dt
import json
import os
import pathlib
import re
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONFIG = (ROOT / "config.js").read_text(encoding="utf-8")
def config(name):
    m = re.search(r"\b" + re.escape(name) + r'\\s*:\\s*"([^"]+)"', CONFIG)
    if not m: raise RuntimeError("Missing " + name)
    return m.group(1)
BASE = config("SUPABASE_URL").rstrip("/")
KEY = os.environ.get("WEDDINGRANK_PRICE_WRITE_KEY", "")
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
MANIFEST = ROOT / "data" / "verified-price-updates.json"
REPORT = ROOT / "reports" / "prices" / "updates.json"
REPORT.parent.mkdir(parents=True, exist_ok=True)

def request(method, path, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + "/rest/v1/" + path, data=body, method=method,
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY,
                 "Content-Type": "application/json", "Prefer": "return=representation"})
    with urllib.request.urlopen(req, timeout=25) as resp: return json.load(resp)

def main():
    entries = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if not isinstance(entries, list): raise ValueError("Manifest must be a list")
    results = []
    for item in entries[:30]:
        record = {"price_id": item.get("price_id"), "status": "skipped"}
        try:
            required = ("price_id", "source_url", "source_quote", "source_checked_at", "rental_fee")
            if not all(item.get(k) is not None for k in required): raise ValueError("Missing required evidence")
            if item["source_checked_at"] != TODAY.isoformat(): raise ValueError("Source not checked today")
            if not item["source_url"].startswith("https://"): raise ValueError("Source must be HTTPS")
            amount = item["rental_fee"]
            if type(amount) is not int or not 0 <= amount <= 100000000: raise ValueError("Invalid rental fee")
            if len(item["source_quote"]) < 6 or len(item["source_quote"]) > 500: raise ValueError("Invalid source excerpt")
            if not KEY:
                record["status"] = "needs_existing_write_credential"
            else:
                # Compare-and-swap guards against changing a different price row or source.
                qs = urllib.parse.urlencode({"price_id": "eq." + item["price_id"],
                    "source_url": "eq." + item["source_url"],
                    "rental_fee": "eq." + str(item["expected_previous_rental_fee"]),
                    "select": "price_id,rental_fee,verified_at"})
                payload = {"rental_fee": amount, "verified_at": TODAY.isoformat()}
                updated = request("PATCH", "wedding_prices?" + qs, payload)
                record["status"] = "updated" if len(updated) == 1 else "conflict_or_not_found"
        except (ValueError, KeyError, TypeError) as exc:
            record["status"] = "invalid_evidence"
            record["reason"] = str(exc)
        results.append(record)
    REPORT.write_text(json.dumps({"date": TODAY.isoformat(), "results": results},
        ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"date": TODAY.isoformat(), "results": results}, ensure_ascii=False))
    return 0

if __name__ == "__main__": raise SystemExit(main())
