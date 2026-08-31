/* WeddingRank lightweight rendering rescue v5.66 */
(()=>{
'use strict';
const cfg=window.WEDDINGRANK_CONFIG||{};
const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
const key=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_KEY||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]||m));
const headers={apikey:key,Authorization:`Bearer ${key}`};
let ran=false;
async function get(path){
  if(!base||!key) throw new Error('Supabase config missing');
  const r=await fetch(`${base}/rest/v1/${path}`,{headers,cache:'no-store'});
  const t=await r.text();
  if(!r.ok) throw new Error(`${r.status}: ${t.slice(0,180)}`);
  return t?JSON.parse(t):[];
}
function card(h,hasPrice){
  return `<article class="card clickable" data-id="${esc(h.hall_id)}" tabindex="0" role="link"><div class="cardTop"><div class="area">${esc(h.sido||'')} ${esc(h.sigungu||'')}</div>${hasPrice?'<span class="dataReady">가격확인</span>':''}</div><h3>${esc(h.name)}</h3><p>${esc(h.road_address||'주소 확인중')}</p><div class="badges"><span class="badge">${esc(h.venue_type||'예식장')}</span><span class="badge price ${hasPrice?'verifiedPrice':'pendingPrice'}">${hasPrice?'가격정보 확인됨':'가격정보 확인중'}</span></div><div class="more">상세정보 보기 →</div></article>`;
}
function bindCards(){
  document.querySelectorAll('#cards .card[data-id],#homeRankPreviewBody [data-id]').forEach(c=>{
    if(c.dataset.wrBound)return;c.dataset.wrBound='1';
    const go=()=>{if(c.dataset.id)location.hash=`hall=${c.dataset.id}`};
    c.addEventListener('click',go);
    c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
  });
}
async function run(){
  if(ran)return;ran=true;
  const status=document.querySelector('#status');
  try{
    const [halls,prices,top10]=await Promise.all([
      get('wedding_halls?select=hall_id,name,sido,sigungu,road_address,venue_type&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&order=name.asc&limit=500'),
      get('wedding_prices?select=hall_id&limit=1000'),
      get('weddingrank_featured_top100?select=hall_id,name,sido,sigungu,selection_rank,editorial_index&order=selection_rank.asc&limit=10')
    ]);
    const priceSet=new Set(prices.map(p=>p.hall_id).filter(Boolean));
    const cards=document.querySelector('#cards');
    if(cards && cards.children.length===0) cards.innerHTML=halls.slice(0,24).map(h=>card(h,priceSet.has(h.hall_id))).join('');
    const pc=document.querySelector('#publicCount'); if(pc)pc.textContent=halls.length+'곳';
    if(status)status.textContent=`공개 예식장 ${halls.length}곳 · 가격정보 ${priceSet.size}곳`;
    const host=document.querySelector('#homeRankPreviewBody');
    if(host && /불러오는 중|복구 중|준비 중/.test(host.textContent||'')){
      host.innerHTML='<div class="previewTopGrid editorialHomeTop10">'+top10.map(x=>`<article class="previewTopCard" data-id="${esc(x.hall_id||'')}" tabindex="0" role="link"><strong class="previewTopNo">${Number(x.selection_rank)||''}</strong><div class="previewTopHall"><b>${esc(x.name||'예식장')}</b><span>${esc([x.sido,x.sigungu].filter(Boolean).join(' '))}</span></div><div class="previewTopScore"><strong>${Number(x.editorial_index||0).toFixed(1)}</strong><span>편집지수</span></div></article>`).join('')+'</div>';
    }
    bindCards();
  }catch(e){
    console.warn('[WeddingRank] data rescue failed',e);
    if(status)status.textContent='예식장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    const host=document.querySelector('#homeRankPreviewBody');
    if(host && /불러오는 중|복구 중|준비 중/.test(host.textContent||'')) host.innerHTML='<div class="rankingPreviewEmpty"><b>예식장 순위를 잠시 불러오지 못했습니다.</b></div>';
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250),{once:true});else setTimeout(run,250);
})();