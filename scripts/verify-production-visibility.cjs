'use strict';
// Public live-site verification. Logs only public counts/status, never secrets.
// This is manual-only and neither publishes nor modifies the specialist DB.
const {createClient}=require('@supabase/supabase-js');
const {writeFileSync}=require('node:fs');
const ROOT='https://weddingrank.kr',expectedHost='mozmxkmaynhxqwzovzhi.supabase.co';
const dbUrl=process.env.SUPABASE_URL,priv=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!dbUrl||!priv||new URL(dbUrl).hostname!==expectedHost)throw Error('Wrong specialist secrets');
const db=createClient(dbUrl,priv,{auth:{persistSession:false,autoRefreshToken:false}});
const time=()=>new Date().toISOString();
const report={scope:'WeddingRank-only',checked_at:time(),live_site:ROOT,pickrank_sync:false,checks:[],errors:[]};
async function resource(path,requiredText){
  const url=ROOT+path;
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(),25000);
  try{
    const r=await fetch(url,{headers:{'Cache-Control':'no-cache','User-Agent':'WeddingRankIntegrityLiveQA/1.0'},signal:controller.signal,redirect:'follow'});
    const body=await r.text();
    const ok=r.ok&&(!requiredText||body.includes(requiredText));
    report.checks.push({path,status:r.status,passed:ok,size_bytes:Buffer.byteLength(body),marker:requiredText||null});
    if(!ok)report.errors.push('Live resource mismatch '+path+' status '+r.status);
    return body;
  }catch(e){report.errors.push('Live resource unavailable '+path+': '+String(e).slice(0,130));report.checks.push({path,status:0,passed:false});return '';}
  finally{clearTimeout(t);}
}
async function count(table,query,filter=()=>true){
 const {data,error}=await db.from(table).select(query).limit(1500);
 if(error)throw error;return data.filter(filter);
}
(async()=>{
 const [halls,ratings]=await Promise.all([
 count('wedding_halls','hall_id,is_public,operation_status'),
 count('external_wedding_ratings','hall_id,is_public,source_count,methodology_version,overall_score')]);
 const pub=halls.filter(h=>h.is_public===true&&h.operation_status==='운영').length;
 const rated=ratings.filter(r=>r.is_public===true&&r.source_count>=3).length;
 report.expected_db={public_venues:pub,public_external_ratings:rated};
 const home=await resource('/','ranking-evidence-v1.js');
 await resource('/app.js?v=20261013-integrity','WEDDINGRANK_CONFIG');
 const manifest=await resource('/ranking-evidence-v1.js?v=20261013','2026-10-13-original-scores');
 const rank=await resource('/ranking-external-v590.js?v=20261013-integrity','TOP30');
 await resource('/ranking-data-as-of.js?v=20261013-integrity','weddingrank_top30_competition');
 const regions=await resource('/regions.html',String(pub));
 const sitemap=await resource('/sitemap.xml','/venue/');
 // Manual directory publication batch 4: confirm each new public detail page on the deployed site.
 for(const [id,name] of [
  ['a2199c90-46d7-4980-95b8-01d4b13c6b47','JNJ아트컨벤션'],
  ['d8371333-50aa-4656-8d3a-39679a72bcf1','영도구청 대강당'],
  ['bbaba30e-bf87-4ee0-877d-efccda8c6a62','이바구복합문화체육센터'],
  ['98caa05a-9e52-4152-b381-e8e0fcebf5f6','부산시민공원']
 ])await resource('/venue/'+id+'/',name);
 await resource('/wedding-hall-ranking/','원점수');
 if(home&&!home.includes('ranking-external-v590.js'))report.errors.push('Current live index TOP30 ranking script is missing');
 if(!regions.includes(String(pub)))report.errors.push('Live regions count inconsistent with WeddingRank DB');
 const unique=(sitemap.match(/<loc>[^<]*\/venue\/[^<]*<\/loc>/g)||[]).length;
 report.live_venue_sitemap_count=unique;
 if(unique!==pub)report.errors.push('Live sitemap has '+unique+' venues; DB '+pub);
 const traced=(manifest.match(/"audited_mean"/g)||[]).length;
 report.source_traced_manifest_entries=traced;
 if(traced!==10)report.errors.push('Live traced score manifest does not contain ten expected audit records');
 // Try actual public REST policy via public publishable config fetched from live site.
 const config=await resource('/config.js?v=5.90','WEDDINGRANK_CONFIG');
 if(config){
  const m=config.match(/(?:SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY|SUPABASE_KEY)\s*:\s*['"]([^'"]+)['"]/);
  if(m){
   const resp=await fetch(dbUrl+'/rest/v1/wedding_halls?select=hall_id&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&limit=500',{
    headers:{apikey:m[1],Authorization:'Bearer '+m[1]}});
   const arr=resp.ok?await resp.json():[];
   report.public_rest={status:resp.status,public_venues:arr.length,matches_service_db:resp.ok&&arr.length===pub};
   if(!report.public_rest.matches_service_db)report.errors.push('Actual public REST response is not DB-count matched');
  }else report.errors.push('Could not verify site publishable-key REST read; front-end config parse mismatch');
 }
 report.outcome=report.errors.length?'INCOMPLETE':'LIVE_DATA_AND_STATIC_PROOF_OK';
 writeFileSync('weddingrank-live-qa.json',JSON.stringify(report,null,2)+'\n');
 console.log('WEDDINGRANK_LIVE_QA='+JSON.stringify(report));
 if(report.errors.length)process.exitCode=1;
})().catch(e=>{report.errors.push(String(e));writeFileSync('weddingrank-live-qa.json',JSON.stringify(report,null,2));console.error(e);process.exitCode=1});
