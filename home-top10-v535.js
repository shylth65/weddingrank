/* WeddingRank homepage TOP10 v5.36 - user ranking first, editorial fallback */
(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const headers={apikey:key,Authorization:`Bearer ${key}`};

  async function get(path){const r=await fetch(`${base}/rest/v1/${path}`,{headers});if(!r.ok)throw new Error(`${r.status}`);return r.json()}

  function bind(host){host.querySelectorAll('[data-id]').forEach(card=>{const go=()=>{if(card.dataset.id)location.hash=`hall=${card.dataset.id}`};card.addEventListener('click',go);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})})}

  async function render(){
    const host=document.querySelector('#homeRankPreviewBody');
    if(!host||!base||!key)return;
    try{
      const ranking=await get('wedding_hall_rankings?select=*');
      const ready=ranking.filter(x=>Number(x.review_count||0)>0&&x.overall_score!=null).sort((a,b)=>Number(b.overall_score)-Number(a.overall_score)||Number(b.review_count||0)-Number(a.review_count||0));
      const title=document.querySelector('.homeRankingPreview h2');
      const desc=document.querySelector('.homeRankingPreview .sectionDesc');

      if(ready.length){
        if(title)title.textContent='전국 예식장 종합랭킹 TOP 10';
        if(desc)desc.textContent='실제 이용자가 등록한 종합평점을 기준으로 한 WeddingRank TOP 10입니다.';
        host.innerHTML='<div class="previewTopGrid">'+ready.slice(0,10).map((h,i)=>`<article class="previewTopCard" data-id="${esc(h.hall_id||'')}" tabindex="0" role="link"><strong class="previewTopNo">${i+1}</strong><div class="previewTopHall"><b>${esc(h.name||'예식장')}</b><span>${esc([h.sido,h.sigungu].filter(Boolean).join(' '))}</span></div><div class="previewTopScore"><strong>${Number(h.overall_score).toFixed(2)}</strong><span>${Number(h.review_count||0)}개 평가</span></div></article>`).join('')+'</div>';
        bind(host);return;
      }

      const editorial=await get('weddingrank_featured_top100?select=*&order=selection_rank.asc&limit=10');
      if(title)title.textContent='전국 대표 웨딩홀 TOP 10';
      if(desc)desc.innerHTML='아직 실제 이용자 평가가 충분하지 않아, 공개정보·지역 대표성·시설 유형·인지도 신호를 기준으로 선정한 <b>WeddingRank 편집선정 TOP 10</b>을 먼저 보여드립니다. 실제 이용자 평가는 별도로 집계됩니다.';
      host.innerHTML='<div class="previewTopGrid editorialHomeTop10">'+editorial.map(x=>`<article class="previewTopCard" data-id="${esc(x.hall_id||'')}" tabindex="0" role="link"><strong class="previewTopNo">${Number(x.selection_rank)}</strong><div class="previewTopHall"><b>${esc(x.name||'예식장')}</b><span>${esc([x.sido,x.sigungu].filter(Boolean).join(' '))}</span></div><div class="previewTopScore"><strong>${Number(x.editorial_index).toFixed(1)}</strong><span>편집지수</span></div></article>`).join('')+'</div>';
      bind(host);
    }catch(e){console.warn('[WeddingRank] homepage top10 failed',e)}
  }
  const run=()=>setTimeout(render,700);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
