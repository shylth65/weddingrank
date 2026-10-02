const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('node:fs');

const auditPaths=[
  'research/audits/2026-10-03-held-review-analysis-batch-1.json',
  'research/audits/2026-10-03-held-review-analysis-batch-2.json'
];
const audits=auditPaths.map(p=>JSON.parse(readFileSync(p,'utf8')));
for(const audit of audits){
  if(audit.schema_version!=='weddingrank-review-analysis-batch-v1') throw new Error('Wrong audit schema: '+audit.batch);
  if(audit.scope!=='WeddingRank-only'||audit.rules?.pickrank_sync!==false) throw new Error('Scope guard failed: '+audit.batch);
}

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error('Missing WeddingRank Supabase secret');
if(!url.includes('mozmxkmaynhxqwzovzhi.supabase.co')) throw new Error('Blocked: wrong Supabase project');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

async function main(){
 let sourcesInserted=0,sourcesUpdated=0,analysisInserted=0,analysisExisting=0,checked=0;
 const receipts=[];
 for(const audit of audits) for(const venue of audit.venues){
  const {data:hall,error:he}=await db.from('wedding_halls')
   .select('hall_id,name,is_public,operation_status').eq('hall_id',venue.hall_id).single();
  if(he)throw he;
  if(hall.name!==venue.name||hall.is_public!==true||hall.operation_status!=='운영') throw new Error('Hall identity/status mismatch: '+venue.hall_id);

  for(const s of venue.sources){
   checked++;
   const period=s.published_period||s.period;
   if(Number(s.raw_scale)!==5||Number(s.sample_count)!==1||!Number.isFinite(Number(s.raw_score))||Number(s.raw_score)<1||Number(s.raw_score)>5)
     throw new Error('Raw-score evidence invalid: '+s.source_url);
   if(!/^https:\/\/jinzzawedding\.com\/reviews\/\d+$/.test(s.source_url)) throw new Error('Not an individual verified review URL: '+s.source_url);
   if(!period||!/^20\d{2}-\d{2}$/.test(period)) throw new Error('Missing verified YYYY-MM period: '+s.source_url);

   let query=db.from('wedding_review_sources')
     .select('source_id,hall_id,source_url,source_type,quality_score,is_published,summary,source_domain,source_name');
   query=s.source_id?query.eq('source_id',s.source_id):query.eq('hall_id',venue.hall_id).eq('source_url',s.source_url);
   let {data:src,error:se}=await query.maybeSingle();
   if(se)throw se;

   const verifiedSummary=`상담·방문 ${period}(원문 일자 미표시) · 원점수 ${Number(s.raw_score).toFixed(1)}/${s.raw_scale} · 실제 표본 ${s.sample_count}명 · ${s.verification} · 외부 개별 후기 · 2026-10-03 원문 검증 [raw-score=${Number(s.raw_score).toFixed(1)}/${s.raw_scale}; sample=${s.sample_count}; period=${period}]`;

   if(!src){
     const row={
       hall_id:venue.hall_id,
       source_url:s.source_url,
       source_name:s.title||'진짜웨딩 개별 인증후기',
       source_domain:'jinzzawedding.com',
       source_type:'public_review',
       published_date:null,
       quality_score:Number(s.quality_score)||92,
       summary:verifiedSummary,
       is_published:true
     };
     const {data:created,error:ce}=await db.from('wedding_review_sources').insert(row)
       .select('source_id,hall_id,source_url,source_type,quality_score,is_published,summary,source_domain,source_name').single();
     if(ce)throw ce;
     src=created;sourcesInserted++;
   }else{
     if(String(src.hall_id)!==String(venue.hall_id)||src.source_url!==s.source_url) throw new Error('Source identity mismatch: '+s.source_url);
     if(src.source_type!=='public_review'||src.is_published!==true||Number(src.quality_score)<70||src.summary!==verifiedSummary||src.source_domain!=='jinzzawedding.com'){
       const {data:updated,error:ue}=await db.from('wedding_review_sources').update({
         source_type:'public_review',
         is_published:true,
         quality_score:Math.max(Number(src.quality_score)||0,Number(s.quality_score)||92),
         source_domain:'jinzzawedding.com',
         summary:verifiedSummary,
         analyzed_at:new Date().toISOString(),
         updated_at:new Date().toISOString()
       }).eq('source_id',src.source_id)
         .select('source_id,hall_id,source_url,source_type,quality_score,is_published,summary,source_domain,source_name').single();
       if(ue)throw ue;
       src=updated;sourcesUpdated++;
     }
   }

   const {data:prior,error:pe}=await db.from('wedding_review_analysis')
    .select('analysis_id,source_id,hall_id,evidence_strength,sentiment').eq('source_id',src.source_id).maybeSingle();
   if(pe)throw pe;
   if(prior){
    if(String(prior.hall_id)!==String(venue.hall_id)||Number(prior.evidence_strength)<70) throw new Error('Existing analysis mismatch: '+src.source_id);
    analysisExisting++;
    receipts.push({batch:audit.batch||1,hall_id:venue.hall_id,source_id:src.source_id,url:s.source_url,status:'existing'});
    continue;
   }
   const row={source_id:src.source_id,hall_id:venue.hall_id,sentiment:s.sentiment,evidence_strength:Number(s.evidence_strength)||92};
   const {data:created,error:ie}=await db.from('wedding_review_analysis').insert(row)
    .select('analysis_id,source_id,hall_id,evidence_strength,sentiment,analyzed_at').single();
   if(ie)throw ie;
   analysisInserted++;
   receipts.push({batch:audit.batch||1,hall_id:venue.hall_id,source_id:src.source_id,url:s.source_url,status:'inserted',analysis_id:created.analysis_id});
  }
 }
 console.log('VERIFIED_ANALYSIS_APPLY_JSON_BEGIN');
 console.log(JSON.stringify({checked,sourcesInserted,sourcesUpdated,analysisInserted,analysisExisting,receipts},null,2));
 console.log('VERIFIED_ANALYSIS_APPLY_JSON_END');
}
main().catch(e=>{console.error(e);process.exit(1);});