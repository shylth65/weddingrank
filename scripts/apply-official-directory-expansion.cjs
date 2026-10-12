'use strict';
// WeddingRank specialist directory only. No ranking, review or central sync writes.
const {createClient}=require('@supabase/supabase-js');
const {readFileSync}=require('node:fs');
const patch=JSON.parse(readFileSync('research/patches/2026-10-12-public-directory-expansion-verified.json','utf8'));
if(patch.schema_version!=='weddingrank-manual-official-directory-promotion-v2'||patch.scope!=='WeddingRank-only'||patch.pickrank_sync!==false)throw Error('WeddingRank publication guard');
const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!u||!k||new URL(u).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('Missing/incorrect WeddingRank GitHub Secrets');
const db=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
const rootHost=s=>{try{return new URL(s).hostname.replace(/^www\./,'')}catch{return ''}};
const same=(x,y)=>x===y;
async function all(t,cols){
 const out=[];
 for(let i=0;;i+=500){const {data,error}=await db.from(t).select(cols).range(i,i+499);if(error)throw error;out.push(...data);if(data.length<500)return out;}
}
const get=async(id)=>{const {data,error}=await db.from('wedding_halls')
 .select('hall_id,name,road_address,phone,website,is_public,operation_status').eq('hall_id',id).single();if(error)throw error;return data};
