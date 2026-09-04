/* WeddingRank runtime QA guard: search, links, guest/login review flow */
(()=>{'use strict';
function style(){
 if(document.getElementById('wrRuntimeQaStyle'))return;
 const s=document.createElement('style');s.id='wrRuntimeQaStyle';s.textContent=`
#search,#sido,#wrReviewSearch{pointer-events:auto!important;position:relative;z-index:2}
a[href^="#"],button{touch-action:manipulation}
`;
 document.head.appendChild(s);
}
function focusSearch(){const s=document.getElementById('search');if(s){s.disabled=false;s.readOnly=false;s.style.pointerEvents='auto'}}
function ensureReviewLogin(){
 const wrap=document.getElementById('reviewFormWrap');
 if(!wrap)return;
 const hasForm=!!document.getElementById('reviewForm');
 const hasLogin=!!document.getElementById('loginBtn')||!!document.getElementById('reviewLoginBtn');
 if(!hasForm&&!hasLogin&&/로그인/.test(wrap.textContent||'')){
   const b=document.createElement('button');b.type='button';b.className='submitReview';b.textContent='로그인';
   b.addEventListener('click',()=>{if(typeof window.openSiteAuth==='function')window.openSiteAuth('login');else document.getElementById('siteAccountBtn')?.click()});
   wrap.appendChild(b);
 }
}
function validHash(href){
 if(!href||href==='#')return false;
 if(/^#hall=/.test(href))return true;
 if(href==='#rankings')return !!document.getElementById('rankingView');
 return !!document.querySelector(href);
}
function bind(){
 focusSearch();
 document.addEventListener('click',e=>{
   const a=e.target.closest?.('a[href^="#"]');if(!a)return;
   const href=a.getAttribute('href');
   if(validHash(href))return;
   e.preventDefault();
   console.warn('[WeddingRank] blocked missing target',href);
   const status=document.getElementById('status');if(status)status.textContent='요청한 화면을 찾지 못했습니다. 예식장 찾기로 이동합니다.';
   location.hash='#find';
 },true);
 const search=document.getElementById('search');
 if(search&&!search.dataset.qaBound){
   search.dataset.qaBound='1';
   search.addEventListener('focus',focusSearch);
   search.addEventListener('pointerdown',focusSearch,{passive:true});
 }
 const root=document.body;
 if(root)new MutationObserver(()=>{focusSearch();ensureReviewLogin()}).observe(root,{childList:true,subtree:true});
 ensureReviewLogin();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{style();bind()},{once:true});else{style();bind()}
})();
