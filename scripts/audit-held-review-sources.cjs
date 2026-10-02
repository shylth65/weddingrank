const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('node:fs');

const audit = JSON.parse(readFileSync('research/audits/2026-09-27-external-rating-eligibility.json','utf8'));
const withdrawn = new Set(audit.publication_audit.unpublished_this_run || []);
const targets = (audit.publication_audit.rows || [])
  .filter(r => !withdrawn.has(String(r.hall_id)))
  .map(r => ({ hall_id:String(r.hall_id), name:r.name }));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing WeddingRank Supabase secrets');
if (!url.includes('mozmxkmaynhxqwzovzhi.supabase.co')) throw new Error('Blocked: wrong Supabase project');
const db = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

async function main(){
  const out=[];
  for(const target of targets){
    const [{data:sources,error:se},{data:analyses,error:ae},{data:rating,error:re},{data:hall,error:he}] = await Promise.all([
      db.from('wedding_review_sources')
        .select('source_id,hall_id,source_url,source_name,source_domain,source_type,published_date,quality_score,summary,is_published,created_at,updated_at')
        .eq('hall_id',target.hall_id)
        .order('created_at',{ascending:true}),
      db.from('wedding_review_analysis')
        .select('analysis_id,source_id,hall_id,food_score,access_score,parking_score,facility_score,bride_waiting_score,banquet_score,service_score,value_score,sentiment,evidence_strength,analyzed_at')
        .eq('hall_id',target.hall_id),
      db.from('external_wedding_ratings')
        .select('hall_id,source_count,overall_score,is_public,updated_at')
        .eq('hall_id',target.hall_id).maybeSingle(),
      db.from('wedding_halls')
        .select('hall_id,name,road_address,phone,website,is_public,operation_status')
        .eq('hall_id',target.hall_id).maybeSingle()
    ]);
    if(se||ae||re||he) throw (se||ae||re||he);
    const analysisBySource=new Map((analyses||[]).map(a=>[String(a.source_id),a]));
    out.push({
      target,
      hall,
      rating,
      sources:(sources||[]).map(s=>({...s,analysis:analysisBySource.get(String(s.source_id))||null}))
    });
  }
  console.log('HELD_REVIEW_AUDIT_JSON_BEGIN');
  console.log(JSON.stringify({generated_at:new Date().toISOString(),target_count:out.length,targets:out},null,2));
  console.log('HELD_REVIEW_AUDIT_JSON_END');
}
main().catch(e=>{console.error(e);process.exit(1);});
