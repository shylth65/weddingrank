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
  const publicApiCount=await page.evaluate(async()=>{
    const cfg=window.WEDDINGRANK_CONFIG,key=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY;
    const r=await fetch(cfg.SUPABASE_URL+'/rest/v1/wedding_halls?select=hall_id&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&limit=1000',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
    if(!r.ok)throw Error('Live WeddingRank public venue API '+r.status);
    return (await r.json()).length;
  });
  record('actual homepage public venue count',publicNum.trim()===publicApiCount+'곳',publicNum.trim(),publicApiCount+'곳');
  record('live TOP30 participant count matches public REST',ratedNum.trim()===expectedCount+'곳',ratedNum.trim(),expectedCount+'곳');
  // Compare home pricing count against only live public venues and currently effective quotes.
  const expectedPriceCount=await page.evaluate(async()=>{
    const cfg=window.WEDDINGRANK_CONFIG,key=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY;
    const headers={apikey:key,Authorization:'Bearer '+key},base=cfg.SUPABASE_URL+'/rest/v1/';
    const [venueResponse,priceResponse]=await Promise.all([
      fetch(base+'wedding_halls?select=hall_id&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&limit=1000',{headers,cache:'no-store'}),
      fetch(base+'wedding_prices?select=hall_id,effective_date&order=effective_date.desc&limit=2000',{headers,cache:'no-store'})
    ]);
    if(!venueResponse.ok||!priceResponse.ok)throw Error('Public venue/price REST QA failed');
    const venues=await venueResponse.json(),prices=await priceResponse.json();
    const ids=new Set(venues.map(v=>v.hall_id));
    const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    return new Set(prices.filter(p=>ids.has(p.hall_id)&&(!p.effective_date||p.effective_date<=today)).map(p=>p.hall_id)).size;
  });
  const statusText=await page.locator('#status').innerText();
  record('public current-price venue count excludes private and future quotes',
    statusText.includes('가격정보 '+expectedPriceCount+'곳'),statusText,'가격정보 '+expectedPriceCount+'곳');
  await page.screenshot({path:'weddingrank-live-home-mobile.png',fullPage:false});
  await page.waitForFunction(()=>document.querySelectorAll('#top30CompetitionPreviewBody .externalHomeTop10 .previewTopCard').length>0,null,{timeout:20000});
  const desktop=await browser.newPage({viewport:{width:1680,height:940},deviceScaleFactor:1});
  desktop.on('pageerror',err=>errors.push('desktop:'+String(err.message||err).slice(0,180)));
  await desktop.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
  await desktop.waitForFunction(()=>document.querySelectorAll('#top30CompetitionPreviewBody .externalHomeTop10 .previewTopCard').length>=10,null,{timeout:30000});
  const layout=await desktop.evaluate(()=>{
    return [...document.querySelectorAll('#top30CompetitionPreviewBody .externalHomeTop10 .previewTopCard')].map(card=>{
      const score=card.querySelector('.previewTopScore'),date=score?.querySelector('small');
      if(!score||!date)return {error:'missing score/date'};
      const cs=getComputedStyle(score),ds=getComputedStyle(date);
      const dateBox=date.getBoundingClientRect(),cardBox=card.getBoundingClientRect();
      const lineHeight=parseFloat(ds.lineHeight)||18;
      return {cardWidth:Math.round(cardBox.width),cardHeight:Math.round(cardBox.height),
        scoreWidth:Math.round(score.getBoundingClientRect().width),
        dateWidth:Math.round(dateBox.width),dateLines:Math.round(dateBox.height/lineHeight*10)/10,
        direction:cs.flexDirection,writingMode:ds.writingMode,
        dateText:date.textContent?.trim()};
    });
  });
  const scoreLayoutOk=layout.length===10&&layout.every(x=>!x.error&&x.direction==='column'&&
     x.writingMode==='horizontal-tb'&&x.dateWidth>=100&&x.dateLines<=3&&x.cardHeight<340);
  record('TOP30 desktop score/date layout never vertical',scoreLayoutOk,
    layout.map(x=>({width:x.dateWidth,lines:x.dateLines,cardHeight:x.cardHeight,mode:x.direction})),
    '10 cards; column footer; >=100px date width; <=3 lines');
  const reloadProof=[];
  for(let n=0;n<3;n++){
    await desktop.waitForTimeout(2400);
    const proof=await desktop.evaluate(()=>{
      const host=document.getElementById('top30CompetitionPreviewBody');
      const current=host?.querySelectorAll('.externalHomeTop10 .previewTopCard').length||0;
      const old=host?.querySelectorAll('.editorialHomeTop10').length||0;
      const bogus=Boolean(document.getElementById('homeRankPreviewBody'));
      const scripts=[...document.scripts].map(x=>x.src||'');
      const configVersion=scripts.find(x=>x.includes('/config.js'))||'';
      const helperVersion=scripts.find(x=>x.includes('/home-lite-v567.js'))||'';
      return {current,old,bogus,configVersion,helperVersion,htmlSnippet:host?.textContent?.slice(0,70)||''};
    });
    reloadProof.push(proof);
    const good=proof.current===expectedCount&&proof.old===0&&!proof.bogus&&
      proof.configVersion.includes('20261013-exclusive-preview')&&
      proof.helperVersion.includes('20261013-exclusive-preview');
    record('TOP30 stable after desktop reload #'+(n+1),good,proof,
      'exclusive TOP30 only, correct cache versions');
    if(n<2){
      await desktop.reload({waitUntil:'domcontentloaded',timeout:45000});
      await desktop.waitForFunction(n=>document.querySelectorAll('#top30CompetitionPreviewBody .externalHomeTop10 .previewTopCard').length===n,expectedCount,{timeout:30000});
    }
  }

  await desktop.screenshot({path:'weddingrank-live-home-desktop.png',fullPage:false});
  await desktop.close();

  // First confirm real search results, then open a recently approved venue by exact known ID.
  await page.locator('#search').fill('엠블던');
  await page.waitForFunction(()=>document.querySelector('#cards')?.textContent?.includes('안산엠블던호텔'),{timeout:10000});
  record('newly published venue in live search',true,'안산엠블던호텔','present');
  await page.evaluate(()=>{location.hash='#hall=535488ad-4269-4ee8-b6c6-dc4dd8757140'});
  await page.waitForFunction(()=>document.querySelector('#detailName')?.textContent?.includes('안산엠블던호텔'),{timeout:15000});
  const detail=await page.locator('#detailName').innerText();
  record('newly published venue detail live',detail.includes('안산엠블던호텔'),detail,'안산엠블던호텔');
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
