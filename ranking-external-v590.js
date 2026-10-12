/* WeddingRank external-review ranking integration v5.91 */
(()=>{
  'use strict';
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const headers={apikey:key,Authorization:`Bearer ${key}`};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get=async path=>{const r=await fetch(`${base}/rest/v1/${path}`,{headers});if(!r.ok)throw new Error(`Supabase ${r.status}`);return r.json()};
  const metricKey=mode=>({overall:'overall_score',food:'food_score',parking:'parking_score',value:'value_score'}[mode]||'overall_score');
  const metricName=mode=>({overall:'종합',food:'음식',parking:'주차',value:'가성비'}[mode]||'종합');

  function installStyles(){
    if(document.getElementById('wr-external-ranking-v590'))return;
    const s=document.createElement('style');s.id='wr-external-ranking-v590';
    s.textContent=`
      .externalHomeTop10 .previewTopCard{grid-template-columns:56px minmax(0,1fr) auto!important}
      .externalHomeTop10 .previewTopScore{min-width:116px!important}
      .externalHomeTop10 .previewTopScore strong{font-size:25px!important}
      .externalHomeTop10 .previewTopScore span{font-weight:900!important;color:#7d6670!important}
      .externalHomeTop10 .previewTopScore small{display:block;margin-top:5px;color:#958c94;font-size:10px;white-space:nowrap}
      .rankScore small{display:block;margin-top:4px;color:#968d98;font-size:10px}
      @media(max-width:700px){
        .externalHomeTop10 .previewTopCard{grid-template-columns:46px minmax(0,1fr)!important}
        .externalHomeTop10 .previewTopScore{grid-column:2;text-align:left!important;min-width:0!important}
        .externalHomeTop10 .previewTopScore strong{font-size:19px!important}
      }`;
    document.head.appendChild(s);
  }

  function bindRows(host){
    host.querySelectorAll('[data-id]').forEach(card=>{
      const go=()=>{if(card.dataset.id)location.hash=`hall=${card.dataset.id}`};
      card.addEventListener('click',go);
      card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
    });
  }

  async function loadData(){
    if(!base||!key)throw new Error('연결 설정이 없습니다.');
    const [ratings,halls,editorial]=await Promise.all([
      get('external_wedding_ratings?select=hall_id,source_count,food_score,access_score,parking_score,facility_score,bride_waiting_score,banquet_score,service_score,value_score,overall_score,updated_at&is_public=eq.true&source_count=gte.3'),
      get('wedding_halls?select=hall_id,name,sido,sigungu&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&limit=1000'),
      get('weddingrank_featured_top100?select=hall_id,editorial_index,selection_rank')
    ]);
    const hallMap=new Map(halls.map(x=>[x.hall_id,x]));
    const editorialMap=new Map(editorial.map(x=>[x.hall_id,x]));
    return ratings.map(r=>({...r,...(hallMap.get(r.hall_id)||{}),editorial_index:editorialMap.get(r.hall_id)?.editorial_index??null,selection_rank:editorialMap.get(r.hall_id)?.selection_rank??null})).filter(x=>x.name);
  }

  async function renderHome(){
    const host=document.getElementById('homeRankPreviewBody');if(!host)return;
    const title=document.querySelector('.homeRankingPreview h2');
    const desc=document.querySelector('.homeRankingPreview .sectionDesc');
    if(title)title.textContent='외부후기 기반 웨딩홀 상대순위 TOP 10';
    if(desc)desc.innerHTML='공개후기 분석으로 산출한 <b>상대순위</b>입니다. 전국 모든 예식장의 품질 순위를 의미하지 않으며, 기존 평가 중 원점수·출처 적격성을 재검증하는 자료가 포함돼 있습니다. 회원 직접평가와 편집지수는 별도입니다.';
    try{
      const rows=(await loadData()).filter(x=>x.overall_score!=null)
        .sort((a,b)=>(Number(b.overall_score)-Number(a.overall_score))||(Number(b.source_count)-Number(a.source_count))||(Number(b.editorial_index??0)-Number(a.editorial_index??0))||String(a.name||'').localeCompare(String(b.name||''),'ko')).slice(0,10);
      if(!rows.length){host.innerHTML='<div class="rankingPreviewEmpty"><b>공개후기 평가를 준비 중입니다.</b></div>';return}
      host.innerHTML='<div class="previewTopGrid externalHomeTop10">'+rows.map((x,i)=>`<article class="previewTopCard" data-id="${esc(x.hall_id)}" tabindex="0" role="link"><strong class="previewTopNo">${i+1}</strong><div class="previewTopHall"><b>${esc(x.name)}</b><span>${esc([x.sido,x.sigungu].filter(Boolean).join(' '))}</span></div><div class="previewTopScore"><strong>${Number(x.overall_score).toFixed(2)}</strong><span>외부평가 · ${Number(x.source_count)}건</span><small>${x.editorial_index!=null?`편집지수 ${Number(x.editorial_index).toFixed(1)}`:'편집지수 별도'}</small></div></article>`).join('')+'</div>';
      bindRows(host);
    }catch(e){host.innerHTML='<div class="rankingPreviewEmpty"><b>공개후기 순위를 불러오는 중입니다.</b></div>';console.warn('[WeddingRank] external home ranking failed',e)}
  }

  window.loadRankings=loadRankings=async function(){
    if(document.getElementById('listView'))document.getElementById('listView').hidden=true;
    if(document.getElementById('detailView'))document.getElementById('detailView').hidden=true;
    if(document.getElementById('rankingView'))document.getElementById('rankingView').hidden=false;
    const body=document.getElementById('rankingBody');if(!body)return;
    body.innerHTML='<div class="pending big">외부평가 순위를 불러오는 중…</div>';
    const hero=document.querySelector('#rankingView .rankingHero p:last-child');
    const note=document.querySelector('#rankingView .rankingNote');
    if(hero)hero.textContent='공개후기 분석자료의 상대순위입니다. 일부 기존 자료는 출처별 원점수·표본·게시일 재감사가 진행 중이며, 전국 예식장 전체의 품질 등급이 아닙니다.';
    if(note)note.textContent='※ 공개출처 3건이라는 수량만으로 검증이 완료되지는 않습니다. 광고·상업적 업체 소개·중복 자료는 독립후기로 인정하지 않습니다. 현재 일부 이전 산정자료는 원점수와 후기별 근거 재검증 중이며, 결과에 따라 순위에서 보류될 수 있습니다. 편집지수·자체 회원평가는 별도입니다.';
    try{
      const mode=typeof rankingMode==='string'?rankingMode:'overall',scoreKey=metricKey(mode),region=document.getElementById('rankingRegion')?.value||'';
      const rows=(await loadData()).filter(x=>(!region||x.sido===region)&&x[scoreKey]!=null)
        .sort((a,b)=>mode==='overall'&&!region
          ? (Number(b.overall_score)-Number(a.overall_score))||(Number(b.source_count)-Number(a.source_count))||(Number(b.editorial_index??0)-Number(a.editorial_index??0))||String(a.name||'').localeCompare(String(b.name||''),'ko')
          : (Number(b[scoreKey])-Number(a[scoreKey]))||(Number(b.source_count)-Number(a.source_count))||String(a.name||'').localeCompare(String(b.name||''),'ko'));
      if(!rows.length){body.innerHTML='<div class="pending big"><b>해당 조건의 외부평가가 아직 없습니다.</b><br><small>독립 공개후기 3건 확보 후 자동 반영됩니다.</small></div>';return}
      body.innerHTML=`<div class="rankSectionMeta"><div><span class="rankKicker">EXTERNAL REVIEW RANKING</span><b>${metricName(mode)} 외부평가 순위</b></div><span>${rows.length}곳</span></div>`+
        rows.map((x,i)=>`<article class="rankRow${i<3?` rank${i+1}`:''}" data-id="${esc(x.hall_id)}"><div class="rankNo">${i+1}</div><div class="rankHall"><b>${esc(x.name)}</b><span>${esc([x.sido,x.sigungu].filter(Boolean).join(' '))}</span></div><div class="rankScore"><strong>${Number(x[scoreKey]).toFixed(2)}</strong><span>외부평가 · 공개출처 ${Number(x.source_count)}건</span><small>${x.editorial_index!=null?`편집지수 ${Number(x.editorial_index).toFixed(1)} · 별도`:'편집지수 별도'}</small></div></article>`).join('');
      bindRows(body);
    }catch(e){body.innerHTML=`<div class="pending big">외부평가 순위 조회 오류: ${esc(e.message)}</div>`}
  };

  function keepHomeRankingInSync(){
    const host=document.getElementById('homeRankPreviewBody');if(!host)return;
    let running=false,attempts=0;
    const ensure=()=>{
      if(running||host.querySelector('.externalHomeTop10')||attempts>=6)return;
      running=true;attempts+=1;
      Promise.resolve(renderHome()).finally(()=>{running=false});
    };
    const observer=new MutationObserver(()=>ensure());
    observer.observe(host,{childList:true});
    ensure();
    [250,700,1500,3000,6000].forEach(ms=>setTimeout(ensure,ms));
    setTimeout(()=>observer.disconnect(),12000);
  }

  installStyles();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',keepHomeRankingInSync,{once:true});else keepHomeRankingInSync();
})();