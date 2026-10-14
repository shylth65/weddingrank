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
  ['98caa05a-9e52-4152-b381-e8e0fcebf5f6','부산시민공원'],
  ['d11d9068-354a-490c-97b9-dca2cedcaf7f','엘마리노 앳 인천'],
  ['d606487e-0698-4c83-aca2-919805373cb7','호텔인터시티 웨딩'],
  ['ce8e779f-b458-4a87-a4f2-34c080aa1c0c','연암컨벤션'],
  ['e99dc720-a490-4d61-8d7b-0fbef396c6ef','안동그랜드호텔 웨딩'],
  ['dfcfa3a0-6587-48d8-ab36-ed177f07675a','마리드메이'],
  ['db4e012e-c5b3-4474-87e9-99225dfcd3ea','HW컨벤션센터'],
  ['392aa988-7514-434b-b0f0-55daf82b1725','메리다웨딩컨벤션'],
  ['e40d3ed5-2cfe-4633-a4d0-9739d353d396','KW컨벤션'],
  ['2805a3fe-736d-4a68-af0c-d3ba4f6024b6','스페이스566웨딩컨벤션'],
  ['db3cb91e-1e53-499b-a0c5-49ea696822d4','오펠리스웨딩'],
  ['f9a17b72-5d44-4f5c-95ab-f6108b0ebc78','어반폴'],
  ['68cee415-6105-487c-ae5d-ae17719b3ba7','파로스컨벤션'],
  ['ddea4ad0-0a8c-4a45-a962-9055b9630c27','서울한방진흥센터'],
  ['dcc8a0d3-a4cc-4147-b496-91a29499d347','성북 예향재'],
  ['4fded12a-b475-4dd5-9b01-e7e1e69dfbce','은평역사한옥박물관'],
  ['baf6cb3a-3362-4b45-a05e-cb58e8d2bdce','백인제가옥'],
  ['9f2ae713-326f-41db-944f-6480454320d2','서울식물원 사색의 정원'],
  ['cd21cfaa-0e49-4102-9de7-1fa70d8740bd','선유도공원'],
  ['4c773aff-0ebd-4a71-b040-4bf087969c02','매헌시민의숲'],
  ['8fcc0fbc-22ba-49a1-9393-869aff665334','보라매시민안전체험관'],
  ['f257ef4b-8f89-4e12-9abb-c6ed75ea28db','광진구청 대강당홀'],
  ['ca49fafa-27c8-4b1d-af2d-5d093fd58136','도봉구청 선인봉홀'],
  ['8843c1af-973a-4f98-8a0b-a34bb8b95bab','서울주택도시개발공사']
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
