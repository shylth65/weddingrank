// WEDDINGRANK_QA_JSDOM=/path/to/jsdom node --test tests/login-runtime.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const {JSDOM}=require(process.env.WEDDINGRANK_QA_JSDOM||'jsdom');
const app=readFileSync(join(__dirname,'../app.js'),'utf8');
const runtime=readFileSync(join(__dirname,'../runtime-qa.js'),'utf8');
const section=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b));
const settle=()=>new Promise(r=>setTimeout(r,30));
function setup(){
 const dom=new JSDOM('<body><input id="search"><button id="siteAccountBtn" data-auth-mode="login">로그인</button><div id="authBox"><button id="loginBtn">로그인</button></div><div id="reviewFormWrap">평가를 작성하려면 먼저 이메일로 로그인해주세요.</div><div id="siteAuthModal"><input id="siteAuthEmail" value="qa@example.invalid"><input id="siteAuthPassword" value="local-test-only"><button id="siteAuthSubmit">로그인</button></div></body>',{url:'https://qa.invalid/',runScripts:'outside-only'});
 const w=dom.window,Observer=w.MutationObserver,observers=[];let callbacks=0;
 w.MutationObserver=class extends Observer{constructor(fn){super(records=>{if(++callbacks>40){observers.forEach(o=>o.disconnect());return}fn(records)});observers.push(this)}};
 Object.assign(w,{currentUser:null,accessToken:null,isAdminUser:false,siteAuthBusy:false,siteAuthMode:'login',$:s=>w.document.querySelector(s),esc:s=>String(s||''),alert:()=>{},openSiteAuth:()=>{},logoutUser:()=>{},refreshAdminAccess:async()=>{}});
 w.closeSiteAuth=()=>{w.document.querySelector('#siteAuthModal').hidden=true};
 w.saveAuthSession=d=>{w.accessToken=d.access_token};
 w.authApi=async()=>({access_token:'fake-token',user:{id:'qa',email:'qa@example.invalid'}});
 w.eval(section('function syncHeaderAuth()', 'async function loadMyReviewHistory'));
 w.eval(section('async function renderReviewForm()', 'async function submitReview('));
 w.eval(section('async function submitSiteAuth()', 'async function changeSitePassword'));
 w.eval(runtime);
 return {w,callbacks:()=>callbacks,close(){observers.forEach(o=>o.disconnect());w.close()}};
}
test('login on homepage settles all DOM observers and closes modal',async()=>{
 const q=setup();try{await settle();await q.w.submitSiteAuth();await settle();
 assert.equal(q.w.document.querySelector('#siteAuthModal').hidden,true);
 assert.equal(q.w.document.querySelector('#siteAccountBtn').textContent,'MY');
 assert.equal(q.w.document.querySelector('#siteAuthSubmit').disabled,false);
 assert.equal(q.w.document.querySelector('#reviewFormWrap').childElementCount,0);
 assert.ok(q.callbacks()<40,`observer callbacks never settled: ${q.callbacks()}`);
 const before=q.callbacks();await settle();assert.equal(q.callbacks(),before);
 }finally{q.close()}
});
test('guest fallback login is added once and observers settle',async()=>{
 const q=setup();try{await settle();q.w.document.querySelector('#loginBtn').remove();await settle();
 assert.equal(q.w.document.querySelectorAll('#reviewLoginBtn').length,1);
 assert.equal(q.w.document.querySelectorAll('#reviewFormWrap button').length,1);
 assert.ok(q.callbacks()<40);const before=q.callbacks();await settle();assert.equal(q.callbacks(),before);
 }finally{q.close()}
});
test('stale guest text never adds login controls for a signed-in member',async()=>{
 const q=setup();try{await settle();q.w.document.querySelector('#authBox').innerHTML='<div class="signed">QA</div>';await settle();
 assert.equal(q.w.document.querySelectorAll('#reviewFormWrap button').length,0);assert.ok(q.callbacks()<40);
 }finally{q.close()}
});
test('invalid email and short password allow a subsequent valid login',async()=>{
 const q=setup();try{await settle();const email=q.w.document.querySelector('#siteAuthEmail'),password=q.w.document.querySelector('#siteAuthPassword');
 email.value='invalid';await q.w.submitSiteAuth();assert.equal(q.w.siteAuthBusy,false);
 email.value='qa@example.invalid';password.value='short';await q.w.submitSiteAuth();assert.equal(q.w.siteAuthBusy,false);
 password.value='local-test-only';await q.w.submitSiteAuth();await settle();assert.equal(q.w.document.querySelector('#siteAccountBtn').textContent,'MY');
 }finally{q.close()}
});
