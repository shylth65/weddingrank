(()=>{
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  if(!base||!key)return;

  let rows=[];
  let byHall=new Map();
  let loaded=false;
  let retryTimers=[];

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[m]));

  async function loadEditorial(){
    if(loaded)return rows;
    try{
      const r=await fetch(`${base}/rest/v1/weddingrank_featured_top100?select=*&order=selection_rank.asc&limit=100`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
      if(!r.ok)throw new Error(await r.text());
      rows=await r.json();
      byHall=new Map(rows.map(x=>[x.hall_id,x]));
      loaded=true;
      refresh();
      scheduleRefreshes();
    }catch(e){console.warn('WeddingRank editorial Top100 load failed',e)}
    return rows;
  }

  function badgeHtml(x){
    return `<span class="editorialBadge" title="실제 이용자 후기가 아닌 WeddingRank 편집선정입니다.">편집선정 TOP100 · #${Number(x.selection_rank)}</span>`;
  }

  function decorateCards(){
    document.querySelectorAll('.card[data-id]').forEach(card=>{
      const x=byHall.get(card.dataset.id);
      const existing=card.querySelector('.editorialBadge');
      if(!x){existing?.remove();return}
      const label=`편집선정 TOP100 · #${Number(x.selection_rank)}`;
      if(existing){if(existing.textContent!==label)existing.textContent=label;return}
      const target=card.querySelector('.badges')||card.querySelector('.cardTop')||card;
      target.insertAdjacentHTML('beforeend',badgeHtml(x));
    });
  }

  function renderEditorialDetail(){
    const m=location.hash.match(/^#hall=(.+)$/);
    const old=document.querySelector('#editorialRatingBlock');
    if(!m){old?.remove();return}
    const x=byHall.get(m[1]);
    if(!x){old?.remove();return}
    if(old?.dataset.hallId===String(x.hall_id))return;
    old?.remove();
    const blocks=[...document.querySelectorAll('#detailView .detailBlock')];
    const reviewBlock=blocks.find(b=>b.querySelector('h2')?.textContent.includes('실제 이용자'));
    if(!reviewBlock)return;
    const el=document.createElement('div');
    el.id='editorialRatingBlock';
    el.dataset.hallId=String(x.hall_id);
    el.className='detailBlock editorialBlock';
    el.innerHTML=`<div class="editorialHead"><div><p class="editorialEyebrow">WEDDINGRANK EDITORIAL</p><h2>WeddingRank 편집선정</h2></div><div class="editorialIndex"><strong>${Number(x.editorial_index).toFixed(1)}</strong><span>/ 100</span></div></div><p><b>전국 대표 100곳 중 #${Number(x.selection_rank)}</b>${x.region_rank?` · 지역 #${Number(x.region_rank)}`:''}</p><p>${esc(x.selection_reason||'')}</p><p class="editorialSummary">${esc(x.summary||'')}</p><div class="editorialDisclaimer">※ 이 점수는 실제 이용자 후기가 아닙니다. 공개정보의 충실도·시설 유형·지역 대표성·인지도 신호를 기준으로 한 WeddingRank 초기 편집지수이며, 실제 이용자 평가는 아래에서 별도로 집계됩니다.</div>`;
    reviewBlock.insertAdjacentElement('beforebegin',el);
  }

  function renderEditorialRanking(){
    const old=document.querySelector('#editorialTop100Block');
    if(location.hash!=='#rankings'){old?.remove();return}
    if(!rows.length)return;
    const body=document.querySelector('#rankingBody');
    if(!body)return;
    if(old)return;
    const wrap=document.createElement('div');
    wrap.id='editorialTop100Block';
    wrap.className='editorialTop100Block';
    wrap.innerHTML=`<div class="editorialTopIntro"><p class="editorialEyebrow">EDITORIAL SELECTION</p><h2>전국 대표 웨딩홀 100선</h2><p>초기 서비스의 빈 랭킹을 가짜 후기로 채우지 않고, 공개정보·지역 대표성·시설 유형·인지도 신호를 기준으로 선정한 <b>WeddingRank 편집선정</b>입니다. 실제 이용자 랭킹과는 분리됩니다.</p></div><div class="editorialRows">${rows.map(x=>`<article class="editorialRankRow" data-id="${esc(x.hall_id)}"><div class="editorialRankNo">${Number(x.selection_rank)}</div><div class="editorialRankHall"><b>${esc(x.name)}</b><span>${esc([x.sido,x.sigungu].filter(Boolean).join(' '))}</span></div><div class="editorialRankScore"><strong>${Number(x.editorial_index).toFixed(1)}</strong><span>편집지수</span></div></article>`).join('')}</div><div class="editorialUserHeading"><h2>실제 이용자 랭킹</h2><p>아래 순위는 실제 이용자가 등록한 평가만으로 산정합니다.</p></div>`;
    body.insertAdjacentElement('beforebegin',wrap);
    wrap.querySelectorAll('.editorialRankRow[data-id]').forEach(el=>el.addEventListener('click',()=>location.hash=`hall=${el.dataset.id}`));
  }

  function refresh(){
    if(!loaded){loadEditorial();return}
    decorateCards();
    renderEditorialDetail();
    renderEditorialRanking();
  }

  function scheduleRefreshes(){
    retryTimers.forEach(clearTimeout);
    retryTimers=[];
    [150,400,900,1600,2600].forEach(ms=>retryTimers.push(setTimeout(refresh,ms)));
  }

  window.addEventListener('hashchange',()=>{setTimeout(refresh,80);scheduleRefreshes()});
  window.addEventListener('DOMContentLoaded',()=>{setTimeout(loadEditorial,150);scheduleRefreshes()});
  setTimeout(loadEditorial,150);
})();