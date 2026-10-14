'use strict';
// Specialist-only ranked TOP30 competition. Read reviewed, source-specific audit
// evidence from this repository. Use independent original score/scale/sample;
// never create a score from prose, member submissions or old PICKRANK data.
const {readFileSync,readdirSync}=require('node:fs');
const {createHash}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank GitHub Secrets required');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const legacyAudits=new Set([
 '2026-10-03-held-review-analysis-batch-1.json',
 '2026-10-03-held-review-analysis-batch-2.json',
 '2026-10-03-held-review-analysis-batch-3.json'
]);
const withheld=new Set(['173a2fa7-0052-4483-b898-2a3312b65765']); // Grand Ostium
const correction=JSON.parse(readFileSync('research/patches/2026-09-27-independent-source-correction.json','utf8'));
for(const h of correction.venues||[])if(h.external_rating_action==='unpublish_preserve_date')withheld.add(String(h.hall_id));
function canonical(raw){const u=new URL(raw);u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_')||k==='fbclid'||k==='gclid')u.searchParams.delete(k);u.searchParams.sort();return u.href.toLowerCase().replace(/\/+$/,'');}
function isCatalog(url){
 try{const u=new URL(url);const h=u.hostname.toLowerCase().replace(/^www\./,'');const p=u.pathname.toLowerCase();
 return (h==='iwedding.co.kr'&&p.startsWith('/enterprise/info/'))||
 (h==='directwedding.co.kr'&&p.startsWith('/weddinghall/hall'))||
 (h==='weddingbook.com'&&p.startsWith('/weddinghall/'))||
 (h==='diningcode.com'&&p==='/profile.php')||
 (h==='weddingcrowd.kr'&&p.startsWith('/hall/view.php'));
 }catch{return true;}
}
async function pages(t,select){let r=[];for(let n=0;;n+=500){const {data,error}=await db.from(t).select(select).range(n,n+499);if(error)throw error;r.push(...data);if(data.length<500)return r;}}
const approvedAudits=[];
for(const filename of readdirSync('research/audits').sort()){
 if(!filename.endsWith('.json'))continue;
 const path='research/audits/'+filename,j=JSON.parse(readFileSync(path,'utf8'));
 if(j.schema_version!=='weddingrank-review-analysis-batch-v1')continue;
 if(!legacyAudits.has(filename)&&!(j.approval_status==='approved'&&j.reviewed_by_specialist===true&&j.source_evidence_validated===true)){
  console.log('WEDDINGRANK_PENDING_UNREVIEWED_AUDIT='+filename);continue;
 }
 approvedAudits.push({filename,data:j});
}
function auditMap(){
 const m=new Map();
 for(const {filename,data} of approvedAudits){
  if(data.scope&&data.scope!=='WeddingRank-only')throw Error('Cross-site evidence: '+filename);
  for(const v of data.venues||[]){
   for(const s of v.sources||[]){
    const url=s.source_url||s.url;
    if(!url||isCatalog(url))throw Error('Non-original evidence found in approved batch: '+filename);
    const score=Number(s.raw_score),scale=Number(s.raw_scale),sample=Number(s.sample_count);
    if(!Number.isFinite(score)||!Number.isFinite(scale)||scale<=0||score<0||score>scale||!Number.isInteger(sample)||sample<1)
      throw Error('Invalid source-specific raw score: '+filename);
    const k=String(v.hall_id)+'|'+canonical(url);
    const entry={hall_id:String(v.hall_id),url:canonical(url),score,scale,sample,filename};
    if(m.has(k)&&JSON.stringify(m.get(k).score)!==JSON.stringify(score))throw Error('Conflicting original score '+k);
    m.set(k,entry);
   }
  }
 }
 return m;
}
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function main(){
 const [halls,sources,analysis,old]=await Promise.all([
  pages('wedding_halls','hall_id,name,is_public,operation_status'),
  pages('wedding_review_sources','source_id,hall_id,source_url,is_published,source_type,quality_score,published_date'),
  pages('wedding_review_analysis','source_id,hall_id,evidence_strength'),
  pages('weddingrank_top30_competition','hall_id,overall_score,source_count,evidence_hash,rank_position,previous_rank,score_basis_at,last_rank_change_at,last_verified_at,created_at,evidence_publication_dates_complete,evidence_sources')
 ]);
 const hallById=new Map(halls.map(h=>[String(h.hall_id),h]));
 const analysisBySource=new Map(analysis.map(a=>[String(a.source_id),a]));
 const audited=auditMap(),grouped=new Map();
 for(const source of sources){
  const id=String(source.hall_id),h=hallById.get(id);
  if(withheld.has(id)||!h||h.is_public!==true||h.operation_status!=='운영'||
    !source.is_published||source.source_type!=='public_review'||Number(source.quality_score)<70||
    !String(source.source_url||'').startsWith('https://')||isCatalog(source.source_url))continue;
  const a=analysisBySource.get(String(source.source_id));
  if(!a||String(a.hall_id)!==id||Number(a.evidence_strength)<70)continue;
  const url=canonical(source.source_url),entry=audited.get(id+'|'+url);
  if(!entry)continue;
  if(!grouped.has(id))grouped.set(id,new Map());
  grouped.get(id).set(url,{...entry,published_date:source.published_date||null,
   quality:Number(source.quality_score),analysis_strength:Number(a.evidence_strength)});
 }
 const eligible=[];
 for(const [id,refs] of grouped){
  if(refs.size<3)continue;
  const entries=[...refs.values()].sort((a,b)=>a.url.localeCompare(b.url));
  const score=Math.round(entries.reduce((total,e)=>total+(e.score/e.scale*5),0)/entries.length*100)/100;
  const totalSamples=entries.reduce((x,e)=>x+e.sample,0);
  const precisePostingDates=entries.every(e=>Boolean(e.published_date));
  eligible.push({hall_id:id,name:hallById.get(id).name,overall_score:score,source_count:entries.length,
    evidence_hash:hash(entries),evidence_publication_dates_complete:precisePostingDates,total_samples:totalSamples, evidence_sources:entries.map(e=>({url:e.url,raw_score:e.score,raw_scale:e.scale,sample_count:e.sample,published_date:e.published_date}))});
 }
 eligible.sort((a,b)=>b.overall_score-a.overall_score||b.source_count-a.source_count||a.name.localeCompare(b.name,'ko')||a.hall_id.localeCompare(b.hall_id));
 eligible.forEach((r,i)=>r.rank_position=i+1);
 const before=new Map(old.map(x=>[String(x.hall_id),x])),afterIds=new Set(eligible.map(x=>x.hall_id)),now=new Date().toISOString();
 let created=0,changed=0,unchanged=0;
 for(const n of eligible){
  const previous=before.get(n.hall_id),basisChanged=!previous||previous.evidence_hash!==n.evidence_hash;
  const rankChanged=Boolean(previous&&previous.rank_position!==n.rank_position);
  const needsUpdate=basisChanged||rankChanged||!Array.isArray(previous?.evidence_sources)||previous.evidence_sources.length!==n.evidence_sources.length||previous.evidence_publication_dates_complete!==n.evidence_publication_dates_complete||
    Number(previous.overall_score)!==n.overall_score||previous.source_count!==n.source_count;
  if(!needsUpdate){unchanged++;continue;}
  const payload={hall_id:n.hall_id,overall_score:n.overall_score,source_count:n.source_count,
   evidence_hash:n.evidence_hash,evidence_sources:n.evidence_sources,evidence_publication_dates_complete:n.evidence_publication_dates_complete,
   rank_position:n.rank_position,
   previous_rank:previous?(rankChanged?previous.rank_position:previous.previous_rank):null,
   score_basis_at:basisChanged?now:previous.score_basis_at,
   last_rank_change_at:rankChanged?now:previous?.last_rank_change_at||now,
   last_verified_at:now};
  const {error}=await db.from('weddingrank_top30_competition').upsert(payload,{onConflict:'hall_id'});
  if(error)throw Error('TOP30 upsert '+n.name+': '+error.message);
  if(previous)changed++;else created++;
 }
 const stale=old.map(x=>x.hall_id).filter(id=>!afterIds.has(String(id)));
 if(stale.length){const {error}=await db.from('weddingrank_top30_competition').delete().in('hall_id',stale);if(error)throw error;}
 const final=await pages('weddingrank_top30_competition','hall_id,overall_score,source_count,rank_position,evidence_hash,evidence_sources,evidence_publication_dates_complete');
 if(final.length!==eligible.length)throw Error('TOP30 count mismatch');
 const finalById=new Map(final.map(x=>[String(x.hall_id),x]));
 for(const x of eligible){const s=finalById.get(x.hall_id);
  if(!s||s.rank_position!==x.rank_position||Number(s.overall_score)!==x.overall_score||s.evidence_hash!==x.evidence_hash)
   throw Error('TOP30 score/rank readback mismatch: '+x.name);
 }
 console.log('WEDDINGRANK_TOP30_SYNC='+JSON.stringify({scope:'WeddingRank-only',verified_at:now,maximum_public_ranks:30,
   qualified_source_traced_venues:eligible.length,shown_top30:Math.min(30,eligible.length),
   added:created,updated:changed,unchanged,disqualified_removed:stale.length,
   exact_post_dates_pending:eligible.filter(x=>!x.evidence_publication_dates_complete).length,
   currently_ranking:eligible.slice(0,30).map(x=>({rank:x.rank_position,name:x.name,score:x.overall_score,sources:x.source_count,date_verified:x.evidence_publication_dates_complete})),
   existing_cron_untouched:true,pickrank_sync:false,legacy_ratings_untouched:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
