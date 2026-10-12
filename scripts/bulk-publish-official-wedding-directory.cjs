'use strict';
// One-shot high-volume specialist directory publication.
// Gate each venue by original official URL, live evidence, identity and duplicate checks.
// No ratings, price, review data or schedules are modified.
const {createClient}=require('@supabase/supabase-js');
const {readFileSync,writeFileSync}=require('node:fs');
const patch=JSON.parse(readFileSync('research/patches/2026-10-13-bulk-directory-36-candidates.json','utf8'));
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('Wrong WeddingRank project / missing Github Secrets');
if(patch.schema_version!=='weddingrank-bulk-official-publish-batch-v1'||patch.scope!=='WeddingRank-only'||patch.pickrank_sync!==false||patch.candidate_hall_ids.length!==36)throw Error('Patch batch verification failed');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const normalized=s=>String(s||'').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
const normalizeDomain=u=>{try{return new URL(u).hostname.toLowerCase().replace(/^www\./,'')}catch{return ''}};
const sameOfficialFamily=(a,b)=>a&&b&&(a===b||a.endsWith('.'+b)||b.endsWith('.'+a));
const phoneDigits=s=>String(s||'').replace(/\D/g,'');
const headlineText=html=>html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').slice(0,500000);
const brand=s=>{
  let t=String(s||'').replace(/(웨딩홀|웨딩|컨벤션|호텔|리조트|&|파티|센터|공간|주식회사|\s)/g,'').trim();
  return normalized(t).slice(0,12);
};
async function pages(t,cols){let result=[];for(let off=0;;off+=500){
 const {data,error}=await db.from(t).select(cols).range(off,off+499);if(error)throw error;
 result.push(...data);if(data.length<500)return result;
}}
async function probe(h){
 const result={hall_id:h.hall_id,name:h.name,existing_venue_url:h.source_url,ready:false,reason:null,source_http_status:null};
 const homepageHost=normalizeDomain(h.website),officialHost=normalizeDomain(h.source_url);
 if(h.verification_status!=='공식확인'){result.reason='not_officially_verified';return result;}
 if(!h.road_address||!h.phone||!homepageHost||!officialHost){result.reason='incomplete_identity';return result;}
 if(!sameOfficialFamily(homepageHost,officialHost)){result.reason='source_host_not_official';return result;}
 if(!/^https?:\/\//.test(h.source_url)){result.reason='invalid_original_evidence_url';return result;}
 const controller=new AbortController(), t=setTimeout(()=>controller.abort(),17000);
 try{
  const response=await fetch(h.source_url,{redirect:'follow',signal:controller.signal,
   headers:{'User-Agent':'Mozilla/5.0 (compatible; WeddingRankAudit/1.0)'}});
  result.source_http_status=response.status;
  const finalHost=normalizeDomain(response.url);
  if(!response.ok){result.reason='official_http_'+response.status;return result;}
  if(!sameOfficialFamily(homepageHost,finalHost)){result.reason='redirect_to_untrusted_host';return result;}
  const html=await response.text(), plain=headlineText(html),simple=normalized(plain);
  const wedding=/웨딩|결혼식|예식|wedding|marriage|ceremony|bridal|婚礼|weddinghall/i.test(plain);
  const phone=phoneDigits(h.phone),phoneSeen=phone.length>=8&&phoneDigits(plain).includes(phone);
  const token=brand(h.name),nameSeen=token.length>=3&&simple.includes(token);
  const proofInPath=/wedd|marri|예식|웨딩|banquet|sub2[-_]|hall/i.test(new URL(response.url).pathname);
  // Live wedding evidence and official venue identity; both must be present.
  if(!wedding){result.reason='missing_live_wedding_evidence';return result;}
  if(!(nameSeen||phoneSeen)){result.reason='no_live_official_name_or_phone_match';return result;}
  if(!phoneSeen&&!nameSeen){result.reason='missing_identity_match';return result;}
  result.ready=true;
  result.proof={official_http:response.status,name_on_official_page:nameSeen,phone_on_official_page:phoneSeen,wedding_on_official_page:wedding,venue_page_path:proofInPath,source_url:h.source_url};
  return result;
 }catch(e){result.reason=String(e.name||e).includes('Abort')?'official_timeout':'official_fetch_error';return result;}
 finally{clearTimeout(t);}
}
async function pool(list,fn,n=6){
 const out=new Array(list.length);let offset=0;
 async function worker(){while(offset<list.length){const i=offset++;out[i]=await fn(list[i]);}}
 await Promise.all(Array.from({length:Math.min(n,list.length)},worker));return out;
}
(async()=>{
 const [halls,ratings,sources,analyses]=await Promise.all([
  pages('wedding_halls','hall_id,name,road_address,phone,website,source_url,verification_status,operation_status,is_public'),
  pages('external_wedding_ratings','hall_id,is_public,overall_score,updated_at'),
  pages('wedding_review_sources','source_id'),pages('wedding_review_analysis','analysis_id')
 ]);
 const expectedIds=new Set(patch.candidate_hall_ids);
 const targets=halls.filter(h=>expectedIds.has(h.hall_id));
 if(targets.length!==expectedIds.size)throw Error('One or more candidate IDs missing from specialist DB');
 const publicBefore=halls.filter(h=>h.is_public===true&&h.operation_status==='운영').length;
 const ratingsBefore=JSON.stringify(ratings.map(r=>[r.hall_id,r.is_public,r.overall_score,r.updated_at]).sort((a,b)=>a[0].localeCompare(b[0])));
 const audit=[];const preflight=[];
 for(const h of targets){
  const same=halls.filter(x=>x.hall_id!==h.hall_id && (
    (normalized(x.name).length>3&&normalized(x.name)===normalized(h.name))||
    (normalized(h.road_address).length>9&&normalized(x.road_address)===normalized(h.road_address))));
  if(h.is_public!==false||h.operation_status!=='운영'||same.length){
   audit.push({hall_id:h.hall_id,name:h.name,ready:false,reason:same.length?'possible_duplicate_existing_records':h.is_public?'already_public':'not_confirmed_operating',
    duplicate_ids:same.map(x=>x.hall_id)});
  }else preflight.push(h);
 }
 const tested=await pool(preflight,probe);
 audit.push(...tested);
 const allowed=tested.filter(x=>x.ready);
 // Publication never depends on score or member review counts.
 const now=await pages('wedding_halls','hall_id,is_public,operation_status,road_address,phone,website');
 const beforeById=new Map(targets.map(h=>[h.hall_id,h]));
 for(const s of allowed){
  const old=beforeById.get(s.hall_id),h=now.find(x=>x.hall_id===s.hall_id);
  if(!h||h.is_public!==false||h.operation_status!=='운영'||h.road_address!==old.road_address||
    h.phone!==old.phone||h.website!==old.website)throw Error('Concurrent venue identity change: '+s.hall_id);
 }
 let published=[];
 if(allowed.length){
  const {data,error}=await db.from('wedding_halls').update({is_public:true})
   .in('hall_id',allowed.map(x=>x.hall_id)).eq('is_public',false).eq('operation_status','운영')
   .select('hall_id,name');
  if(error)throw Error('Publication failed: '+error.message);
  if(data.length!==allowed.length)throw Error('Bulk publication row count mismatch: '+data.length+' vs '+allowed.length);
  published=data;
 }
 const [finalHalls,finalRatings,finalSources,finalAnalyses]=await Promise.all([
  pages('wedding_halls','hall_id,is_public,operation_status'),
  pages('external_wedding_ratings','hall_id,is_public,overall_score,updated_at'),
  pages('wedding_review_sources','source_id'),pages('wedding_review_analysis','analysis_id')
 ]);
 const publicAfter=finalHalls.filter(h=>h.is_public===true&&h.operation_status==='운영').length;
 const ratingSnapshot=JSON.stringify(finalRatings.map(r=>[r.hall_id,r.is_public,r.overall_score,r.updated_at]).sort((a,b)=>a[0].localeCompare(b[0])));
 if(publicAfter!==publicBefore+published.length||ratingSnapshot!==ratingsBefore||sources.length!==finalSources.length||analyses.length!==finalAnalyses.length)
  throw Error('Publication counts or original ratings/sources unexpectedly changed');
 const report={scope:'WeddingRank-only',run_at:new Date().toISOString(),state:'DB_UPDATED_SITE_NOT_YET_VERIFIED',batch_size:targets.length,
  reviewed_live_official:preflight.length,approved:allowed.length,new_public_directory:published.length,
  published,public_before:publicBefore,public_after:publicAfter,public_rating_count:finalRatings.filter(r=>r.is_public).length,
  held:audit.filter(x=>!x.ready),held_count:audit.filter(x=>!x.ready).length,
  official_proofs:allowed.map(x=>({hall_id:x.hall_id,name:x.name,...x.proof})),
  original_price_rows_touched:0,review_source_rows_touched:0,rating_values_or_dates_changed:0,
  github_reservation_schedules_changed:0,pickrank_sync:false};
 writeFileSync('weddingrank-bulk-official-publish-result.json',JSON.stringify(report,null,2)+'\n');
 console.log('WEDDINGRANK_BULK_OFFICIAL_PUBLISH_JSON='+JSON.stringify({...report,held:audit.filter(x=>!x.ready).map(x=>({name:x.name,reason:x.reason})),official_proofs:allowed.map(x=>({name:x.name,...x.proof}))}));
})().catch(e=>{console.error(e);process.exit(1)});
