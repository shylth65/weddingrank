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
async function loadTop10(){
  const host=$('#homeRankPreviewBody'); if(!host||!base||!key) return;
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),7000);
  try{
    const r=await fetch(`${base}/rest/v1/weddingrank_featured_top100?select=hall_id,name,sido,sigungu,selection_rank,editorial_index&order=selection_rank.asc&limit=10`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:'no-store',signal:ctl.signal});
    if(!r.ok) throw new Error(String(r.status));
    const rows=await r.json();
    if(!rows.length) throw new Error('empty');
    host.innerHTML='<div class="previewTopGrid editorialHomeTop10">'+rows.map(x=>`<article class="previewTopCard" data-id="${esc(x.hall_id)}" tabindex="0" role="link"><strong class="previewTopNo">${Number(x.selection_rank)||''}</strong><div class="previewTopHall"><b>${esc(x.name)}</b><span>${esc([x.sido,x.sigungu].filter(Boolean).join(' '))}</span></div><div class="previewTopScore"><strong>${Number(x.editorial_index||0).toFixed(1)}</strong><span>편집지수</span></div></article>`).join('')+'</div>';
    host.querySelectorAll('[data-id]').forEach(c=>{const go=()=>location.hash=`hall=${c.dataset.id}`;c.onclick=go;c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
  }catch(_){
    host.innerHTML='<div class="rankingPreviewEmpty"><b>TOP 10 정보를 잠시 후 다시 확인해 주세요.</b></div>';
  }finally{clearTimeout(timer)}
}
function start(){
  $('#search')?.addEventListener('input',()=>setTimeout(()=>applyFive(true),80),{passive:true});
  $('#sido')?.addEventListener('change',()=>setTimeout(()=>applyFive(true),80));
  [250,700,1400,2600].forEach(ms=>setTimeout(()=>applyFive(ms===250),ms));
  loadTop10();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
