/* WeddingRank mobile-stable homepage helper v5.69 */
(()=>{
'use strict';
const PAGE=5;
let shown=PAGE;
const $=s=>document.querySelector(s);
const cfg=window.WEDDINGRANK_CONFIG||{};
const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
const key=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function applyFive(reset=false){
  const host=$('#cards'); if(!host) return;
  const cards=[...host.querySelectorAll('.card')];
  if(reset) shown=PAGE;
  cards.forEach((c,i)=>{const on=i<shown;c.hidden=!on;c.style.display=on?'':'none'});
  let bar=$('#wrLiteControls');
  if(!bar){
    bar=document.createElement('div');bar.id='wrLiteControls';bar.className='listControls';
    bar.innerHTML='<span id="wrLiteCount"></span><button id="wrLiteMore" type="button">예식장 5곳 더보기</button>';
    host.insertAdjacentElement('afterend',bar);
    $('#wrLiteMore')?.addEventListener('click',()=>{shown+=PAGE;applyFive(false)});
  }
  const old=$('#listControls'); if(old) old.style.display='none';
  const count=$('#wrLiteCount'),more=$('#wrLiteMore');
  if(!cards.length){bar.hidden=true;return}
  bar.hidden=false;
  const visible=Math.min(shown,cards.length);
  if(count) count.textContent=`현재 ${visible}곳 표시중`;
  if(more){more.hidden=visible>=cards.length;more.textContent=`예식장 ${Math.min(PAGE,cards.length-visible)}곳 더보기`}
}
function start(){
  $('#search')?.addEventListener('input',()=>setTimeout(()=>applyFive(true),80),{passive:true});
  $('#sido')?.addEventListener('change',()=>setTimeout(()=>applyFive(true),80));
  [250,700,1400,2600].forEach(ms=>setTimeout(()=>applyFive(ms===250),ms));
  // TOP30 is owned exclusively by ranking-external-v590.js; never overwrite its live cards.
  // Retain the legacy helper only for search/list pagination.
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
