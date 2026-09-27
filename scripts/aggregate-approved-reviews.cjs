const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('node:fs');

// Explicitly withdrawn ratings cannot be republished from stale source rows.
// Remove a guard only after the specialist source correction is verified.
const verifiedPatch=JSON.parse(readFileSync('research/patches/2026-09-27-independent-source-correction.json','utf8'));
if(verifiedPatch.schema_version!=='weddingrank-verified-patch-v1')throw new Error('Missing reviewed exclusion patch');
const protectedHallIds=new Set(verifiedPatch.venues
  .filter(v=>v.external_rating_action==='unpublish_preserve_date')
  .map(v=>String(v.hall_id)));


const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('BLOCKED: WeddingRank '+(!url?'SUPABASE_URL':'SUPABASE_SERVICE_ROLE_KEY')+' is missing.');
  process.exit(2);
}
if (!url.includes('mozmxkmaynhxqwzovzhi.supabase.co')) {
  console.error('BLOCKED: Supabase project is not WeddingRank.');
  process.exit(2);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const metrics = ['food_score','access_score','parking_score','facility_score','bride_waiting_score','banquet_score','service_score','value_score'];
const avg = values => values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length*100)/100 : null;
const pages = async (table, select) => {
  const all=[];
  for(let offset=0;;offset+=500) {
    const { data, error } = await db.from(table).select(select).range(offset,offset+499);
    if(error) throw error;
    all.push(...data);
    if(data.length<500) return all;
  }
};
async function main() {
  const [halls,sources,analysis,prior] = await Promise.all([
    pages('wedding_halls','hall_id,is_public,operation_status'),
    pages('wedding_review_sources','source_id,hall_id,source_url,source_type,quality_score,is_published'),
    pages('wedding_review_analysis','source_id,hall_id,evidence_strength,'+metrics.join(',')),
    pages('external_wedding_ratings','hall_id,source_count,overall_score,is_public,updated_at,'+metrics.join(','))
  ]);
  const operating=new Set(halls.filter(h=>h.is_public===true && h.operation_status==='운영').map(h=>String(h.hall_id)));
  const analysisById=new Map(analysis.map(a=>[String(a.source_id),a]));
  const previous=new Map(prior.map(r=>[String(r.hall_id),r]));
  const grouped=new Map();
  for(const s of sources) {
    if(!operating.has(String(s.hall_id)) || s.is_published!==true || s.source_type!=='public_review' || Number(s.quality_score)<70 || !/^https:\/\//i.test(s.source_url||'')) continue;
    const a=analysisById.get(String(s.source_id));
    if(!a || Number(a.evidence_strength)<70 || String(a.hall_id)!==String(s.hall_id)) continue;
    const group=grouped.get(String(s.hall_id)) || new Map();
    group.set(s.source_url,a);
    grouped.set(String(s.hall_id),group);
  }
  let updated=0,unchanged=0,insufficient=0,protectedUnpublished=0;
  const eligible=new Set();
  for(const [hallId,distinct] of grouped) {
    if(protectedHallIds.has(hallId)) { protectedUnpublished++; continue; }
    if(distinct.size<3) { insufficient++; continue; }
    const evaluations=[...distinct.values()];
    const result={hall_id:hallId,source_count:evaluations.length,is_public:true,methodology_version:'external_v1'};
    for(const m of metrics) {
      const values=evaluations.map(a=>Number(a[m])).filter(v=>Number.isFinite(v)&&v>=1&&v<=5);
      result[m]=avg(values);
    }
    result.overall_score=avg(metrics.map(m=>result[m]).filter(v=>v!=null));
    if(result.overall_score==null) { insufficient++; continue; }
    eligible.add(hallId);
    const old=previous.get(hallId);
    const fields=['source_count','overall_score','is_public',...metrics];
    if(old && fields.every(k=>old[k]==null&&result[k]==null || typeof result[k]==='number'&&Number(old[k])===result[k] || old[k]===result[k])) {unchanged++;continue;}
    result.updated_at=new Date().toISOString();
    const {error}=await db.from('external_wedding_ratings').upsert(result,{onConflict:'hall_id'});
    if(error) throw error;
    updated++;
  }
  // Report stale public rows without mutating them. A reviewed, explicitly
  // approved correction can then preserve the existing rating date.
  const ratingsRequiringReview=[...previous]
    .filter(([hallId,old])=>old.is_public===true&&!eligible.has(hallId))
    .map(([hallId])=>hallId);
  const missingDiagnostics=ratingsRequiringReview.map(hallId=>({
    hall_id:hallId,
    public_source_rows:sources.filter(s=>String(s.hall_id)===hallId&&s.is_published===true&&s.source_type==='public_review').length,
    analyzed_rows:analysis.filter(a=>String(a.hall_id)===hallId&&Number(a.evidence_strength)>=70).length,
    distinct_eligible_sources:grouped.get(hallId)?.size||0,
    protected_by_patch:protectedHallIds.has(hallId)
  }));
  let withdrawnUnanalysed=0;
  for(const d of missingDiagnostics){
    if(d.protected_by_patch||d.analyzed_rows!==0||d.distinct_eligible_sources!==0)continue;
    const old=previous.get(d.hall_id);
    const {error}=await db.from('external_wedding_ratings')
      .update({is_public:false}).eq('hall_id',d.hall_id).eq('is_public',true);
    if(error)throw error;
    const {data:after,error:afterError}=await db.from('external_wedding_ratings')
      .select('is_public,updated_at').eq('hall_id',d.hall_id).single();
    if(afterError)throw afterError;
    if(after.is_public!==false||after.updated_at!==old.updated_at)
      throw new Error('Withdrawal or preserved rating date failed: '+d.hall_id);
    withdrawnUnanalysed++;
  }
  const approvedSources=[...grouped.values()].reduce((sum,distinct)=>sum+distinct.size,0);
  console.log(JSON.stringify({
    halls_scanned:halls.length,
    public_operating_halls:operating.size,
    sources_scanned:sources.length,
    approved_sources:approvedSources,
    eligible_ratings:eligible.size,
    updated,
    unchanged,
    ratings_requiring_review:ratingsRequiringReview.length,
    rating_ids_requiring_review:ratingsRequiringReview,
    missing_diagnostics:missingDiagnostics,
    insufficient,
    protected_unpublished:protectedUnpublished,
    withdrawn_unanalysed:withdrawnUnanalysed
  }));
}
main().catch(e=>{console.error(e);process.exit(1)});
