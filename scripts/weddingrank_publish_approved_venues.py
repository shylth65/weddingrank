#!/usr/bin/env python3
"""Publish only individually approved, recently verified venues; never infer approval from HTTP status."""
import datetime as dt
import json
import os
import pathlib
import re
import urllib.parse
import urllib.request
import weddingrank_daily_audit as audit

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "approved-venue-publications.json"
OUT = ROOT / "reports" / "expansion" / "publication-results.json"
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
OUT.parent.mkdir(parents=True, exist_ok=True)

def norm(value):
    value = re.sub(r"\\s+", "", str(value or "")).lower()
    for long, short in (("서울특별시","서울"),("경기도","경기"),("인천광역시","인천"),("부산광역시","부산"),("대구광역시","대구"),("광주광역시","광주"),("대전광역시","대전"),("울산광역시","울산"),("경상남도","경남"),("경상북도","경북"),("충청북도","충북"),("충청남도","충남"),("전라남도","전남"),("전북특별자치도","전북"),("전라북도","전북")):
        if value.startswith(long): value = short + value[len(long):]
    return value

def request(method, table, params, payload=None):
    key = os.environ["WEDDINGRANK_PRICE_WRITE_KEY"]
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(audit.URL + "/rest/v1/" + table + "?" + urllib.parse.urlencode(params),
        data=data, method=method, headers={"apikey":key,"Authorization":"Bearer "+key,
        "Content-Type":"application/json","Prefer":"return=representation"})
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.load(response)

def main():
    approved = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if not isinstance(approved,list): raise ValueError("Approved manifest must be a list")
    if not os.environ.get("WEDDINGRANK_PRICE_WRITE_KEY"): raise RuntimeError("Existing credential missing")
    audit.KEY = os.environ["WEDDINGRANK_PRICE_WRITE_KEY"]
    halls = []
    for offset in range(0,3000,500):
        batch = audit.fetch("wedding_halls","hall_id,name,road_address,source_url,website,is_public,operation_status,verification_status","offset="+str(offset),500)
        halls.extend(batch)
        if len(batch)<500: break
    published = [h for h in halls if h.get("is_public") is True]
    results=[]
    for item in approved[:10]:
        result={"hall_id":item.get("hall_id"),"status":"skipped"}
        try:
            hall = next((h for h in halls if h["hall_id"]==item["hall_id"]),None)
            if hall is None: raise ValueError("Venue missing")
            if hall.get("is_public") is not False or hall.get("operation_status")!="운영": raise ValueError("Not an unpublished operating venue")
            if hall.get("verification_status")!="공식확인": raise ValueError("Not officially verified")
            if item.get("approved") is not True or item.get("checked_at")!=TODAY.isoformat(): raise ValueError("Explicit same-day approval required")
            if not item.get("official_wedding_evidence") or len(item["official_wedding_evidence"])<15: raise ValueError("Specific wedding evidence required")
            if not item.get("name") or norm(item["name"])!=norm(hall["name"]): raise ValueError("Name mismatch")
            if not item.get("road_address") or norm(item["road_address"])!=norm(hall["road_address"]): raise ValueError("Address mismatch")
            url=item.get("official_url","")
            if not url.startswith("https://") or url not in (hall.get("website"),hall.get("source_url")): raise ValueError("Official URL mismatch")
            if any(norm(h.get("name"))==norm(hall["name"]) or (norm(h.get("road_address")) and norm(h.get("road_address"))==norm(hall.get("road_address"))) for h in published): raise ValueError("Duplicate public venue")
            # A live HTTP response is not proof of wedding operation; manual evidence above is mandatory.
            updated=request("PATCH","wedding_halls",{"hall_id":"eq."+hall["hall_id"],"is_public":"eq.false","operation_status":"eq.운영","verification_status":"eq.공식확인","select":"hall_id,is_public"},{"is_public":True})
            if len(updated)!=1: raise ValueError("Conflict or no updated row")
            result["status"]="published"
            published.append(hall)
        except (KeyError,ValueError,TypeError,OSError) as ex:
            result["status"]="not_published"
            result["reason"]=str(ex)
        results.append(result)
    summary={"date_kst":TODAY.isoformat(),"reviewed":len(results),"published":sum(r["status"]=="published" for r in results),"results":results}
    OUT.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\\n",encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False))
if __name__=="__main__": main()
