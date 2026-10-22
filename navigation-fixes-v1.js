/* WeddingRank navigation and touch/keyboard safety. No data mutations. */
(()=>{'use strict';
const targets=new Set(['#find','#regions','#wrPriceBand','#about','#rankings']);
function visible(el){return !!el&&!el.closest('[hidden]')}
function go(hash){
 if(hash==='#rankings'){
   location.hash=hash;
   requestAnimationFrame(()=>document.getElementById('rankingView')?.scrollIntoView({block:'start',behavior:'smooth'}));
   return;
 }
 const id=hash.slice(1),el=document.getElementById(id);
 if(!el)return;
 if(location.hash!=='#'+id)history.pushState(null,'','#'+id);
 // The find/region/price/about anchors belong to the list page.
 document.getElementById('listView')?.removeAttribute('hidden');
 document.getElementById('detailView')?.setAttribute('hidden','');
 document.getElementById('rankingView')?.setAttribute('hidden','');
 requestAnimationFrame(()=>el.scrollIntoView({block:'start',behavior:'smooth'}));
}
function init(){
 const style=document.createElement('style');
 style.textContent='html{scroll-padding-top:16px}#rankingView,#find,#evaluate,#regions,#wrPriceBand,#about{scroll-margin-top:16px}a,button,[role="link"]{touch-action:manipulation}';
 document.head.appendChild(style);
 document.addEventListener('click',event=>{
   const a=event.target.closest?.('a[href^="#"]');
   if(!a)return;
   const hash=a.getAttribute('href');
   if(!targets.has(hash))return;
   if(!document.getElementById(hash.slice(1)) && hash!=='#rankings')return;
   event.preventDefault();
   go(hash);
 });
 document.addEventListener('keydown',event=>{
   if(event.key!=='Enter'&&event.key!==' ')return;
   const el=event.target.closest?.('#rankingBody .rankRow[data-id],#top30CompetitionPreviewBody [data-id]');
   if(!el)return;
   event.preventDefault();
   location.hash='hall='+encodeURIComponent(el.dataset.id);
 });
 window.addEventListener('hashchange',()=>{
   const hash=location.hash;
   if(targets.has(hash)&&hash!=='#rankings')go(hash);
 });
 if(targets.has(location.hash)&&location.hash!=='#rankings')setTimeout(()=>go(location.hash),250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();