async function main(){
 const [halls,allRooms,allPrices,ratings]=await Promise.all([
  all('wedding_halls','hall_id,name,road_address,phone,website,is_public,operation_status'),
  all('hall_rooms','hall_id,room_name,source_url,room_id'),
  all('wedding_prices','hall_id,source_url,source_name,verified_at'),
  all('external_wedding_ratings','hall_id,is_public,updated_at')
 ]);
 const beforePub=halls.filter(x=>x.is_public===true&&x.operation_status==='운영').length;
 const beforeExternal=ratings.filter(x=>x.is_public===true).length;
 const beforeRatingDates=JSON.stringify(ratings.map(x=>[x.hall_id,x.is_public,x.updated_at]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
 const selected=[],held=[];
 for(const v of patch.venues){
  const row=halls.find(h=>h.hall_id===v.id);
  const reasons=[];
  if(!row)reasons.push('missing_hall');
  else{
   if(row.name!==v.name||row.road_address!==v.address||(row.website!==v.website&&row.website!==v.updated_website))reasons.push('identity_or_website_changed');
   if(row.phone!==v.phone&&row.phone!==v.updated_phone)reasons.push('phone_changed');
   if(row.operation_status!=='운영')reasons.push('not_confirmed_operating');
   if(!v.official?.length||v.official.some(s=>!/^https:\/\//.test(s)))reasons.push('official_url_absent');
   const duplicates=halls.filter(h=>h.hall_id!==v.id&&
    ((row.road_address&&h.road_address&&norm(h.road_address)===norm(row.road_address))||
     (row.name&&h.name&&norm(h.name)===norm(row.name))));
   if(duplicates.length)reasons.push('duplicate_record:'+duplicates.map(h=>h.hall_id).join(','));
   const officialHosts=new Set(v.official.map(rootHost));
   const ownHost=rootHost(v.website);
   if(!ownHost||(!officialHosts.has(ownHost)&&!v.official.some(o=>rootHost(o).endsWith('.'+ownHost))))
     reasons.push('website_domain_mismatch');
   const ownPrices=allPrices.filter(p=>p.hall_id===v.id);
   if(ownPrices.some(p=>!officialHosts.has(rootHost(p.source_url))||!p.verified_at))
     reasons.push('preexisting_price_unverified');
   const ownRooms=allRooms.filter(p=>p.hall_id===v.id);
   if(ownRooms.some(p=>p.source_url&&!officialHosts.has(rootHost(p.source_url))))
     reasons.push('preexisting_room_source_nonofficial');
   if(!v.rooms?.every(r=>r.room_name&&/^https:\/\//.test(r.source_url)&&officialHosts.has(rootHost(r.source_url))))
     reasons.push('rooms_have_unverified_evidence');
   if(row.is_public!==false&&row.is_public!==true)reasons.push('unknown_visibility');
  }
  if(reasons.length)held.push({id:v.id,name:v.name,reasons});
  else selected.push({row,venue:v});
 }
 if(held.length)console.log('WEDDINGRANK_HELD_CANDIDATES='+JSON.stringify(held));
 // Recheck all selected candidates under guard before any mutation.
 for(const {row,venue:v} of selected){
  const now=await get(v.id);
  if(now.name!==row.name||now.road_address!==row.road_address||now.phone!==row.phone||
    now.website!==row.website||now.is_public!==row.is_public||now.operation_status!=='운영')
    throw Error('Concurrency conflict before specialist publication: '+v.id);
 }
 const published=[],existing=[],newRooms=[],blockedRooms=[];
 for(const {row,venue:v} of selected){
  // Insert specific verified rooms while venue remains private; don't modify existing originals.
  for(const rm of v.rooms||[]){
   const found=allRooms.find(r=>r.hall_id===v.id&&norm(r.room_name)===norm(rm.room_name));
   if(found)continue;
   const newRow={hall_id:v.id,room_name:rm.room_name,floor:rm.floor||null,
    capacity_min:rm.capacity_min??null,capacity_max:rm.capacity_max??null,
    source_url:rm.source_url,verified_at:patch.audited_on,
    notes:'2026-10-12 official wedding page; no invented capacity'};
   const {data,error}=await db.from('hall_rooms').insert(newRow).select('room_id,hall_id,room_name').single();
   if(error){
     if(error.code==='42501'||/permission denied/i.test(error.message||'')){
       blockedRooms.push({hall_id:v.id,name:v.name,room:rm.room_name,error:'hall_rooms INSERT requires DB grant'});
       continue;
     }
     throw Error('Room publication halted for '+v.name+': '+error.message);
   }
   newRooms.push(data);
  }
  const fields={};
  if(v.updated_phone&&row.phone!==v.updated_phone)fields.phone=v.updated_phone;
  if(v.updated_website&&row.website!==v.updated_website)fields.website=v.updated_website;
  if(row.is_public!==true)fields.is_public=true;
  if(Object.keys(fields).length){
   const {error}=await db.from('wedding_halls').update(fields)
    .eq('hall_id',v.id).eq('operation_status','운영').eq('name',v.name).eq('is_public',false);
   if(error)throw Error('Directory publication failed for '+v.name+': '+error.message);
  }
  const after=await get(v.id);
  if(after.is_public!==true||after.operation_status!=='운영'||after.name!==v.name||
     after.road_address!==v.address||after.phone!==(v.updated_phone||v.phone)||
     after.website!==(v.updated_website||v.website))
    throw Error('DB post-publication verification failed: '+v.name);
  if(row.is_public===true)existing.push(v.name);
  else published.push({id:v.id,name:v.name,official_url:v.official[0],phone:after.phone});
 }
 const checkRooms=await all('hall_rooms','hall_id,room_name');
 const checkHalls=await all('wedding_halls','hall_id,is_public,operation_status');
 const finalRatings=await all('external_wedding_ratings','hall_id,is_public,updated_at');
 const totalPublic=checkHalls.filter(x=>x.is_public===true&&x.operation_status==='운영').length;
 const externalPublic=finalRatings.filter(x=>x.is_public===true).length;
 const afterRatingDates=JSON.stringify(finalRatings.map(x=>[x.hall_id,x.is_public,x.updated_at]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
 if(beforePub+published.length!==totalPublic)throw Error('Unexpected public venue count!');
 if(beforeExternal!==externalPublic||beforeRatingDates!==afterRatingDates)throw Error('External ratings unexpectedly changed');
 for(const rm of newRooms)if(!checkRooms.some(x=>x.hall_id===rm.hall_id&&x.room_name===rm.room_name))throw Error('Room not persisted');
 console.log('WEDDINGRANK_PUBLIC_DIRECTORY_EXPANSION='+JSON.stringify({
   scope:'WeddingRank-only',pickrank_sync:false,public_before:beforePub,public_after:totalPublic,
   newly_published:published,already_public:existing,held,
   new_room_rows:newRooms.length,room_rows_blocked_by_permission:blockedRooms,external_ratings_before:beforeExternal,external_ratings_after:externalPublic,
   rating_dates_changed:0,price_rows_added:0,review_sources_changed:0,review_analyses_changed:0
 }));
}
main().catch(e=>{console.error(e);process.exit(1)});
