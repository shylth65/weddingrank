'use strict';
// Batch discovery of candidate URLs only. No database writes or publication.
const {createClient}=require('@supabase/supabase-js');
const {createHash}=require('node:crypto');
function canonical(raw){const u=new URL(raw);u.hash='';u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');for(const k of [...u.searchParams.keys()])if(/^utm_/i.test(k)||['fbclid','gclid'].includes(k.toLowerCase()))u.searchParams.delete(k);u.searchParams.sort();return u.origin+u.pathname.replace(/\/$/,'')+(u.search||'');}
const sha256=s=>createHash('sha256').update(s).digest('hex');
// Hash only an independently attributable review body, never dynamic whole-page HTML.
const reviewBodyHash=review=>{const body=String(review?.reviewBody||'').replace(/\s+/g,' ').trim();return body.length>=200?sha256('review-body-v1\n'+body):null;};
const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!u||!k||new URL(u).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank project secrets missing');
const db=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
const getAll=async(t,c)=>{let out=[];for(let i=0;;i+=500){const {data,error}=await db.from(t).select(c).range(i,i+499);if(error)throw error;out.push(...data);if(data.length<500)return out}};
const clean=s=>String(s||'').replace(/[^a-z0-9가-힣]/gi,'').toLowerCase();
const aliases=s=>{const v=clean(s);return [...new Set([v,v.replace(/웨딩홀|웨딩|예식장|호텔|점$/g,''),v.replace(/서울|역삼|강남/g,'')].filter(x=>x.length>=3))]};
const root='https://jinzzawedding.com';
const allowed=p=>/^\/reviews\/\d+$/.test(p);
async function fetchPage(url){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),9000);try{const r=await fetch(url,{signal:ctl.signal,headers:{'User-Agent':'WeddingRankEvidenceAudit/1.0','Accept':'text/html'}});if(!r.ok)throw Error('HTTP '+r.status);return (await r.text()).slice(0,400000)}finally{clearTimeout(timer)}}
function links(html,base){return [...new Set([...html.matchAll(/href=["']([^"'#]+)["']/gi)].map(m=>{try{const u=new URL(m[1],base);return u.hostname==='jinzzawedding.com'&&allowed(u.pathname)?u.origin+u.pathname:null}catch{return null}}).filter(Boolean))]}
function jsonld(html){const out=[];for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const j=JSON.parse(m[1]);out.push(...(Array.isArray(j)?j:(j['@graph']||[j])))}catch{}}return out}
async function main(){
const [halls,sources,ranking,queued]=await Promise.all([getAll('wedding_halls','hall_id,name,operation_status'),getAll('wedding_review_sources','source_url'),getAll('weddingrank_top30_competition','hall_id'),getAll('wedding_review_candidate_queue','canonical_url,content_sha256,status')]);
if(ranking.length>=30){console.log('WEDDINGRANK_DISCOVERY_SKIPPED=TOP30_COMPLETE');return;}
const known=new Set(sources.map(s=>{try{return canonical(s.source_url)}catch{return null}}).filter(Boolean));
const existingQueue=new Map(queued.map(q=>[q.canonical_url,q]));
const hallNames=new Map();for(const h of halls.filter(h=>h.operation_status==='운영'))for(const n of aliases(h.name)){const a=hallNames.get(n)||[];a.push(h);hallNames.set(n,a)}
// The generic /reviews path returns HTTP 404; discover individual review links from live pages instead.
const seeds=new Set(['/','/halls']);
for(const s of sources){try{const x=new URL(s.source_url);if(x.hostname==='jinzzawedding.com'&&allowed(x.pathname))seeds.add(x.pathname)}catch{}}
const seedUrls=[...seeds].slice(0,350).map(p=>root+p);
const candidates=new Set(),errors=[];let pages=0;
for(let i=0;i<seedUrls.length;i+=5){await Promise.all(seedUrls.slice(i,i+5).map(async url=>{try{const html=await fetchPage(url);pages++;for(const l of links(html,url))candidates.add(l)}catch(e){errors.push({url,error:String(e).slice(0,80)})}}))}
const urls=[...candidates].filter(url=>!known.has(canonical(url))).slice(0,250);
const leads=[];for(let i=0;i<urls.length;i+=5){await Promise.all(urls.slice(i,i+5).map(async url=>{try{const html=await fetchPage(url),rv=jsonld(html).find(v=>String(v['@type']||'').includes('Review'))||{},title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.trim()||'';
const name=rv.itemReviewed?.name||'',matches=[...new Map(aliases(name).flatMap(n=>hallNames.get(n)||[]).map(h=>[h.hall_id,h])).values()],hall=matches.length===1?matches[0]:null,rating=rv.reviewRating||{},score=Number(rating.ratingValue),scale=Number(rating.bestRating);
leads.push({url:canonical(url),content_sha256:reviewBodyHash(rv),title,venue_name:name,matched_hall_id:hall?.hall_id||null,identity_candidates:matches.map(h=>({hall_id:h.hall_id,name:h.name})),identity_status:hall?'candidate_match_unverified':matches.length?'ambiguous':'unmatched',raw_score:Number.isFinite(score)?score:null,raw_scale:Number.isFinite(scale)?scale:null,published_date:rv.datePublished||null,author_present:Boolean(rv.author?.name),verified:false,publish_eligible:false});
}catch(e){errors.push({url,error:String(e).slice(0,80)})}}))}
let queueAdded=0,queueChanged=0,queueUnchanged=0;
for(const lead of leads){
 const prior=existingQueue.get(lead.url);
 // Previous stored fingerprints were whole-HTML hashes. They cannot establish body changes.
 // Preserve old queued records until a separately verified baseline migration.
 if(prior){queueUnchanged++;console.log('::notice::EXISTING_HTML_HASH_BASELINE_UNVERIFIED '+lead.url);continue;}
 if(!lead.content_sha256){console.log('::notice::REVIEW_BODY_UNAVAILABLE_HELD '+lead.url);continue;}
 if(prior&&prior.content_sha256===lead.content_sha256){queueUnchanged++;continue;}
 if(prior&&['qualitative_approved','quantitative_approved'].includes(prior.status)){
  console.log('::warning::Previously approved candidate changed and requires specialist manual review: '+lead.url);
  continue;
 }
 const patch={canonical_url:lead.url,original_url:lead.url,source_domain:new URL(lead.url).hostname,content_sha256:lead.content_sha256,source_title:lead.title||null,hall_id:lead.matched_hall_id||null,status:'needs_review',validation_reason:'review_body_v1_new_unverified_candidate',last_checked_at:new Date().toISOString()};
 if(prior){patch.previous_content_sha256=prior.content_sha256||null;
  const {error}=await db.from('wedding_review_candidate_queue').update(patch).eq('canonical_url',lead.url);
  if(error)throw Error('candidate changed update: '+error.message);queueChanged++;
 } else {
  const {error}=await db.from('wedding_review_candidate_queue').insert(patch);
  if(error)throw Error('candidate insert: '+error.message);queueAdded++;
 }
}
console.log('WEDDINGRANK_BULK_DISCOVERY_JSON='+JSON.stringify({timestamp:new Date().toISOString(),scope:'WeddingRank-only',mode:'candidate_queue_only_no_publication',pickrank_sync:false,queue_added:queueAdded,queue_changed:queueChanged,queue_unchanged:queueUnchanged,existing_source_count:known.size,source_hash_scope:'candidate_queue_previous_hash_persisted; no approved_source_overwrite',seed_pages:seedUrls.length,pages_scanned:pages,discovered_urls:candidates.size,new_urls_examined:urls.length,new_leads:leads.length,matched_halls:leads.filter(l=>l.matched_hall_id).length,verified_and_publishable:0,requires_manual_evidence_review:leads.length,errors:errors.slice(0,40),leads}));
}
main().catch(e=>{console.error(e);process.exitCode=1});