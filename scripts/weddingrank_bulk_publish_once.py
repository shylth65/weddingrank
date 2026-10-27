#!/usr/bin/env python3
"""Render one-time guarded SQL for individually reviewed venue approvals.
No network access, credential reads, schedules, migrations or ranking writes.
Execute the generated SQL only through the existing authorized DB connector.
"""
import argparse,datetime as dt,json,pathlib,re,collections

def norm(s):
 s=re.sub(r'\s+','',str(s or '')).lower()
 for a,b in [('서울특별시','서울'),('서울시','서울'),('경기도','경기'),('인천광역시','인천'),('부산광역시','부산'),('대구광역시','대구'),('광주광역시','광주'),('대전광역시','대전'),('울산광역시','울산'),('강원특별자치도','강원'),('강원도','강원'),('전북특별자치도','전북'),('전라북도','전북'),('경상남도','경남'),('경상북도','경북'),('전라남도','전남'),('충청북도','충북'),('충청남도','충남')]:
  if s.startswith(a):s=b+s[len(a):]
 return s

def validate(approvals,halls,checked_date):
 byid={h['hall_id']:h for h in halls};seen=set();public=[h for h in halls if h['is_public']]
 errors=[];valid=[]
 for row in approvals:
  try:
   hid=row['hall_id'];assert hid not in seen,'duplicate approval ID';seen.add(hid)
   old=byid[hid];assert old['is_public'] is False,'already public'
   assert row.get('approved') is True and row.get('checked_at')==checked_date,'missing current explicit approval'
   assert row['name']==old['name'] and row['expected_before']['name']==old['name'],'identity conflict'
   assert row.get('road_address') and row.get('official_url','').startswith('https://'),'address/source missing'
   assert len(row.get('official_wedding_evidence',''))>=25,'substantive wedding evidence missing'
   assert old['operation_status'] in ('운영','오픈예정'),'operation not approved'
   for key in ['road_address','operation_status','verification_status','website','source_url','is_public']:
    assert old[key]==row['expected_before'][key],f'stale preimage: {key}'
   for p in public+valid:
    assert norm(p['name'])!=norm(row['name']),'duplicate published name'
    if norm(p.get('road_address'))==norm(row['road_address']):
     assert row.get('distinct_subvenue') is True,'shared-address needs explicit distinct-space proof'
     assert p.get('official_url',p.get('source_url'))!=row['official_url'],'same official venue'
   valid.append(row)
  except (AssertionError,KeyError) as e:errors.append({'hall_id':row.get('hall_id'),'name':row.get('name'),'reason':str(e)})
 return valid,errors

def render_sql(rows):
 # JSON is SQL-quoted as one literal; individual fields are never interpolated as SQL.
 payload=json.dumps(rows,ensure_ascii=False).replace("'","''")
 return """DO $wr_bulk$
DECLARE item jsonb; changed uuid; receipt jsonb := '[]'::jsonb;
BEGIN
 FOR item IN SELECT value FROM jsonb_array_elements('"""+payload+"""'::jsonb) LOOP
  BEGIN
   IF item->>'checked_at' <> (now() AT TIME ZONE 'Asia/Seoul')::date::text OR item->>'approved' <> 'true' THEN
    RAISE EXCEPTION 'Explicit same-day approval required';
   END IF;
   IF EXISTS (SELECT 1 FROM public.wedding_halls p WHERE p.is_public IS TRUE
      AND p.hall_id <> (item->>'hall_id')::uuid
      AND (regexp_replace(lower(p.name),'\\s+','','g')=regexp_replace(lower(item->>'name'),'\\s+','','g')
        OR (p.road_address=item->>'road_address' AND coalesce((item->>'distinct_subvenue')::boolean,false) IS FALSE))) THEN
    RAISE EXCEPTION 'Duplicate public identity/address';
   END IF;
   UPDATE public.wedding_halls h SET
      is_public=true, verification_status='공식확인', operation_status='운영',
      road_address=item->>'road_address', website=item->>'official_url',
      source_url=item->>'official_url', source_name='공식 예식 운영자료: 2026-10-27 일회성 검증',
      verified_at=(item->>'checked_at')::date,updated_at=now(),
      notes=concat_ws(E'\\n',nullif(h.notes,''),'2026-10-27 일회성 공식검증·공개: '||(item->>'official_wedding_evidence'))
    WHERE h.hall_id=(item->>'hall_id')::uuid AND h.is_public IS FALSE
      AND h.name=item->>'name'
      AND h.road_address IS NOT DISTINCT FROM item->'expected_before'->>'road_address'
      AND h.operation_status IS NOT DISTINCT FROM item->'expected_before'->>'operation_status'
      AND h.verification_status IS NOT DISTINCT FROM item->'expected_before'->>'verification_status'
      AND h.website IS NOT DISTINCT FROM item->'expected_before'->>'website'
      AND h.source_url IS NOT DISTINCT FROM item->'expected_before'->>'source_url'
    RETURNING h.hall_id INTO changed;
   IF changed IS NULL THEN RAISE EXCEPTION 'Stale row, already published or missing'; END IF;
   receipt:=receipt||jsonb_build_array(jsonb_build_object('hall_id',changed,'name',item->>'name','status','published'));
  EXCEPTION WHEN OTHERS THEN
   receipt:=receipt||jsonb_build_array(jsonb_build_object('hall_id',item->>'hall_id','name',item->>'name','status','not_published','reason',SQLERRM));
  END;
 END LOOP;
 PERFORM set_config('weddingrank.bulk_publication_receipt',receipt::text,false);
END $wr_bulk$;
SELECT current_setting('weddingrank.bulk_publication_receipt')::jsonb AS receipt;
"""

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--manifest',required=True);p.add_argument('--snapshot',required=True);p.add_argument('--date',default=dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date().isoformat());p.add_argument('--output',required=True);a=p.parse_args()
 rows=json.loads(pathlib.Path(a.manifest).read_text());snap=json.loads(pathlib.Path(a.snapshot).read_text());valid,errors=validate(rows,snap['halls'],a.date)
 pathlib.Path(a.output).write_text(render_sql(valid));print(json.dumps({'approved':len(valid),'excluded':errors},ensure_ascii=False))
 if errors:raise SystemExit(1)
if __name__=='__main__':main()
