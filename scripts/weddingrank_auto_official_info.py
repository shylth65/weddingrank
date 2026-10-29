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
    with urllib.request.urlopen(req,timeout=10) as response:
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
    source=h.get("source_url") or h["website"]
    if not source.startswith("https://"):continue
    host=canonical_host(source)
    if host!=canonical_host(h["website"]):continue
    if any(x in host for x in ("blog.","naver.","youtube.","instagram.","weddingrank.kr")):continue
    eligible.append((h,source))
eligible.sort(key=lambda x:x[0]["hall_id"])
start=(TODAY.toordinal()*8)%max(1,len(eligible))
sample=(eligible+eligible)[start:start+min(8,len(eligible))]
results=[]
for h,url in sample:
    result={"hall_id":h["hall_id"],"name":h["name"],"status":"held"}
    try:
        text=fetch_text(url)
        if not re.search(r"웨딩|결혼식|예식|wedding",text,re.I):raise ValueError("Wedding operation not explicit in page text")
        address=norm(h["road_address"])
        if len(address)<9 or address not in norm(text):raise ValueError("Registered address not found verbatim on official page")
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
report={"date_kst":TODAY.isoformat(),"eligible":len(eligible),"checked":len(results),
    "verified":sum(x["status"]=="verified" for x in results),"results":results}
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(report,ensure_ascii=False))
