'use strict';
// WeddingRank room metadata verification: DB-only, specialist GitHub Secrets only.
const fs=require('node:fs');
const {createClient}=require('@supabase/supabase-js');
const patch=JSON.parse(fs.readFileSync('research/patches/2026-10-16-manual-official-room-metadata-batch-18.json','utf8'));
if(patch.schema_version!=='weddingrank-official-room-metadata-batch-v1' ||
 patch.scope!=='WeddingRank-only' || !patch.policy.original_rows_preserved ||
 !patch.policy.room_metadata_only || !patch.policy.review_rating_price_untouched ||
 !patch.policy.no_new_rating_publication)throw Error('Specialist-only evidence guard failed');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')
 throw Error('Missing or incorrect GitHub Secrets for WeddingRank');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
async function all(t,cols){
 const out=[];for(let i=0;;i+=500){
  const {data,error}=await db.from(t).select(cols).range(i,i+499);
  if(error)throw Error(t+': '+error.message);
  out.push(...data);if(data.length<500)break;
 }return out;
}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const ratingSignature=(rs)=>JSON.stringify(rs.map(x=>[x.hall_id,x.is_public,x.updated_at,x.overall_score,x.source_count])
 .sort((x,y)=>String(x[0]).localeCompare(String(y[0]))));
