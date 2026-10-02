const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('node:fs');

const audit=JSON.parse(readFileSync('research/audits/2026-10-03-held-review-analysis-batch-1.json','utf8'));
if(audit.schema_version!=='weddingrank-review-analysis-batch-v1') throw new Error('Wrong audit schema');
if(audit.scope!=='WeddingRank-only'||audit.rules?.pickrank_sync!==false) throw new Error('Scope guard failed');

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error('Missing WeddingRank Supabase secret');
if(!url.includes('mozmxkmaynhxqwzovzhi.supabase.co')) throw new Error('Blocked: wrong Supabase project');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

async function main(){
 let inserted=0,existing=0,checked=0;
 const receipts=[];
 for(const venue of audit.venues){
  const {data:hall,error:he}=await db.from('wedding_halls')
   .select('hall_id,name,is_public,operation_status').eq('hall_id',venue.hall_id).single();
  if(he)throw he;
  if(hall.name!==venue.name||hall.is_public!==true||hall.operation_status!=='운영') throw new Error('Hall identity/status mismatch: '+venue.hall_id);
  for(const s of venue.sources){
   checked++;
   const {data:src,error:se}=await db.from('wedding_review_sources')
    .select('source_id,hall_id,source_url,source_type,quality_score,is_published')
    .eq('source_id',s.source_id).single();
   if(se)throw se;
   if(String(src.hall_id)!==String(venue.hall_id)||src.source_url!==s.source_url||src.source_type!=='public_review'||src.is_published!==true||Number(src.quality_score)<70)
     throw new Error('Source eligibility mismatch: '+s.source_id);
   if(Number(s.raw_scale)!==5||Number(s.sample_count)!==1||!Number.isFinite(Number(s.raw_score))||Number(s.raw_score)<1||Number(s.raw_score)>5)
     throw new Error('Raw-score evidence invalid: '+s.source_id);

   const {data:prior,error:pe}=await db.from('wedding_review_analysis')
    .select('analysis_id,source_id,hall_id,evidence_strength,sentiment').eq('source_id',s.source_id).maybeSingle();
   if(pe)throw pe;
   if(prior){
    if(String(prior.hall_id)!==String(venue.hall_id)||Number(prior.evidence_strength)<70) throw new Error('Existing analysis mismatch: '+s.source_id);
    existing++;
    receipts.push({source_id:s.source_id,status:'existing',analysis_id:prior.analysis_id});
    continue;
   }
   const row={
    source_id:s.source_id,
    hall_id:venue.hall_id,
    sentiment:s.sentiment,
    evidence_strength:s.evidence_strength
   };
   const {data:created,error:ie}=await db.from('wedding_review_analysis').insert(row)
    .select('analysis_id,source_id,hall_id,evidence_strength,sentiment,analyzed_at').single();
   if(ie)throw ie;
   inserted++;
   receipts.push({source_id:s.source_id,status:'inserted',analysis_id:created.analysis_id,analyzed_at:created.analyzed_at});
  }
 }
 console.log('VERIFIED_ANALYSIS_APPLY_JSON_BEGIN');
 console.log(JSON.stringify({checked,inserted,existing,receipts},null,2));
 console.log('VERIFIED_ANALYSIS_APPLY_JSON_END');
}
main().catch(e=>{console.error(e);process.exit(1);});
