/* WeddingRank homepage rendering rescue v5.60 */
(()=>{
'use strict';
const cfg=window.WEDDINGRANK_CONFIG||{};
const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
if(!base||!key)return;
const headers={apikey:key,Authorization:`Bearer ${key}`};
async function get(path){const r=await fetch(`${base}/rest/v1/${path}`,{headers,cache:'no-store'}),t=await r.text();if(!r.ok)throw new Error(`${r.status}: ${t.slice(0,180)}`);return t?JSON.parse(t):[]}
function ensureStatic(){
 const g=document.querySelector('.compareGrid');
 if(g){g.style.display='grid';g.style.visibility='visible';g.style.opacity='1';g.querySelectorAll(':scope > div').forEach(x=>{x.style.display='flex';x.style.visibility='visible';x.style.opacity='1'})}
 document.querySelectorAll('.criteria span,.heroPanel,.heroFact').forEach(x=>{x.style.visibility='visible';x.style.opacity='1'});
}
function bindCards(){document.querySelectorAll('#cards .card[data-id],#homeRankPreviewBody [data-id]').forEach(c=>{if(c.dataset.rescueBound)return;c.dataset.rescueBound='1';const go=()=>{if(c.dataset.id)location.hash=`hall=${c.dataset.id}`};c.addEventListener('click',go);c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})})}
async function rescueList(){
 const status=document.querySelector('#status'),cards=document.querySelector('#cards');
 if(!cards)return;
 const needs=!cards.children.length || /준비중|연결 오류/.test(status?.textContent||'');
 if(!needs)return;
 try{
  const [halls,prices]=await Promise.all([
   get('wedding_halls?select=hall_id,name,sido,sigungu,road_address,venue_type&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&order=name.asc&limit=500'),
   get('wedding_prices?select=hall_id,meal_price_per_person,rental_fee,effective_date&order=effective_date.desc&limit=1000')
  ]);
  const pm=new Map();for(const p of prices){if(p.hall_id&&!pm.has(p.hall_id))pm.set(p.hall_id,p)}
  const visible=halls.slice(0,24);
  cards.innerHTML=visible.map(h=>{const p=pm.get(h.hall_id);const pb=!p?'<span class="badge price pendingPrice">가격정보 확인중</span>':p.meal_price_per_person!=null?`<span class="badge price verifiedPrice">식대 ${Number(p.meal_price_per_person).toLocaleString('ko-KR')}원</span>`:p.rental_fee!=null?`<span class="badge price verifiedPrice">대관 ${Number(p.rental_fee).toLocaleString('ko-KR')}원</span>`:'<span class="badge price verifiedPrice">가격정보 있음</span>';return `<article class="card clickable" data-id="${esc(h.hall_id)}" tabindex="0" role="link"><div class="cardTop"><div class="area">${esc(h.sido||'')} ${esc(h.sigungu||'')}</div>${pm.has(h.hall_id)?'<span class="dataReady">가격확인</span>':''}</div><h3>${esc(h.name)}</h3><p>${esc(h.road_address||'주소 확인중')}</p><div class="badges"><span class="badge">${esc(h.venue_type||'예식장')}</span>${pb}</div><div class="more">상세정보 보기 →</div></article>`}).join('');
  const pc=document.querySelector('#publicCount');if(pc)pc.textContent=halls.length+'곳';
  if(status)status.textContent=`공개 예식장 ${halls.length}곳 · 가격정보 ${pm.size}곳`;
  const sido=document.querySelector('#sido');if(sido&&sido.options.length<=1){const regions=[...new Set(halls.map(x=>x.sido).filter(Boolean))].sort();sido.innerHTML='<option value="">전국</option>'+regions.map(x=>`<option>${esc(x)}</option>`).join('');const rb=document.querySelector('#regionButtons');if(rb)rb.innerHTML=regions.map(x=>`<button data-region="${esc(x)}">${esc(x)}</button>`).join('')}
  bindCards();
 }catch(e){if(status)status.textContent='예식장 정보를 다시 불러와 주세요.';console.error('[WeddingRank rescue] list',e)}
}
async function rescueTop10(){
 const host=document.querySelector('#homeRankPreviewBody');if(!host)return;
 const pending=/불러오는 중|준비 중/.test(host.textContent||'');if(!pending&&host.children.length>1)return;
 try{const rows=await get('weddingrank_featured_top100?select=hall_id,name,sido,sigungu,selection_rank,editorial_index&order=selection_rank.asc&limit=10');if(!rows.length){host.innerHTML='<div class="rankingPreviewEmpty"><b>대표 웨딩홀 TOP 10을 준비 중입니다.</b></div>';return}host.innerHTML='<div class="previewTopGrid editorialHomeTop10">'+rows.map(x=>`<article class="previewTopCard" data-id="${esc(x.hall_id||'')}" tabindex="0" role="link"><strong class="previewTopNo">${Number(x.selection_rank)}</strong><div class="previewTopHall"><b>${esc(x.name||'예식장')}</b><span>${esc([x.sido,x.sigungu].filter(Boolean).join(' '))}</span></div><div class="previewTopScore"><strong>${Number(x.editorial_index||0).toFixed(1)}</strong><span>편집지수</span></div></article>`).join('')+'</div>';bindCards()}catch(e){console.error('[WeddingRank rescue] top10',e)}}
async function run(){ensureStatic();await Promise.allSettled([rescueList(),rescueTop10()]);ensureStatic()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,350),{once:true});else setTimeout(run,350);
setTimeout(run,1800);setTimeout(run,4500);
})();