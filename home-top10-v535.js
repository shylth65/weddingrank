/* WeddingRank safe homepage TOP10 v5.35 - no observers, no DOM moves */
(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function renderHomeTop10(){
    const host=document.querySelector('#homeRankPreviewBody');
    if(!host)return;
    const cfg=window.WEDDINGRANK_CONFIG||{};
    const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
    const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
    if(!base||!key)return;
    try{
      const r=await fetch(`${base}/rest/v1/wedding_hall_rankings?select=*`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
      if(!r.ok)throw new Error(`ranking ${r.status}`);
      const rows=await r.json();
      const ready=rows.filter(x=>Number(x.review_count||0)>0&&x.overall_score!=null)
        .sort((a,b)=>Number(b.overall_score)-Number(a.overall_score)||Number(b.review_count||0)-Number(a.review_count||0)||String(a.name||'').localeCompare(String(b.name||''),'ko'));
      const pending=rows.filter(x=>!(Number(x.review_count||0)>0&&x.overall_score!=null))
        .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'));
      const top=[...ready.slice(0,10)];
      if(top.length<10)top.push(...pending.slice(0,10-top.length));
      if(!top.length){host.innerHTML='<div class="rankingPreviewEmpty"><b>아직 표시할 랭킹 정보가 없습니다.</b></div>';return;}
      let rank=0;
      host.innerHTML='<div class="previewTopGrid">'+top.map(h=>{
        const reviewed=Number(h.review_count||0)>0&&h.overall_score!=null;
        if(reviewed)rank++;
        return `<article class="previewTopCard${reviewed?'':' previewTopPending'}" data-id="${esc(h.hall_id||'')}" tabindex="0" role="link"><strong class="previewTopNo">${reviewed?rank:'대기'}</strong><div class="previewTopHall"><b>${esc(h.name||'예식장')}</b><span>${esc([h.sido,h.sigungu].filter(Boolean).join(' '))}</span></div><div class="previewTopScore"><strong>${reviewed?Number(h.overall_score).toFixed(2):'평가대기'}</strong><span>${reviewed?`${Number(h.review_count||0)}개 평가`:'첫 평가 후 순위 반영'}</span></div></article>`;
      }).join('')+'</div>';
      host.querySelectorAll('.previewTopCard[data-id]').forEach(card=>{
        const go=()=>{if(card.dataset.id)location.hash=`hall=${card.dataset.id}`};
        card.addEventListener('click',go);
        card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
      });
    }catch(e){console.warn('[WeddingRank] safe home top10 failed',e)}
  }
  const run=()=>setTimeout(renderHomeTop10,700);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
