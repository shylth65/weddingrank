'use strict';
// Batch discovery of candidate URLs only. No database writes or publication.
const {createClient}=require('@supabase/supabase-js');
const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!u||!k||new URL(u).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank project secrets missing');
const db=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
const getAll=async(t,c)=>{let out=[];for(let i=0;;i+=500){const {data,error}=await db.from(t).select(c).range(i,i+499);if(error)throw error;out.push(...data);if(data.length<500)return out}};
const clean=s=>String(s||'').replace(/[^a-z0-9가-힣]/gi,'').toLowerCase();
const root='https://jinzzawedding.com';
const allowed=p=>/^\/reviews\/\d+$/.test(p);
async function fetchPage(url){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),9000);try{const r=await fetch(url,{signal:ctl.signal,headers:{'User-Agent':'WeddingRankEvidenceAudit/1.0','Accept':'text/html'}});if(!r.ok)throw Error('HTTP '+r.status);return (await r.text()).slice(0,400000)}finally{clearTimeout(timer)}}
function links(html,base){return [...new Set([...html.matchAll(/href=["']([^"'#]+)["']/gi)].map(m=>{try{const u=new URL(m[1],base);return u.hostname==='jinzzawedding.com'&&allowed(u.pathname)?u.origin+u.pathname:null}catch{return null}}).filter(Boolean))]}
function jsonld(html){const out=[];for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const j=JSON.parse(m[1]);out.push(...(Array.isArray(j)?j:(j['@graph']||[j])))}catch{}}return out}
async function main(){
const [halls,sources]=await Promise.all([getAll('wedding_halls','hall_id,name,operation_status'),getAll('wedding_review_sources','source_url')]);
const known=new Set(sources.map(s=>String(s.source_url||'').replace(/\/$/,'')));
const hallNames=new Map(halls.filter(h=>h.operation_status==='운영').map(h=>[clean(h.name),h]));
const seeds=new Set(['/','/reviews','/halls']);
for(const s of sources){try{const x=new URL(s.source_url);if(x.hostname==='jinzzawedding.com'&&allowed(x.pathname))seeds.add(x.pathname)}catch{}}
const seedUrls=[...seeds].slice(0,350).map(p=>root+p);
const candidates=new Set(),errors=[];let pages=0;
for(let i=0;i<seedUrls.length;i+=5){await Promise.all(seedUrls.slice(i,i+5).map(async url=>{try{const html=await fetchPage(url);pages++;for(const l of links(html,url))candidates.add(l)}catch(e){errors.push({url,error:String(e).slice(0,80)})}}))}
const urls=[...candidates].filter(url=>!known.has(url)).slice(0,250);
const leads=[];for(let i=0;i<urls.length;i+=5){await Promise.all(urls.slice(i,i+5).map(async url=>{try{const html=await fetchPage(url),rv=jsonld(html).find(v=>String(v['@type']||'').includes('Review'))||{},title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.trim()||'';
const name=rv.itemReviewed?.name||'',hall=hallNames.get(clean(name)),rating=rv.reviewRating||{},score=Number(rating.ratingValue),scale=Number(rating.bestRating);
leads.push({url,title,venue_name:name,matched_hall_id:hall?.hall_id||null,raw_score:Number.isFinite(score)?score:null,raw_scale:Number.isFinite(scale)?scale:null,published_date:rv.datePublished||null,author_present:Boolean(rv.author?.name),verified:false,publish_eligible:false});
}catch(e){errors.push({url,error:String(e).slice(0,80)})}}))}
console.log('WEDDINGRANK_BULK_DISCOVERY_JSON='+JSON.stringify({timestamp:new Date().toISOString(),scope:'WeddingRank-only',mode:'read_only',pickrank_sync:false,existing_source_count:known.size,seed_pages:seedUrls.length,pages_scanned:pages,discovered_urls:candidates.size,new_urls_examined:urls.length,new_leads:leads.length,matched_halls:leads.filter(l=>l.matched_hall_id).length,errors:errors.slice(0,40),leads}));
}
main().catch(e=>{console.error(e);process.exitCode=1});