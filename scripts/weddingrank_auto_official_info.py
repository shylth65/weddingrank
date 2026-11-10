#!/usr/bin/env python3
"""Conservative daily official-info verifier for existing PUBLIC operating venues.
Only stores independently rechecked address and official booking URL. Never touches price or publication.
"""
import datetime as dt
import html
import json
import os
import pathlib
import re
import urllib.parse
import urllib.request
import weddingrank_daily_audit as audit

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"reports"/"daily"/"official-info-refresh.json"
OUT.parent.mkdir(parents=True,exist_ok=True)
TODAY=dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
KEY=os.environ.get("WEDDINGRANK_PRICE_WRITE_KEY","")
if not KEY: raise RuntimeError("Existing DB credential missing")
audit.KEY=KEY

def all_rows(table,fields):
    rows=[]
    for offset in range(0,3000,500):
        part=audit.fetch(table,fields,"offset="+str(offset),500)
        rows.extend(part)
        if len(part)<500:break
    return rows

def norm(x):
    return re.sub(r"[^0-9a-z가-힣]","",str(x or "").lower())

def canonical_host(url):
    p=urllib.parse.urlparse(url)
    return (p.hostname or "").lower().removeprefix("www.")

def fetch_text(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 WeddingRankOfficialVerifier/1.0"})
    with urllib.request.urlopen(req,timeout=5) as response:
        if response.status!=200:raise ValueError("HTTP not 200")
        if "text/html" not in response.headers.get("Content-Type",""):raise ValueError("Not HTML")
        final=response.geturl()
        if canonical_host(final)!=canonical_host(url):raise ValueError("Redirect to another domain")
        body=response.read(400000).decode("utf-8",errors="replace")
    text=html.unescape(re.sub(r"<[^>]+>"," ",re.sub(r"<(script|style)\b[^>]*>.*?</\1>"," ",body,flags=re.I|re.S)))
    return re.sub(r"\s+"," ",text)

def write(item):
    url=audit.URL+"/rest/v1/wedding_venue_fact_checks"
    body=json.dumps(item,ensure_ascii=False).encode()
    req=urllib.request.Request(url,data=body,method="POST",headers={
        "apikey":KEY,"Authorization":"Bearer "+KEY,"Content-Type":"application/json","Prefer":"return=representation"})
    with urllib.request.urlopen(req,timeout=25) as response:return json.load(response)

halls=all_rows("wedding_halls","hall_id,name,road_address,website,source_url,is_public,operation_status")
checks=all_rows("wedding_venue_fact_checks","hall_id,status,checked_at,created_at")
checks.sort(key=lambda x:(x.get("checked_at") or "",x.get("created_at") or ""),reverse=True)
latest={}
for x in checks:latest.setdefault(x["hall_id"],x)
eligible=[]
for h in halls:
    if h.get("is_public") is not True or h.get("operation_status")!="운영":continue
    if latest.get(h["hall_id"],{}).get("status")!="held":continue
    if not h.get("road_address") or not h.get("website"):continue
    # Prefer the official source, but permit a same-owner website fallback if it differs.
    source=h.get("source_url") or h["website"]
    if not source.startswith("https://"):continue
    host=canonical_host(source)
    if host!=canonical_host(h["website"]):
        # Cross-domain official ownership is not established; use the venue website instead.
        source=h["website"]
        if not source.startswith("https://"):continue
        host=canonical_host(source)
    if any(x in host for x in ("blog.","naver.","youtube.","instagram.","weddingrank.kr")):continue
    eligible.append((h,source))
eligible.sort(key=lambda x:x[0]["hall_id"])
start=((TODAY.toordinal()-dt.date(2026,1,1).toordinal())*8)%max(1,len(eligible))
# Rotate across all candidates, but skip recently failed sites for a short cooldown.
cooldown_path=ROOT/"reports"/"daily"/"official-info-failures.json"
# Prior failures are restored by the existing daily workflow cache.
try:
    previous=json.loads(cooldown_path.read_text(encoding="utf-8"))
except (OSError,ValueError):
    previous={}

def cooling_down(h):
    last=previous.get(h["hall_id"],{})
    try:
        age=(TODAY-dt.date.fromisoformat(last["date"])).days
    except (KeyError,TypeError,ValueError):
        return False
    return age<3 and last.get("reason") in ("timeout","dns","tls_certificate","connection_reset")

ordered=(eligible+eligible)[start:start+len(eligible)]
skipped_cooldown=sum(cooling_down(item[0]) for item in ordered)
sample=[item for item in ordered if not cooling_down(item[0])][:min(8,len(eligible))]
# Do not weaken SSL validation or treat a failed connection as official evidence.
results=[]
for h,url in sample:
    result={"hall_id":h["hall_id"],"name":h["name"],"status":"held"}
    try:
        text=fetch_text(url)
        if not re.search(r"웨딩|결혼식|예식|wedding",text,re.I):raise ValueError("Wedding operation not explicit in page text")
        address=norm(h["road_address"])
        if len(address)<9 or address not in norm(text):
            # Look for the registered address on same-domain directions pages.
            base=urllib.parse.urlparse(url)
            matched=False
            for path in ("/location","/directions","/contact","/about/location"):
                try:
                    location_url=urllib.parse.urlunparse((base.scheme,base.netloc,path,"","",""))
                    if address in norm(fetch_text(location_url)):
                        matched=True
                        break
                except (ValueError,OSError):
                    continue
            if not matched:raise ValueError("Official homepage/directions address not matched")
        fields={k:{"value":v,"status":"official","source_url":url,"verified_at":TODAY.isoformat()} for k,v in {
            "road_address":h["road_address"],"booking":url}.items()}
        record={"batch_id":"weddingrank-official-auto-"+TODAY.isoformat(),"hall_id":h["hall_id"],
            "checked_at":TODAY.isoformat(),"status":"verified","source_url":url,
            "reason":"Official same-domain HTML explicitly mentions wedding and matches registered full address; no prices inferred",
            "fields":fields,"http_status":"200"}
        saved=write(record)
        if len(saved)!=1:raise ValueError("DB did not confirm insert")
        result["status"]="verified";result["field_count"]=len(fields)
    except Exception as exc:
        result["reason"]=str(exc)[:180]
    results.append(result)
from collections import Counter
def classify(reason):
    r=reason.lower()
    if "timed out" in r:return "timeout"
    if "certificate" in r or "ssl" in r:return "tls_certificate"
    if "name resolution" in r or "no address associated" in r:return "dns"
    if "reset by peer" in r:return "connection_reset"
    if "address not matched" in r:return "address_mismatch"
    if "wedding operation" in r:return "wedding_evidence_missing"
    if reason=="verified":return "verified"
    return "other"
reasons=Counter(classify(x.get("reason","verified")) for x in results)
report={"date_kst":TODAY.isoformat(),"eligible":len(eligible),"checked":len(results),"failure_reasons":dict(reasons),
    "verified":sum(x["status"]=="verified" for x in results),"skipped_cooldown":skipped_cooldown,"results":results}
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
failures={hall_id:record for hall_id,record in previous.items() if isinstance(record,dict) and record.get("date") and record.get("reason")}
for x in results:
    if x["status"]=="verified":
        failures.pop(x["hall_id"],None)
    else:
        failures[x["hall_id"]]={"date":TODAY.isoformat(),"reason":classify(x.get("reason","verified"))}
for hall_id,record in list(failures.items()):
    try:
        if (TODAY-dt.date.fromisoformat(record["date"])).days>=3:failures.pop(hall_id,None)
    except (ValueError,TypeError,KeyError):
        failures.pop(hall_id,None)
cooldown_path.write_text(json.dumps(failures,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(report,ensure_ascii=False))
