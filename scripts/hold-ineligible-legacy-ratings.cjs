'use strict';
// WeddingRank-only: hold publicly rated venues that no longer meet the
// minimum 3 independent analyzed original URLs after catalog reclassification.
// Preserve every rating's score/date, source rows and all original analyses.
const {createClient}=require('@supabase/supabase-js');
const u=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!u||!key||new URL(u).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank GitHub Secrets/project guard failed');
const db=createClient(u,key,{auth:{persistSession:false,autoRefreshToken:false}});
const apply=process.argv.includes('--apply');
const urlsAreListings=(s)=>{
 try{
  const x=new URL(s);const host=x.hostname.toLowerCase().replace(/^www\./,'');
  return (host==='iwedding.co.kr'&&/^\/enterprise\/info\/\d+\/?$/i.test(x.pathname))||
   (host==='directwedding.co.kr'&&/^\/weddinghall\/hall\d+\/?$/i.test(x.pathname))||
   (host==='weddingbook.com'&&/^\/weddinghall\/[^/]+\/?$/i.test(x.pathname));
 }catch{return true;}
};
async function pages(t,c){let out=[];for(let n=0;;n+=500){
 const {data,error}=await db.from(t).select(c).range(n,n+499);if(error)throw error;
 out.push(...data);if(data.length<500)return out;}}
function snapshot(rows){return JSON.stringify(rows.map(r=>({
 id:r.hall_id,score:r.overall_score,at:r.updated_at,source_count:r.source_count,
 published:r.is_public
})).sort((a,b)=>a.id.localeCompare(b.id)));}
async function main(){
 const [ratings,halls,sources,analyses]=await Promise.all([
  pages('external_wedding_ratings','hall_id,is_public,source_count,overall_score,updated_at,methodology_version'),
  pages('wedding_halls','hall_id,name,is_public,operation_status'),
  pages('wedding_review_sources','source_id,hall_id,source_url,source_type,is_published,quality_score'),
  pages('wedding_review_analysis','source_id,hall_id,evidence_strength')]);
 const allowed=new Map();
 const aBySource=new Map(analyses.map(a=>[String(a.source_id),a]));
 for(const s of sources){
  if(!s.is_published||s.source_type!=='public_review'||Number(s.quality_score)<70||
     !String(s.source_url||'').startsWith('https://')||urlsAreListings(s.source_url))continue;
  const a=aBySource.get(String(s.source_id));
  if(!a||String(a.hall_id)!==String(s.hall_id)||Number(a.evidence_strength)<70)continue;
  const id=String(s.hall_id);
  if(!allowed.has(id))allowed.set(id,new Set());
  allowed.get(id).add(String(s.source_url).replace(/\/+$/,''));
 }
 const hallById=new Map(halls.map(h=>[String(h.hall_id),h]));
 const targets=ratings.filter(r=>r.is_public===true&&(allowed.get(String(r.hall_id))?.size||0)<3);
 const reasons=targets.map(r=>({hall_id:r.hall_id,name:hallById.get(String(r.hall_id))?.name||'',
  verified_distinct_analyzed_original_urls:allowed.get(String(r.hall_id))?.size||0,
  retained_legacy_score:Number(r.overall_score),rating_method:r.methodology_version}));
 const allOriginal=snapshot(ratings);
 if(!apply){
  console.log('WEDDINGRANK_RATING_HOLD='+JSON.stringify({mode:'dry_run',
   current_public_ratings:ratings.filter(r=>r.is_public).length,required_minimum:3,
   public_ratings_failing_minimum:targets.length,affected:reasons,
   source_or_score_deletions:0,pickrank_sync:false}));
  return;
 }
 if(!targets.length){console.log('WEDDINGRANK_RATING_HOLD='+JSON.stringify({mode:'applied',held:0}));return;}
 const ids=targets.map(t=>t.hall_id);
 const {data,error}=await db.from('external_wedding_ratings')
   .update({is_public:false}).in('hall_id',ids).eq('is_public',true)
   .select('hall_id,is_public,overall_score,updated_at');
 if(error)throw Error('Unable to withhold unqualified ratings: '+error.message);
 if(data.length!==targets.length)throw Error('Unqualified venue hold count mismatch: '+data.length+' vs '+targets.length);
 const after=await pages('external_wedding_ratings','hall_id,is_public,source_count,overall_score,updated_at,methodology_version');
 if(after.length!==ratings.length)throw Error('Rating rows changed unexpectedly');
 const oldById=new Map(ratings.map(r=>[String(r.hall_id),r]));
 for(const r of after){
  const old=oldById.get(String(r.hall_id));
  if(!old||String(old.overall_score)!==String(r.overall_score)||
    new Date(old.updated_at).getTime()!==new Date(r.updated_at).getTime()||
    old.source_count!==r.source_count||old.methodology_version!==r.methodology_version)
       throw Error('Original rating score/date changed for '+r.hall_id);
  const expected=ids.includes(r.hall_id)?false:old.is_public;
  if(r.is_public!==expected)throw Error('Unexpected publication flag for '+r.hall_id);
 }
 const still=after.filter(r=>r.is_public&&(allowed.get(String(r.hall_id))?.size||0)<3);
 if(still.length)throw Error('Noncompliant publicly rated venues remain');
 console.log('WEDDINGRANK_RATING_HOLD='+JSON.stringify({
  mode:'applied',scope:'WeddingRank-only',public_before:ratings.filter(r=>r.is_public).length,
  public_after:after.filter(r=>r.is_public).length,withheld:targets.length,
  remaining_public_below_3_eligible_urls:still.length,affected:reasons,
  original_scores_preserved:true,rating_dates_changed:0,original_ratings_deleted:0,
  source_rows_deleted:0,analysis_rows_modified:0,other_publication_flags_changed:0,pickrank_sync:false
 }));
}
main().catch(e=>{console.error(e);process.exit(1)});
