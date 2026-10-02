const { chromium } = require('playwright');

const targets=[
 {id:'53b21fbb-0463-4a93-8056-750bea92ae1c',name:'서울신라호텔 웨딩',q:'서울신라호텔',score:'3.7'},
 {id:'ea026116-dd93-4dd9-8eff-8a4f46a1c19d',name:'코리아나호텔 웨딩',q:'코리아나호텔',score:'3.9'},
 {id:'97c52cd9-1b30-48c2-8684-7b4cfd1405d3',name:'로얄파크컨벤션',q:'로얄파크컨벤션',score:'3.5'},
 {id:'419f2235-04c8-443b-b02e-17ee1e0246a8',name:'몬드리안 서울 이태원 웨딩',q:'몬드리안 서울 이태원',score:'4.1'},
 {id:'421c6da5-36cc-4449-ad2f-d8be5a2be72a',name:'상록아트홀',q:'상록아트홀',score:'4.3'},
 {id:'f2e4650b-8271-4edf-bbf7-2adf4be4148b',name:'벨라루체웨딩홀 서울점',q:'벨라루체웨딩홀 서울점',score:'4.1'},
 {id:'de3d58f0-43e8-49c1-8fe6-9227ef93c218',name:'그랜드 하얏트 서울 웨딩',q:'그랜드 하얏트 서울',score:'3.9'},
 {id:'1f98ca7f-a8b9-4223-85d5-316dd501afbf',name:'PJ호텔 웨딩',q:'PJ호텔',score:'3.8'}
];

async function main(){
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];
 page.on('pageerror',e=>errors.push('pageerror:'+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});

 await page.goto('https://weddingrank.kr/',{waitUntil:'networkidle',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#publicCount')?.textContent.includes('79곳'),null,{timeout:30000});
 const publicCount=(await page.locator('#publicCount').textContent()).trim();
 const homeStatus=(await page.locator('#status').textContent()).trim();
 const homeAsOf=(await page.locator('#rankingDataAsOf').textContent()).trim();

 const searches=[];
 for(const t of targets){
   await page.goto('https://weddingrank.kr/#find',{waitUntil:'networkidle',timeout:60000});
   await page.locator('#search').fill(t.q);
   await page.waitForTimeout(250);
   searches.push({name:t.name,result:(await page.locator('#listResultCount').textContent()).trim()});
 }

 const details=[];
 for(const t of targets){
   await page.goto('https://weddingrank.kr/#hall='+t.id,{waitUntil:'networkidle',timeout:60000});
   await page.waitForFunction(expected=>document.querySelector('#detailName')?.textContent.trim()===expected,t.name,{timeout:30000});
   await page.waitForFunction(expected=>document.querySelector('#externalReviewSummary')?.textContent.includes(expected+' / 5'),t.score,{timeout:30000});
   const detailName=(await page.locator('#detailName').textContent()).trim();
   const externalText=(await page.locator('#externalReviewSummary').innerText()).trim();
   const sourceCount=await page.locator('#externalReviewSummary .externalSource').count();
   const sourceTexts=await page.locator('#externalReviewSummary .externalSource').allInnerTexts();
   const hrefs=await page.locator('#externalReviewSummary .externalSource').evaluateAll(nodes=>nodes.map(n=>n.href));
   details.push({name:detailName,expected_score:t.score,sourceCount,sourceTexts,hrefs,externalText:externalText.slice(0,1800)});
 }

 await page.goto('https://weddingrank.kr/#rankings',{waitUntil:'networkidle',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#rankingBody')?.innerText.includes('외부평가 순위'),null,{timeout:30000});
 const rankingMeta=(await page.locator('#rankingBody .rankSectionMeta').innerText()).trim();
 const fullAsOf=(await page.locator('#rankingDataAsOfFull').textContent()).trim();

 const result={publicCount,homeStatus,homeAsOf,searches,details,rankingMeta,fullAsOf,errors};
 console.log('LIVE_WEDDINGRANK_VERIFY_BEGIN');
 console.log(JSON.stringify(result,null,2));
 console.log('LIVE_WEDDINGRANK_VERIFY_END');
 if(publicCount!=='79곳') throw new Error('Public hall count mismatch: '+publicCount);
 if(!/75곳/.test(rankingMeta)) throw new Error('External rating count is not 75: '+rankingMeta);
 for(const s of searches) if(!/검색결과 1곳/.test(s.result)) throw new Error('Search mismatch '+JSON.stringify(s));
 for(const d of details){
   if(d.sourceCount!==3) throw new Error('Qualified source count mismatch '+d.name+': '+d.sourceCount);
   if(!d.sourceTexts.every(x=>x.includes('원점수')&&x.includes('실제 표본 1명')&&x.includes('원문 검증'))) throw new Error('Provenance missing on '+d.name);
   if(d.externalText.includes('PICKRANK')) throw new Error('Legacy PICKRANK wording remains on '+d.name);
   if(!d.externalText.includes('WeddingRank가 직접 검증·분석한 전문 평가')) throw new Error('WeddingRank authority wording missing on '+d.name);
 }
 await browser.close();
}
main().catch(async e=>{console.error(e);process.exit(1)});
