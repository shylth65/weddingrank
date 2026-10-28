const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),{join}=require('node:path');
const {JSDOM}=require(process.env.WEDDINGRANK_QA_JSDOM||'jsdom');
const settle=()=>new Promise(r=>setTimeout(r,35));
async function setup(hash='',facts=[],rooms=[]){
 const html=readFileSync(join(__dirname,'../index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 const d=new JSDOM(html,{url:'https://qa.invalid/'+hash,runScripts:'outside-only'}),w=d.window;
 const hs=Array.from({length:4},(_,i)=>({hall_id:`00000000-0000-0000-0000-00000000000${i+1}`,name:'테스트 예식장 '+(i+1),sido:'서울특별시',road_address:'검증용 주소',verification_status:'검색확인'}));
 w.scrollTo=()=>{};w.alert=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.WEDDINGRANK_CONFIG={SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'test-publishable-only'};
 w.fetch=async u=>{const path=String(u);const data=path.includes('wedding_halls?')?hs:path.includes('wedding_venue_fact_checks?')?facts:path.includes('hall_rooms?')?rooms:[];return {ok:true,status:200,text:async()=>JSON.stringify(data)};};
 w.eval(['app.js','planning-math.js','planning-tools.js'].map(f=>readFileSync(join(__dirname,'../'+f),'utf8')).join('\n'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await settle();return{d,w,hs};
}
test('removed planning features stay absent on list and detail while ranking explanation works',async()=>{const{d,w,hs}=await setup();assert.equal(w.document.querySelectorAll('[data-compare],[data-cost],[data-plan="compare"],[data-plan="cost"],#wrCompareTray').length,0);w.WeddingTools.detail(hs[0].hall_id);const panel=w.document.querySelector('#wrDetailPlanning');assert.match(panel.textContent,/랭킹 산정 근거/);assert.doesNotMatch(panel.textContent,/공식 실용정보|예상 비용 계산|비교 추가|비교 해제/);panel.querySelector('[data-plan="method"]').click();assert.equal(w.document.querySelector('dialog').open,true);assert.match(w.document.querySelector('dialog').textContent,/독립 후기 점수 순위/);w.document.querySelector('[data-plan="close"]').click();assert.equal(w.document.querySelector('dialog').open,false);d.window.close();});
test('old comparison links do not reopen the removed feature',async()=>{const{d,w}=await setup('#compare=00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000002');assert.equal(w.document.querySelector('dialog').open,false);assert.equal(w.document.querySelectorAll('[data-compare],#wrCompareTray').length,0);d.window.close();});
