/* WeddingRank ranking finalizer v5.29 */
(()=>{
  const HOME_LIMIT=10;
  const PENDING_LIMIT=10;
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[m]));
  let homeBusy=false;
  let trimBusy=false;

  async function fetchRows(){
    if(!base||!key)return [];
    const r=await fetch(`${base}/rest/v1/wedding_hall_rankings?select=*&order=overall_score.desc.nullslast`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
    if(!r.ok)throw new Error(await r.text());
    return r.json();
  }

  function overallSort(rows){
    return [...rows].sort((a,b)=>{
      const ar=Number(a.review_count)>0&&a.overall_score!=null;
      const br=Number(b.review_count)>0&&b.overall_score!=null;
      if(ar!==br)return ar?-1:1;
      if(ar&&br)return (Number(b.overall_score)-Number(a.overall_score))||(Number(b.review_count)-Number(a.review_count))||String(a.name||'').localeCompare(String(b.name||''),'ko');
      return String(a.name||'').localeCompare(String(b.name||''),'ko');
    });
  }

  async function renderHomeTop10(){
    if(homeBusy||location.hash==='#rankings'||location.hash.startsWith('#hall='))return;
    const body=document.querySelector('#homeRankPreviewBody');
    const section=document.querySelector('.homeRankingPreview');
    if(!body||!section)return;
    homeBusy=true;
    try{
      const rows=overallSort(await fetchRows()).slice(0,HOME_LIMIT);
      const h2=section.querySelector('h2');
      if(h2)h2.textContent='전국 예식장 종합랭킹 TOP 10';
      const desc=section.querySelector('.sectionDesc');
      if(desc)desc.textContent='실제 이용자 종합평점을 우선 표시하고, 부족한 자리는 평가대기 예식장으로 채워 총 10곳을 보여드립니다.';
      if(!rows.length){body.innerHTML='<div class="rankingPreviewEmpty"><b>표시할 예식장 정보가 없습니다.</b></div>';return}
      let rankNo=0;
      body.innerHTML='<div class="previewTopGrid">'+rows.map(h=>{
        const ready=Number(h.review_count)>0&&h.overall_score!=null;
        if(ready)rankNo++;
        return `<article class="previewTopCard${ready?'':' previewPendingCard'}" data-id="${esc(h.hall_id)}" tabindex="0" role="link"><strong class="previewTopNo">${ready?rankNo:'대기'}</strong><div class="previewTopHall"><b>${esc(h.name||'예식장')}</b><span>${esc([h.sido,h.sigungu].filter(Boolean).join(' '))}</span></div><div class="previewTopScore">${ready?`<strong>${Number(h.overall_score).toFixed(2)}</strong><span>${Number(h.review_count)}개 평가</span>`:'<strong>평가대기</strong><span>첫 평가 후 순위 반영</span>'}</div></article>`;
      }).join('')+'</div>';
      body.querySelectorAll('.previewTopCard[data-id]').forEach(card=>{
        const go=()=>location.hash=`hall=${card.dataset.id}`;
        card.onclick=go;
        card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}};
      });
    }catch(e){console.warn('WeddingRank home top10 v5.29',e)}finally{homeBusy=false}
  }

  function isPendingRow(el){
    if(!(el instanceof HTMLElement))return false;
    if(el.closest('#editorialTop100Block'))return false;
    if(el.classList.contains('pendingRank'))return true;
    const t=(el.textContent||'').replace(/\s+/g,' ');
    return t.includes('평가대기')&&t.includes('첫 평가');
  }

  function trimPending(){
    if(trimBusy||location.hash!=='#rankings')return;
    const body=document.querySelector('#rankingBody');
    if(!body)return;
    trimBusy=true;
    try{
      const candidates=[...body.children].filter(isPendingRow);
      const extras=candidates.slice(PENDING_LIMIT);
      extras.forEach(el=>el.remove());
      let note=body.querySelector(':scope > .rankingPendingNote');
      if(candidates.length>PENDING_LIMIT){
        if(!note){note=document.createElement('div');note.className='rankingPendingNote';body.appendChild(note)}
        note.textContent=`평가대기 예식장은 최대 ${PENDING_LIMIT}곳까지만 표시합니다. 실제 평가가 등록되면 자동으로 랭킹에 반영됩니다.`;
      }else if(note){note.remove()}
    }finally{trimBusy=false}
  }

  function forceTrimRepeatedly(){
    [0,30,100,250,600,1200].forEach(ms=>setTimeout(trimPending,ms));
  }

  const observer=new MutationObserver(()=>{
    if(location.hash==='#rankings')forceTrimRepeatedly();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});

  window.addEventListener('hashchange',()=>{forceTrimRepeatedly();setTimeout(renderHomeTop10,80)});
  document.addEventListener('DOMContentLoaded',()=>{renderHomeTop10();forceTrimRepeatedly()},{once:true});
  [120,350,800,1500,2600,4500].forEach(ms=>setTimeout(()=>{renderHomeTop10();trimPending()},ms));
})();
