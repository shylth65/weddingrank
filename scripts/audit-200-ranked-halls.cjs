'use strict';
// Manual-only WeddingRank 200 ranked-hall evidence queue.
// Does NOT score, publish, re-date, or sync any hall/rating.
const {createClient}=require('@supabase/supabase-js');
const {readFileSync,writeFileSync}=require('node:fs');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')
 throw new Error('Wrong/missing WeddingRank-only GitHub Secrets');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const p=async(table,cols)=>{let a=[];for(let i=0;;i+=500){
 const {data,error}=await db.from(table).select(cols).range(i,i+499);if(error)throw error;
 a.push(...data);if(data.length<500)return a;}};
const norm=s=>{try{const u=new URL(s);u.hash='';u.searchParams.sort();return u.href.replace(/\/+$/,'').toLowerCase()}
 catch{return String(s||'').trim().toLowerCase()}};
const batchPaths=[
 'research/audits/2026-10-03-held-review-analysis-batch-1.json',
 'research/audits/2026-10-03-held-review-analysis-batch-2.json',
 'research/audits/2026-10-03-held-review-analysis-batch-3.json'];
const rawEvidence=new Set();
for(const path of batchPaths){
 const x=JSON.parse(readFileSync(path,'utf8'));
 if(x.schema_version!=='weddingrank-review-analysis-batch-v1'||x.scope!=='WeddingRank-only')
   throw Error('Audited raw batch invalid: '+path);
 for(const hall of x.venues||[])for(const s of hall.sources||[]){
  const u=s.source_url||s.url;
  if(!u||!Number.isFinite(Number(s.raw_score))||Number(s.raw_scale)!==5||Number(s.sample_count)!==1)continue;
  rawEvidence.add(String(hall.hall_id)+'|'+norm(u));
 }
}
(async()=>{
 const [halls,sources,analyses,ratings]=await Promise.all([
  p('wedding_halls','hall_id,name,road_address,phone,website,is_public,operation_status'),
  p('wedding_review_sources','source_id,hall_id,source_url,source_type,is_published,quality_score,published_date,summary,source_domain'),
  p('wedding_review_analysis','source_id,hall_id,evidence_strength'),
  p('external_wedding_ratings','hall_id,is_public,updated_at,source_count,overall_score')]);
 const aById=new Map(analyses.map(a=>[String(a.source_id),a]));
 const sByHall=new Map();for(const s of sources){
  const id=String(s.hall_id);if(!sByHall.has(id))sByHall.set(id,[]);
  sByHall.get(id).push(s);
 }
 const rankByHall=new Map(ratings.map(r=>[String(r.hall_id),r]));
 const publicRatings=ratings.filter(r=>r.is_public===true);
 const publicOperating=halls.filter(h=>h.is_public===true&&h.operation_status==='운영');
 const processed=halls.map(h=>{
  const id=String(h.hall_id),ss=sByHall.get(id)||[];
  const group=new Map();let analysisMissing=0,rawMissing=0,dateMissing=0,badQuality=0;
  for(const s of ss){
   const k=norm(s.source_url);
   if(!k.startsWith('https://')||!s.is_published||s.source_type!=='public_review'||Number(s.quality_score)<70
      ||/(weddingrank|pickrank)\.kr/.test(k)){badQuality++;continue;}
   const a=aById.get(String(s.source_id));
   if(!a||String(a.hall_id)!==id||Number(a.evidence_strength)<70){analysisMissing++;continue;}
   const m=String(s.summary||'').match(/\[raw-score=([\d.]+)\/([\d.]+);\s*sample=(\d+);/i);
   const hasAudit=rawEvidence.has(id+'|'+k);
   const hasInline=Boolean(m&&Number(m[2])>0&&Number(m[1])<=Number(m[2])&&Number(m[3])>=1);
   if(!hasAudit&&!hasInline)rawMissing++;
   if(!s.published_date)dateMissing++;
   group.set(k,{source_id:s.source_id,audited_raw:hasAudit,inline_raw:hasInline,
     published_date:s.published_date||null});
  }
  const record=rankByHall.get(id);
  const analyzedDistinct=group.size;
  const auditedDistinct=[...group.values()].filter(v=>v.audited_raw).length;
  const unranked=record?.is_public!==true;
  const addressAndPhone=Boolean(h.road_address&&h.phone&&h.website);
  const evidenceGap=analysisMissing+rawMissing+dateMissing;
  const researchPriority=(
   (h.is_public?1000:0)+(h.operation_status==='운영'?400:0)+
   Math.min(analyzedDistinct,3)*100+Math.min(ss.length,6)*10+
   (addressAndPhone?40:0) - (evidenceGap>0?Math.min(evidenceGap,8)*5:0));
  const milestoneStatus=!unranked?'published_legacy_or_verified':
    h.operation_status!=='운영'?'operation_not_verified':
    analyzedDistinct>=3&&auditedDistinct>=3&&dateMissing===0?'needs_final_source_quality_review':
    ss.length>=3&&analyzedDistinct===0?'hold_3_urls_zero_analysis':
    analyzedDistinct>=1?'partial_verified_analysis':
    ss.length?'source_leads_only':'original_review_research_needed';
  return {hall_id:id,name:h.name,public_directory:h.is_public===true,operation_status:h.operation_status,
   external_rating_public:!unranked,raw_source_rows:ss.length,analyzed_distinct_urls:analyzedDistinct,
   audited_raw_score_urls:auditedDistinct,missing_analysis:analysisMissing,missing_raw_score:rawMissing,
   missing_exact_publication_date:dateMissing,rejected_source_rows:badQuality,profile_complete:addressAndPhone,
   milestone_status:milestoneStatus,research_priority:researchPriority};
 });
 const queue=processed.filter(x=>!x.external_rating_public).sort((a,b)=>b.research_priority-a.research_priority||a.name.localeCompare(b.name,'ko'));
 const statusCounts=Object.fromEntries([...new Set(queue.map(x=>x.milestone_status))].map(s=>[s,queue.filter(x=>x.milestone_status===s).length]));
 const out={timestamp:new Date().toISOString(),scope:'WeddingRank-only',audit_only:true,pickrank_sync:false,
  targets:{public_directory:200,independent_external_ratings:200},
  current:{candidate_venue_rows:halls.length,public_operating_venues:publicOperating.length,
   published_independent_external_ratings:publicRatings.length,review_sources:sources.length,review_analyses:analyses.length},
  remaining:{public_directory:Math.max(0,200-publicOperating.length),
   independent_external_ratings:Math.max(0,200-publicRatings.length)},
  reasons:{manual_source_verification_required:true,source_level_original_scores_required:true,
   unanalysed_URLs_never_automatically_eligible:true,advertising_venue_or_member_reviews_excluded:true,
   legacy_rating_dates_unchanged:true,no_new_rank_score_calculated:true},
  unranked_status_counts:statusCounts,review_research_queue:queue.slice(0,200)};
 writeFileSync('weddingrank-200-ranking-evidence-queue.json',JSON.stringify(out,null,2)+'\n');
 console.log('WEDDINGRANK_200_TARGET_AUDIT='+JSON.stringify({...out,review_research_queue:queue.slice(0,12)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
