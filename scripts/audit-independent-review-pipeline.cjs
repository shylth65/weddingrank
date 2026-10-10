'use strict';
const {createClient}=require('@supabase/supabase-js');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank-only secrets required');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const pages=async(table,cols)=>{let out=[];for(let i=0;;i+=500){const {data,error}=await db.from(table).select(cols).range(i,i+499);if(error)throw error;out.push(...data);if(data.length<500)return out;}};
const normalized=s=>String(s||'').replace(/\/$/,'').toLowerCase();
async function main(){
 const [halls,sources,analyses,ratings]=await Promise.all([
  pages('wedding_halls','hall_id,name,is_public,operation_status'),
  pages('wedding_review_sources','source_id,hall_id,source_url,source_type,source_domain,is_published,quality_score,published_date,summary'),
  pages('wedding_review_analysis','analysis_id,source_id,hall_id,evidence_strength'),
  pages('external_wedding_ratings','hall_id,is_public,updated_at')]);
 const analysisBySource=new Map(analyses.map(a=>[a.source_id,a]));
 const ratingByHall=new Map(ratings.map(r=>[r.hall_id,r]));
 const findings=[],stats={halls:halls.length,sources:sources.length,analyses:analyses.length,public_ratings:ratings.filter(r=>r.is_public).length,ready_for_manual_review:0,held:0,public_at_risk:0};
 for(const h of halls){
  const ss=sources.filter(s=>s.hall_id===h.hall_id), distinct=new Map(),reasons=new Set();
  for(const s of ss){
   const u=normalized(s.source_url);
   if(!/^https:\/\//.test(u)||!s.is_published||s.source_type!=='public_review'||Number(s.quality_score)<70)continue;
   if(/(weddingrank\.kr|pickrank\.kr)/.test(u))continue;
   const a=analysisBySource.get(s.source_id);
   if(!a||a.hall_id!==h.hall_id||Number(a.evidence_strength)<70){reasons.add('missing_verified_analysis');continue;}
   const m=String(s.summary||'').match(/\[raw-score=([\d.]+)\/([\d.]+);\s*sample=(\d+);/i);
   if(!m||!Number(m[2])||Number(m[1])>Number(m[2])||Number(m[3])<1){reasons.add('missing_raw_score_scale_sample');continue;}
   if(!s.published_date)reasons.add('missing_exact_publication_date');
   distinct.set(u,s);
  }
  const publicRating=ratingByHall.get(h.hall_id)?.is_public===true;
  const qualified=distinct.size>=3&&h.operation_status==='운영'&&reasons.size===0;
  if(publicRating&&!qualified)stats.public_at_risk++;
  if(!publicRating&&qualified)stats.ready_for_manual_review++;
  if(!publicRating&&ss.length)stats.held++;
  if((!publicRating&&ss.length)||(publicRating&&!qualified))findings.push({hall_id:h.hall_id,name:h.name,public_rating:publicRating,verified_distinct_sources:distinct.size,source_rows:ss.length,reasons:[...reasons],candidate_for_review:!publicRating&&qualified});
 }
 const output={timestamp:new Date().toISOString(),scope:'WeddingRank-only',mode:'read_only_no_auto_publication',pickrank_sync:false,stats,findings:findings.slice(0,150)};
 console.log('WEDDINGRANK_DISCOVERY_AUDIT_JSON='+JSON.stringify(output));
 if(stats.public_at_risk)console.log('WARNING: public ratings require human review; no ratings changed');
}
main().catch(e=>{console.error(e);process.exitCode=1});