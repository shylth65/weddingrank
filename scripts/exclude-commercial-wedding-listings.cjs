'use strict';
// WeddingRank specialist-origin source reclassification only.
// Keep URLs, authors' summaries, analysis rows and pre-existing scores untouched.
const {createClient}=require('@supabase/supabase-js');
const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!u||!k||new URL(u).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank GitHub Secret/project guard failed');
const db=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
const apply=process.argv.includes('--apply');
function category(url){
  try{
    const p=new URL(String(url));const host=p.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='iwedding.co.kr'&&/^\/enterprise\/info\/\d+\/?$/i.test(p.pathname))return 'iwedding_enterprise_listing';
    if(host==='directwedding.co.kr'&&/^\/weddinghall\/hall\d+\/?$/i.test(p.pathname))return 'directwedding_venue_listing';
    if(host==='weddingbook.com'&&/^\/weddinghall\/[^/]+\/?$/i.test(p.pathname))return 'weddingbook_venue_listing';
    return null;
  }catch{return null;}
}
async function pages(table,cols){
 const result=[];
 for(let off=0;;off+=500){
   const {data,error}=await db.from(table).select(cols).range(off,off+499);
   if(error)throw error;result.push(...data);if(data.length<500)return result;
 }
}
const metric=x=>x.map(r=>[String(r.hall_id),r.is_public,r.updated_at]).sort((a,b)=>a[0].localeCompare(b[0]));
async function main(){
 const [sources,ratings]=await Promise.all([
   pages('wedding_review_sources','source_id,hall_id,source_url,source_type,is_published'),
   pages('external_wedding_ratings','hall_id,is_public,updated_at')]);
 const oldMetric=JSON.stringify(metric(ratings));
 const classified=sources.map(s=>({...s,listing_class:category(s.source_url)})).filter(s=>s.listing_class);
 const active=classified.filter(s=>s.is_published===true&&s.source_type==='public_review');
 const summary=Object.fromEntries([...new Set(classified.map(s=>s.listing_class))].map(type=>[type,{
   already_excluded:classified.filter(s=>s.listing_class===type&&s.source_type==='other'&&s.is_published===false).length,
   active_independent_labels:active.filter(s=>s.listing_class===type).length
 }]));
 const affected=[...new Set(active.map(s=>String(s.hall_id)))];
 if(!apply){
   console.log('WEDDINGRANK_CATALOG_EXCLUSION='+JSON.stringify({mode:'dry_run',project:'WeddingRank',sources_total:sources.length,active_catalog_candidates:active.length,affected_halls:affected.length,counts:summary,ratings_unchanged:true,pickrank_sync:false}));
   return;
 }
 let changed=0;
 for(const kind of Object.keys(summary)){
   const arr=active.filter(s=>s.listing_class===kind);
   if(!arr.length)continue;
   const ids=arr.map(x=>x.source_id);
   const {data,error}=await db.from('wedding_review_sources')
     .update({source_type:'other',is_published:false})
     .in('source_id',ids).eq('source_type','public_review').eq('is_published',true)
     .select('source_id,hall_id,source_url,source_type,is_published');
   if(error)throw Error('Failed reclassification '+kind+': '+error.message);
   if(data.length!==ids.length||data.some(s=>category(s.source_url)!==kind||s.source_type!=='other'||s.is_published!==false))
      throw Error('Mismatch reclassification '+kind+' changed '+data.length+' expected '+ids.length);
   changed+=data.length;
 }
 const [afterSources,afterRatings]=await Promise.all([
   pages('wedding_review_sources','source_id,hall_id,source_url,source_type,is_published'),
   pages('external_wedding_ratings','hall_id,is_public,updated_at')]);
 const still=afterSources.filter(s=>category(s.source_url)&&s.source_type==='public_review'&&s.is_published===true);
 if(still.length)throw Error('Invalid catalog sources still published: '+still.length);
 if(afterSources.length!==sources.length||JSON.stringify(metric(afterRatings))!==oldMetric)
   throw Error('Original rows, score publication flags or rating dates unexpectedly changed');
 console.log('WEDDINGRANK_CATALOG_EXCLUSION='+JSON.stringify({mode:'applied',scope:'WeddingRank-only',
  sources_total:sources.length,affected_halls:affected.length,excluded_catalog_rows:changed,remaining_active_catalog_sources:still.length,counts:summary,
  original_source_rows_deleted:0,original_analysis_rows_modified:0,score_values_changed:0,rating_publications_changed:0,rating_dates_changed:0,pickrank_sync:false}));
}
main().catch(e=>{console.error(e);process.exit(1)});
