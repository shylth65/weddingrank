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
  record('actual homepage public venue count',publicNum.trim()==='128곳',publicNum.trim(),'128곳');
  record('original-score references in homepage',ratedNum.trim()==='10곳',ratedNum.trim(),'10곳');
  await page.screenshot({path:'weddingrank-live-home-mobile.png',fullPage:false});
  // First confirm real search results, then open a recently approved venue by exact known ID.
  await page.locator('#search').fill('디바인밸리');
  await page.waitForFunction(()=>document.querySelector('#cards')?.textContent?.includes('디바인밸리'),{timeout:10000});
  record('newly published venue in live search',true,'디바인밸리 웨딩','present');
  await page.evaluate(()=>{location.hash='#hall=26107bdd-491a-434c-a201-1c40542191e9'});
  await page.waitForFunction(()=>document.querySelector('#detailName')?.textContent?.includes('디바인밸리'),{timeout:15000});
  const detail=await page.locator('#detailName').innerText();
  record('newly published venue detail live',detail.includes('디바인밸리'),detail,'디바인밸리 웨딩');
  await page.screenshot({path:'weddingrank-live-detail-mobile.png',fullPage:false});
  await page.evaluate(()=>{location.hash='#rankings'});
  await page.waitForFunction(()=>{const e=document.querySelector('#rankingBody');return Boolean(e?.querySelector('.rankSectionMeta')||e?.textContent?.includes('조회 오류'))},null,{timeout:30000});
  const rankings=await page.locator('#rankingBody').innerText();
  const ranks=await page.locator('#rankingBody > .rankRow').count();
  record('source-traced ranking section visible',rankings.includes('원점수 추적 참고 비교'),rankings.slice(0,60),'원점수 추적 참고 비교');
  record('held legacy list visible',rankings.includes('기존 평가 근거 재검증 대상'),rankings.includes('재검증 대상'),'true');
  record('numeric ranking of source-traced venues',ranks===10,ranks,10);
  record('Grand Ostium excluded from numeric ranking',!rankings.split('기존 평가 근거 재검증 대상')[0].includes('그랜드오스티엄'),true,true);
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
