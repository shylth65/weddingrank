'use strict';
// Read-only end-to-end rating integrity validation of WeddingRank.
const {readFileSync,writeFileSync}=require('node:fs');
const vm=require('node:vm');
const {createClient}=require('@supabase/supabase-js');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank-only GitHub Secrets required');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const ctx={window:{}};vm.runInNewContext(readFileSync('ranking-evidence-v1.js','utf8'),ctx);
const manifest=ctx.window.WeddingRankEvidence;
if(!manifest||!manifest.records||!manifest.isScoreTraced)throw Error('Missing score-tracing manifest');
async function pages(table,select){let result=[];for(let n=0;;n+=500){
 const {data,error}=await db.from(table).select(select).range(n,n+499);
 if(error)throw error;result.push(...data);if(data.length<500)return result;
}}
const banned=url=>{
 try{const x=new URL(url),host=x.hostname.toLowerCase().replace(/^www\./,''),
 p=x.pathname.toLowerCase();
 return host==='iwedding.co.kr'&&p.startsWith('/enterprise/info/')||
  host==='directwedding.co.kr'&&p.startsWith('/weddinghall/hall')||
  host==='weddingbook.com'&&p.startsWith('/weddinghall/');
 }catch{return true;}
};
(async()=>{
 const [halls,ratings,sources,analyses]=await Promise.all([
   pages('wedding_halls','hall_id,name,is_public,operation_status'),
   pages('external_wedding_ratings','hall_id,methodology_version,source_count,overall_score,is_public,updated_at'),
   pages('wedding_review_sources','source_id,hall_id,source_url,is_published,source_type,quality_score'),
   pages('wedding_review_analysis','source_id,hall_id,evidence_strength')]);
 const active=sources.filter(s=>s.is_published===true&&s.source_type==='public_review');
 const activeCatalog=active.filter(s=>banned(s.source_url));
 if(activeCatalog.length)throw Error('Business catalog source still counted: '+activeCatalog.length);
 const byHall=new Map();const analysisBySource=new Map(analyses.map(a=>[String(a.source_id),a]));
 for(const s of active){
   if(Number(s.quality_score)<70||!String(s.source_url||'').startsWith('https://'))continue;
   const a=analysisBySource.get(String(s.source_id));
   if(!a||String(a.hall_id)!==String(s.hall_id)||Number(a.evidence_strength)<70)continue;
   const id=String(s.hall_id);if(!byHall.has(id))byHall.set(id,new Set());
   byHall.get(id).add(s.source_url);
 }
 const publicRatings=ratings.filter(r=>r.is_public),qualified=publicRatings.filter(r=>(byHall.get(String(r.hall_id))?.size||0)>=3);
 if(qualified.length!==publicRatings.length)throw Error('Current public ratings below 3 analyzed originals');
 const audited=qualified.filter(r=>manifest.isScoreTraced(r));
 const manifests=Object.entries(manifest.records);
 const available=new Map(sources.map(s=>[String(s.hall_id)+'|'+s.source_url,s]));
 for(const [id,entry] of manifests){
   const rating=ratings.find(r=>String(r.hall_id)===id);
   if(!rating||rating.is_public!==true||!manifest.isScoreTraced(rating))throw Error('Manifest score mismatch or rating hidden: '+entry.name);
   if(entry.sources.length<3||entry.precise_publication_dates_verified!==false)throw Error('Posting-date precision falsely certified');
   for(const e of entry.sources){
     const source=available.get(id+'|'+e.url);
     if(!source||source.source_type!=='public_review'||!source.is_published||Number(source.quality_score)<70)
        throw Error('Audited individual source missing or ineligible: '+entry.name+' '+e.url);
     const analysis=analysisBySource.get(String(source.source_id));
     if(!analysis||String(analysis.hall_id)!==id||Number(analysis.evidence_strength)<70)
        throw Error('Audited source analysis missing: '+entry.name);
   }
 }
 const grand=ratings.find(r=>String(r.hall_id)==='173a2fa7-0052-4483-b898-2a3312b65765');
 if(!grand||grand.is_public!==false)throw Error('Grand Ostium must remain held');
 const frontend=readFileSync('ranking-external-v590.js','utf8');
 const detail=readFileSync('app.js','utf8');
 if(!frontend.includes('hasTracedOverall')||!frontend.includes('EVIDENCE REVIEW PENDING')||
    !detail.includes('window.WeddingRankEvidence')||!detail.includes('기존 외부평가 근거 재검증 중'))
     throw Error('Source/trust UI is not guarding legacy numeric scores');
 const output={executed_at:new Date().toISOString(),scope:'WeddingRank-only',read_only:true,pickrank_sync:false,
  public_operating_directory:halls.filter(h=>h.is_public&&h.operation_status==='운영').length,
  rating_rows:ratings.length,public_external_ratings:publicRatings.length,original_score_traced_reference_venues:audited.length,
  public_ratings_kept_under_evidence_review:publicRatings.length-audited.length,
  catalog_rows_excluded:sources.filter(s=>banned(s.source_url)&&s.source_type==='other'&&!s.is_published).length,
  remaining_active_catalog_rows:activeCatalog.length,remaining_public_with_less_than_three_valid_sources:0,
  traced_source_originals_verified:manifests.reduce((n,[,entry])=>n+entry.sources.length,0),
  exact_original_posting_date_certified:0,
  grand_ostium_public_rating:false,unchanged_schedules:true};
 writeFileSync('weddingrank-rating-integrity-qa.json',JSON.stringify(output,null,2)+'\n');
 console.log('WEDDINGRANK_RATING_INTEGRITY_QA='+JSON.stringify(output));
})().catch(e=>{console.error(e);process.exit(1)});
