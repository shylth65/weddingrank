const { createClient } = require('@supabase/supabase-js');

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
    pages('external_wedding_ratings','hall_id,source_count,overall_score,is_public,'+metrics.join(','))
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
  let updated=0,unchanged=0,insufficient=0;
  for(const [hallId,distinct] of grouped) {
    if(distinct.size<3) { insufficient++; continue; }
    const evaluations=[...distinct.values()];
    const result={hall_id:hallId,source_count:evaluations.length,is_public:true,methodology_version:'external_v1'};
    for(const m of metrics) {
      const values=evaluations.map(a=>Number(a[m])).filter(v=>Number.isFinite(v)&&v>=1&&v<=5);
      result[m]=avg(values);
    }
    result.overall_score=avg(metrics.map(m=>result[m]).filter(v=>v!=null));
    if(result.overall_score==null) { insufficient++; continue; }
    const old=previous.get(hallId);
    const fields=['source_count','overall_score','is_public',...metrics];
    if(old && fields.every(k=>old[k]==null&&result[k]==null || typeof result[k]==='number'&&Number(old[k])===result[k] || old[k]===result[k])) {unchanged++;continue;}
    result.updated_at=new Date().toISOString();
    const {error}=await db.from('external_wedding_ratings').upsert(result,{onConflict:'hall_id'});
    if(error) throw error;
    updated++;
  }
  console.log(JSON.stringify({halls:halls.length,approved_sources:sources.length,updated,unchanged,insufficient}));
}
main().catch(e=>{console.error(e);process.exit(1)});
