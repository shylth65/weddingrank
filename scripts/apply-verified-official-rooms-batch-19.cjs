'use strict';
// Specialist WeddingRank source DB only. Original hall, price, review and rating rows are immutable.
const fs=require('node:fs'),{createClient}=require('@supabase/supabase-js');
const patch=JSON.parse(fs.readFileSync('research/patches/2026-10-16-manual-official-room-insert-batch-19.json','utf8'));
if(patch.schema_version!=='weddingrank-official-room-insert-v1'||patch.scope!=='WeddingRank-only'||
 !patch.policy.only_first_party_wedding_proofs||!patch.policy.only_current_public_operating||
 !patch.policy.only_halls_with_zero_room_rows||!patch.policy.preserve_originals||
 !patch.policy.no_price_review_rating_changes||!patch.policy.do_not_change_cron)throw Error('Publication guard rejected');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('Wrong WeddingRank GitHub Secrets');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
async function all(t,cols){const result=[];for(let n=0;;n+=500){
 const {data,error}=await db.from(t).select(cols).range(n,n+499);if(error)throw Error(t+':'+error.message);
 result.push(...data);if(data.length<500)break;}return result;}
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
const hostname=s=>{try{return new URL(s).hostname.replace(/^www\./,'')}catch{return ''}};
const ratingSignature=rs=>JSON.stringify(rs.map(r=>[r.hall_id,r.is_public,r.updated_at,r.overall_score,r.source_count])
 .sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
async function main(){
 const [halls,rooms,ratings,prices,sources,analyses]=await Promise.all([
 all('wedding_halls','hall_id,name,road_address,website,is_public,operation_status'),
 all('hall_rooms','room_id,hall_id,room_name,source_url'),
 all('external_wedding_ratings','hall_id,is_public,updated_at,overall_score,source_count'),
 all('wedding_prices','hall_id'),all('wedding_review_sources','hall_id'),all('wedding_review_analysis','hall_id')
 ]);
 const before={public_halls:halls.filter(h=>h.is_public===true&&h.operation_status==='운영').length,
  all_halls:halls.length,all_rooms:rooms.length,
  public_rooms:rooms.filter(r=>halls.some(h=>h.hall_id===r.hall_id&&h.is_public===true&&h.operation_status==='운영')).length,
  numeric_ratings:ratings.filter(r=>r.is_public).length,prices:prices.length,sources:sources.length,analyses:analyses.length};
 const sig=ratingSignature(ratings);
 const log={batch:19,scope:'WeddingRank-only',timestamp:new Date().toISOString(),before,held:[],selected:[],inserted:[],errors:[]};
 for(const v of patch.venues){
  const hits=halls.filter(h=>h.hall_id===v.id),h=hits[0],issues=[];
  if(hits.length!==1||h?.name!==v.name||h?.road_address!==v.address||h?.website!==v.website||
    h?.is_public!==true||h?.operation_status!=='운영')issues.push('unverified venue identity or operation state');
  if(h&&halls.some(x=>x.hall_id!==v.id&&(norm(x.name)===norm(v.name)||
     (x.road_address&&norm(x.road_address)===norm(v.address)))))issues.push('duplicate facility or address');
  if(rooms.some(r=>r.hall_id===v.id))issues.push('target venue is no longer missing rooms');
  if(!Array.isArray(v.rooms)||v.rooms.length===0)issues.push('no original room evidence');
  else{
   const seen=new Set();
   for(const r of v.rooms){
    if(!r.name||seen.has(norm(r.name)))issues.push('blank or duplicate room name');
    seen.add(norm(r.name));
    if(!r.source_url?.startsWith('https://')||hostname(r.source_url)!==hostname(v.website))
      issues.push('original operator domain mismatch');
    if(r.capacity_max!=null&&(!Number.isInteger(r.capacity_max)||r.capacity_max<=0))
      issues.push('invalid source-confirmed capacity');
   }
  }
  if(issues.length)log.held.push({id:v.id,name:v.name,reasons:[...new Set(issues)]});
  else log.selected.push(v);
 }
 try{
  // Identity is revalidated directly before insertion; missing/changed records are never overwritten.
  for(const v of log.selected){
   const {data:now,error:e}=await db.from('wedding_halls')
    .select('name,road_address,website,is_public,operation_status').eq('hall_id',v.id).single();
   if(e)throw e;
   if(now.name!==v.name||now.road_address!==v.address||now.website!==v.website||
      now.is_public!==true||now.operation_status!=='운영')throw Error('Venue changed during batch: '+v.name);
   const {count,error:rc}=await db.from('hall_rooms').select('room_id',{count:'exact',head:true}).eq('hall_id',v.id);
   if(rc||count!==0)throw Error('Room concurrency conflict: '+v.name);
   for(const r of v.rooms){
    const row={hall_id:v.id,room_name:r.name,floor:r.floor??null,capacity_min:null,
      capacity_max:r.capacity_max??null,source_url:r.source_url,verified_at:patch.audited_on,
      notes:'2026-10-16 official operator wedding-page original: '+r.notes+'; no estimated price or attendee count'};
    const {data,error}=await db.from('hall_rooms').insert(row)
      .select('room_id,hall_id,room_name,floor,capacity_min,capacity_max,source_url').single();
    if(error)throw Error('INSERT '+v.name+' '+r.name+': '+error.message);
    if(data.hall_id!==v.id||data.room_name!==r.name||data.source_url!==r.source_url)
      throw Error('INSERT postcondition failed for '+v.name+' '+r.name);
    log.inserted.push(data);
   }
  }
  const [newHalls,newRooms,newRatings,newPrices,newSources,newAnalyses]=await Promise.all([
   all('wedding_halls','hall_id,is_public,operation_status'),all('hall_rooms','room_id,hall_id,room_name'),
   all('external_wedding_ratings','hall_id,is_public,updated_at,overall_score,source_count'),
   all('wedding_prices','hall_id'),all('wedding_review_sources','hall_id'),all('wedding_review_analysis','hall_id')
  ]);
  const after={public_halls:newHalls.filter(h=>h.is_public&&h.operation_status==='운영').length,
   all_halls:newHalls.length,all_rooms:newRooms.length,
   public_rooms:newRooms.filter(r=>newHalls.some(h=>h.hall_id===r.hall_id&&h.is_public&&h.operation_status==='운영')).length,
   numeric_ratings:newRatings.filter(r=>r.is_public).length,prices:newPrices.length,sources:newSources.length,analyses:newAnalyses.length};
  log.after=after;
  if(after.all_halls!==before.all_halls||after.public_halls!==before.public_halls||
     after.all_rooms!==before.all_rooms+log.inserted.length||
     after.public_rooms!==before.public_rooms+log.inserted.length||
     after.numeric_ratings!==before.numeric_ratings||after.prices!==before.prices||
     after.sources!==before.sources||after.analyses!==before.analyses||ratingSignature(newRatings)!==sig)
    throw Error('Unexpected specialist original change');
  for(const row of log.inserted)if(!newRooms.some(x=>x.room_id===row.room_id))throw Error('Inserted room was not persisted');
  log.result='PASS';
 }catch(err){log.result='ERROR';log.errors.push(String(err));process.exitCode=1;}
 finally{
  fs.writeFileSync('weddingrank-batch-19-proof.json',JSON.stringify(log,null,2)+'\n');
  console.log('WEDDINGRANK_BATCH_19='+JSON.stringify(log));
 }
}
main().catch(err=>{console.error('WEDDINGRANK_BATCH_19_FATAL='+String(err));process.exitCode=1});
