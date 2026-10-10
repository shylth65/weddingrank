'use strict';
// Discovery is deliberately read-only. No publication, rating, or source writes.
// Public venue directories are leads, never independent review evidence.
const {createClient}=require('@supabase/supabase-js');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank secrets/project mismatch');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const clean=s=>String(s||'').replace(/[^a-z0-9가-힣]/gi,'').toLowerCase();
async function fetchHtml(u){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
try{const r=await fetch(u,{signal:ctl.signal,headers:{'User-Agent':'WeddingRankSourceAudit/1.0 (public metadata; no bulk content copy)','Accept':'text/html'}});if(!r.ok)throw Error('HTTP '+r.status);return (await r.text()).slice(0,1000000)}finally{clearTimeout(timer)}}
async function main(){
const {data:halls,error}=await db.from('wedding_halls').select('hall_id,name,road_address,is_public,operation_status').eq('operation_status','운영').limit(1000);
if(error)throw error;
const names=new Map();for(const h of halls){const k=clean(h.name);if(k)names.set(k,h)}
const output={timestamp:new Date().toISOString(),scope:'WeddingRank-only',mode:'discovery_read_only',pickrank_sync:false,sites:[],leads:[],warnings:[]};
for(const site of [{name:'jinzzawedding',url:'https://jinzzawedding.com/'}]){
try{
const html=await fetchHtml(site.url);
const matches=[...html.matchAll(/href=["']([^"'?#]*\/reviews\/\d+)(?:[?#][^"']*)?["']/gi)];
const urls=[...new Set(matches.map(m=>new URL(m[1],site.url).href))].filter(u=>new URL(u).hostname==='jinzzawedding.com').slice(0,100);
output.sites.push({site:site.name,status:'reachable',candidate_review_links:urls.length});
for(const u of urls){
try{const page=await fetchHtml(u);
const title=(page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/<[^>]+>/g,' ').trim()||'';
const ld=[...page.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
let reviews=[];for(const m of ld){try{const v=JSON.parse(m[1]);reviews.push(...(Array.isArray(v)?v:(v['@graph']||[v])).filter(x=>String(x['@type']).includes('Review')))}catch{}}
const rv=reviews[0]||{},name=rv.itemReviewed?.name||'',rating=rv.reviewRating||{},raw=Number(rating.ratingValue),scale=Number(rating.bestRating),published=rv.datePublished||null;
const hall=names.get(clean(name));
output.leads.push({url:u,title,matched_hall_id:hall?.hall_id||null,matched_name:hall?.name||null,source_name:site.name,raw_score:Number.isFinite(raw)?raw:null,raw_scale:Number.isFinite(scale)?scale:null,published_date:published,author_present:Boolean(rv.author?.name),sample_count:rv.author?.name?1:null,review_analysis_status:'not_verified',publish_eligible:false,reason:'Human review of original content, identity, independence, publication date and rating evidence required'});
}catch(e){output.warnings.push({url:u,error:String(e).slice(0,140)})}
}
}catch(e){output.sites.push({site:site.name,status:'error',error:String(e).slice(0,140)})}
}
console.log('WEDDINGRANK_EXTERNAL_DISCOVERY_JSON='+JSON.stringify(output));
}
main().catch(e=>{console.error(e);process.exitCode=1});