'use strict';
// Stages EXISTING independently analysed review sources for specialist verification.
// No AI score synthesis, specialist approval, rank updates or public publication.
const {createClient}=require('@supabase/supabase-js');
const {createHash}=require('node:crypto');
const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!u||!k||new URL(u).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank credentials missing');
const db=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
const hash=x=>createHash('sha256').update(x).digest('hex');
async function all(t,c){let out=[];for(let i=0;;i+=500){const {data,error}=await db.from(t).select(c).range(i,i+499);if(error)throw error;out.push(...data);if(data.length<500)return out;}}
async function main(){
 const [sources,analyses,published]=await Promise.all([
  all('wedding_review_sources','source_id,hall_id,source_url,summary,quality_score,is_published,source_type'),
  all('wedding_review_analysis','source_id,hall_id,evidence_strength,food_score,parking_score,access_score,facility_score,service_score'),
  all('wedding_qualitative_review_publications','source_id,content_sha256,approval_status')
 ]);
 const byAnalysis=new Map(analyses.map(a=>[a.source_id,a])),byExisting=new Map(published.map(p=>[p.source_id,p]));
 let pendingAdded=0,held=0,unchanged=0,errors=0;
 for(const s of sources){
  if(!s.is_published||s.source_type!=='public_review'||Number(s.quality_score)<70||!/^https:\/\//i.test(s.source_url||''))continue;
  const a=byAnalysis.get(s.source_id);if(!a||a.hall_id!==s.hall_id||Number(a.evidence_strength)<70){held++;continue;}
  // This is a snapshot hash of saved summary, NOT the original remote page's content hash.
  const summary=String(s.summary||'').trim();if(!summary){held++;continue;}
  const digest=hash(summary),prev=byExisting.get(s.source_id);
  if(prev){if(prev.content_sha256===digest)unchanged++;else {held++;console.log('::warning::Existing qualitative evidence changed: specialist review required '+s.source_id);}continue;}
  const {error}=await db.from('wedding_qualitative_review_publications').insert({
    source_id:s.source_id,hall_id:s.hall_id,source_url:s.source_url,summary,content_sha256:digest,
    approval_status:'pending',reviewed_at:new Date().toISOString()
  });
  if(error){errors++;console.log('::error::stage failed '+s.source_id+': '+error.message);}else pendingAdded++;
 }
 console.log('WEDDINGRANK_QUALITATIVE_STAGE='+JSON.stringify({scope:'WeddingRank-only',pending_added:pendingAdded,held,unchanged,errors,approved_automatically:0,published_automatically:0,ranking_recomputed:false,hash_basis:'stored summary only'}));
 if(errors)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
