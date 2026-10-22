// Run with: WEDDINGRANK_QA_JSDOM=/path/to/jsdom node --test tests/moderation.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {JSDOM}=require(process.env.WEDDINGRANK_QA_JSDOM||'jsdom');
const source=readFileSync(require('node:path').join(__dirname,'../moderation.js'),'utf8');
const settle=()=>new Promise(r=>setTimeout(r,10));
async function setup({admin=true,signedIn=true,rows=[{review_id:'review-1'}],confirm=false,panel=false}={}){
 const dom=new JSDOM('<html><head></head><body><article class="reviewItem" data-review-id="review-1"><p class="wrReviewText">Old review</p></article><article class="post" data-post-id="27"><h2>Old title</h2><div class="body">Old board body</div></article></body></html>',{url:'https://qa.invalid',runScripts:'outside-only'});
 if(panel)dom.window.document.body.insertAdjacentHTML('beforeend','<div id="moderationPanel"></div>');
 const w=dom.window,calls=[],observers=[],Observer=w.MutationObserver,close=w.close.bind(w);
 w.MutationObserver=class extends Observer{constructor(callback){super(callback);observers.push(this)}};w.close=()=>{observers.forEach(o=>o.disconnect());close()};w.WEDDINGRANK_CONFIG={SUPABASE_URL:'https://backend.invalid',SUPABASE_ANON_KEY:'fake-public-key'};
 if(signedIn)w.localStorage.setItem('wr_access_token','fake-session');
 w.confirm=()=>confirm;
 w.fetch=async (url,options)=>{calls.push({url,...options});return {ok:true,text:async()=>JSON.stringify(url.includes('admin_users')?(admin?[{user_id:'admin'}]:[]):options.method==='GET'&&url.includes('/reviews?')?[{review_id:'review-2',visit_role:'하객',review_text:'Panel review'}]:options.method==='GET'&&url.includes('/wedding_board_posts?')?[{id:28,title:'Panel title',body:'Panel body'}]:rows)}};
 w.eval(source);await settle();return {dom,w,calls};
}
test('anonymous and non-admin members never receive editing controls',async()=>{
 for(const options of [{signedIn:false},{admin:false}]){const {dom,w,calls}=await setup(options);assert.equal(w.document.querySelectorAll('.wrModeration').length,0);assert.equal(calls.some(c=>c.method==='PATCH'||c.method==='DELETE'),false);dom.window.close()}
});
test('admin review edit saves only the review text and preserves literal markup',async()=>{
 const {dom,w,calls}=await setup();const card=w.document.querySelector('[data-review-id]');card.querySelector('[data-moderation-action=edit]').click();
 const form=card.querySelector('form');form.elements.body.value='<b>Edited text</b>';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 const patch=calls.find(c=>c.method==='PATCH');assert.match(patch.url,/reviews\?review_id=eq.review-1$/);assert.deepEqual(JSON.parse(patch.body),{review_text:'<b>Edited text</b>'});assert.equal(card.querySelector('.wrReviewText').textContent,'<b>Edited text</b>');assert.equal(card.querySelector('.wrReviewText b'),null);assert.equal(card.querySelector('form'),null);dom.window.close();
});
test('board editing saves title and body; cancel leaves content alone',async()=>{
 const {dom,w,calls}=await setup();const card=w.document.querySelector('[data-post-id]');card.querySelector('[data-moderation-action=edit]').click();card.querySelector('[data-cancel-edit]').click();assert.equal(card.querySelector('form'),null);
 card.querySelector('[data-moderation-action=edit]').click();const form=card.querySelector('form');form.elements.title.value='New title';form.elements.body.value='New board body';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();assert.deepEqual(JSON.parse(calls.find(c=>c.method==='PATCH').body),{title:'New title',body:'New board body'});assert.equal(card.querySelector('h2').textContent,'New title');dom.window.close();
});
test('cancelled delete does not send a delete request',async()=>{
 const {dom,w,calls}=await setup();w.document.querySelector('[data-moderation-action=delete]').click();await settle();assert.equal(calls.some(c=>c.method==='DELETE'),false);assert.ok(w.document.querySelector('[data-review-id]'));dom.window.close();
});
test('confirmed delete targets one record and announces content change',async()=>{
 const {dom,w,calls}=await setup({confirm:true});let change;w.document.addEventListener('wr-content-changed',e=>change=e.detail.kind);w.document.querySelector('[data-review-id] [data-moderation-action=delete]').click();await settle();assert.match(calls.find(c=>c.method==='DELETE').url,/reviews\?review_id=eq.review-1$/);assert.equal(w.document.querySelector('[data-review-id]'),null);assert.equal(change,'review');dom.window.close();
});
test('zero affected rows are an error and retain the displayed record',async()=>{
 const {dom,w}=await setup({confirm:true,rows:[]});w.document.querySelector('[data-moderation-action=delete]').click();await settle();assert.ok(w.document.querySelector('[data-review-id]'));assert.match(w.document.querySelector('.wrModeration [role=status]').textContent,/삭제 권한/);dom.window.close();
});
test('logout immediately removes administrator controls',async()=>{
 const {dom,w}=await setup();assert.equal(w.document.querySelectorAll('.wrModeration').length,2);w.localStorage.removeItem('wr_access_token');w.dispatchEvent(new w.Event('wr-auth-changed'));await settle();assert.equal(w.document.querySelectorAll('.wrModeration').length,0);dom.window.close();
});

test('admin management panel loads both lists; anonymous panel stays locked',async()=>{
 const {dom,w,calls}=await setup({panel:true});
 assert.equal(w.document.querySelectorAll('#moderationPanel .wrModeration').length,2);
 assert.equal(calls.filter(c=>c.method==='GET'&&!c.url.includes('admin_users')).length,2);
 dom.window.close();
 const anon=await setup({panel:true,signedIn:false});
 assert.match(anon.w.document.querySelector('#moderationPanel').textContent,/관리자 로그인 후/);
 assert.equal(anon.calls.length,0);anon.dom.window.close();
});
