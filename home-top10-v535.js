/* WeddingRank homepage editorial TOP10 only v5.37 */
(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  if(!base||!key)return;
  const headers={apikey:key,Authorization:`Bearer ${key}`};
  async function get(path){const r=await fetch(`${base}/rest/v1/${path}`,{headers});if(!r.ok)throw new Error(`${r.status}`);return r.json()}
  function bind(host){host.querySelectorAll('[data-id]').forEach(card=>{const go=()=>{if(card.dataset.id)location.hash=`hall=${card.dataset.id}`};card.addEventListener('click',go);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})})}
  async function render(){
    const host=document.querySelector('#homeRankPreviewBody');
    if(!host)return;
    try{
      const editorial=await get('weddingrank_featured_top100?select=*&order=selection_rank.asc&limit=10');
      const title=document.querySelector('.homeRankingPreview h2');
      const desc=document.querySelector('.homeRankingPreview .sectionDesc');
      if(title)title.textContent='전국 대표 웨딩홀 TOP 10';
      if(desc)desc.innerHTML='공개정보·지역 대표성·시설 유형·인지도 신호를 기준으로 선정한 <b>WeddingRank 편집선정 TOP 10</b>입니다. 실제 이용자 평가는 예식장별로 별도 집계됩니다.';
      host.innerHTML='<div class="previewTopGrid editorialHomeTop10">'+editorial.map(x=>`<article class="previewTopCard" data-id="${esc(x.hall_id||'')}" tabindex="0" role="link"><strong class="previewTopNo">${Number(x.selection_rank)}</strong><div class="previewTopHall"><b>${esc(x.name||'예식장')}</b><span>${esc([x.sido,x.sigungu].filter(Boolean).join(' '))}</span></div><div class="previewTopScore"><strong>${Number(x.editorial_index).toFixed(1)}</strong><span>편집지수</span></div></article>`).join('')+'</div>';
      bind(host);
    }catch(e){host.innerHTML='<div class="rankingPreviewEmpty"><b>대표 웨딩홀 TOP 10을 불러오는 중입니다.</b></div>';console.warn('[WeddingRank] editorial home top10 failed',e)}
  }
  const run=()=>setTimeout(render,500);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
