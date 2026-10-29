#!/usr/bin/env python3
"""Operational outcome scorecard; reports real DB counts, never confuses job success with growth."""
import datetime as dt
import json
import os
import pathlib
import urllib.parse
import urllib.request
import weddingrank_daily_audit as audit

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"reports"/"daily"/"outcomes.json"
OUT.parent.mkdir(parents=True,exist_ok=True)
key=os.environ.get("WEDDINGRANK_PRICE_WRITE_KEY")
if not key: raise RuntimeError("Existing authorized key required for accurate private/public counts")
def count(table, filter_query=""):
    url=audit.URL+"/rest/v1/"+table+"?select=*&limit=1"+("&"+filter_query if filter_query else "")
    req=urllib.request.Request(url,headers={"apikey":key,"Authorization":"Bearer "+key,"Prefer":"count=exact","Range":"0-0"})
    with urllib.request.urlopen(req,timeout=25) as response:
        header=response.headers.get("Content-Range","")
        if "/" not in header: raise RuntimeError("Count header unavailable for "+table)
        return int(header.split("/")[-1])
now=dt.datetime.now(dt.timezone(dt.timedelta(hours=9)))
counts={
 "published_venues":count("wedding_halls","is_public=eq.true"),
 "operating_published_venues":count("wedding_halls","is_public=eq.true&operation_status=eq."+urllib.parse.quote("운영")),
 "price_records":count("wedding_prices"),
 "fact_check_records":count("wedding_venue_fact_checks"),
 "new_public_venues_24h":count("wedding_halls","is_public=eq.true&updated_at=gte."+urllib.parse.quote((now-dt.timedelta(days=1)).astimezone(dt.timezone.utc).isoformat())),
 "new_price_records_24h":count("wedding_prices","created_at=gte."+urllib.parse.quote((now-dt.timedelta(days=1)).astimezone(dt.timezone.utc).isoformat())),
 "new_fact_checks_24h":count("wedding_venue_fact_checks","created_at=gte."+urllib.parse.quote((now-dt.timedelta(days=1)).astimezone(dt.timezone.utc).isoformat()))
}
publication=ROOT/"reports"/"expansion"/"publication-results.json"
price_updates=ROOT/"reports"/"prices"/"updates.json"
if publication.exists():
    p=json.loads(publication.read_text(encoding="utf-8"))
    counts["published_by_this_run"]=p.get("published",0)
if price_updates.exists():
    p=json.loads(price_updates.read_text(encoding="utf-8"))
    counts["price_updates_by_this_run"]=sum(x.get("status")=="updated" for x in p.get("results",[]))
previous=OUT.parent/"outcomes-baseline.json"
# Baseline must be explicit and persisted outside ephemeral Actions runners.
# Without a prior durable snapshot, do not invent a daily change in published totals.
report={"date_kst":now.date().isoformat(),"counts":counts,
 "published_change_since_previous_run":None,
 "note":"Total published delta unavailable without a durable prior snapshot; 24h insertion counts are exact DB queries."}
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
summary="## WeddingRank actual data outcomes\n\n"+"\n".join("- "+k+": **"+str(v)+"**" for k,v in counts.items())+"\n\nPublished delta: not measurable without persisted baseline.\n"
print(summary)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    with open(os.environ["GITHUB_STEP_SUMMARY"],"a",encoding="utf-8") as f:f.write(summary)
