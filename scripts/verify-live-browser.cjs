'use strict';
// Real browser smoke verification for actual WeddingRank homepage, search, details
// and source-vetted rankings. No DB write, no schedule changes.
const {chromium}=require('playwright-core');
const {writeFileSync}=require('node:fs');
const BASE='https://weddingrank.kr/';
const output={checked_at:new Date().toISOString(),scope:'WeddingRank-only',pickrank_sync:false,live_browser:true,checks:[],errors:[]};
const record=(name,ok,observed,expected)=>{output.checks.push({name,ok,observed,expected});if(!ok)output.errors.push(name+' expected '+expected+' observed '+observed);};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',err=>errors.push(String(err.message||err).slice(0,180)));
 try{
  const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:50000});
  record('homepage HTTP',response?.ok(),response?.status(),200);
  await page.waitForFunction(()=>document.querySelector('#publicCount')?.textContent?.includes('곳')&&
    document.querySelector('#ratedCount')?.textContent?.includes('곳'),{timeout:45000});
  const publicNum=await page.locator('#publicCount').innerText();
  const ratedNum=await page.locator('#ratedCount').innerText();
  const current=await page.evaluate(async()=>{
    const cfg=window.WEDDINGRANK_CONFIG;
    const key=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY;
    const r=await fetch(cfg.SUPABASE_URL+'/rest/v1/weddingrank_top30_competition?select=hall_id,rank_position,overall_score&order=rank_position.asc&limit=1000',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
    if(!r.ok)throw Error('Live TOP30 public API '+r.status);
    return r.json();
  });
  const expectedCount=Math.min(30,current.length);
  record('actual homepage public venue count',publicNum.trim()==='128곳',publicNum.trim(),'128곳');
  record('live TOP30 participant count matches public REST',ratedNum.trim()===expectedCount+'곳',ratedNum.trim(),expectedCount+'곳');
  await page.screenshot({path:'weddingrank-live-home-mobile.png',fullPage:false});
  // First confirm real search results, then open a recently approved venue by exact known ID.
  await page.locator('#search').fill('디바인밸리');
  await page.waitForFunction(()=>document.querySelector('#cards')?.textContent?.includes('디바인밸리'),{timeout:10000});
  record('newly published venue in live search',true,'디바인밸리 웨딩','present');
  await page.evaluate(()=>{location.hash='#hall=26107bdd-491a-434c-a201-1c40542191e9'});
  await page.waitForFunction(()=>document.querySelector('#detailName')?.textContent?.includes('디바인밸리'),{timeout:15000});
  const detail=await page.locator('#detailName').innerText();
  record('newly published venue detail live',detail.includes('디바인밸리'),detail,'디바인밸리 웨딩');
  await page.evaluate(()=>{location.hash='#hall=51ddb9d2-3ec8-46d8-9766-0ad58fb008a9'});
  await page.waitForFunction(()=>document.querySelector('#externalReviewSummary')?.textContent?.includes('TOP 30 외부후기 종합 비교'),null,{timeout:15000});
  record('TOP30 approved score and source detail visible',true,'approved raw sources','true');
  await page.screenshot({path:'weddingrank-live-detail-mobile.png',fullPage:false});
  await page.evaluate(()=>{location.hash='#rankings'});
  await page.waitForFunction(()=>{const e=document.querySelector('#rankingBody');return Boolean(e?.querySelector('.rankSectionMeta')||e?.textContent?.includes('불러오지 못'))},null,{timeout:30000});
  const rankings=await page.locator('#rankingBody').innerText();
  const ranks=await page.locator('#rankingBody > .rankRow').count();
  record('live TOP30 header visible',rankings.includes('TOP 30 검증 랭킹'),rankings.slice(0,100),'TOP 30 검증 랭킹');
  record('actual ranked entrants match published competition table',ranks===expectedCount,ranks,expectedCount);
  record('never display more than 30 ranks',ranks<=30,ranks,'<=30');
  record('Grand Ostium excluded from numeric ranking',!rankings.includes('그랜드오스티엄'),true,true);
  await page.screenshot({path:'weddingrank-live-rankings-mobile.png',fullPage:false});
  output.frontend_js_errors=errors;
  if(errors.length)output.errors.push('Frontend uncaught errors: '+errors.join('; '));
 }finally{await browser.close();}
 output.outcome=output.errors.length?'FAILED_OR_INCOMPLETE':'LIVE_BROWSER_DISPLAY_CONFIRMED';
 writeFileSync('weddingrank-live-browser-qa.json',JSON.stringify(output,null,2)+'\n');
 console.log('WEDDINGRANK_LIVE_BROWSER_QA='+JSON.stringify(output));
 if(output.errors.length)process.exitCode=1;
})().catch(e=>{
 output.errors.push(String(e));output.outcome='FAILED_OR_INCOMPLETE';
 writeFileSync('weddingrank-live-browser-qa.json',JSON.stringify(output,null,2)+'\n');
 console.error('Browser verification incomplete:',String(e));
 process.exitCode=1;
});
