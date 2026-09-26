const { readFileSync } = require('node:fs');
const { createClient } = require('@supabase/supabase-js');

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const patchPath=process.argv[2];
if(!url||!key||!patchPath){
  console.error('BLOCKED: WeddingRank credentials and one patch path are required.');
  process.exit(2);
}
if(!url.includes('mozmxkmaynhxqwzovzhi.supabase.co')){
  console.error('BLOCKED: Supabase project is not WeddingRank.');
  process.exit(2);
}
if(!/^research\/patches\/[0-9-]+-[a-z0-9-]+\.json$/.test(patchPath)){
  console.error('BLOCKED: patch path is outside the approved research/patches directory.');
  process.exit(2);
}

const patch=JSON.parse(readFileSync(patchPath,'utf8'));
if(patch.schema_version!=='weddingrank-verified-patch-v1'||!Array.isArray(patch.venues)||!patch.venues.length){
  console.error('BLOCKED: unsupported or empty verified patch.');
  process.exit(2);
}
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const allowedProfileKeys=new Set(['phone','website']);

async function main(){
  const result={patch_id:patch.patch_id,venues:0,profile_updates:0,sources_added:0,sources_reclassified:0,ratings_unpublished:0,rating_dates_changed:0};
  for(const venue of patch.venues){
    if(!venue.hall_id||!venue.expected_name||!venue.expected_address) throw new Error('Venue identity guard is incomplete.');
    const {data:hall,error:hallError}=await db.from('wedding_halls')
      .select('hall_id,name,road_address,phone,website')
      .eq('hall_id',venue.hall_id).single();
    if(hallError) throw hallError;
    if(hall.name!==venue.expected_name||hall.road_address!==venue.expected_address) throw new Error('Venue identity mismatch: '+venue.hall_id);

    const profileUpdates=venue.profile_updates||{};
    if(Object.keys(profileUpdates).some(k=>!allowedProfileKeys.has(k))) throw new Error('Unapproved profile field in patch.');
    if(Object.keys(profileUpdates).length){
      const {error}=await db.from('wedding_halls').update(profileUpdates).eq('hall_id',venue.hall_id);
      if(error) throw error;
      result.profile_updates++;
    }

    for(const source of venue.reclassify_sources||[]){
      const {data,error}=await db.from('wedding_review_sources')
        .update({source_type:source.source_type,updated_at:patch.verified_at})
        .eq('hall_id',venue.hall_id).eq('source_url',source.source_url)
        .select('source_id');
      if(error) throw error;
      if(!data?.length) throw new Error('Source reclassification target missing: '+source.source_url);
      result.sources_reclassified+=data.length;
    }

    for(const source of venue.add_sources||[]){
      const row={
        hall_id:venue.hall_id,
        source_url:source.source_url,
        source_name:source.source_name,
        source_domain:source.source_domain,
        source_type:'public_review',
        published_date:source.published_date,
        analyzed_at:patch.verified_at,
        quality_score:source.quality_score,
        summary:source.summary,
        is_published:true,
        updated_at:patch.verified_at
      };
      const {error}=await db.from('wedding_review_sources').upsert(row,{onConflict:'hall_id,source_url'});
      if(error) throw error;
      result.sources_added++;
    }

    if(venue.external_rating_action==='unpublish_preserve_date'){
      const {data:before,error:beforeError}=await db.from('external_wedding_ratings')
        .select('updated_at,is_public').eq('hall_id',venue.hall_id).single();
      if(beforeError) throw beforeError;
      if(before.is_public===true){
        const {error}=await db.from('external_wedding_ratings').update({is_public:false}).eq('hall_id',venue.hall_id);
        if(error) throw error;
        result.ratings_unpublished++;
      }
      const {data:after,error:afterError}=await db.from('external_wedding_ratings')
        .select('updated_at').eq('hall_id',venue.hall_id).single();
      if(afterError) throw afterError;
      if(after.updated_at!==before.updated_at) throw new Error('Rating date changed unexpectedly: '+venue.hall_id);
    }
    result.venues++;
  }
  console.log(JSON.stringify(result));
}

main().catch(error=>{console.error(error);process.exit(1)});
