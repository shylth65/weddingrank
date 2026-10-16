'use strict';
// Manual specialist-only data expansion. Own DB, GitHub Secrets; never touch ratings, prices, member reviews.
const {createClient}=require('@supabase/supabase-js');
const fs=require('node:fs');
const patch=JSON.parse(fs.readFileSync('research/patches/2026-10-16-manual-official-rooms-and-directory.json','utf8'));
if(patch.schema_version!=='weddingrank-manual-evidence-directory-and-rooms-v1'||patch.scope!=='WeddingRank-only'||
  !patch.policy.preserve_existing_originals||!patch.policy.no_review_or_rating_changes)throw Error('Policy guard rejected');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('Wrong specialist GitHub Secrets');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
const host=s=>{try{return new URL(s).hostname.replace(/^www\\./,'')}catch{return ''}};
const validUrl=s=>typeof s==='string'&&s.startsWith('https://');
async function all(table,columns){
 const rows=[];for(let i=0;;i+=500){
  const {data,error}=await db.from(table).select(columns).range(i,i+499);
  if(error)throw Error(table+': '+error.message);rows.push(...data);if(data.length<500)break;
 }return rows;
}
async function main(){
 const [halls,rooms,prices,ratings,sources,analyses]=await Promise.all([
  all('wedding_halls','hall_id,name,road_address,phone,website,is_public,operation_status'),
  all('hall_rooms','room_id,hall_id,room_name,source_url,capacity_min,capacity_max'),
  all('wedding_prices','hall_id,source_url'),
  all('external_wedding_ratings','hall_id,is_public,updated_at'),
  all('wedding_review_sources','hall_id'),all('wedding_review_analysis','hall_id')
 ]);
 const state=a=>JSON.stringify(a.map(x=>[x.hall_id,x.is_public,x.updated_at]).sort((x,y)=>String(x[0]).localeCompare(String(y[0]))));
 const beforeRatings=state(ratings);
 const publicBefore=halls.filter(x=>x.is_public===true&&x.operation_status==='운영').length;
 const beforeRooms=rooms.length;const publicRoomBefore=rooms.filter(r=>halls.some(h=>h.hall_id===r.hall_id&&h.is_public===true&&h.operation_status==='운영')).length;const holds=[],validated=[];
 for(const v of [...patch.publish_venues,...patch.enrich_rooms]){
  const hall=halls.find(x=>x.hall_id===v.id);const why=[];
  if(!hall)why.push('not_found');
  else {
   if(hall.name!==v.name||hall.road_address!==v.address||hall.phone!==v.phone||hall.website!==v.website)
    why.push('identity_conflict');
   if(hall.operation_status!=='운영')why.push('not_operating');
   const dup=halls.filter(x=>x.hall_id!==v.id&&(norm(x.name)===norm(v.name)||
      (x.road_address&&norm(x.road_address)===norm(v.address)&&
       !(x.road_address.includes('새말로 97')&&v.address.includes('새말로 97')))));
   if(dup.length)why.push('duplicate:'+dup.map(x=>x.hall_id).join(','));
  }
  if(patch.publish_venues.includes(v)){
   if(hall?.is_public!==false)why.push('already_public_or_unknown');
   if(prices.some(x=>x.hall_id===v.id))why.push('price_provenance_unconfirmed');
   const ownRooms=rooms.filter(x=>x.hall_id===v.id);
   if(ownRooms.length!==1||norm(ownRooms[0].room_name)!==norm(v.existing_room_name)||!validUrl(ownRooms[0].source_url)||
       host(ownRooms[0].source_url)!==host(v.website)||ownRooms[0].capacity_min!=null||ownRooms[0].capacity_max!=null)
    why.push('existing_room_unverified');
   if(!validUrl(v.official_url)||host(v.official_url)!==host(v.website))why.push('official_wedding_url_invalid');
  } else {
   if(hall?.is_public!==true)why.push('not_currently_public');
   if(!v.rooms?.length||v.rooms.some(r=>!r.room_name||!validUrl(r.source_url)||host(r.source_url)!==host(v.website)||
      r.capacity_min!=null||r.capacity_max!=null))why.push('room_source_unverified');
  }
  if(why.length)holds.push({id:v.id,name:v.name,reasons:why});
  else validated.push(v);
 }
 const added=[],newlyPublic=[],roomErrors=[];
 // Add rooms without modifying existing original rows. Leave unknown capacity NULL.
 for(const v of validated.filter(v=>patch.enrich_rooms.includes(v))){
  for(const r of v.rooms){
   if(rooms.some(x=>x.hall_id===v.id&&norm(x.room_name)===norm(r.room_name)))continue;
   const payload={hall_id:v.id,room_name:r.room_name,floor:r.floor??null,
     capacity_min:null,capacity_max:null,source_url:r.source_url,verified_at:patch.audited_on,
     notes:'Verified on original operator wedding page; capacity intentionally unknown (2026-10-16)'};
   const {data,error}=await db.from('hall_rooms').insert(payload).select('room_id,hall_id,room_name').single();
   if(error){roomErrors.push({name:v.name,room:r.room_name,code:error.code||'',message:error.message});continue;}
   added.push(data);
  }
 }
 for(const v of validated.filter(v=>patch.publish_venues.includes(v))){
  const {data,error}=await db.from('wedding_halls').update({is_public:true})
   .eq('hall_id',v.id).eq('name',v.name).eq('road_address',v.address)
   .eq('phone',v.phone).eq('website',v.website).eq('operation_status','운영').eq('is_public',false)
   .select('hall_id,is_public,operation_status');
  if(error)throw Error('Publish failed '+v.name+': '+error.message);
  if(data?.length!==1||data[0].is_public!==true)throw Error('Publish postcondition failed: '+v.name);
  newlyPublic.push({id:v.id,name:v.name,source:v.official_url});
 }
 const [afterHalls,afterRooms,afterRatings,afterSources,afterAnalyses,afterPrices]=await Promise.all([
  all('wedding_halls','hall_id,name,is_public,operation_status'),
  all('hall_rooms','room_id,hall_id,room_name'),
  all('external_wedding_ratings','hall_id,is_public,updated_at'),
  all('wedding_review_sources','hall_id'),all('wedding_review_analysis','hall_id'),all('wedding_prices','hall_id')
 ]);
 const publicAfter=afterHalls.filter(x=>x.is_public===true&&x.operation_status==='운영').length;
 const publicRoomAfter=afterRooms.filter(r=>afterHalls.some(h=>h.hall_id===r.hall_id&&h.is_public===true&&h.operation_status==='운영')).length;
 if(publicAfter!==publicBefore+newlyPublic.length)throw Error('Unexpected public count difference');
 if(afterRooms.length!==beforeRooms+added.length)throw Error('Unexpected room count difference');
 if(state(afterRatings)!==beforeRatings||afterSources.length!==sources.length||afterAnalyses.length!==analyses.length||afterPrices.length!==prices.length)
  throw Error('Rating, source, analysis or price unexpectedly changed');
 for(const x of added)if(!afterRooms.some(y=>y.room_id===x.room_id))throw Error('Room insertion not persisted');
 console.log('WEDDINGRANK_MANUAL_20261016_RESULT='+JSON.stringify({
  public_before:publicBefore,public_after:publicAfter,rooms_before_total:beforeRooms,rooms_after_total:afterRooms.length,public_rooms_before:publicRoomBefore,public_rooms_after:publicRoomAfter,
  newly_public:newlyPublic,new_rooms:added,room_insert_errors:roomErrors,held:holds.concat(patch.held_with_evidence),
  review_sources:sources.length,review_analyses:analyses.length,numeric_rating_public:afterRatings.filter(x=>x.is_public).length,
  price_rows:prices.length,ranking_basis_dates_changed:0,original_rows_deleted:0
 }));
 if(roomErrors.length)process.exitCode=2;
}
main().catch(e=>{console.error('WEDDINGRANK_MANUAL_20261016_ERROR='+e.stack);process.exit(1)});
