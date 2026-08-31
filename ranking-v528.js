/* WeddingRank ranking corrections v5.28 */
(()=>{
  const HOME_LIMIT=10;
  const PENDING_LIMIT=10;
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[m]));
  let homeBusy=false,trimBusy=false;

  async function fetchRankingRows(){
    if(!base||!key)return [];
    const r=await fetch(`${base}/rest/v1/wedding_hall_rankings?select=*&order=overall_score.desc.nullslast`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
    if(!r.ok)throw new Error(await r.text());
    return r.json();
  }

  function sortOverall(rows){
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
      const rows=sortOverall(await fetchRankingRows()).slice(0,HOME_LIMIT);
      const h2=section.querySelector('h2');
      if(h2)h2.textContent='전국 예식장 종합랭킹 TOP 10';
      const desc=section.querySelector('.sectionDesc');
      if(desc)desc.textContent='실제 이용자 종합평점을 우선 표시하고, 아직 평가가 없는 예식장은 평가대기로 채워 최대 10곳을 보여드립니다.';
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
    }catch(e){console.warn('WeddingRank home top10 v5.28',e)}finally{homeBusy=false}
  }

  function trimRankingPending(){
    if(trimBusy||location.hash!=='#rankings')return;
    const body=document.querySelector('#rankingBody');
    if(!body)return;
    const pending=[...body.querySelectorAll('.rankRow.pendingRank')];
    if(!pending.length)return;
    trimBusy=true;
    try{
      pending.slice(PENDING_LIMIT).forEach(row=>row.remove());
      let note=body.querySelector('.rankingPendingNote');
      if(pending.length>PENDING_LIMIT){
        if(!note){note=document.createElement('div');note.className='rankingPendingNote';body.appendChild(note)}
        note.textContent=`평가대기 예식장은 최대 ${PENDING_LIMIT}곳까지만 표시합니다. 실제 평가가 등록되면 자동으로 종합랭킹에 반영됩니다.`;
      }else if(note){note.remove()}
    }finally{trimBusy=false}
  }

  function refresh(){
    setTimeout(trimRankingPending,20);
    setTimeout(renderHomeTop10,60);
  }

  const mo=new MutationObserver(()=>{
    if(location.hash==='#rankings')setTimeout(trimRankingPending,0);
  });
  mo.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('hashchange',refresh);
  document.addEventListener('DOMContentLoaded',refresh,{once:true});
  [120,350,800,1500,2600].forEach(ms=>setTimeout(refresh,ms));
})();
