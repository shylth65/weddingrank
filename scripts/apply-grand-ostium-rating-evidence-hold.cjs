'use strict';
// WeddingRank-only targeted withdrawal: preserve the original numerical rating,
// basis date and all raw/source rows for later verified reanalysis.
const {createClient}=require('@supabase/supabase-js');
const {readFileSync}=require('node:fs');
const patch=JSON.parse(readFileSync('research/patches/2026-10-13-grand-ostium-rating-evidence-hold.json','utf8'));
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')
  throw Error('WeddingRank-only GitHub Secrets required');
if(patch.schema_version!=='weddingrank-source-rating-correction-v1'||patch.scope!=='WeddingRank-only'||patch.pickrank_sync!==false)
  throw Error('Audit scope/schema guard failed');
const hallId=patch.venue.hall_id,sourceId='a803dee5-c57c-4242-8df6-b53f06a735d2';
if(hallId!=='173a2fa7-0052-4483-b898-2a3312b65765')throw Error('Wrong hall ID');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const expectRating=(r)=>Number(r.overall_score)===4.62&&r.source_count===3&&
 r.methodology_version==='pickrank_canonical_sync_v2_20260919' &&
 new Date(r.updated_at).getTime()===new Date(patch.rating_before.updated_at).getTime();
async function fetchRating(){
 const {data,error}=await db.from('external_wedding_ratings')
  .select('hall_id,is_public,source_count,overall_score,updated_at,methodology_version')
  .eq('hall_id',hallId).single();
 if(error)throw error;return data;
}
async function main(){
 const {data:hall,error:he}=await db.from('wedding_halls')
  .select('hall_id,name,road_address,is_public,operation_status').eq('hall_id',hallId).single();
 if(he)throw he;
 if(hall.name!==patch.venue.name||hall.road_address!==patch.venue.address||hall.is_public!==true||hall.operation_status!=='운영')
  throw Error('Venue identity/operating publication changed; abort');
 const before=await fetchRating();
 if(!expectRating(before))throw Error('Previously audited source score or rating date changed; abort');
 const {data:source,error:se}=await db.from('wedding_review_sources')
  .select('source_id,hall_id,source_url,source_type,is_published,published_date')
  .eq('source_id',sourceId).single();
 if(se)throw se;
 if(String(source.hall_id)!==hallId||source.source_url!=='https://www.iwedding.co.kr/enterprise/info/1440399467')
  throw Error('Commercial source identity mismatch');
 // First remove the inadequately supported ranking; never delete any original record.
 let ratingWithdrawn=0,sourceReclassified=0;
 if(before.is_public===true){
  const {error:e}=await db.from('external_wedding_ratings').update({is_public:false})
    .eq('hall_id',hallId).eq('is_public',true);
  if(e)throw e;
  ratingWithdrawn=1;
 }
 const afterRating=await fetchRating();
 if(afterRating.is_public!==false||!expectRating(afterRating))throw Error('Rating withdrawal/date preservation verification failed');
 if(source.is_published!==false||source.source_type!=='other'){
  const {error:e}=await db.from('wedding_review_sources')
    .update({is_published:false,source_type:'other'})
    .eq('source_id',sourceId).eq('hall_id',hallId);
  if(e)throw Error('Rating safely unpublished but commercial source reclassification failed: '+e.message);
  sourceReclassified=1;
 }
 const {data:afterSource,error:ae}=await db.from('wedding_review_sources')
  .select('source_id,hall_id,source_type,is_published,published_date')
  .eq('source_id',sourceId).single();
 if(ae)throw ae;
 if(afterSource.source_type!=='other'||afterSource.is_published!==false)
  throw Error('Commercial listing source still counted');
 const {data:originalAnalyses,error:anerr}=await db.from('wedding_review_analysis')
  .select('analysis_id').eq('hall_id',hallId);
 if(anerr)throw anerr;
 console.log('WEDDINGRANK_GRAND_OSTIUM_HOLD='+JSON.stringify({
  scope:'WeddingRank-only',hall_id:hallId,venue_directory_remains_public:true,
  external_rating_public_before:before.is_public,external_rating_public_after:false,
  rating_score_preserved:Number(afterRating.overall_score),
  rating_date_preserved:afterRating.updated_at,
  original_analysis_rows_retained:originalAnalyses.length,
  commercial_listing_source_excluded:true,rating_withdrawn:ratingWithdrawn,source_reclassified:sourceReclassified,
  pickrank_sync:false,other_ratings_untouched:true
 }));
}
main().catch(e=>{console.error(e);process.exit(1)});