const roomFields=r=>({floor:r.floor??null,capacity_min:r.capacity_min??null,capacity_max:r.capacity_max??null});
async function run(){
 const [halls,rooms,ratings,sources,analyses,prices]=await Promise.all([
  all('wedding_halls','hall_id,name,road_address,is_public,operation_status'),
  all('hall_rooms','room_id,hall_id,room_name,floor,capacity_min,capacity_max,source_url,notes'),
  all('external_wedding_ratings','hall_id,is_public,updated_at,overall_score,source_count'),
  all('wedding_review_sources','hall_id'),
  all('wedding_review_analysis','hall_id'),
  all('wedding_prices','hall_id')
 ]);
 const pre={all_venues:halls.length,public_venues:halls.filter(h=>h.is_public&&h.operation_status==='운영').length,
  all_rooms:rooms.length,public_rooms:rooms.filter(r=>halls.some(h=>h.hall_id===r.hall_id&&h.is_public&&h.operation_status==='운영')).length,
  rating_count:ratings.filter(r=>r.is_public).length,rating_signature:ratingSignature(ratings),
  review_sources:sources.length,review_analyses:analyses.length,prices:prices.length};
 const audit={batch:18,scope:'WeddingRank-only',checked_at:new Date().toISOString(),before:pre,selected:[],held:patch.held.slice(),applied:[],errors:[]};
 // Preflight every venue and exact hall + original official evidence before mutation.
 for(const v of patch.updates){
  const h=halls.filter(x=>x.hall_id===v.id);const match=rooms.filter(x=>x.hall_id===v.id&&x.room_name===v.room);const why=[];
  if(h.length!==1||h[0].name!==v.name||h[0].road_address!==v.address||h[0].is_public!==true||
   h[0].operation_status!=='운영')why.push('venue identity or publication changed');
  if(match.length!==1)why.push('venue room identity count != 1');
  if(match.length===1){
   const old=match[0];
   if(old.source_url!==v.source)why.push('original room source URL changed');
   if(!v.source.startsWith('https://'))why.push('nonsecure original source URL');
   if(!equal(old.capacity_max??null,v.expected.capacity_max))why.push('capacity_max changed');
   if(!equal(old.capacity_min??null,v.expected.capacity_min)&&
      !equal(old.capacity_min??null,v.corrected.capacity_min))why.push('capacity_min unexpected');
   if(!equal(old.floor??null,v.expected.floor)&&!equal(old.floor??null,v.corrected.floor))
      why.push('floor unexpectedly modified');
  }
  if(why.length)audit.held.push({id:v.id,name:v.name,room:v.room,reasons:why});
  else audit.selected.push({id:v.id,name:v.name,room:v.room,room_id:match[0].room_id,
   source:v.source,old:roomFields(match[0]),desired:v.corrected,why:v.why});
 }
 try{
  for(const entry of audit.selected){
   const {data:live,error:readErr}=await db.from('hall_rooms')
    .select('room_id,room_name,hall_id,floor,capacity_min,capacity_max,source_url,notes')
    .eq('room_id',entry.room_id).single();
   if(readErr)throw readErr;
   if(live.room_name!==entry.room||live.hall_id!==entry.id||live.source_url!==entry.source||
      !equal(roomFields(live),entry.old))throw Error('Concurrent room mutation: '+entry.room);
   if(equal(roomFields(live),entry.desired)){
    audit.applied.push({id:entry.id,room:entry.room,status:'already_verified',previous:entry.old});
    continue;
   }
   const newNotes=String(live.notes||'')+' | 2026-10-16 공식 웨딩 원문 검증: '+entry.why;
   let q=db.from('hall_rooms').update({...entry.desired,notes:newNotes})
    .eq('room_id',entry.room_id).eq('source_url',entry.source);
   if(live.floor==null)q=q.is('floor',null);else q=q.eq('floor',live.floor);
   if(live.capacity_min==null)q=q.is('capacity_min',null);else q=q.eq('capacity_min',live.capacity_min);
   if(live.capacity_max==null)q=q.is('capacity_max',null);else q=q.eq('capacity_max',live.capacity_max);
   const {data,error}=await q.select('room_id,room_name,hall_id,floor,capacity_min,capacity_max,source_url');
   if(error)throw Error('Failed to update '+entry.room+': '+error.message);
   if(data?.length!==1||!equal(roomFields(data[0]),entry.desired))
    throw Error('Room update postcondition mismatch: '+entry.room);
   audit.applied.push({id:entry.id,room:entry.room,status:'updated',before:entry.old,after:roomFields(data[0])});
  }
  const [newRooms,newHalls,newRatings,newSources,newAnalyses,newPrices]=await Promise.all([
   all('hall_rooms','room_id,hall_id,room_name,floor,capacity_min,capacity_max'),
   all('wedding_halls','hall_id,is_public,operation_status'),
   all('external_wedding_ratings','hall_id,is_public,updated_at,overall_score,source_count'),
   all('wedding_review_sources','hall_id'),all('wedding_review_analysis','hall_id'),all('wedding_prices','hall_id')
  ]);
  audit.after={all_venues:newHalls.length,public_venues:newHalls.filter(h=>h.is_public&&h.operation_status==='운영').length,
   all_rooms:newRooms.length,public_rooms:newRooms.filter(r=>newHalls.some(h=>h.hall_id===r.hall_id&&h.is_public&&h.operation_status==='운영')).length,
   rating_count:newRatings.filter(r=>r.is_public).length,review_sources:newSources.length,review_analyses:newAnalyses.length,prices:newPrices.length};
  if(pre.all_venues!==audit.after.all_venues||pre.public_venues!==audit.after.public_venues||
   pre.all_rooms!==audit.after.all_rooms||pre.public_rooms!==audit.after.public_rooms||
   pre.rating_count!==audit.after.rating_count||pre.rating_signature!==ratingSignature(newRatings)||
   pre.review_sources!==audit.after.review_sources||pre.review_analyses!==audit.after.review_analyses||
   pre.prices!==audit.after.prices)throw Error('Unexpected changes outside verified room metadata');
  audit.result='PASS';
 }catch(e){audit.result='ERROR';audit.errors.push(String(e));process.exitCode=1;}
 finally{
  fs.writeFileSync('weddingrank-batch-18-proof.json',JSON.stringify(audit,null,2)+'\n');
  console.log('WEDDINGRANK_BATCH_18='+JSON.stringify({...audit,before:{...pre,rating_signature:'redacted'}}));
 }
}
run().catch(e=>{console.error('WEDDINGRANK_BATCH_18_FATAL='+String(e));process.exitCode=1});
