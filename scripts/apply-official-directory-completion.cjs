'use strict';
// WeddingRank-only: narrow, audited completion of missing official directory fields.
// Does not insert/modify ratings, reviews, venue visibility or synchronization.
const {readFileSync}=require('node:fs');
const {createClient}=require('@supabase/supabase-js');
const patch=JSON.parse(readFileSync('research/patches/2026-10-12-retry-official-directory.json','utf8'));
const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank GitHub secret/project guard');
if(patch.schema_version!=='weddingrank-official-directory-completion-v1'||patch.scope!=='WeddingRank-only'||patch.pickrank_sync!==false)throw Error('Invalid independent source patch');
if(!Array.isArray(patch.venues)||patch.venues.length!==2)throw Error('Unexpected venue count');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const fields=['road_address','phone','website'];
const same=(a,b)=>a===b||(a==null&&b==null);
async function getHall(id){
 const {data,error}=await db.from('wedding_halls').select('hall_id,name,road_address,phone,website,is_public,operation_status').eq('hall_id',id).single();
 if(error)throw error;
 return data;
}
async function main(){
 const checks=[];
 // Preflight every row before writing any row. Any concurrent change blocks this patch.
 for(const venue of patch.venues){
  const h=await getHall(venue.hall_id);
  if(h.name!==venue.name||h.is_public!==true||h.operation_status!=='운영')throw Error('Identity or operational status mismatch: '+venue.hall_id);
  if(!venue.sources?.length||venue.sources.some(s=>!/^https:\/\//.test(s.source_url)))throw Error('Official evidence missing');
  const updateKeys=Object.keys(venue.updates);
  if(updateKeys.some(k=>!fields.includes(k)))throw Error('Update outside official profile allow-list');
  if(Object.keys(venue.expected).some(k=>!['road_address','phone','website','is_public','operation_status'].includes(k)))throw Error('Unexpected expected guard field');
  for(const k of ['road_address','phone','website']){
   if(!same(h[k],venue.expected[k])&&!same(h[k],venue.updates[k]))
     throw Error('Current profile differs from approved before/after state: '+venue.hall_id+' '+k);
  }
  for(const [k,expected] of Object.entries(venue.expected)){
   if(!same(h[k],expected)&&!same(h[k],venue.updates[k]))
     throw Error('Unexpected existing field: '+venue.hall_id+' '+k);
  }
  const nextAddress=venue.updates.road_address||h.road_address;
  if(!nextAddress)throw Error('Missing verified address: '+venue.hall_id);
  const {data:duplicates,error:de}=await db.from('wedding_halls')
    .select('hall_id,name').eq('road_address',nextAddress).neq('hall_id',venue.hall_id).eq('is_public',true).limit(5);
  if(de)throw de;
  if(duplicates?.length)throw Error('Unreviewed duplicate exact-address venue: '+venue.hall_id);
  checks.push({venue,h});
 }
 const receipts=[];
 for(const {venue,h} of checks){
  const updates={};
  for(const [k,v] of Object.entries(venue.updates)){
   if(!same(h[k],v))updates[k]=v;
  }
  if(Object.keys(updates).length){
   const {error}=await db.from('wedding_halls').update(updates)
     .eq('hall_id',venue.hall_id).eq('is_public',true).eq('operation_status','운영');
   if(error)throw error;
  }
  const after=await getHall(venue.hall_id);
  for(const [k,v] of Object.entries(venue.updates)){
   if(!same(after[k],v))throw Error('Post-write mismatch: '+venue.hall_id+' '+k);
  }
  if(after.name!==venue.name||after.is_public!==true||after.operation_status!=='운영')throw Error('Status changed: '+venue.hall_id);
  receipts.push({hall_id:venue.hall_id,name:after.name,written_fields:Object.keys(updates),record:after,verified:true});
 }
 console.log('WEDDINGRANK_VERIFIED_DIRECTORY_COMPLETION='+JSON.stringify({scope:'WeddingRank-only',pickrank_sync:false,verified_records:receipts.length,written_fields:receipts.reduce((a,r)=>a+r.written_fields.length,0),ratings_touched:0,reviews_touched:0,status_changes:0,receipts}));
}
main().catch(e=>{console.error(e);process.exit(1)});
